import { db } from "./db";
import { users, signupSchema, loginSchema, type SignupInput, type LoginInput, type User } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

// Session setup
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  const isProduction = !!(process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT);
  
  return session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    proxy: isProduction, // Trust proxy in production
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "lax" : "lax",
      maxAge: sessionTtl,
    },
  });
}

// Auth service functions
export async function createUser(input: SignupInput): Promise<User> {
  const passwordHash = await bcrypt.hash(input.password, 12);
  const verificationToken = randomBytes(32).toString("hex");
  const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const [user] = await db
    .insert(users)
    .values({
      email: input.email.toLowerCase(),
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      emailVerified: true, // Auto-verify in development (no email service)
      verificationToken,
      verificationTokenExpiry,
      authProvider: "email",
    })
    .returning();

  return user;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
  return user || null;
}

export async function findUserById(id: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user || null;
}

export async function findUserByGoogleId(googleId: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
  return user || null;
}

export async function verifyPassword(user: User, password: string): Promise<boolean> {
  if (!user.passwordHash) return false;
  return bcrypt.compare(password, user.passwordHash);
}

export async function verifyEmail(token: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.verificationToken, token));

  if (!user) return null;
  if (user.verificationTokenExpiry && new Date() > user.verificationTokenExpiry) {
    return null;
  }

  const [updatedUser] = await db
    .update(users)
    .set({
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiry: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning();

  return updatedUser;
}

export async function createOrUpdateGoogleUser(profile: {
  googleId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}): Promise<User> {
  // Check if user exists by Google ID
  let user = await findUserByGoogleId(profile.googleId);
  if (user) {
    // Update existing user
    const [updated] = await db
      .update(users)
      .set({
        firstName: profile.firstName,
        lastName: profile.lastName,
        profileImageUrl: profile.profileImageUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();
    return updated;
  }

  // Check if user exists by email
  user = await findUserByEmail(profile.email);
  if (user) {
    // Link Google account to existing user
    const [updated] = await db
      .update(users)
      .set({
        googleId: profile.googleId,
        emailVerified: true,
        authProvider: user.passwordHash ? "both" : "google",
        profileImageUrl: profile.profileImageUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();
    return updated;
  }

  // Create new user
  const [newUser] = await db
    .insert(users)
    .values({
      email: profile.email.toLowerCase(),
      googleId: profile.googleId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      profileImageUrl: profile.profileImageUrl,
      emailVerified: true,
      authProvider: "google",
    })
    .returning();

  return newUser;
}

// Middleware to check if user is authenticated
export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.session && (req.session as any).userId) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};

// Setup Google OAuth
function setupGoogleOAuth(app: Express) {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientID || !clientSecret) {
    console.log("Google OAuth not configured - missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
    return false;
  }

  // Determine callback URL based on environment
  let callbackURL: string;
  if (process.env.REPLIT_DEPLOYMENT) {
    // Production deployment
    callbackURL = "https://downtime-tracker.replit.app/api/auth/google/callback";
  } else if (process.env.REPLIT_DEV_DOMAIN) {
    // Development on Replit
    callbackURL = `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`;
  } else {
    // Local development
    callbackURL = "http://localhost:5000/api/auth/google/callback";
  }
  console.log("Google OAuth callback URL:", callbackURL);

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error("No email found in Google profile"), undefined);
          }

          const user = await createOrUpdateGoogleUser({
            googleId: profile.id,
            email,
            firstName: profile.name?.givenName,
            lastName: profile.name?.familyName,
            profileImageUrl: profile.photos?.[0]?.value,
          });

          return done(null, user);
        } catch (error) {
          return done(error as Error, undefined);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await findUserById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  return true;
}

// Register auth routes
export function registerAuthRoutes(app: Express) {
  // Setup session middleware
  app.use(getSession());
  
  // Setup passport
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Setup Google OAuth if configured
  const googleEnabled = setupGoogleOAuth(app);

  // Signup
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const data = signupSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await findUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      const user = await createUser(data);

      // Set session
      (req.session as any).userId = user.id;

      res.status(201).json({
        id: user.id,
        email: user.email,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Signup error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);

      const user = await findUserByEmail(data.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (!user.passwordHash) {
        return res.status(401).json({ message: "Please sign in with Google" });
      }

      const isValid = await verifyPassword(user, data.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Set session
      (req.session as any).userId = user.id;

      res.json({
        id: user.id,
        email: user.email,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    // Logout from passport first
    req.logout((logoutErr) => {
      if (logoutErr) {
        console.error("Passport logout error:", logoutErr);
      }
      
      // Then destroy session
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to logout" });
        }
        
        // Clear cookie with matching options
        const isProduction = !!(process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT);
        res.clearCookie("connect.sid", {
          path: "/",
          httpOnly: true,
          secure: isProduction,
          sameSite: "lax",
        });
        
        res.json({ success: true });
      });
    });
  });

  // Get current user
  app.get("/api/user", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await findUserById(userId);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
    });
  });

  // Email verification
  app.get("/api/auth/verify/:token", async (req, res) => {
    const { token } = req.params;
    const user = await verifyEmail(token);

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired verification link" });
    }

    res.json({ message: "Email verified successfully" });
  });

  // Google OAuth status check
  app.get("/api/auth/google/status", (req, res) => {
    res.json({ enabled: googleEnabled });
  });

  // Google OAuth routes (only if configured)
  if (googleEnabled) {
    app.get(
      "/api/auth/google",
      passport.authenticate("google", { 
        scope: ["profile", "email"],
        prompt: "select_account"  // Force account selection every time
      })
    );

    app.get(
      "/api/auth/google/callback",
      passport.authenticate("google", { failureRedirect: "/auth?error=google_failed" }),
      (req, res) => {
        // Set session userId from passport user
        if (req.user) {
          (req.session as any).userId = (req.user as any).id;
        }
        res.redirect("/");
      }
    );
  } else {
    // Return error if Google OAuth not configured
    app.get("/api/auth/google", (req, res) => {
      res.status(503).json({ 
        message: "Google sign-in is not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." 
      });
    });
  }
}

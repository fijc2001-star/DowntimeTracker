import React from 'react';
import { useLocation } from 'wouter';
import { useCurrentUser } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Loader2, Mail, ShieldCheck } from 'lucide-react';

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading } = useCurrentUser();

  React.useEffect(() => {
    if (user) {
      setLocation('/');
    }
  }, [user, setLocation]);

  const handleLogin = () => {
    window.location.href = '/api/login';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Abstract Background Elements */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,var(--primary)_0%,transparent_50%)] blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-[radial-gradient(ellipse_at_center,var(--secondary)_0%,transparent_60%)] blur-[80px]" />
      </div>

      <div className="relative z-10 w-full max-w-md p-4">
        <div className="mb-8 text-center space-y-2">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary shadow-2xl shadow-primary/20 mb-4 border border-white/10">
            <Activity className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-display font-bold tracking-tight text-foreground">DOWNTIME<span className="text-primary">.OS</span></h1>
          <p className="text-muted-foreground">Manufacturing Intelligence System</p>
        </div>

        <Card className="border-sidebar-border bg-card/50 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle>Welcome</CardTitle>
            <CardDescription>Sign in or create an account to continue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button 
              variant="default" 
              className="w-full h-14 text-base gap-3"
              onClick={handleLogin}
              data-testid="button-login"
            >
              <svg className="h-5 w-5" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
              </svg>
              Continue with Google
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full h-14 text-base gap-3"
              onClick={handleLogin}
              data-testid="button-login-email"
            >
              <Mail className="h-5 w-5" />
              Continue with Email
            </Button>
            
            <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/10 border border-secondary/20">
              <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Secure Authentication</p>
                <p>Sign up with a new account or log in with your existing credentials. Your data is protected with industry-standard encryption.</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <p className="text-center text-xs text-muted-foreground mt-8 font-mono opacity-50">
          V1.0.4 BUILD 2026.01 // SECURE_AUTH
        </p>
      </div>
    </div>
  );
}

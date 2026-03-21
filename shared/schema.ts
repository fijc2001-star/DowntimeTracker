import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, pgEnum, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Export auth models
export * from "./models/auth";

// Enums
export const roleEnum = pgEnum("role", ["owner", "admin", "operator"]);

// Processes table
export const processes = pgTable("processes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProcessSchema = createInsertSchema(processes).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export const selectProcessSchema = createSelectSchema(processes);
export type InsertProcess = z.infer<typeof insertProcessSchema>;
export type Process = typeof processes.$inferSelect;

// Nodes table
export const nodes = pgTable("nodes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  processId: varchar("process_id").notNull().references(() => processes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertNodeSchema = createInsertSchema(nodes).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export const selectNodeSchema = createSelectSchema(nodes);
export type InsertNode = z.infer<typeof insertNodeSchema>;
export type Node = typeof nodes.$inferSelect;

// Downtime Reasons table - linked to specific processes
export const downtimeReasons = pgTable("downtime_reasons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  processId: varchar("process_id").notNull().references(() => processes.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDowntimeReasonSchema = createInsertSchema(downtimeReasons).omit({ 
  id: true, 
  createdAt: true 
});
export const selectDowntimeReasonSchema = createSelectSchema(downtimeReasons);
export type InsertDowntimeReason = z.infer<typeof insertDowntimeReasonSchema>;
export type DowntimeReason = typeof downtimeReasons.$inferSelect;

// Uptime Reasons table - linked to specific processes
export const uptimeReasons = pgTable("uptime_reasons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  processId: varchar("process_id").notNull().references(() => processes.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUptimeReasonSchema = createInsertSchema(uptimeReasons).omit({ 
  id: true, 
  createdAt: true 
});
export const selectUptimeReasonSchema = createSelectSchema(uptimeReasons);
export type InsertUptimeReason = z.infer<typeof insertUptimeReasonSchema>;
export type UptimeReason = typeof uptimeReasons.$inferSelect;

// Downtime Events table
export const downtimeEvents = pgTable("downtime_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nodeId: varchar("node_id").notNull().references(() => nodes.id, { onDelete: "cascade" }),
  processId: varchar("process_id").notNull().references(() => processes.id, { onDelete: "cascade" }),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  reasonId: varchar("reason_id").references(() => downtimeReasons.id, { onDelete: "set null" }),
  uptimeReasonId: varchar("uptime_reason_id").references(() => uptimeReasons.id, { onDelete: "set null" }),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDowntimeEventSchema = createInsertSchema(downtimeEvents).omit({ 
  id: true, 
  createdAt: true 
});
export const selectDowntimeEventSchema = createSelectSchema(downtimeEvents);
export type InsertDowntimeEvent = z.infer<typeof insertDowntimeEventSchema>;
export type DowntimeEvent = typeof downtimeEvents.$inferSelect;

// User Permissions table - tracks ownership and roles per process/node
export const userPermissions = pgTable("user_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  processId: varchar("process_id").references(() => processes.id, { onDelete: "cascade" }),
  nodeId: varchar("node_id").references(() => nodes.id, { onDelete: "cascade" }),
  role: roleEnum("role").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserPermissionSchema = createInsertSchema(userPermissions).omit({ 
  id: true, 
  createdAt: true 
});
export const selectUserPermissionSchema = createSelectSchema(userPermissions);
export type InsertUserPermission = z.infer<typeof insertUserPermissionSchema>;
export type UserPermission = typeof userPermissions.$inferSelect;

// Relations
export const processesRelations = relations(processes, ({ many }) => ({
  nodes: many(nodes),
  events: many(downtimeEvents),
  permissions: many(userPermissions),
}));

export const nodesRelations = relations(nodes, ({ one, many }) => ({
  process: one(processes, {
    fields: [nodes.processId],
    references: [processes.id],
  }),
  events: many(downtimeEvents),
  permissions: many(userPermissions),
}));

export const downtimeEventsRelations = relations(downtimeEvents, ({ one }) => ({
  node: one(nodes, {
    fields: [downtimeEvents.nodeId],
    references: [nodes.id],
  }),
  process: one(processes, {
    fields: [downtimeEvents.processId],
    references: [processes.id],
  }),
  reason: one(downtimeReasons, {
    fields: [downtimeEvents.reasonId],
    references: [downtimeReasons.id],
  }),
}));

// Re-import users from auth models for relations
import { users } from "./models/auth";

export const usersRelations = relations(users, ({ many }) => ({
  permissions: many(userPermissions),
  createdEvents: many(downtimeEvents),
}));

export const userPermissionsRelations = relations(userPermissions, ({ one }) => ({
  user: one(users, {
    fields: [userPermissions.userId],
    references: [users.id],
  }),
  process: one(processes, {
    fields: [userPermissions.processId],
    references: [processes.id],
  }),
  node: one(nodes, {
    fields: [userPermissions.nodeId],
    references: [nodes.id],
  }),
}));

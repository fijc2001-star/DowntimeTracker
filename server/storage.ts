import { db } from "./db";
import { 
  processes, nodes, downtimeReasons, downtimeEvents, userPermissions,
  type Process, type InsertProcess,
  type Node, type InsertNode,
  type DowntimeReason, type InsertDowntimeReason,
  type DowntimeEvent, type InsertDowntimeEvent,
  type UserPermission, type InsertUserPermission,
} from "@shared/schema";
import { eq, and, desc, isNull, or, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // Process operations
  getProcesses(): Promise<Process[]>;
  getProcess(id: string): Promise<Process | undefined>;
  createProcess(process: InsertProcess, creatorId: string): Promise<Process>;
  updateProcess(id: string, process: Partial<InsertProcess>): Promise<Process | undefined>;
  
  // Node operations
  getNodes(): Promise<Node[]>;
  getNodesByProcess(processId: string): Promise<Node[]>;
  getNode(id: string): Promise<Node | undefined>;
  createNode(node: InsertNode, creatorId: string): Promise<Node>;
  updateNode(id: string, node: Partial<InsertNode>): Promise<Node | undefined>;
  
  // Downtime reason operations
  getDowntimeReasons(): Promise<DowntimeReason[]>;
  getActiveDowntimeReasons(): Promise<DowntimeReason[]>;
  createDowntimeReason(reason: InsertDowntimeReason): Promise<DowntimeReason>;
  
  // Downtime event operations
  getDowntimeEvents(filters?: { processId?: string; nodeId?: string }): Promise<DowntimeEvent[]>;
  getActiveDowntimeEvent(nodeId: string): Promise<DowntimeEvent | undefined>;
  createDowntimeEvent(event: InsertDowntimeEvent): Promise<DowntimeEvent>;
  updateDowntimeEvent(id: string, event: Partial<InsertDowntimeEvent>): Promise<DowntimeEvent | undefined>;
  
  // Permission operations
  getUserPermissions(userId: string): Promise<UserPermission[]>;
  getProcessPermissions(processId: string): Promise<UserPermission[]>;
  getProcessPermissionsWithUsers(processId: string): Promise<(UserPermission & { user?: { email: string; firstName?: string | null; lastName?: string | null } })[]>;
  createPermission(permission: InsertUserPermission): Promise<UserPermission>;
  deletePermission(id: string): Promise<void>;
  
  // Access control helpers
  hasProcessAccess(userId: string, processId: string, requiredRole?: 'admin' | 'operator'): Promise<boolean>;
  hasNodeAccess(userId: string, nodeId: string, requiredRole?: 'admin' | 'operator'): Promise<boolean>;
  getUserAccessibleProcesses(userId: string): Promise<Process[]>;
  getUserAccessibleNodes(userId: string): Promise<Node[]>;
  getUserOwnedProcesses(userId: string): Promise<Process[]>;
  
  // User operations
  getAllUsers(): Promise<{ id: string; email: string; firstName?: string | null; lastName?: string | null }[]>;
}

export class DatabaseStorage implements IStorage {
  // Process operations
  async getProcesses(): Promise<Process[]> {
    return await db.select().from(processes).where(eq(processes.isActive, true));
  }

  async getProcess(id: string): Promise<Process | undefined> {
    const [process] = await db.select().from(processes).where(eq(processes.id, id));
    return process;
  }

  async createProcess(processData: InsertProcess, creatorId: string): Promise<Process> {
    const [process] = await db.insert(processes).values(processData).returning();
    
    // Grant owner access to creator (owner cannot be revoked)
    await db.insert(userPermissions).values({
      userId: creatorId,
      processId: process.id,
      role: 'owner',
    });
    
    return process;
  }

  async updateProcess(id: string, processData: Partial<InsertProcess>): Promise<Process | undefined> {
    const [process] = await db
      .update(processes)
      .set({ ...processData, updatedAt: new Date() })
      .where(eq(processes.id, id))
      .returning();
    return process;
  }

  // Node operations
  async getNodes(): Promise<Node[]> {
    return await db.select().from(nodes).where(eq(nodes.isActive, true));
  }

  async getNodesByProcess(processId: string): Promise<Node[]> {
    return await db.select().from(nodes)
      .where(and(eq(nodes.processId, processId), eq(nodes.isActive, true)));
  }

  async getNode(id: string): Promise<Node | undefined> {
    const [node] = await db.select().from(nodes).where(eq(nodes.id, id));
    return node;
  }

  async createNode(nodeData: InsertNode, creatorId: string): Promise<Node> {
    const [node] = await db.insert(nodes).values(nodeData).returning();
    
    // Grant admin access to creator
    await db.insert(userPermissions).values({
      userId: creatorId,
      nodeId: node.id,
      role: 'admin',
    });
    
    return node;
  }

  async updateNode(id: string, nodeData: Partial<InsertNode>): Promise<Node | undefined> {
    const [node] = await db
      .update(nodes)
      .set({ ...nodeData, updatedAt: new Date() })
      .where(eq(nodes.id, id))
      .returning();
    return node;
  }

  // Downtime reason operations
  async getDowntimeReasons(): Promise<DowntimeReason[]> {
    return await db.select().from(downtimeReasons).orderBy(downtimeReasons.label);
  }

  async getActiveDowntimeReasons(): Promise<DowntimeReason[]> {
    return await db.select().from(downtimeReasons)
      .where(eq(downtimeReasons.isActive, true))
      .orderBy(downtimeReasons.label);
  }

  async createDowntimeReason(reasonData: InsertDowntimeReason): Promise<DowntimeReason> {
    const [reason] = await db.insert(downtimeReasons).values(reasonData).returning();
    return reason;
  }

  // Downtime event operations
  async getDowntimeEvents(filters?: { processId?: string; nodeId?: string }): Promise<DowntimeEvent[]> {
    let query = db.select().from(downtimeEvents).orderBy(desc(downtimeEvents.startTime));
    
    if (filters?.processId) {
      query = query.where(eq(downtimeEvents.processId, filters.processId)) as any;
    }
    if (filters?.nodeId) {
      query = query.where(eq(downtimeEvents.nodeId, filters.nodeId)) as any;
    }
    
    return await query;
  }

  async getActiveDowntimeEvent(nodeId: string): Promise<DowntimeEvent | undefined> {
    const [event] = await db.select().from(downtimeEvents)
      .where(and(
        eq(downtimeEvents.nodeId, nodeId),
        isNull(downtimeEvents.endTime)
      ))
      .orderBy(desc(downtimeEvents.startTime))
      .limit(1);
    return event;
  }

  async createDowntimeEvent(eventData: InsertDowntimeEvent): Promise<DowntimeEvent> {
    const [event] = await db.insert(downtimeEvents).values(eventData).returning();
    return event;
  }

  async updateDowntimeEvent(id: string, eventData: Partial<InsertDowntimeEvent>): Promise<DowntimeEvent | undefined> {
    const [event] = await db
      .update(downtimeEvents)
      .set(eventData)
      .where(eq(downtimeEvents.id, id))
      .returning();
    return event;
  }

  // Permission operations
  async getUserPermissions(userId: string): Promise<UserPermission[]> {
    return await db.select().from(userPermissions)
      .where(eq(userPermissions.userId, userId));
  }

  async getProcessPermissions(processId: string): Promise<UserPermission[]> {
    return await db.select().from(userPermissions)
      .where(eq(userPermissions.processId, processId));
  }

  async getProcessPermissionsWithUsers(processId: string): Promise<(UserPermission & { user?: { email: string; firstName?: string | null; lastName?: string | null } })[]> {
    const { users } = await import("@shared/schema");
    
    const permissions = await db.select({
      id: userPermissions.id,
      userId: userPermissions.userId,
      processId: userPermissions.processId,
      nodeId: userPermissions.nodeId,
      role: userPermissions.role,
      createdAt: userPermissions.createdAt,
      userEmail: users.email,
      userFirstName: users.firstName,
      userLastName: users.lastName,
    })
    .from(userPermissions)
    .leftJoin(users, eq(userPermissions.userId, users.id))
    .where(or(
      eq(userPermissions.processId, processId),
      sql`${userPermissions.nodeId} IN (SELECT id FROM nodes WHERE process_id = ${processId})`
    ));
    
    return permissions.map(p => ({
      id: p.id,
      userId: p.userId,
      processId: p.processId,
      nodeId: p.nodeId,
      role: p.role,
      createdAt: p.createdAt,
      user: p.userEmail ? {
        email: p.userEmail,
        firstName: p.userFirstName,
        lastName: p.userLastName,
      } : undefined,
    }));
  }

  async createPermission(permissionData: InsertUserPermission): Promise<UserPermission> {
    const [permission] = await db.insert(userPermissions).values(permissionData).returning();
    return permission;
  }

  async getPermission(id: string): Promise<UserPermission | undefined> {
    const [permission] = await db.select().from(userPermissions).where(eq(userPermissions.id, id));
    return permission;
  }

  async deletePermission(id: string): Promise<void> {
    await db.delete(userPermissions).where(eq(userPermissions.id, id));
  }

  // Access control helpers
  async hasProcessAccess(userId: string, processId: string, requiredRole?: 'admin' | 'operator'): Promise<boolean> {
    const [permission] = await db.select().from(userPermissions)
      .where(and(
        eq(userPermissions.userId, userId),
        eq(userPermissions.processId, processId)
      ))
      .limit(1);
    
    if (!permission) return false;
    if (!requiredRole) return true;
    if (requiredRole === 'operator') return true; // owner, admin, and operator all satisfy
    // 'owner' and 'admin' both satisfy admin requirement
    return permission.role === 'admin' || permission.role === 'owner';
  }

  async hasNodeAccess(userId: string, nodeId: string, requiredRole?: 'admin' | 'operator'): Promise<boolean> {
    // Check direct node permission
    const [nodePerm] = await db.select().from(userPermissions)
      .where(and(
        eq(userPermissions.userId, userId),
        eq(userPermissions.nodeId, nodeId)
      ))
      .limit(1);
    
    if (nodePerm) {
      if (!requiredRole) return true;
      if (requiredRole === 'operator') return true;
      return nodePerm.role === 'admin' || nodePerm.role === 'owner';
    }
    
    // Check if user has access via process permission
    const [node] = await db.select().from(nodes).where(eq(nodes.id, nodeId));
    if (!node) return false;
    
    const [processPerm] = await db.select().from(userPermissions)
      .where(and(
        eq(userPermissions.userId, userId),
        eq(userPermissions.processId, node.processId)
      ))
      .limit(1);
    
    if (!processPerm) return false;
    if (!requiredRole) return true;
    if (requiredRole === 'operator') return true;
    // 'owner' and 'admin' both satisfy admin requirement
    return processPerm.role === 'admin' || processPerm.role === 'owner';
  }

  async getUserAccessibleProcesses(userId: string): Promise<Process[]> {
    const perms = await db.select({ processId: userPermissions.processId })
      .from(userPermissions)
      .where(and(
        eq(userPermissions.userId, userId),
        sql`${userPermissions.processId} IS NOT NULL`
      ));
    
    if (perms.length === 0) return [];
    
    const processIds = perms.map(p => p.processId).filter((id): id is string => id !== null);
    return await db.select().from(processes)
      .where(and(
        inArray(processes.id, processIds),
        eq(processes.isActive, true)
      ));
  }

  async getUserAccessibleNodes(userId: string): Promise<Node[]> {
    // Get all permissions for this user
    const perms = await this.getUserPermissions(userId);
    
    // Get nodes where user has direct node permission
    const directNodePerms = perms.filter(p => p.nodeId !== null).map(p => p.nodeId!);
    
    // Get nodes in processes where user has process permission
    const processPerms = perms.filter(p => p.processId !== null).map(p => p.processId!);
    
    const nodesByProcess = processPerms.length > 0
      ? await db.select().from(nodes)
          .where(and(
            inArray(nodes.processId, processPerms),
            eq(nodes.isActive, true)
          ))
      : [];
    
    const directNodes = directNodePerms.length > 0
      ? await db.select().from(nodes)
          .where(and(
            inArray(nodes.id, directNodePerms),
            eq(nodes.isActive, true)
          ))
      : [];
    
    // Merge and deduplicate
    const allNodes = [...nodesByProcess, ...directNodes];
    const uniqueNodes = allNodes.filter((node, index, self) =>
      index === self.findIndex(n => n.id === node.id)
    );
    
    return uniqueNodes;
  }

  async getUserOwnedProcesses(userId: string): Promise<Process[]> {
    // Get processes where user is owner or admin (both can manage the process)
    const perms = await db.select({ processId: userPermissions.processId })
      .from(userPermissions)
      .where(and(
        eq(userPermissions.userId, userId),
        sql`${userPermissions.role} IN ('owner', 'admin')`,
        sql`${userPermissions.processId} IS NOT NULL`
      ));
    
    if (perms.length === 0) return [];
    
    const processIds = perms.map(p => p.processId).filter((id): id is string => id !== null);
    return await db.select().from(processes)
      .where(and(
        inArray(processes.id, processIds),
        eq(processes.isActive, true)
      ));
  }

  async getAllUsers(): Promise<{ id: string; email: string; firstName?: string | null; lastName?: string | null }[]> {
    const { users } = await import("@shared/schema");
    return await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
    }).from(users);
  }
}

export const storage = new DatabaseStorage();

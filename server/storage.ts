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
  deleteProcess(id: string): Promise<boolean>;
  
  // Node operations
  getNodes(): Promise<Node[]>;
  getNodesByProcess(processId: string): Promise<Node[]>;
  getNode(id: string): Promise<Node | undefined>;
  createNode(node: InsertNode, creatorId: string): Promise<Node>;
  updateNode(id: string, node: Partial<InsertNode>): Promise<Node | undefined>;
  deleteNode(id: string): Promise<boolean>;
  
  // Downtime reason operations
  getDowntimeReasonsByProcess(processId: string): Promise<DowntimeReason[]>;
  getActiveDowntimeReasonsByProcess(processId: string): Promise<DowntimeReason[]>;
  createDowntimeReason(reason: InsertDowntimeReason): Promise<DowntimeReason>;
  updateDowntimeReason(id: string, data: Partial<InsertDowntimeReason>): Promise<DowntimeReason | undefined>;
  deleteDowntimeReason(id: string): Promise<boolean>;
  
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
  
  // Analytics
  getDowntimeStatsByReason(entityType: 'process' | 'node', entityId: string): Promise<{ reasonLabel: string; totalDuration: number }[]>;
  getDowntimeStatsByNode(processId: string): Promise<{ nodeId: string; nodeName: string; totalDuration: number }[]>;
  getUserAdminProcesses(userId: string): Promise<Process[]>;
  getUserAdminNodes(userId: string): Promise<Node[]>;
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

  async deleteProcess(id: string): Promise<boolean> {
    // Soft delete by setting isActive to false
    const [process] = await db
      .update(processes)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(processes.id, id))
      .returning();
    return !!process;
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
    
    // Only grant node-level admin if user doesn't already have process-level owner/admin access
    const processRole = await this.getUserProcessRole(creatorId, nodeData.processId);
    if (!processRole || processRole === 'operator') {
      // User doesn't have admin/owner access to process, grant node-level admin
      await db.insert(userPermissions).values({
        userId: creatorId,
        nodeId: node.id,
        role: 'admin',
      });
    }
    // If user is owner/admin of process, they already have access to all nodes
    
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

  async deleteNode(id: string): Promise<boolean> {
    // Soft delete by setting isActive to false
    const [node] = await db
      .update(nodes)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(nodes.id, id))
      .returning();
    return !!node;
  }

  // Downtime reason operations
  async getDowntimeReasonsByProcess(processId: string): Promise<DowntimeReason[]> {
    return await db.select().from(downtimeReasons)
      .where(eq(downtimeReasons.processId, processId))
      .orderBy(downtimeReasons.label);
  }

  async getActiveDowntimeReasonsByProcess(processId: string): Promise<DowntimeReason[]> {
    return await db.select().from(downtimeReasons)
      .where(and(
        eq(downtimeReasons.processId, processId),
        eq(downtimeReasons.isActive, true)
      ))
      .orderBy(downtimeReasons.label);
  }

  async createDowntimeReason(reasonData: InsertDowntimeReason): Promise<DowntimeReason> {
    const [reason] = await db.insert(downtimeReasons).values(reasonData).returning();
    return reason;
  }

  async updateDowntimeReason(id: string, data: Partial<InsertDowntimeReason>): Promise<DowntimeReason | undefined> {
    const [reason] = await db
      .update(downtimeReasons)
      .set(data)
      .where(eq(downtimeReasons.id, id))
      .returning();
    return reason;
  }

  async deleteDowntimeReason(id: string): Promise<boolean> {
    const [reason] = await db
      .delete(downtimeReasons)
      .where(eq(downtimeReasons.id, id))
      .returning();
    return !!reason;
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
    
    // Get all permissions (process-level and node-level for this process)
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
    
    // Filter out redundant node-level permissions where user has process-level owner/admin
    const processLevelUsers = new Set(
      permissions
        .filter(p => p.processId === processId && (p.role === 'owner' || p.role === 'admin'))
        .map(p => p.userId)
    );
    
    const filteredPermissions = permissions.filter(p => {
      // Keep all process-level permissions
      if (p.processId === processId) return true;
      // Keep node-level permissions only if user doesn't have process-level owner/admin
      return !processLevelUsers.has(p.userId);
    });
    
    return filteredPermissions.map(p => ({
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

  async getUserProcessRole(userId: string, processId: string): Promise<'owner' | 'admin' | 'operator' | null> {
    const [permission] = await db.select().from(userPermissions)
      .where(and(
        eq(userPermissions.userId, userId),
        eq(userPermissions.processId, processId)
      ))
      .limit(1);
    return permission?.role as 'owner' | 'admin' | 'operator' | null;
  }

  async getUserNodeRole(userId: string, nodeId: string): Promise<'owner' | 'admin' | 'operator' | null> {
    // Check direct node permission first
    const [nodePerm] = await db.select().from(userPermissions)
      .where(and(
        eq(userPermissions.userId, userId),
        eq(userPermissions.nodeId, nodeId)
      ))
      .limit(1);
    
    if (nodePerm) {
      return nodePerm.role as 'owner' | 'admin' | 'operator';
    }
    
    // Check process-level permission
    const [node] = await db.select().from(nodes).where(eq(nodes.id, nodeId));
    if (!node) return null;
    
    const [processPerm] = await db.select().from(userPermissions)
      .where(and(
        eq(userPermissions.userId, userId),
        eq(userPermissions.processId, node.processId)
      ))
      .limit(1);
    
    return processPerm?.role as 'owner' | 'admin' | 'operator' | null;
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

  async getDowntimeStatsByReason(entityType: 'process' | 'node', entityId: string): Promise<{ reasonLabel: string; totalDuration: number }[]> {
    const now = new Date();
    
    // Build the query based on entity type
    const whereCondition = entityType === 'process'
      ? eq(downtimeEvents.processId, entityId)
      : eq(downtimeEvents.nodeId, entityId);
    
    // Get all completed downtime events for this entity with their reasons
    const events = await db
      .select({
        reasonId: downtimeEvents.reasonId,
        startTime: downtimeEvents.startTime,
        endTime: downtimeEvents.endTime,
      })
      .from(downtimeEvents)
      .where(whereCondition);
    
    // Get all reasons for lookup
    const reasonList = await db.select().from(downtimeReasons);
    const reasonMap = new Map(reasonList.map(r => [r.id, r.label]));
    
    // Calculate duration per reason
    const durationByReason: Record<string, number> = {};
    
    for (const event of events) {
      const end = event.endTime ? new Date(event.endTime) : now;
      const start = new Date(event.startTime);
      const durationMs = end.getTime() - start.getTime();
      
      const reasonLabel = event.reasonId ? (reasonMap.get(event.reasonId) || 'Unknown') : 'No Reason';
      durationByReason[reasonLabel] = (durationByReason[reasonLabel] || 0) + durationMs;
    }
    
    // Convert to array and sort by duration descending
    return Object.entries(durationByReason)
      .map(([reasonLabel, totalDuration]) => ({ reasonLabel, totalDuration }))
      .sort((a, b) => b.totalDuration - a.totalDuration);
  }

  async getDowntimeStatsByNode(processId: string): Promise<{ nodeId: string; nodeName: string; totalDuration: number }[]> {
    const now = new Date();
    
    // Get all downtime events for this process
    const events = await db
      .select({
        nodeId: downtimeEvents.nodeId,
        startTime: downtimeEvents.startTime,
        endTime: downtimeEvents.endTime,
      })
      .from(downtimeEvents)
      .where(eq(downtimeEvents.processId, processId));
    
    // Get all nodes in this process for names
    const nodeList = await db.select().from(nodes).where(eq(nodes.processId, processId));
    const nodeMap = new Map(nodeList.map(n => [n.id, n.name]));
    
    // Calculate duration per node
    const durationByNode: Record<string, number> = {};
    
    for (const event of events) {
      const end = event.endTime ? new Date(event.endTime) : now;
      const start = new Date(event.startTime);
      const durationMs = end.getTime() - start.getTime();
      
      durationByNode[event.nodeId] = (durationByNode[event.nodeId] || 0) + durationMs;
    }
    
    // Convert to array with node names and sort by duration descending
    return Object.entries(durationByNode)
      .map(([nodeId, totalDuration]) => ({
        nodeId,
        nodeName: nodeMap.get(nodeId) || 'Unknown Node',
        totalDuration,
      }))
      .sort((a, b) => b.totalDuration - a.totalDuration);
  }

  async getUserAdminProcesses(userId: string): Promise<Process[]> {
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

  async getUserAdminNodes(userId: string): Promise<Node[]> {
    // Get nodes where user has direct admin/owner permission
    const directPerms = await db.select({ nodeId: userPermissions.nodeId })
      .from(userPermissions)
      .where(and(
        eq(userPermissions.userId, userId),
        sql`${userPermissions.role} IN ('owner', 'admin')`,
        sql`${userPermissions.nodeId} IS NOT NULL`
      ));
    
    const directNodeIds = directPerms.map(p => p.nodeId).filter((id): id is string => id !== null);
    
    // Get nodes in processes where user has admin/owner access
    const adminProcesses = await this.getUserAdminProcesses(userId);
    const adminProcessIds = adminProcesses.map(p => p.id);
    
    // Fetch both sets
    const directNodes = directNodeIds.length > 0 
      ? await db.select().from(nodes).where(and(
          inArray(nodes.id, directNodeIds),
          eq(nodes.isActive, true)
        ))
      : [];
    
    const processNodes = adminProcessIds.length > 0
      ? await db.select().from(nodes).where(and(
          inArray(nodes.processId, adminProcessIds),
          eq(nodes.isActive, true)
        ))
      : [];
    
    // Merge and deduplicate
    const allNodes = [...directNodes, ...processNodes];
    const uniqueNodes = allNodes.filter((node, index, self) =>
      index === self.findIndex(n => n.id === node.id)
    );
    
    return uniqueNodes;
  }
}

export const storage = new DatabaseStorage();

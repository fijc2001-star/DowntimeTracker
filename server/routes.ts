import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerAuthRoutes, isAuthenticated } from "./auth";
import { z } from "zod";
import { 
  insertProcessSchema, insertNodeSchema, insertDowntimeReasonSchema, insertUptimeReasonSchema,
  insertDowntimeEventSchema, insertUserPermissionSchema 
} from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication FIRST
  registerAuthRoutes(app);

  // Helper to get user ID from request
  const getUserId = (req: any): string => (req.session as any)?.userId;

  // ===== PROCESS ENDPOINTS =====
  
  // Get all processes accessible to user
  app.get("/api/processes", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const processes = await storage.getUserAccessibleProcesses(userId);
      
      // Add role information for each process
      const processesWithRoles = await Promise.all(
        processes.map(async (process) => {
          const role = await storage.getUserProcessRole(userId, process.id);
          return {
            ...process,
            userRole: role || 'operator',
          };
        })
      );
      
      res.json(processesWithRoles);
    } catch (error) {
      console.error("Error fetching processes:", error);
      res.status(500).json({ message: "Failed to fetch processes" });
    }
  });

  // Get processes where user is admin (owned processes) - must be before :id route
  app.get("/api/processes/owned", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const ownedProcesses = await storage.getUserOwnedProcesses(userId);
      res.json(ownedProcesses);
    } catch (error) {
      console.error("Error fetching owned processes:", error);
      res.status(500).json({ message: "Failed to fetch owned processes" });
    }
  });

  // Get single process
  app.get("/api/processes/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const processId = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
      
      const hasAccess = await storage.hasProcessAccess(userId, processId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const process = await storage.getProcess(processId);
      if (!process) {
        return res.status(404).json({ message: "Process not found" });
      }
      
      const role = await storage.getUserProcessRole(userId, processId);
      res.json({ ...process, userRole: role || 'operator' });
    } catch (error) {
      console.error("Error fetching process:", error);
      res.status(500).json({ message: "Failed to fetch process" });
    }
  });

  // Create process
  app.post("/api/processes", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const data = insertProcessSchema.parse(req.body);
      
      const process = await storage.createProcess(data, userId);
      res.status(201).json(process);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating process:", error);
      res.status(500).json({ message: "Failed to create process" });
    }
  });

  // Update process
  app.patch("/api/processes/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const processId = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
      
      const hasAdmin = await storage.hasProcessAccess(userId, processId, 'admin');
      if (!hasAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const data = insertProcessSchema.partial().parse(req.body);
      const process = await storage.updateProcess(processId, data);
      
      if (!process) {
        return res.status(404).json({ message: "Process not found" });
      }
      
      res.json(process);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating process:", error);
      res.status(500).json({ message: "Failed to update process" });
    }
  });

  // Delete process (owner only)
  app.delete("/api/processes/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const processId = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
      
      // Only owner can delete a process
      const role = await storage.getUserProcessRole(userId, processId);
      if (role !== 'owner') {
        return res.status(403).json({ message: "Only process owner can delete" });
      }
      
      const deleted = await storage.deleteProcess(processId);
      if (!deleted) {
        return res.status(404).json({ message: "Process not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting process:", error);
      res.status(500).json({ message: "Failed to delete process" });
    }
  });

  // ===== NODE ENDPOINTS =====
  
  // Get all nodes accessible to user
  app.get("/api/nodes", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const processId = req.query.processId as string | undefined;
      
      let nodes;
      if (processId) {
        const hasAccess = await storage.hasProcessAccess(userId, processId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied" });
        }
        nodes = await storage.getNodesByProcess(processId);
      } else {
        nodes = await storage.getUserAccessibleNodes(userId);
      }
      
      // Add role and status information for each node
      const nodesWithInfo = await Promise.all(
        nodes.map(async (node) => {
          const role = await storage.getUserNodeRole(userId, node.id);
          const activeEvent = await storage.getActiveDowntimeEvent(node.id);
          
          return {
            ...node,
            userRole: role || 'operator',
            status: activeEvent ? 'down' : 'running',
            activeEvent: activeEvent || null,
          };
        })
      );
      
      res.json(nodesWithInfo);
    } catch (error) {
      console.error("Error fetching nodes:", error);
      res.status(500).json({ message: "Failed to fetch nodes" });
    }
  });

  // Get single node
  app.get("/api/nodes/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const nodeId = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
      
      const hasAccess = await storage.hasNodeAccess(userId, nodeId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const node = await storage.getNode(nodeId);
      if (!node) {
        return res.status(404).json({ message: "Node not found" });
      }
      
      const role = await storage.getUserNodeRole(userId, nodeId);
      const activeEvent = await storage.getActiveDowntimeEvent(nodeId);
      
      res.json({
        ...node,
        userRole: role || 'operator',
        status: activeEvent ? 'down' : 'running',
        activeEvent: activeEvent || null,
      });
    } catch (error) {
      console.error("Error fetching node:", error);
      res.status(500).json({ message: "Failed to fetch node" });
    }
  });

  // Create node
  app.post("/api/nodes", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const initialStatus = req.body.initialStatus as 'running' | 'stopped' | undefined;
      const data = insertNodeSchema.parse(req.body);
      
      // User must have admin access to the parent process
      const hasAdmin = await storage.hasProcessAccess(userId, data.processId, 'admin');
      if (!hasAdmin) {
        return res.status(403).json({ message: "Admin access to process required" });
      }
      
      const node = await storage.createNode(data, userId);

      // If the node should start stopped, create an initial downtime event with no reason
      if (initialStatus === 'stopped') {
        await storage.createDowntimeEvent({
          nodeId: node.id,
          processId: node.processId,
          startTime: new Date(),
          reasonId: null,
          createdBy: userId,
        });
      }

      res.status(201).json(node);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating node:", error);
      res.status(500).json({ message: "Failed to create node" });
    }
  });

  // Update node
  app.patch("/api/nodes/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const nodeId = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
      
      const hasAdmin = await storage.hasNodeAccess(userId, nodeId, 'admin');
      if (!hasAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const data = insertNodeSchema.partial().parse(req.body);
      const node = await storage.updateNode(nodeId, data);
      
      if (!node) {
        return res.status(404).json({ message: "Node not found" });
      }
      
      res.json(node);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating node:", error);
      res.status(500).json({ message: "Failed to update node" });
    }
  });

  // Delete node (admin only)
  app.delete("/api/nodes/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const nodeId = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
      
      const hasAdmin = await storage.hasNodeAccess(userId, nodeId, 'admin');
      if (!hasAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const deleted = await storage.deleteNode(nodeId);
      if (!deleted) {
        return res.status(404).json({ message: "Node not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting node:", error);
      res.status(500).json({ message: "Failed to delete node" });
    }
  });

  // ===== DOWNTIME REASON ENDPOINTS =====
  
  // Get downtime reasons for a process (active only for operators, all for admins)
  app.get("/api/processes/:processId/downtime-reasons", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { processId } = req.params;
      const includeInactive = req.query.includeInactive === 'true';
      
      const hasAccess = await storage.hasProcessAccess(userId, processId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const reasons = includeInactive 
        ? await storage.getDowntimeReasonsByProcess(processId)
        : await storage.getActiveDowntimeReasonsByProcess(processId);
      res.json(reasons);
    } catch (error) {
      console.error("Error fetching downtime reasons:", error);
      res.status(500).json({ message: "Failed to fetch downtime reasons" });
    }
  });

  // Create downtime reason for a process (admin/owner only)
  app.post("/api/processes/:processId/downtime-reasons", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { processId } = req.params;
      
      const hasAdmin = await storage.hasProcessAccess(userId, processId, 'admin');
      if (!hasAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const data = insertDowntimeReasonSchema.parse({ ...req.body, processId });
      const reason = await storage.createDowntimeReason(data);
      res.status(201).json(reason);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating downtime reason:", error);
      res.status(500).json({ message: "Failed to create downtime reason" });
    }
  });

  // Update downtime reason (admin/owner only)
  app.patch("/api/downtime-reasons/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      
      // Get the reason to find its process
      const reasons = await storage.getDowntimeReasonsByProcess(req.body.processId);
      const reason = reasons.find(r => r.id === id);
      if (!reason) {
        return res.status(404).json({ message: "Downtime reason not found" });
      }
      
      const hasAdmin = await storage.hasProcessAccess(userId, reason.processId, 'admin');
      if (!hasAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const updated = await storage.updateDowntimeReason(id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating downtime reason:", error);
      res.status(500).json({ message: "Failed to update downtime reason" });
    }
  });

  // Delete downtime reason (admin/owner only)
  app.delete("/api/downtime-reasons/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      const processId = req.query.processId as string;
      
      if (!processId) {
        return res.status(400).json({ message: "processId query parameter required" });
      }
      
      const hasAdmin = await storage.hasProcessAccess(userId, processId, 'admin');
      if (!hasAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      await storage.deleteDowntimeReason(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting downtime reason:", error);
      res.status(500).json({ message: "Failed to delete downtime reason" });
    }
  });

  // ===== UPTIME REASON ENDPOINTS =====

  app.get("/api/processes/:processId/uptime-reasons", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { processId } = req.params;
      const includeInactive = req.query.includeInactive === 'true';

      const hasAccess = await storage.hasProcessAccess(userId, processId);
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });

      const reasons = includeInactive
        ? await storage.getUptimeReasonsByProcess(processId)
        : await storage.getActiveUptimeReasonsByProcess(processId);
      res.json(reasons);
    } catch (error) {
      console.error("Error fetching uptime reasons:", error);
      res.status(500).json({ message: "Failed to fetch uptime reasons" });
    }
  });

  app.post("/api/processes/:processId/uptime-reasons", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { processId } = req.params;

      const hasAdmin = await storage.hasProcessAccess(userId, processId, 'admin');
      if (!hasAdmin) return res.status(403).json({ message: "Admin access required" });

      const data = insertUptimeReasonSchema.parse({ ...req.body, processId });
      const reason = await storage.createUptimeReason(data);
      res.status(201).json(reason);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid data", errors: error.errors });
      console.error("Error creating uptime reason:", error);
      res.status(500).json({ message: "Failed to create uptime reason" });
    }
  });

  app.patch("/api/uptime-reasons/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;

      const reasons = await storage.getUptimeReasonsByProcess(req.body.processId);
      const reason = reasons.find(r => r.id === id);
      if (!reason) return res.status(404).json({ message: "Uptime reason not found" });

      const hasAdmin = await storage.hasProcessAccess(userId, reason.processId, 'admin');
      if (!hasAdmin) return res.status(403).json({ message: "Admin access required" });

      const updated = await storage.updateUptimeReason(id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating uptime reason:", error);
      res.status(500).json({ message: "Failed to update uptime reason" });
    }
  });

  app.delete("/api/uptime-reasons/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      const processId = req.query.processId as string;

      if (!processId) return res.status(400).json({ message: "processId query parameter required" });

      const hasAdmin = await storage.hasProcessAccess(userId, processId, 'admin');
      if (!hasAdmin) return res.status(403).json({ message: "Admin access required" });

      await storage.deleteUptimeReason(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting uptime reason:", error);
      res.status(500).json({ message: "Failed to delete uptime reason" });
    }
  });

  // ===== DOWNTIME EVENT ENDPOINTS =====
  
  // Get downtime events (filtered by access)
  app.get("/api/downtime-events", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const processId = req.query.processId as string | undefined;
      const nodeId = req.query.nodeId as string | undefined;
      
      // Check access if filtered by process or node
      if (processId) {
        const hasAccess = await storage.hasProcessAccess(userId, processId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      if (nodeId) {
        const hasAccess = await storage.hasNodeAccess(userId, nodeId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      const events = await storage.getDowntimeEvents({ processId, nodeId });
      res.json(events);
    } catch (error) {
      console.error("Error fetching downtime events:", error);
      res.status(500).json({ message: "Failed to fetch downtime events" });
    }
  });

  // Export downtime events as enriched JSON for CSV download
  app.get("/api/downtime-events/export", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const processId = req.query.processId as string | undefined;
      const nodeId = req.query.nodeId as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      if (!processId && !nodeId) {
        return res.status(400).json({ message: "processId or nodeId is required" });
      }

      if (processId && nodeId) {
        return res.status(400).json({ message: "processId and nodeId are mutually exclusive" });
      }

      if (processId) {
        const hasAccess = await storage.hasProcessAccess(userId, processId);
        if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      }

      if (nodeId) {
        const hasAccess = await storage.hasNodeAccess(userId, nodeId);
        if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      }

      const events = await storage.getDowntimeEventsEnriched({ processId, nodeId, startDate, endDate });
      res.json(events);
    } catch (error) {
      console.error("Error exporting downtime events:", error);
      res.status(500).json({ message: "Failed to export downtime events" });
    }
  });

  // Start downtime (create event with reason)
  app.post("/api/downtime-events/start", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { nodeId, reasonId } = req.body;
      
      if (!nodeId || !reasonId) {
        return res.status(400).json({ message: "nodeId and reasonId are required" });
      }
      
      // Check access
      const hasAccess = await storage.hasNodeAccess(userId, nodeId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Check if there's already an active event
      const activeEvent = await storage.getActiveDowntimeEvent(nodeId);
      if (activeEvent) {
        return res.status(400).json({ message: "Node already has active downtime event" });
      }
      
      // Get node to find processId
      const node = await storage.getNode(nodeId);
      if (!node) {
        return res.status(404).json({ message: "Node not found" });
      }
      
      const event = await storage.createDowntimeEvent({
        nodeId,
        processId: node.processId,
        startTime: new Date(),
        reasonId,
        createdBy: userId,
      });
      
      res.status(201).json(event);
    } catch (error) {
      console.error("Error starting downtime:", error);
      res.status(500).json({ message: "Failed to start downtime" });
    }
  });

  // Stop downtime (update event with end time and optional uptime reason)
  app.post("/api/downtime-events/stop", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { nodeId, uptimeReasonId } = req.body;
      
      if (!nodeId) {
        return res.status(400).json({ message: "nodeId is required" });
      }
      
      // Check access
      const hasAccess = await storage.hasNodeAccess(userId, nodeId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Find active event
      const activeEvent = await storage.getActiveDowntimeEvent(nodeId);
      if (!activeEvent) {
        return res.status(400).json({ message: "No active downtime event found" });
      }
      
      const event = await storage.updateDowntimeEvent(activeEvent.id, {
        endTime: new Date(),
        ...(uptimeReasonId ? { uptimeReasonId } : {}),
      });
      
      res.json(event);
    } catch (error) {
      console.error("Error stopping downtime:", error);
      res.status(500).json({ message: "Failed to stop downtime" });
    }
  });

  // ===== ANALYTICS ENDPOINTS =====
  
  // Get processes where user has admin/owner access (for dashboard)
  app.get("/api/analytics/admin-processes", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const includeInactive = req.query.includeInactive === 'true';
      const adminProcesses = await storage.getUserAdminProcesses(userId, includeInactive);
      res.json(adminProcesses);
    } catch (error) {
      console.error("Error fetching admin processes:", error);
      res.status(500).json({ message: "Failed to fetch admin processes" });
    }
  });
  
  // Get nodes where user has admin/owner access (for dashboard)
  app.get("/api/analytics/admin-nodes", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const includeInactive = req.query.includeInactive === 'true';
      const adminNodes = await storage.getUserAdminNodes(userId, includeInactive);
      res.json(adminNodes);
    } catch (error) {
      console.error("Error fetching admin nodes:", error);
      res.status(500).json({ message: "Failed to fetch admin nodes" });
    }
  });
  
  // Get downtime stats by reason for a process or node
  app.get("/api/analytics/downtime-stats/:entityType/:entityId", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { entityType, entityId } = req.params;
      const { startDate, endDate } = req.query;
      
      if (entityType !== 'process' && entityType !== 'node') {
        return res.status(400).json({ message: "Invalid entity type" });
      }
      
      // Check admin/owner access
      if (entityType === 'process') {
        const hasAccess = await storage.hasProcessAccess(userId, entityId, 'admin');
        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied - admin/owner required" });
        }
      } else {
        const hasAccess = await storage.hasNodeAccess(userId, entityId, 'admin');
        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied - admin/owner required" });
        }
      }
      
      const stats = await storage.getDowntimeStatsByReason(
        entityType, 
        entityId, 
        startDate as string | undefined, 
        endDate as string | undefined
      );
      res.json(stats);
    } catch (error) {
      console.error("Error fetching downtime stats:", error);
      res.status(500).json({ message: "Failed to fetch downtime stats" });
    }
  });

  // Get downtime stats by node for a process
  app.get("/api/analytics/downtime-stats-by-node/:processId", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { processId } = req.params;
      const { startDate, endDate } = req.query;
      
      // Check admin/owner access
      const hasAccess = await storage.hasProcessAccess(userId, processId, 'admin');
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied - admin/owner required" });
      }
      
      const stats = await storage.getDowntimeStatsByNode(
        processId, 
        startDate as string | undefined, 
        endDate as string | undefined
      );
      res.json(stats);
    } catch (error) {
      console.error("Error fetching downtime stats by node:", error);
      res.status(500).json({ message: "Failed to fetch downtime stats by node" });
    }
  });

  // Get downtime percentage KPI for a process or node
  app.get("/api/analytics/downtime-percentage/:entityType/:entityId", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { entityType, entityId } = req.params;
      const { startDate, endDate } = req.query;

      if (entityType !== 'process' && entityType !== 'node') {
        return res.status(400).json({ message: "Invalid entity type" });
      }

      if (entityType === 'process') {
        const hasAccess = await storage.hasProcessAccess(userId, entityId, 'admin');
        if (!hasAccess) return res.status(403).json({ message: "Access denied - admin/owner required" });
      } else {
        const hasAccess = await storage.hasNodeAccess(userId, entityId, 'admin');
        if (!hasAccess) return res.status(403).json({ message: "Access denied - admin/owner required" });
      }

      const result = await storage.getDowntimePercentage(
        entityType,
        entityId,
        startDate as string | undefined,
        endDate as string | undefined
      );
      res.json(result);
    } catch (error) {
      console.error("Error fetching downtime percentage:", error);
      res.status(500).json({ message: "Failed to fetch downtime percentage" });
    }
  });

  // ===== USER ENDPOINTS =====
  
  // Get all users (for authorization assignment)
  app.get("/api/users", isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // ===== PERMISSION ENDPOINTS =====
  
  // Get permissions for a process (admin only) - includes user info
  app.get("/api/permissions/process/:processId", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const processId = typeof req.params.processId === 'string' ? req.params.processId : req.params.processId[0];
      
      const hasAdmin = await storage.hasProcessAccess(userId, processId, 'admin');
      if (!hasAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const permissions = await storage.getProcessPermissionsWithUsers(processId);
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      res.status(500).json({ message: "Failed to fetch permissions" });
    }
  });

  // Assign permission with process-level node expansion
  app.post("/api/permissions/assign", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { userId: targetUserId, processId, nodeId, role } = req.body;
      
      if (!targetUserId || !role) {
        return res.status(400).json({ message: "userId and role are required" });
      }
      
      if (!processId && !nodeId) {
        return res.status(400).json({ message: "Must specify processId or nodeId" });
      }
      
      // Check admin access
      if (processId) {
        const hasAdmin = await storage.hasProcessAccess(userId, processId, 'admin');
        if (!hasAdmin) {
          return res.status(403).json({ message: "Admin access required" });
        }
      } else if (nodeId) {
        const hasAdmin = await storage.hasNodeAccess(userId, nodeId, 'admin');
        if (!hasAdmin) {
          return res.status(403).json({ message: "Admin access required" });
        }
      }
      
      // If assigning to process, create a process-level permission
      if (processId && !nodeId) {
        const permission = await storage.createPermission({
          userId: targetUserId,
          processId,
          role,
        });
        return res.status(201).json(permission);
      }
      
      // If assigning to specific node
      if (nodeId) {
        const permission = await storage.createPermission({
          userId: targetUserId,
          nodeId,
          processId: processId || null,
          role,
        });
        return res.status(201).json(permission);
      }
      
      res.status(400).json({ message: "Invalid assignment" });
    } catch (error) {
      console.error("Error assigning permission:", error);
      res.status(500).json({ message: "Failed to assign permission" });
    }
  });

  // Create permission (admin only)
  app.post("/api/permissions", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const data = insertUserPermissionSchema.parse(req.body);
      
      // Check admin access to the target process or node
      if (data.processId) {
        const hasAdmin = await storage.hasProcessAccess(userId, data.processId, 'admin');
        if (!hasAdmin) {
          return res.status(403).json({ message: "Admin access required" });
        }
      } else if (data.nodeId) {
        const hasAdmin = await storage.hasNodeAccess(userId, data.nodeId, 'admin');
        if (!hasAdmin) {
          return res.status(403).json({ message: "Admin access required" });
        }
      } else {
        return res.status(400).json({ message: "Must specify processId or nodeId" });
      }
      
      const permission = await storage.createPermission(data);
      res.status(201).json(permission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating permission:", error);
      res.status(500).json({ message: "Failed to create permission" });
    }
  });

  // Get current user's own assignments (for self de-assignment)
  app.get("/api/permissions/my-assignments", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const assignments = await storage.getUserAssignmentsWithDetails(userId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching user assignments:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  // Delete permission (admin or self-removal)
  app.delete("/api/permissions/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const permissionId = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
      
      // Get the permission to check access
      const targetPerm = await storage.getPermission(permissionId);
      
      if (!targetPerm) {
        return res.status(404).json({ message: "Permission not found" });
      }
      
      // Prevent deletion of owner permissions
      if (targetPerm.role === 'owner') {
        return res.status(403).json({ message: "Cannot revoke owner access. Delete the process instead." });
      }
      
      // Allow self-removal only for admin/owner roles (operators cannot de-assign themselves)
      const isSelfRemoval = targetPerm.userId === userId;
      const canSelfRemove = isSelfRemoval && (targetPerm.role === 'admin' || targetPerm.role === 'owner');
      
      if (!canSelfRemove) {
        // Check if user has admin rights to modify this permission
        if (targetPerm.processId) {
          const hasAdmin = await storage.hasProcessAccess(userId, targetPerm.processId, 'admin');
          if (!hasAdmin) {
            return res.status(403).json({ message: "Admin access required to remove this permission" });
          }
        } else if (targetPerm.nodeId) {
          const hasAdmin = await storage.hasNodeAccess(userId, targetPerm.nodeId, 'admin');
          if (!hasAdmin) {
            return res.status(403).json({ message: "Admin access required to remove this permission" });
          }
        }
      }
      
      await storage.deletePermission(permissionId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting permission:", error);
      res.status(500).json({ message: "Failed to delete permission" });
    }
  });

  return httpServer;
}

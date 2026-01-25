import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerAuthRoutes, isAuthenticated } from "./auth";
import { z } from "zod";
import { 
  insertProcessSchema, insertNodeSchema, insertDowntimeReasonSchema, 
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
          const hasAdmin = await storage.hasProcessAccess(userId, process.id, 'admin');
          return {
            ...process,
            userRole: hasAdmin ? 'admin' : 'operator',
          };
        })
      );
      
      res.json(processesWithRoles);
    } catch (error) {
      console.error("Error fetching processes:", error);
      res.status(500).json({ message: "Failed to fetch processes" });
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
      
      const hasAdmin = await storage.hasProcessAccess(userId, processId, 'admin');
      res.json({ ...process, userRole: hasAdmin ? 'admin' : 'operator' });
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
          const hasAdmin = await storage.hasNodeAccess(userId, node.id, 'admin');
          const activeEvent = await storage.getActiveDowntimeEvent(node.id);
          
          return {
            ...node,
            userRole: hasAdmin ? 'admin' : 'operator',
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
      
      const hasAdmin = await storage.hasNodeAccess(userId, nodeId, 'admin');
      const activeEvent = await storage.getActiveDowntimeEvent(nodeId);
      
      res.json({
        ...node,
        userRole: hasAdmin ? 'admin' : 'operator',
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
      const data = insertNodeSchema.parse(req.body);
      
      // User must have admin access to the parent process
      const hasAdmin = await storage.hasProcessAccess(userId, data.processId, 'admin');
      if (!hasAdmin) {
        return res.status(403).json({ message: "Admin access to process required" });
      }
      
      const node = await storage.createNode(data, userId);
      res.status(201).json(node);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating node:", error);
      res.status(500).json({ message: "Failed to create node" });
    }
  });

  // ===== DOWNTIME REASON ENDPOINTS =====
  
  // Get all active downtime reasons
  app.get("/api/downtime-reasons", isAuthenticated, async (req, res) => {
    try {
      const reasons = await storage.getActiveDowntimeReasons();
      res.json(reasons);
    } catch (error) {
      console.error("Error fetching downtime reasons:", error);
      res.status(500).json({ message: "Failed to fetch downtime reasons" });
    }
  });

  // Create downtime reason (admin only - could add global admin check here)
  app.post("/api/downtime-reasons", isAuthenticated, async (req, res) => {
    try {
      const data = insertDowntimeReasonSchema.parse(req.body);
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

  // Start downtime (create event without end time)
  app.post("/api/downtime-events/start", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { nodeId } = req.body;
      
      if (!nodeId) {
        return res.status(400).json({ message: "nodeId is required" });
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
        createdBy: userId,
      });
      
      res.status(201).json(event);
    } catch (error) {
      console.error("Error starting downtime:", error);
      res.status(500).json({ message: "Failed to start downtime" });
    }
  });

  // Stop downtime (update event with end time and reason)
  app.post("/api/downtime-events/stop", isAuthenticated, async (req, res) => {
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
      
      // Find active event
      const activeEvent = await storage.getActiveDowntimeEvent(nodeId);
      if (!activeEvent) {
        return res.status(400).json({ message: "No active downtime event found" });
      }
      
      const event = await storage.updateDowntimeEvent(activeEvent.id, {
        endTime: new Date(),
        reasonId,
      });
      
      res.json(event);
    } catch (error) {
      console.error("Error stopping downtime:", error);
      res.status(500).json({ message: "Failed to stop downtime" });
    }
  });

  // ===== PERMISSION ENDPOINTS =====
  
  // Get permissions for a process (admin only)
  app.get("/api/permissions/process/:processId", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const processId = typeof req.params.processId === 'string' ? req.params.processId : req.params.processId[0];
      
      const hasAdmin = await storage.hasProcessAccess(userId, processId, 'admin');
      if (!hasAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const permissions = await storage.getProcessPermissions(processId);
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      res.status(500).json({ message: "Failed to fetch permissions" });
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

  // Delete permission (admin only)
  app.delete("/api/permissions/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const permissionId = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
      
      // Get the permission to check access
      const perms = await storage.getUserPermissions(userId);
      const targetPerm = perms.find(p => p.id === permissionId);
      
      if (!targetPerm) {
        return res.status(404).json({ message: "Permission not found" });
      }
      
      // Check if user has admin rights to modify this permission
      if (targetPerm.processId) {
        const hasAdmin = await storage.hasProcessAccess(userId, targetPerm.processId, 'admin');
        if (!hasAdmin) {
          return res.status(403).json({ message: "Admin access required" });
        }
      } else if (targetPerm.nodeId) {
        const hasAdmin = await storage.hasNodeAccess(userId, targetPerm.nodeId, 'admin');
        if (!hasAdmin) {
          return res.status(403).json({ message: "Admin access required" });
        }
      }
      
      await storage.deletePermission(permissionId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting permission:", error);
      res.status(500).json({ message: "Failed to delete permission" });
    }
  });

  return httpServer;
}

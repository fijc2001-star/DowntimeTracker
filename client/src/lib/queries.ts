import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { InsertProcess, InsertNode, InsertDowntimeReason, InsertUserPermission } from '@shared/schema';

// Query Keys
export const queryKeys = {
  user: ['user'],
  processes: ['processes'],
  process: (id: string) => ['process', id],
  nodes: (processId?: string) => processId ? ['nodes', processId] : ['nodes'],
  node: (id: string) => ['node', id],
  downtimeReasonsByProcess: (processId: string) => ['downtimeReasons', processId],
  downtimeEvents: (filters?: { processId?: string; nodeId?: string }) => ['downtimeEvents', filters],
  processPermissions: (processId: string) => ['permissions', 'process', processId],
};

// User Queries
export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.user,
    queryFn: api.getCurrentUser,
    retry: false,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.logout,
    onSuccess: () => {
      queryClient.clear();
      window.location.href = '/auth';
    },
  });
}

// Process Queries
export function useProcesses() {
  return useQuery({
    queryKey: queryKeys.processes,
    queryFn: api.getProcesses,
  });
}

export function useProcess(id: string) {
  return useQuery({
    queryKey: queryKeys.process(id),
    queryFn: () => api.getProcess(id),
    enabled: !!id,
  });
}

export function useCreateProcess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InsertProcess) => api.createProcess(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.processes });
      queryClient.invalidateQueries({ queryKey: ['processes', 'owned'] });
    },
  });
}

export function useUpdateProcess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertProcess> }) => 
      api.updateProcess(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.processes });
      queryClient.invalidateQueries({ queryKey: queryKeys.process(variables.id) });
    },
  });
}

export function useDeleteProcess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteProcess(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.processes });
      queryClient.invalidateQueries({ queryKey: ['processes', 'owned'] });
    },
  });
}

// Node Queries
export function useNodes(processId?: string) {
  return useQuery({
    queryKey: queryKeys.nodes(processId),
    queryFn: () => api.getNodes(processId),
  });
}

export function useNode(id: string) {
  return useQuery({
    queryKey: queryKeys.node(id),
    queryFn: () => api.getNode(id),
    enabled: !!id,
    refetchInterval: 3000, // Refresh every 3 seconds for real-time status
  });
}

export function useCreateNode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InsertNode) => api.createNode(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.nodes() });
    },
  });
}

export function useUpdateNode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertNode> }) => 
      api.updateNode(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.nodes() });
      queryClient.invalidateQueries({ queryKey: queryKeys.node(variables.id) });
    },
  });
}

export function useDeleteNode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteNode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.nodes() });
    },
  });
}

// Downtime Reason Queries (process-scoped)
export function useDowntimeReasonsByProcess(processId: string, includeInactive = false) {
  return useQuery({
    queryKey: ['downtimeReasons', processId, { includeInactive }],
    queryFn: () => api.getDowntimeReasonsByProcess(processId, includeInactive),
    enabled: !!processId,
  });
}

export function useCreateDowntimeReason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ processId, data }: { processId: string; data: Omit<InsertDowntimeReason, 'processId'> }) => 
      api.createDowntimeReason(processId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'downtimeReasons' && query.queryKey[1] === variables.processId });
    },
  });
}

export function useUpdateDowntimeReason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, processId, data }: { id: string; processId: string; data: Partial<InsertDowntimeReason> }) => 
      api.updateDowntimeReason(id, { ...data, processId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'downtimeReasons' && query.queryKey[1] === variables.processId });
    },
  });
}

export function useDeleteDowntimeReason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, processId }: { id: string; processId: string }) => 
      api.deleteDowntimeReason(id, processId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'downtimeReasons' && query.queryKey[1] === variables.processId });
    },
  });
}

// Downtime Event Queries
export function useDowntimeEvents(filters?: { processId?: string; nodeId?: string }) {
  return useQuery({
    queryKey: queryKeys.downtimeEvents(filters),
    queryFn: () => api.getDowntimeEvents(filters),
  });
}

export function useStartDowntime() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ nodeId, reasonId }: { nodeId: string; reasonId: string }) => 
      api.startDowntime(nodeId, reasonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.nodes() });
      queryClient.invalidateQueries({ queryKey: queryKeys.downtimeEvents() });
    },
  });
}

export function useStopDowntime() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (nodeId: string) => api.stopDowntime(nodeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.nodes() });
      queryClient.invalidateQueries({ queryKey: queryKeys.downtimeEvents() });
    },
  });
}

// Permission Queries
export function useProcessPermissions(processId: string) {
  return useQuery({
    queryKey: queryKeys.processPermissions(processId),
    queryFn: () => api.getProcessPermissions(processId),
    enabled: !!processId,
  });
}

export function useCreatePermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InsertUserPermission) => api.createPermission(data),
    onSuccess: (_, variables) => {
      if (variables.processId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.processPermissions(variables.processId) });
      }
    },
  });
}

export function useDeletePermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deletePermission(id),
    onSuccess: () => {
      // Invalidate all permission queries (matches ['permissions', ...])
      queryClient.invalidateQueries({ predicate: (query) => 
        Array.isArray(query.queryKey) && query.queryKey[0] === 'permissions'
      });
    },
  });
}

// Get all users (for authorization assignment)
export function useAllUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: api.getAllUsers,
  });
}

// Get processes where current user is admin (owner)
export function useMyOwnedProcesses() {
  return useQuery({
    queryKey: ['processes', 'owned'],
    queryFn: api.getMyOwnedProcesses,
  });
}

// Get current user's assignments for self de-assignment
export function useMyAssignments() {
  return useQuery({
    queryKey: ['permissions', 'my-assignments'],
    queryFn: api.getMyAssignments,
  });
}

// Assign permission with process-level expansion
export function useAssignPermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.assignPermission,
    onSuccess: () => {
      // Invalidate all permission queries (matches ['permissions', ...])
      queryClient.invalidateQueries({ predicate: (query) => 
        Array.isArray(query.queryKey) && query.queryKey[0] === 'permissions'
      });
      queryClient.invalidateQueries({ queryKey: ['processes'] });
    },
  });
}

// Revoke permission (alias for deletePermission for clearer naming)
export function useRevokePermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deletePermission(id),
    onSuccess: () => {
      // Invalidate all permission queries (matches ['permissions', ...])
      queryClient.invalidateQueries({ predicate: (query) => 
        Array.isArray(query.queryKey) && query.queryKey[0] === 'permissions'
      });
    },
  });
}

// Analytics Queries
export function useAdminProcesses() {
  return useQuery({
    queryKey: ['analytics', 'admin-processes'],
    queryFn: api.getAdminProcesses,
  });
}

export function useAdminNodes() {
  return useQuery({
    queryKey: ['analytics', 'admin-nodes'],
    queryFn: api.getAdminNodes,
  });
}

export function useDowntimeStatsByReason(entityType: 'process' | 'node' | null, entityId: string | null) {
  return useQuery({
    queryKey: ['analytics', 'downtime-stats', entityType, entityId],
    queryFn: () => api.getDowntimeStatsByReason(entityType!, entityId!),
    enabled: !!entityType && !!entityId,
  });
}

export function useDowntimeStatsByNode(processId: string | null) {
  return useQuery({
    queryKey: ['analytics', 'downtime-stats-by-node', processId],
    queryFn: () => api.getDowntimeStatsByNode(processId!),
    enabled: !!processId,
  });
}

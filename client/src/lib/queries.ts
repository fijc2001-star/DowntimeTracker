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
  downtimeReasons: ['downtimeReasons'],
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
      window.location.href = '/';
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

// Downtime Reason Queries
export function useDowntimeReasons() {
  return useQuery({
    queryKey: queryKeys.downtimeReasons,
    queryFn: api.getDowntimeReasons,
  });
}

export function useCreateDowntimeReason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InsertDowntimeReason) => api.createDowntimeReason(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.downtimeReasons });
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
    mutationFn: (nodeId: string) => api.startDowntime(nodeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.nodes() });
      queryClient.invalidateQueries({ queryKey: queryKeys.downtimeEvents() });
    },
  });
}

export function useStopDowntime() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ nodeId, reasonId }: { nodeId: string; reasonId: string }) => 
      api.stopDowntime(nodeId, reasonId),
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
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
  });
}

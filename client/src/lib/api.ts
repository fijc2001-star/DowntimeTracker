import type { 
  Process, Node, DowntimeReason, DowntimeEvent, UserPermission,
  InsertProcess, InsertNode, InsertDowntimeReason, InsertDowntimeEvent, InsertUserPermission 
} from "@shared/schema";

const API_BASE = "";

async function fetchAPI<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// User API
export async function getCurrentUser() {
  return fetchAPI<{ id: string; email: string; name: string }>('/api/user');
}

export async function logout() {
  return fetchAPI<{ success: boolean }>('/api/auth/logout', { method: 'POST' });
}

// Process API
export async function getProcesses() {
  return fetchAPI<(Process & { userRole: 'admin' | 'operator' })[]>('/api/processes');
}

export async function getProcess(id: string) {
  return fetchAPI<Process & { userRole: 'admin' | 'operator' }>(`/api/processes/${id}`);
}

export async function createProcess(data: InsertProcess) {
  return fetchAPI<Process>('/api/processes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProcess(id: string, data: Partial<InsertProcess>) {
  return fetchAPI<Process>(`/api/processes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// Node API
export async function getNodes(processId?: string) {
  const url = processId ? `/api/nodes?processId=${processId}` : '/api/nodes';
  return fetchAPI<(Node & { userRole: 'admin' | 'operator'; status: 'running' | 'down'; activeEvent: DowntimeEvent | null })[]>(url);
}

export async function getNode(id: string) {
  return fetchAPI<Node & { userRole: 'admin' | 'operator'; status: 'running' | 'down'; activeEvent: DowntimeEvent | null }>(`/api/nodes/${id}`);
}

export async function createNode(data: InsertNode) {
  return fetchAPI<Node>('/api/nodes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateNode(id: string, data: Partial<InsertNode>) {
  return fetchAPI<Node>(`/api/nodes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// Downtime Reason API
export async function getDowntimeReasons() {
  return fetchAPI<DowntimeReason[]>('/api/downtime-reasons');
}

export async function createDowntimeReason(data: InsertDowntimeReason) {
  return fetchAPI<DowntimeReason>('/api/downtime-reasons', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Downtime Event API
export async function getDowntimeEvents(filters?: { processId?: string; nodeId?: string }) {
  const params = new URLSearchParams();
  if (filters?.processId) params.append('processId', filters.processId);
  if (filters?.nodeId) params.append('nodeId', filters.nodeId);
  const url = `/api/downtime-events${params.toString() ? `?${params}` : ''}`;
  return fetchAPI<DowntimeEvent[]>(url);
}

export async function startDowntime(nodeId: string) {
  return fetchAPI<DowntimeEvent>('/api/downtime-events/start', {
    method: 'POST',
    body: JSON.stringify({ nodeId }),
  });
}

export async function stopDowntime(nodeId: string, reasonId: string) {
  return fetchAPI<DowntimeEvent>('/api/downtime-events/stop', {
    method: 'POST',
    body: JSON.stringify({ nodeId, reasonId }),
  });
}

// Permission API
export async function getProcessPermissions(processId: string) {
  return fetchAPI<(UserPermission & { user?: { email: string; firstName?: string; lastName?: string } })[]>(`/api/permissions/process/${processId}`);
}

export async function createPermission(data: InsertUserPermission) {
  return fetchAPI<UserPermission>('/api/permissions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deletePermission(id: string) {
  return fetchAPI<void>(`/api/permissions/${id}`, {
    method: 'DELETE',
  });
}

// User API (for authorization)
export async function getAllUsers() {
  return fetchAPI<{ id: string; email: string; firstName?: string; lastName?: string }[]>('/api/users');
}

// Get processes where user is admin (owner)
export async function getMyOwnedProcesses() {
  return fetchAPI<Process[]>('/api/processes/owned');
}

// Assign permission with process-level node expansion
export async function assignPermission(data: { userId: string; processId?: string; nodeId?: string; role: 'admin' | 'operator' }) {
  return fetchAPI<UserPermission>('/api/permissions/assign', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

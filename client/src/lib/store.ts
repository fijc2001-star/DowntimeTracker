import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

// Types
export type Role = 'admin' | 'operator';

export interface User {
  id: string;
  name: string;
  role: Role;
  email: string;
}

export interface Process {
  id: string;
  name: string;
  description: string;
}

export interface Node {
  id: string;
  processId: string;
  name: string;
  status: 'running' | 'down'; 
}

export interface DowntimeReason {
  id: string;
  label: string;
  category: 'mechanical' | 'electrical' | 'operational' | 'external';
}

export interface DowntimeEvent {
  id: string;
  nodeId: string;
  processId: string;
  startTime: string; // ISO string
  endTime?: string; // ISO string
  reasonId?: string;
}

// Initial Data
const INITIAL_PROCESSES: Process[] = [
  { id: 'proc-1', name: 'Assembly Line A', description: 'Main chassis assembly' },
  { id: 'proc-2', name: 'Paint Shop', description: 'Automated coating line' },
  { id: 'proc-3', name: 'Packaging Unit', description: 'Final boxing and palletizing' },
];

const INITIAL_NODES: Node[] = [
  { id: 'node-1', processId: 'proc-1', name: 'Robot Arm 1 (Welding)', status: 'running' },
  { id: 'node-2', processId: 'proc-1', name: 'Conveyor Belt A', status: 'running' },
  { id: 'node-3', processId: 'proc-1', name: 'Quality Check Station', status: 'running' },
  { id: 'node-4', processId: 'proc-2', name: 'Primer Booth', status: 'running' },
  { id: 'node-5', processId: 'proc-2', name: 'Drying Oven', status: 'running' },
  { id: 'node-6', processId: 'proc-3', name: 'Labeling Machine', status: 'running' },
];

const INITIAL_REASONS: DowntimeReason[] = [
  { id: 'r-1', label: 'Component Jam', category: 'mechanical' },
  { id: 'r-2', label: 'Overheating', category: 'mechanical' },
  { id: 'r-3', label: 'Sensor Failure', category: 'electrical' },
  { id: 'r-4', label: 'Power Outage', category: 'external' },
  { id: 'r-5', label: 'Operator Break', category: 'operational' },
  { id: 'r-6', label: 'Material Shortage', category: 'operational' },
  { id: 'r-7', label: 'Emergency Stop', category: 'mechanical' },
];

// Store State
interface AppState {
  currentUser: User | null;
  processes: Process[];
  nodes: Node[];
  reasons: DowntimeReason[];
  events: DowntimeEvent[];
  
  // Actions
  login: (email: string, role: Role) => void;
  logout: () => void;
  
  startDowntime: (nodeId: string) => void;
  stopDowntime: (nodeId: string, reasonId: string) => void;
  
  addProcess: (process: Omit<Process, 'id'>) => void;
  addNode: (node: Omit<Node, 'id' | 'status'>) => void;
  
  // Analytics Helpers
  getProcessStatus: (processId: string) => 'running' | 'down' | 'mixed';
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      processes: INITIAL_PROCESSES,
      nodes: INITIAL_NODES,
      reasons: INITIAL_REASONS,
      events: [],

      login: (email, role) => set({ 
        currentUser: { id: 'user-1', name: email.split('@')[0], email, role } 
      }),
      
      logout: () => set({ currentUser: null }),

      startDowntime: (nodeId) => {
        const { nodes, events } = get();
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        // Update node status
        const updatedNodes = nodes.map(n => 
          n.id === nodeId ? { ...n, status: 'down' as const } : n
        );

        // Create new event
        const newEvent: DowntimeEvent = {
          id: uuidv4(),
          nodeId,
          processId: node.processId,
          startTime: new Date().toISOString(),
        };

        set({ nodes: updatedNodes, events: [...events, newEvent] });
      },

      stopDowntime: (nodeId, reasonId) => {
        const { nodes, events } = get();
        
        // Update node status
        const updatedNodes = nodes.map(n => 
          n.id === nodeId ? { ...n, status: 'running' as const } : n
        );

        // Close open event for this node
        const updatedEvents = events.map(e => {
          if (e.nodeId === nodeId && !e.endTime) {
            return { ...e, endTime: new Date().toISOString(), reasonId };
          }
          return e;
        });

        set({ nodes: updatedNodes, events: updatedEvents });
      },

      addProcess: (process) => set(state => ({
        processes: [...state.processes, { ...process, id: uuidv4() }]
      })),

      addNode: (node) => set(state => ({
        nodes: [...state.nodes, { ...node, id: uuidv4(), status: 'running' }]
      })),

      getProcessStatus: (processId) => {
        const { nodes } = get();
        const processNodes = nodes.filter(n => n.processId === processId);
        if (processNodes.length === 0) return 'running';
        
        const downCount = processNodes.filter(n => n.status === 'down').length;
        if (downCount === 0) return 'running';
        if (downCount === processNodes.length) return 'down';
        return 'mixed';
      }
    }),
    {
      name: 'downtime-tracker-storage',
    }
  )
);

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Settings2, ChevronDown, ChevronRight, Users, Shield, UserPlus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useCurrentUser, useProcesses, useNodes, useAllUsers, useMyOwnedProcesses, useAssignPermission, useRevokePermission, useProcessPermissions, useCreateProcess, useCreateNode } from '@/lib/queries';
import { useToast } from '@/hooks/use-toast';

function CollapsibleSection({ 
  title, 
  description, 
  icon: Icon, 
  children, 
  defaultOpen = true,
  headerAction
}: { 
  title: string; 
  description: string; 
  icon: any; 
  children: React.ReactNode;
  defaultOpen?: boolean;
  headerAction?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  {title}
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
              </div>
            </div>
            {headerAction && (
              <div onClick={(e) => e.stopPropagation()}>
                {headerAction}
              </div>
            )}
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function AuthorizationSection() {
  const { data: currentUser } = useCurrentUser();
  const { data: allUsers = [] } = useAllUsers();
  const { data: ownedProcesses = [] } = useMyOwnedProcesses();
  const { data: allNodes = [] } = useNodes();
  const { toast } = useToast();
  
  const [assignDialogOpen, setAssignDialogOpen] = React.useState(false);
  const [selectedUserId, setSelectedUserId] = React.useState('');
  const [selectedProcessId, setSelectedProcessId] = React.useState('');
  const [selectedNodeId, setSelectedNodeId] = React.useState('');
  const [selectedRole, setSelectedRole] = React.useState<'admin' | 'operator'>('operator');
  const [assignmentType, setAssignmentType] = React.useState<'process' | 'node'>('process');
  
  const assignPermission = useAssignPermission();
  const revokePermission = useRevokePermission();
  
  // Get nodes for selected process
  const nodesForProcess = React.useMemo(() => {
    if (!selectedProcessId) return [];
    return allNodes.filter(n => n.processId === selectedProcessId);
  }, [selectedProcessId, allNodes]);
  
  // Filter out current user from assignable users
  const assignableUsers = allUsers.filter(u => u.id !== currentUser?.id);
  
  const handleAssignPermission = async () => {
    if (!selectedUserId || !selectedRole) {
      toast({ title: 'Error', description: 'Please select a user and role', variant: 'destructive' });
      return;
    }
    
    if (assignmentType === 'process' && !selectedProcessId) {
      toast({ title: 'Error', description: 'Please select a process', variant: 'destructive' });
      return;
    }
    
    if (assignmentType === 'node' && !selectedNodeId) {
      toast({ title: 'Error', description: 'Please select a node', variant: 'destructive' });
      return;
    }
    
    try {
      if (assignmentType === 'process') {
        // Assign to process (backend will handle node assignments)
        await assignPermission.mutateAsync({
          userId: selectedUserId,
          processId: selectedProcessId,
          role: selectedRole,
        });
      } else {
        // Assign to specific node
        await assignPermission.mutateAsync({
          userId: selectedUserId,
          nodeId: selectedNodeId,
          processId: selectedProcessId,
          role: selectedRole,
        });
      }
      
      toast({ title: 'Permission assigned', description: 'The user now has access to the selected resource.' });
      setAssignDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to assign permission', variant: 'destructive' });
    }
  };
  
  const resetForm = () => {
    setSelectedUserId('');
    setSelectedProcessId('');
    setSelectedNodeId('');
    setSelectedRole('operator');
    setAssignmentType('process');
  };
  
  const handleRevokePermission = async (permissionId: string) => {
    try {
      await revokePermission.mutateAsync(permissionId);
      toast({ title: 'Permission revoked', description: 'Access has been removed.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to revoke permission', variant: 'destructive' });
    }
  };
  
  if (ownedProcesses.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>You don't own any processes yet.</p>
        <p className="text-sm">Create a process to start managing user access.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">
          Assign access to processes and nodes you own. Admin role grants full control, Operator role allows starting/stopping downtime events.
        </p>
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-assign-permission">
              <UserPlus className="h-4 w-4 mr-2" /> Assign Access
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign User Access</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>User</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger data-testid="select-user">
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableUsers.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.email} {user.firstName && `(${user.firstName} ${user.lastName || ''})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Assignment Type</Label>
                <Select value={assignmentType} onValueChange={(v) => {
                  setAssignmentType(v as 'process' | 'node');
                  setSelectedNodeId('');
                }}>
                  <SelectTrigger data-testid="select-assignment-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="process">Entire Process</SelectItem>
                    <SelectItem value="node">Specific Node</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Process</Label>
                <Select value={selectedProcessId} onValueChange={(v) => {
                  setSelectedProcessId(v);
                  setSelectedNodeId('');
                }}>
                  <SelectTrigger data-testid="select-process">
                    <SelectValue placeholder="Select a process" />
                  </SelectTrigger>
                  <SelectContent>
                    {ownedProcesses.map(proc => (
                      <SelectItem key={proc.id} value={proc.id}>{proc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {assignmentType === 'node' && selectedProcessId && (
                <div className="space-y-2">
                  <Label>Node</Label>
                  <Select value={selectedNodeId} onValueChange={setSelectedNodeId}>
                    <SelectTrigger data-testid="select-node">
                      <SelectValue placeholder="Select a node" />
                    </SelectTrigger>
                    <SelectContent>
                      {nodesForProcess.map(node => (
                        <SelectItem key={node.id} value={node.id}>{node.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as 'admin' | 'operator')}>
                  <SelectTrigger data-testid="select-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin - Full control</SelectItem>
                    <SelectItem value="operator">Operator - Start/Stop downtime</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleAssignPermission} 
                disabled={assignPermission.isPending}
                data-testid="button-confirm-assign"
              >
                {assignPermission.isPending ? 'Assigning...' : 'Assign Access'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Show permissions per owned process */}
      <div className="space-y-4">
        {ownedProcesses.map(process => (
          <ProcessPermissionsCard 
            key={process.id} 
            process={process} 
            onRevoke={handleRevokePermission}
            isRevoking={revokePermission.isPending}
          />
        ))}
      </div>
    </div>
  );
}

function ProcessPermissionsCard({ 
  process, 
  onRevoke,
  isRevoking 
}: { 
  process: any; 
  onRevoke: (id: string) => void;
  isRevoking: boolean;
}) {
  const { data: permissions = [] } = useProcessPermissions(process.id);
  const { data: allNodes = [] } = useNodes();
  
  const processNodes = allNodes.filter(n => n.processId === process.id);
  
  if (permissions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader className="py-4">
          <CardTitle className="text-base">{process.name}</CardTitle>
          <CardDescription>No users assigned to this process</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="py-4">
        <CardTitle className="text-base">{process.name}</CardTitle>
        <CardDescription>{permissions.length} user(s) with access</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissions.map((perm: any) => {
              const node = perm.nodeId ? processNodes.find(n => n.id === perm.nodeId) : null;
              return (
                <TableRow key={perm.id}>
                  <TableCell>{perm.user?.email || 'Unknown'}</TableCell>
                  <TableCell>
                    {perm.nodeId ? (
                      <span className="text-muted-foreground">Node: {node?.name || 'Unknown'}</span>
                    ) : (
                      <span className="font-medium">All nodes</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      perm.role === 'admin' 
                        ? 'bg-primary/10 text-primary' 
                        : 'bg-secondary/50 text-secondary-foreground'
                    }`}>
                      {perm.role.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 hover:text-destructive"
                      onClick={() => onRevoke(perm.id)}
                      disabled={isRevoking}
                      data-testid={`button-revoke-${perm.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const { data: ownedProcesses = [] } = useMyOwnedProcesses();
  const { data: allNodes = [] } = useNodes();
  const createProcess = useCreateProcess();
  const createNode = useCreateNode();
  const { toast } = useToast();
  
  // Filter nodes to only show those belonging to owned processes
  const ownedProcessIds = new Set(ownedProcesses.map(p => p.id));
  const ownedNodes = allNodes.filter(n => ownedProcessIds.has(n.processId));
  
  const [newProcessOpen, setNewProcessOpen] = React.useState(false);
  const [newNodeOpen, setNewNodeOpen] = React.useState(false);
  
  // Form State
  const [procName, setProcName] = React.useState('');
  const [procDesc, setProcDesc] = React.useState('');
  const [nodeName, setNodeName] = React.useState('');
  const [nodeProcId, setNodeProcId] = React.useState('');

  const handleAddProcess = () => {
    createProcess.mutate(
      { name: procName, description: procDesc },
      {
        onSuccess: () => {
          toast({ title: 'Success', description: 'Process created successfully' });
          setProcName('');
          setProcDesc('');
          setNewProcessOpen(false);
        },
        onError: () => {
          toast({ title: 'Error', description: 'Failed to create process', variant: 'destructive' });
        },
      }
    );
  };

  const handleAddNode = () => {
    createNode.mutate(
      { name: nodeName, processId: nodeProcId },
      {
        onSuccess: () => {
          toast({ title: 'Success', description: 'Node created successfully' });
          setNodeName('');
          setNodeProcId('');
          setNewNodeOpen(false);
        },
        onError: () => {
          toast({ title: 'Error', description: 'Failed to create node', variant: 'destructive' });
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">System Administration</h1>
        <p className="text-muted-foreground">Manage factory configuration, processes, equipment nodes, and user access.</p>
      </div>

      {/* Process Management */}
      <CollapsibleSection
        title="Processes"
        description="Production lines and workflows"
        icon={Settings2}
        headerAction={
          <Dialog open={newProcessOpen} onOpenChange={setNewProcessOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-process">
                <Plus className="h-4 w-4 mr-2" /> Add Process
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Process</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Process Name</Label>
                  <Input 
                    value={procName} 
                    onChange={e => setProcName(e.target.value)} 
                    placeholder="e.g. Assembly Line B"
                    data-testid="input-process-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input 
                    value={procDesc} 
                    onChange={e => setProcDesc(e.target.value)} 
                    placeholder="e.g. Secondary assembly unit"
                    data-testid="input-process-description"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddProcess} data-testid="button-create-process">Create Process</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ownedProcesses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No processes you own. Create a new process to get started.
                </TableCell>
              </TableRow>
            ) : (
              ownedProcesses.map(p => (
                <TableRow key={p.id} data-testid={`row-process-${p.id}`}>
                  <TableCell className="font-mono text-xs">{p.id.substring(0, 8)}...</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.description || '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CollapsibleSection>

      {/* Node Management */}
      <CollapsibleSection
        title="Nodes"
        description="Individual machines and stations"
        icon={Settings2}
        headerAction={
          <Dialog open={newNodeOpen} onOpenChange={setNewNodeOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-add-node">
                <Plus className="h-4 w-4 mr-2" /> Add Node
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Node</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Node Name</Label>
                  <Input 
                    value={nodeName} 
                    onChange={e => setNodeName(e.target.value)} 
                    placeholder="e.g. CNC Machine 04"
                    data-testid="input-node-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Parent Process</Label>
                  <Select value={nodeProcId} onValueChange={setNodeProcId}>
                    <SelectTrigger data-testid="select-node-process">
                      <SelectValue placeholder="Select a process" />
                    </SelectTrigger>
                    <SelectContent>
                      {ownedProcesses.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddNode} disabled={!nodeName || !nodeProcId} data-testid="button-create-node">
                  Add Node
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Parent Process</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ownedNodes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No nodes in your processes. Add nodes to track equipment.
                </TableCell>
              </TableRow>
            ) : (
              ownedNodes.map(n => {
                const process = ownedProcesses.find(p => p.id === n.processId);
                return (
                  <TableRow key={n.id} data-testid={`row-node-${n.id}`}>
                    <TableCell className="font-mono text-xs">{n.id.substring(0, 8)}...</TableCell>
                    <TableCell className="font-medium">{n.name}</TableCell>
                    <TableCell>{process?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        n.status === 'down' 
                          ? 'bg-destructive/10 text-destructive' 
                          : 'bg-success/10 text-success'
                      }`}>
                        {n.status.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CollapsibleSection>

      {/* Authorization Management */}
      <CollapsibleSection
        title="Authorization"
        description="Manage user access to processes and nodes"
        icon={Users}
        defaultOpen={true}
      >
        <AuthorizationSection />
      </CollapsibleSection>
    </div>
  );
}

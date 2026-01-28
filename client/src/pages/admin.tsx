import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Settings2, ChevronDown, ChevronRight, Users, Shield, UserPlus, Pencil, AlertTriangle, ListChecks } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useCurrentUser, useProcesses, useNodes, useAllUsers, useMyOwnedProcesses, useAssignPermission, useRevokePermission, useProcessPermissions, useCreateProcess, useCreateNode, useUpdateProcess, useDeleteProcess, useUpdateNode, useDeleteNode, useDowntimeReasonsByProcess, useCreateDowntimeReason, useUpdateDowntimeReason, useDeleteDowntimeReason } from '@/lib/queries';
import type { DowntimeReason } from '@shared/schema';
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
                      perm.role === 'owner' 
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : perm.role === 'admin' 
                          ? 'bg-primary/10 text-primary' 
                          : 'bg-secondary/50 text-secondary-foreground'
                    }`}>
                      {perm.role.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {perm.role === 'owner' ? (
                      <span className="text-xs text-muted-foreground">Cannot revoke</span>
                    ) : (
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
                    )}
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

function DowntimeReasonsSection() {
  const { data: ownedProcesses = [] } = useMyOwnedProcesses();
  const [selectedProcessId, setSelectedProcessId] = React.useState('');
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [editingReason, setEditingReason] = React.useState<DowntimeReason | null>(null);
  
  const [reasonLabel, setReasonLabel] = React.useState('');
  
  const { data: reasons = [] } = useDowntimeReasonsByProcess(selectedProcessId, true);
  const createReason = useCreateDowntimeReason();
  const updateReason = useUpdateDowntimeReason();
  const deleteReason = useDeleteDowntimeReason();
  const { toast } = useToast();
  
  React.useEffect(() => {
    if (ownedProcesses.length > 0 && !selectedProcessId) {
      setSelectedProcessId(ownedProcesses[0].id);
    }
  }, [ownedProcesses, selectedProcessId]);
  
  const handleAddReason = () => {
    if (!reasonLabel.trim()) {
      toast({ title: 'Error', description: 'Please enter a reason label', variant: 'destructive' });
      return;
    }
    
    createReason.mutate(
      { processId: selectedProcessId, data: { label: reasonLabel, isActive: true } },
      {
        onSuccess: () => {
          toast({ title: 'Success', description: 'Downtime reason created' });
          setReasonLabel('');
          setAddDialogOpen(false);
        },
        onError: () => {
          toast({ title: 'Error', description: 'Failed to create reason', variant: 'destructive' });
        },
      }
    );
  };
  
  const handleEditReason = (reason: DowntimeReason) => {
    setEditingReason(reason);
    setReasonLabel(reason.label);
    setEditDialogOpen(true);
  };
  
  const handleUpdateReason = () => {
    if (!editingReason || !reasonLabel.trim()) return;
    
    updateReason.mutate(
      { id: editingReason.id, processId: selectedProcessId, data: { label: reasonLabel } },
      {
        onSuccess: () => {
          toast({ title: 'Success', description: 'Reason updated' });
          setEditDialogOpen(false);
          setEditingReason(null);
          setReasonLabel('');
        },
        onError: () => {
          toast({ title: 'Error', description: 'Failed to update reason', variant: 'destructive' });
        },
      }
    );
  };
  
  const handleToggleActive = (reason: DowntimeReason) => {
    updateReason.mutate(
      { id: reason.id, processId: selectedProcessId, data: { isActive: !reason.isActive } },
      {
        onSuccess: () => {
          toast({ title: 'Success', description: reason.isActive ? 'Reason disabled' : 'Reason enabled' });
        },
        onError: () => {
          toast({ title: 'Error', description: 'Failed to update reason', variant: 'destructive' });
        },
      }
    );
  };
  
  const handleDeleteReason = (reason: DowntimeReason) => {
    deleteReason.mutate(
      { id: reason.id, processId: selectedProcessId },
      {
        onSuccess: () => {
          toast({ title: 'Success', description: 'Reason deleted' });
        },
        onError: () => {
          toast({ title: 'Error', description: 'Failed to delete reason', variant: 'destructive' });
        },
      }
    );
  };
  
  if (ownedProcesses.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
        <p>You need to own a process to manage downtime reasons.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Label>Select Process:</Label>
          <Select value={selectedProcessId} onValueChange={setSelectedProcessId}>
            <SelectTrigger className="w-[250px]" data-testid="select-process-for-reasons">
              <SelectValue placeholder="Select a process" />
            </SelectTrigger>
            <SelectContent>
              {ownedProcesses.map(proc => (
                <SelectItem key={proc.id} value={proc.id}>{proc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-reason">
              <Plus className="h-4 w-4 mr-2" />
              Add Reason
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Downtime Reason</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Reason Label</Label>
                <Input
                  value={reasonLabel}
                  onChange={e => setReasonLabel(e.target.value)}
                  placeholder="e.g. Motor Failure"
                  data-testid="input-reason-label"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddReason} data-testid="button-submit-reason">Add Reason</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {reasons.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          <ListChecks className="h-8 w-8 mx-auto mb-2" />
          <p>No downtime reasons configured for this process.</p>
          <p className="text-sm">Add reasons that operators can select when stopping a machine.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reasons.map(reason => (
              <TableRow key={reason.id} className={!reason.isActive ? 'opacity-50' : ''} data-testid={`row-reason-${reason.id}`}>
                <TableCell className="font-medium">{reason.label}</TableCell>
                <TableCell>
                  <Badge variant={reason.isActive ? 'default' : 'secondary'}>
                    {reason.isActive ? 'Active' : 'Disabled'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleEditReason(reason)}
                      data-testid={`button-edit-reason-${reason.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleToggleActive(reason)}
                      data-testid={`button-toggle-reason-${reason.id}`}
                    >
                      {reason.isActive ? '🔴' : '🟢'}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive" data-testid={`button-delete-reason-${reason.id}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Reason</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{reason.label}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteReason(reason)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Downtime Reason</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason Label</Label>
              <Input
                value={reasonLabel}
                onChange={e => setReasonLabel(e.target.value)}
                placeholder="e.g. Motor Failure"
                data-testid="input-edit-reason-label"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateReason} data-testid="button-update-reason">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminPage() {
  const { data: ownedProcesses = [] } = useMyOwnedProcesses();
  const { data: allNodes = [] } = useNodes();
  const createProcess = useCreateProcess();
  const createNode = useCreateNode();
  const updateProcess = useUpdateProcess();
  const deleteProcess = useDeleteProcess();
  const updateNode = useUpdateNode();
  const deleteNode = useDeleteNode();
  const { toast } = useToast();
  
  // Filter nodes to only show those belonging to owned processes
  const ownedProcessIds = new Set(ownedProcesses.map(p => p.id));
  const ownedNodes = allNodes.filter(n => ownedProcessIds.has(n.processId));
  
  const [newProcessOpen, setNewProcessOpen] = React.useState(false);
  const [newNodeOpen, setNewNodeOpen] = React.useState(false);
  const [editProcessOpen, setEditProcessOpen] = React.useState(false);
  const [editNodeOpen, setEditNodeOpen] = React.useState(false);
  
  // Form State
  const [procName, setProcName] = React.useState('');
  const [procDesc, setProcDesc] = React.useState('');
  const [nodeName, setNodeName] = React.useState('');
  const [nodeProcId, setNodeProcId] = React.useState('');
  
  // Edit state
  const [editingProcessId, setEditingProcessId] = React.useState('');
  const [editingNodeId, setEditingNodeId] = React.useState('');

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
  
  const handleEditProcess = (process: { id: string; name: string; description?: string | null }) => {
    setEditingProcessId(process.id);
    setProcName(process.name);
    setProcDesc(process.description || '');
    setEditProcessOpen(true);
  };
  
  const handleUpdateProcess = () => {
    updateProcess.mutate(
      { id: editingProcessId, data: { name: procName, description: procDesc } },
      {
        onSuccess: () => {
          toast({ title: 'Success', description: 'Process updated successfully' });
          setProcName('');
          setProcDesc('');
          setEditingProcessId('');
          setEditProcessOpen(false);
        },
        onError: () => {
          toast({ title: 'Error', description: 'Failed to update process', variant: 'destructive' });
        },
      }
    );
  };
  
  const handleDeleteProcess = (processId: string) => {
    deleteProcess.mutate(processId, {
      onSuccess: () => {
        toast({ title: 'Success', description: 'Process deleted successfully' });
      },
      onError: () => {
        toast({ title: 'Error', description: 'Failed to delete process', variant: 'destructive' });
      },
    });
  };
  
  const handleEditNode = (node: { id: string; name: string; processId: string }) => {
    setEditingNodeId(node.id);
    setNodeName(node.name);
    setNodeProcId(node.processId);
    setEditNodeOpen(true);
  };
  
  const handleUpdateNode = () => {
    updateNode.mutate(
      { id: editingNodeId, data: { name: nodeName } },
      {
        onSuccess: () => {
          toast({ title: 'Success', description: 'Node updated successfully' });
          setNodeName('');
          setNodeProcId('');
          setEditingNodeId('');
          setEditNodeOpen(false);
        },
        onError: () => {
          toast({ title: 'Error', description: 'Failed to update node', variant: 'destructive' });
        },
      }
    );
  };
  
  const handleDeleteNode = (nodeId: string) => {
    deleteNode.mutate(nodeId, {
      onSuccess: () => {
        toast({ title: 'Success', description: 'Node deleted successfully' });
      },
      onError: () => {
        toast({ title: 'Error', description: 'Failed to delete node', variant: 'destructive' });
      },
    });
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
                  <TableCell className="text-right space-x-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8" 
                      onClick={() => handleEditProcess(p)}
                      data-testid={`button-edit-process-${p.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 hover:text-destructive"
                          data-testid={`button-delete-process-${p.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Process</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{p.name}"? This will also remove all associated nodes and their downtime history. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteProcess(p.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
                    <TableCell className="text-right space-x-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8" 
                        onClick={() => handleEditNode(n)}
                        data-testid={`button-edit-node-${n.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 hover:text-destructive"
                            data-testid={`button-delete-node-${n.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Node</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{n.name}"? This will also remove all associated downtime events. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteNode(n.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
      
      {/* Downtime Reasons Management */}
      <CollapsibleSection
        title="Downtime Reasons"
        description="Configure the reasons operators can select when logging downtime"
        icon={ListChecks}
        defaultOpen={false}
      >
        <DowntimeReasonsSection />
      </CollapsibleSection>
      
      {/* Edit Process Dialog */}
      <Dialog open={editProcessOpen} onOpenChange={setEditProcessOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Process</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Process Name</Label>
              <Input 
                value={procName} 
                onChange={e => setProcName(e.target.value)} 
                placeholder="e.g. Assembly Line B"
                data-testid="input-edit-process-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input 
                value={procDesc} 
                onChange={e => setProcDesc(e.target.value)} 
                placeholder="e.g. Secondary assembly unit"
                data-testid="input-edit-process-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProcessOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateProcess} data-testid="button-update-process">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Node Dialog */}
      <Dialog open={editNodeOpen} onOpenChange={setEditNodeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Node</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Node Name</Label>
              <Input 
                value={nodeName} 
                onChange={e => setNodeName(e.target.value)} 
                placeholder="e.g. CNC Machine 04"
                data-testid="input-edit-node-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditNodeOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateNode} data-testid="button-update-node">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

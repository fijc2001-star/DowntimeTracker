import React from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Settings2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdminPage() {
  const { processes, nodes, addProcess, addNode } = useAppStore();
  const [newProcessOpen, setNewProcessOpen] = React.useState(false);
  const [newNodeOpen, setNewNodeOpen] = React.useState(false);
  
  // Form State
  const [procName, setProcName] = React.useState('');
  const [procDesc, setProcDesc] = React.useState('');
  const [nodeName, setNodeName] = React.useState('');
  const [nodeProcId, setNodeProcId] = React.useState('');

  const handleAddProcess = () => {
    addProcess({ name: procName, description: procDesc });
    setProcName('');
    setProcDesc('');
    setNewProcessOpen(false);
  };

  const handleAddNode = () => {
    addNode({ name: nodeName, processId: nodeProcId });
    setNodeName('');
    setNodeProcId('');
    setNewNodeOpen(false);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold">System Administration</h1>
        <p className="text-muted-foreground">Manage factory configuration, processes, and equipment nodes.</p>
      </div>

      {/* Process Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Processes</CardTitle>
            <CardDescription>Production lines and workflows</CardDescription>
          </div>
          <Dialog open={newProcessOpen} onOpenChange={setNewProcessOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Add Process</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Process</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Process Name</Label>
                  <Input value={procName} onChange={e => setProcName(e.target.value)} placeholder="e.g. Assembly Line B" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={procDesc} onChange={e => setProcDesc(e.target.value)} placeholder="e.g. Secondary assembly unit" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddProcess}>Create Process</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
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
              {processes.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.id}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.description}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Settings2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Node Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Nodes</CardTitle>
            <CardDescription>Individual machines and stations</CardDescription>
          </div>
          <Dialog open={newNodeOpen} onOpenChange={setNewNodeOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Plus className="h-4 w-4 mr-2" /> Add Node</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Node</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Node Name</Label>
                  <Input value={nodeName} onChange={e => setNodeName(e.target.value)} placeholder="e.g. CNC Machine 04" />
                </div>
                <div className="space-y-2">
                  <Label>Parent Process</Label>
                  <Select value={nodeProcId} onValueChange={setNodeProcId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a process" />
                    </SelectTrigger>
                    <SelectContent>
                      {processes.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddNode} disabled={!nodeName || !nodeProcId}>Add Node</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
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
              {nodes.map(n => {
                const process = processes.find(p => p.id === n.processId);
                return (
                  <TableRow key={n.id}>
                    <TableCell className="font-mono text-xs">{n.id}</TableCell>
                    <TableCell className="font-medium">{n.name}</TableCell>
                    <TableCell>{process?.name || 'Orphaned'}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${n.status === 'down' ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>
                        {n.status.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

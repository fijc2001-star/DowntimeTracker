import React from 'react';
import { useProcesses, useNodes, useDowntimeReasonsByProcess, useUptimeReasonsByProcess, useStartDowntime, useStopDowntime } from '@/lib/queries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Factory, Cog, Play, Square, AlertOctagon, Timer, Loader2, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { Node, DowntimeEvent } from '@shared/schema';

type NodeWithStatus = Node & { userRole: 'owner' | 'admin' | 'operator'; status: 'running' | 'down'; activeEvent: DowntimeEvent | null };

function getRoleBadgeVariant(role: string) {
  switch (role) {
    case 'owner': return 'default';
    case 'admin': return 'secondary';
    case 'operator': return 'outline';
    default: return 'outline';
  }
}

function getRoleLabel(role: string) {
  switch (role) {
    case 'owner': return 'Owner';
    case 'admin': return 'Admin';
    case 'operator': return 'Operator';
    default: return role;
  }
}

function NodeOperationalPanel({ 
  node, 
  processId,
  onBack
}: { 
  node: NodeWithStatus;
  processId: string;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const { data: reasons = [] } = useDowntimeReasonsByProcess(processId);
  const { data: uptimeReasons = [] } = useUptimeReasonsByProcess(processId);
  const startDowntime = useStartDowntime();
  const stopDowntime = useStopDowntime();
  
  const [stopDialogOpen, setStopDialogOpen] = React.useState(false);
  const [startDialogOpen, setStartDialogOpen] = React.useState(false);
  const [selectedReason, setSelectedReason] = React.useState<string>('');
  const [selectedUptimeReason, setSelectedUptimeReason] = React.useState<string>('');
  
  const isDown = node.status === 'down';
  const activeEvent = node.activeEvent;

  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    if (!isDown) return;
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isDown]);

  const handleStopWithReason = async () => {
    if (!selectedReason) return;
    try {
      await startDowntime.mutateAsync({ nodeId: node.id, reasonId: selectedReason });
      toast({
        title: 'Downtime Started',
        description: `${node.name} is now marked as down.`,
      });
      setStopDialogOpen(false);
      setSelectedReason('');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start downtime',
        variant: 'destructive',
      });
    }
  };

  const handleResumeClick = () => {
    if (uptimeReasons.length > 0) {
      setStartDialogOpen(true);
    } else {
      handleResume();
    }
  };

  const handleResume = async (uptimeReasonId?: string) => {
    try {
      await stopDowntime.mutateAsync({ nodeId: node.id, uptimeReasonId });
      setStartDialogOpen(false);
      setSelectedUptimeReason('');
      toast({
        title: 'Production Resumed',
        description: `${node.name} is now running.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to resume production',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Button 
        variant="ghost" 
        className="gap-2 text-muted-foreground hover:text-foreground"
        onClick={onBack}
        data-testid="button-back"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <Card className="border-2 shadow-xl overflow-hidden">
        <div className={`h-2 w-full ${isDown ? 'bg-destructive animate-pulse' : 'bg-success'}`} />
        <CardHeader className="text-center pb-4 pt-8">
          <CardTitle className="text-4xl font-display uppercase tracking-wider" data-testid="text-node-name">{node.name}</CardTitle>
          <CardDescription className="flex items-center justify-center gap-2 mt-2">
            <Badge variant={getRoleBadgeVariant(node.userRole)} data-testid="badge-node-role">
              {getRoleLabel(node.userRole)}
            </Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-8 pb-12">
          <div className="text-center space-y-4">
            <div className={`inline-flex items-center gap-3 px-8 py-4 rounded-full text-xl font-bold border ${isDown ? 'bg-destructive/20 text-destructive border-destructive/30' : 'bg-success/20 text-success border-success/30'}`} data-testid="status-badge">
              {isDown ? (
                <><AlertOctagon className="h-6 w-6" /> STOPPED</>
              ) : (
                <><Timer className="h-6 w-6" /> RUNNING</>
              )}
            </div>
            
            {isDown && activeEvent && (
              <div className="text-5xl font-mono font-bold text-destructive mt-6 tabular-nums" data-testid="text-downtime-duration">
                {formatDistanceToNow(new Date(activeEvent.startTime))}
              </div>
            )}
          </div>

          <div className="flex gap-4 w-full max-w-lg">
            {isDown ? (
              <Button 
                size="lg" 
                className="flex-1 h-24 text-2xl font-bold bg-success hover:bg-success/90 text-white shadow-lg transition-all hover:scale-[1.02]"
                onClick={handleResumeClick}
                disabled={stopDowntime.isPending}
                data-testid="button-start"
              >
                {stopDowntime.isPending ? (
                  <Loader2 className="h-8 w-8 mr-3 animate-spin" />
                ) : (
                  <Play className="h-8 w-8 mr-3 fill-current" />
                )}
                START
              </Button>
            ) : (
              <Button 
                size="lg" 
                variant="destructive"
                className="flex-1 h-24 text-2xl font-bold shadow-lg transition-all hover:scale-[1.02]"
                onClick={() => setStopDialogOpen(true)}
                disabled={startDowntime.isPending}
                data-testid="button-stop"
              >
                {startDowntime.isPending ? (
                  <Loader2 className="h-8 w-8 mr-3 animate-spin" />
                ) : (
                  <Square className="h-8 w-8 mr-3 fill-current" />
                )}
                STOP
              </Button>
            )}
          </div>
        </CardContent>

        <Dialog open={stopDialogOpen} onOpenChange={setStopDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Stop Production</DialogTitle>
              <DialogDescription>
                Select the reason for stopping this machine.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Select value={selectedReason} onValueChange={setSelectedReason}>
                <SelectTrigger data-testid="select-reason">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {reasons.map(reason => (
                    <SelectItem key={reason.id} value={reason.id} data-testid={`option-reason-${reason.id}`}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStopDialogOpen(false)} data-testid="button-cancel">
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleStopWithReason} 
                disabled={!selectedReason || startDowntime.isPending}
                data-testid="button-confirm-stop"
              >
                {startDowntime.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Stop Production
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={startDialogOpen} onOpenChange={(open) => { setStartDialogOpen(open); if (!open) setSelectedUptimeReason(''); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resume Production</DialogTitle>
              <DialogDescription>
                Select the reason for restarting this machine.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Select value={selectedUptimeReason} onValueChange={setSelectedUptimeReason}>
                <SelectTrigger data-testid="select-uptime-reason">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {uptimeReasons.map(reason => (
                    <SelectItem key={reason.id} value={reason.id} data-testid={`option-uptime-reason-${reason.id}`}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStartDialogOpen(false)} data-testid="button-cancel-start">
                Cancel
              </Button>
              <Button
                className="bg-success hover:bg-success/90 text-white"
                onClick={() => handleResume(selectedUptimeReason || undefined)}
                disabled={!selectedUptimeReason || stopDowntime.isPending}
                data-testid="button-confirm-start"
              >
                {stopDowntime.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Resume Production
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  );
}

function ProcessTreeItem({ 
  process, 
  nodes,
  selectedNodeId,
  onSelectNode,
}: { 
  process: { id: string; name: string; description: string | null; userRole: 'owner' | 'admin' | 'operator' };
  nodes: NodeWithStatus[];
  selectedNodeId: string | null;
  onSelectNode: (node: NodeWithStatus | null) => void;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const processNodes = nodes.filter(n => n.processId === process.id && n.isActive);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border shadow-sm" data-testid={`card-process-${process.id}`}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                <Factory className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-lg" data-testid={`text-process-name-${process.id}`}>{process.name}</CardTitle>
                  {process.description && (
                    <CardDescription className="mt-1">{process.description}</CardDescription>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getRoleBadgeVariant(process.userRole)} data-testid={`badge-role-${process.id}`}>
                  {getRoleLabel(process.userRole)}
                </Badge>
                <Badge variant="outline" className="ml-2">
                  {processNodes.length} node{processNodes.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">
            {processNodes.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground border rounded-lg bg-muted/20">
                No nodes configured for this process.
              </div>
            ) : (
              <div className="space-y-2 pl-8">
                {processNodes.map(node => {
                  const isSelected = selectedNodeId === node.id;
                  const isDown = node.status === 'down';
                  
                  return (
                    <div
                      key={node.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                          : 'hover:border-primary/50 hover:bg-muted/50'
                      }`}
                      onClick={() => onSelectNode(isSelected ? null : node)}
                      data-testid={`node-item-${node.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <Cog className={`h-4 w-4 ${isDown ? 'text-destructive' : 'text-muted-foreground'}`} />
                        <span className="font-medium" data-testid={`text-node-name-${node.id}`}>{node.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${isDown ? 'bg-destructive animate-pulse' : 'bg-success'}`} data-testid={`status-indicator-${node.id}`} />
                        <span className={`text-sm font-medium ${isDown ? 'text-destructive' : 'text-success'}`}>
                          {isDown ? 'Down' : 'Running'}
                        </span>
                        <Badge variant={getRoleBadgeVariant(node.userRole)} className="ml-2" data-testid={`badge-node-role-${node.id}`}>
                          {getRoleLabel(node.userRole)}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function ProcessesPage() {
  const { data: processes = [], isLoading: processesLoading } = useProcesses();
  const { data: nodes = [], isLoading: nodesLoading } = useNodes();
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);

  const isLoading = processesLoading || nodesLoading;

  const activeProcesses = processes.filter(p => p.isActive);
  
  const selectedNode = selectedNodeId 
    ? (nodes as NodeWithStatus[]).find(n => n.id === selectedNodeId) || null 
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (selectedNode) {
    return (
      <NodeOperationalPanel
        node={selectedNode}
        processId={selectedNode.processId}
        onBack={() => setSelectedNodeId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-display font-bold text-foreground">Operations</h2>
        <p className="text-muted-foreground">View all processes and nodes you have access to.</p>
      </div>

      <div className="space-y-4">
        {activeProcesses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Factory className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No Processes Available</p>
              <p className="text-sm mt-1">You don't have access to any processes yet.</p>
            </CardContent>
          </Card>
        ) : (
          activeProcesses.map(process => (
            <ProcessTreeItem
              key={process.id}
              process={process as any}
              nodes={nodes as NodeWithStatus[]}
              selectedNodeId={selectedNodeId}
              onSelectNode={(node) => setSelectedNodeId(node ? node.id : null)}
            />
          ))
        )}
      </div>
    </div>
  );
}

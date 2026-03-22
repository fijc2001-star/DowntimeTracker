import React from 'react';
import { useRoute, useLocation } from 'wouter';
import { useNode, useProcess, useDowntimeEvents, useDowntimeReasonsByProcess, useUptimeReasonsByProcess, useStartDowntime, useStopDowntime } from '@/lib/queries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Play, Square, Timer, AlertOctagon, History, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function NodeView() {
  const [, params] = useRoute('/node/:id');
  const nodeId = params?.id || '';
  const { toast } = useToast();
  
  const { data: node, isLoading: nodeLoading } = useNode(nodeId);
  const { data: process } = useProcess(node?.processId || '');
  const { data: reasons = [] } = useDowntimeReasonsByProcess(node?.processId || '');
  const { data: uptimeReasons = [] } = useUptimeReasonsByProcess(node?.processId || '');
  const { data: events = [] } = useDowntimeEvents({ nodeId });
  
  const startDowntime = useStartDowntime();
  const stopDowntime = useStopDowntime();
  
  const [stopDialogOpen, setStopDialogOpen] = React.useState(false);
  const [startDialogOpen, setStartDialogOpen] = React.useState(false);
  const [selectedReason, setSelectedReason] = React.useState<string>('');
  const [selectedUptimeReason, setSelectedUptimeReason] = React.useState<string>('');
  
  if (nodeLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!node) {
    return <div className="text-center py-12 text-muted-foreground">Node not found</div>;
  }
  
  const activeEvent = node.activeEvent;
  const isDown = node.status === 'down';

  // Tick for timer update
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
      setStopDialogOpen(false);
      setSelectedReason('');
      toast({
        title: 'Downtime Started',
        description: `${node.name} is now marked as down.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start downtime',
        variant: 'destructive',
      });
    }
  };

  const handleStopClick = () => {
    if (reasons.length === 0) {
      toast({
        title: 'Cannot Stop Production',
        description: 'No downtime reasons are configured for this process. Ask an admin to add at least one before stopping.',
        variant: 'destructive',
      });
      return;
    }
    setStopDialogOpen(true);
  };

  const handleResumeClick = () => {
    if (uptimeReasons.length === 0) {
      toast({
        title: 'Cannot Resume Production',
        description: 'No uptime reasons are configured for this process. Ask an admin to add at least one before resuming.',
        variant: 'destructive',
      });
      return;
    }
    setStartDialogOpen(true);
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

  const recentEvents = events
    .filter(e => e.endTime)
    .sort((a, b) => new Date(b.endTime!).getTime() - new Date(a.endTime!).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/process/${process?.id}`}>{process?.name}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{node.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Operator Control Panel */}
      <Card className="border-2 shadow-xl overflow-hidden">
        <div className={`h-2 w-full ${isDown ? 'bg-destructive animate-pulse' : 'bg-success'}`} />
        <CardHeader className="text-center pb-8 pt-8">
          <CardTitle className="text-4xl font-display uppercase tracking-wider" data-testid="text-node-name">{node.name}</CardTitle>
          <CardDescription className="text-lg font-mono">ID: {node.id}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-8 pb-12">
          
          {/* Status Display */}
          <div className="text-center space-y-2">
            <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-full text-xl font-bold border ${isDown ? 'bg-destructive/20 text-destructive border-destructive/30' : 'bg-success/20 text-success border-success/30'}`} data-testid="status-badge">
              {isDown ? (
                <><AlertOctagon className="h-6 w-6" /> PRODUCTION STOPPED</>
              ) : (
                <><Timer className="h-6 w-6" /> RUNNING</>
              )}
            </div>
            
            {isDown && activeEvent && (
              <div className="text-5xl font-mono font-bold text-destructive mt-4 tabular-nums" data-testid="text-downtime-duration">
                {formatDistanceToNow(new Date(activeEvent.startTime))}
              </div>
            )}
          </div>

          {/* Big Buttons */}
          <div className="flex gap-6 w-full max-w-lg">
             {isDown ? (
               <Button 
                 size="lg" 
                 className="flex-1 h-32 text-2xl font-bold bg-success hover:bg-success/90 text-white shadow-[0_0_30px_hsl(var(--success)/0.3)] transition-all hover:scale-[1.02]"
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
                 className="flex-1 h-32 text-2xl font-bold shadow-[0_0_30px_hsl(var(--destructive)/0.3)] transition-all hover:scale-[1.02]"
                 onClick={handleStopClick}
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
      </Card>

      {/* Recent History */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Recent Downtime Events</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentEvents.length === 0 ? (
              <p className="text-muted-foreground text-sm italic">No recent history.</p>
            ) : (
              recentEvents.map(event => {
                const reason = reasons.find(r => r.id === event.reasonId);
                const duration = event.endTime ? formatDistanceToNow(new Date(event.startTime), { addSuffix: false }) : 'Ongoing';
                
                return (
                  <div key={event.id} className="flex items-center justify-between p-3 rounded bg-secondary/20 border border-secondary/30" data-testid={`event-${event.id}`}>
                    <div>
                      <div className="font-medium">{reason?.label || 'Unknown Reason'}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {new Date(event.startTime).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="font-mono font-bold text-right">
                       {duration}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resume Production Dialog (only shown when uptime reasons exist) */}
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

      {/* Stop Production Dialog */}
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
    </div>
  );
}

import React from 'react';
import { useAppStore } from '@/lib/store';
import { useRoute, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Play, Square, Timer, AlertOctagon, History } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function NodeView() {
  const [, params] = useRoute('/node/:id');
  const nodeId = params?.id;
  const [, setLocation] = useLocation();
  
  const { nodes, events, reasons, processes, startDowntime, stopDowntime } = useAppStore();
  const [stopDialogOpen, setStopDialogOpen] = React.useState(false);
  const [selectedReason, setSelectedReason] = React.useState<string>('');
  
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return <div>Node not found</div>;
  
  const process = processes.find(p => p.id === node.processId);
  
  const activeEvent = events.find(e => e.nodeId === node.id && !e.endTime);
  const isDown = node.status === 'down';

  // Tick for timer update
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    if (!isDown) return;
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isDown]);

  const handleStop = () => {
    if (!selectedReason) return;
    stopDowntime(node.id, selectedReason);
    setStopDialogOpen(false);
    setSelectedReason('');
  };

  const recentEvents = events
    .filter(e => e.nodeId === node.id && e.endTime)
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
          <CardTitle className="text-4xl font-display uppercase tracking-wider">{node.name}</CardTitle>
          <CardDescription className="text-lg font-mono">ID: {node.id}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-8 pb-12">
          
          {/* Status Display */}
          <div className="text-center space-y-2">
            <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-full text-xl font-bold border ${isDown ? 'bg-destructive/20 text-destructive border-destructive/30' : 'bg-success/20 text-success border-success/30'}`}>
              {isDown ? (
                <><AlertOctagon className="h-6 w-6" /> PRODUCTION STOPPED</>
              ) : (
                <><Timer className="h-6 w-6" /> RUNNING</>
              )}
            </div>
            
            {isDown && activeEvent && (
              <div className="text-5xl font-mono font-bold text-destructive mt-4 tabular-nums">
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
                 onClick={() => setStopDialogOpen(true)}
               >
                 <Play className="h-8 w-8 mr-3 fill-current" />
                 RESUME
               </Button>
             ) : (
               <Button 
                 size="lg" 
                 variant="destructive"
                 className="flex-1 h-32 text-2xl font-bold shadow-[0_0_30px_hsl(var(--destructive)/0.3)] transition-all hover:scale-[1.02]"
                 onClick={() => startDowntime(node.id)}
               >
                 <Square className="h-8 w-8 mr-3 fill-current" />
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
                  <div key={event.id} className="flex items-center justify-between p-3 rounded bg-secondary/20 border border-secondary/30">
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

      {/* Stop Dialog */}
      <Dialog open={stopDialogOpen} onOpenChange={setStopDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Downtime Reason</DialogTitle>
            <DialogDescription>
              Select the primary cause for this downtime event before resuming production.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger className="h-12 text-lg">
                <SelectValue placeholder="Select reason..." />
              </SelectTrigger>
              <SelectContent>
                {reasons.map(reason => (
                  <SelectItem key={reason.id} value={reason.id}>
                    {reason.label} <span className="text-xs text-muted-foreground ml-2">({reason.category})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStopDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleStop} disabled={!selectedReason} className="bg-success text-white hover:bg-success/90">
              Confirm & Resume
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import React from 'react';
import { useProcesses, useNodes, useDowntimeEvents } from '@/lib/queries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ArrowRight, Factory, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

export default function Dashboard() {
  const { data: processes = [], isLoading: processesLoading } = useProcesses();
  const { data: nodes = [], isLoading: nodesLoading } = useNodes();
  const { data: events = [], isLoading: eventsLoading } = useDowntimeEvents();

  const isLoading = processesLoading || nodesLoading || eventsLoading;

  // Aggregate stats
  const activeDowntimes = events.filter(e => !e.endTime).length;
  const totalNodes = nodes.length;
  const utilization = totalNodes > 0 ? ((totalNodes - activeDowntimes) / totalNodes) * 100 : 0;

  // Chart Data: Events by status (active vs resolved)
  const statusStats = React.useMemo(() => {
    const active = events.filter(e => !e.endTime).length;
    const resolved = events.filter(e => e.endTime).length;
    return [
      { name: 'Active', value: active },
      { name: 'Resolved', value: resolved },
    ].filter(s => s.value > 0);
  }, [events]);

  // Get process status based on nodes
  const getProcessStatus = (processId: string) => {
    const processNodes = nodes.filter(n => n.processId === processId);
    if (processNodes.length === 0) return 'idle';
    const anyDown = processNodes.some(n => n.status === 'down');
    const allDown = processNodes.every(n => n.status === 'down');
    if (allDown) return 'down';
    if (anyDown) return 'partial';
    return 'running';
  };

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">Overview</h2>
          <p className="text-muted-foreground">Real-time facility status and performance metrics.</p>
        </div>
        <div className="flex gap-2">
           {/* Add Date Range Picker here later */}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-l-4 border-l-primary shadow-sm">
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Downtimes</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-mono font-bold text-foreground" data-testid="text-active-downtimes">{activeDowntimes}</span>
              <span className="text-sm text-muted-foreground">/ {totalNodes} Nodes</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-l-4 border-l-success shadow-sm">
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Fleet Utilization</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-mono font-bold text-foreground" data-testid="text-utilization">{utilization.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-l-4 border-l-chart-2 shadow-sm">
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Events</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-mono font-bold text-foreground" data-testid="text-total-events">{events.length}</span>
              <span className="text-sm text-muted-foreground">Logged</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Process Status List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xl font-semibold tracking-tight">Process Areas</h3>
          {processes.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No processes found. Create your first process to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processes.map(process => {
                const status = getProcessStatus(process.id);
                const isRunning = status === 'running';
                const isDown = status === 'down';
                
                return (
                  <Link key={process.id} href={`/process/${process.id}`}>
                    <Card className="hover:border-primary/50 transition-colors cursor-pointer group h-full" data-testid={`card-process-${process.id}`}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="group-hover:text-primary transition-colors">{process.name}</CardTitle>
                          {isRunning ? (
                            <CheckCircle2 className="h-5 w-5 text-success" data-testid={`status-running-${process.id}`} />
                          ) : isDown ? (
                            <AlertCircle className="h-5 w-5 text-destructive animate-pulse" data-testid={`status-down-${process.id}`} />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-warning" data-testid={`status-partial-${process.id}`} />
                          )}
                        </div>
                        <CardDescription>{process.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center mt-4">
                          <div className="text-xs font-mono text-muted-foreground">ID: {process.id}</div>
                          <Button variant="ghost" size="sm" className="gap-2 group-hover:bg-primary/10 group-hover:text-primary" data-testid={`button-view-process-${process.id}`}>
                            View Details <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Analytics Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Event Status</CardTitle>
            <CardDescription>Active vs resolved downtimes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {statusStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}
                      itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

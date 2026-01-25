import React from 'react';
import { useAppStore } from '@/lib/store';
import { useRoute, Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { ArrowLeft, Play, Square, AlertTriangle, Monitor, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatDistanceToNow } from 'date-fns';

export default function ProcessView() {
  const [, params] = useRoute('/process/:id');
  const processId = params?.id;
  
  const { processes, nodes, events, reasons } = useAppStore();
  
  const process = processes.find(p => p.id === processId);
  const processNodes = nodes.filter(n => n.processId === processId);

  // Filter events for this process only
  const processEvents = events.filter(e => processNodes.some(n => n.id === e.nodeId));

  if (!process) return <div>Process not found</div>;

  // Chart Logic
  const reasonStats = React.useMemo(() => {
    const stats: Record<string, number> = {};
    processEvents.forEach(e => {
      if (!e.reasonId) return;
      const reason = reasons.find(r => r.id === e.reasonId);
      const label = reason?.label || 'Unknown';
      stats[label] = (stats[label] || 0) + 1;
    });
    return Object.entries(stats).map(([name, value]) => ({ name, value }));
  }, [processEvents, reasons]);

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{process.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">{process.name}</h1>
          <p className="text-muted-foreground">{process.description}</p>
        </div>
      </div>

      <Tabs defaultValue="nodes" className="w-full">
        <TabsList className="w-full md:w-auto grid grid-cols-2">
          <TabsTrigger value="nodes">Operations & Nodes</TabsTrigger>
          <TabsTrigger value="analytics">Analytics & Reasons</TabsTrigger>
        </TabsList>
        
        <TabsContent value="nodes" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {processNodes.map(node => {
              const activeEvent = events.find(e => e.nodeId === node.id && !e.endTime);
              const isDown = node.status === 'down';
              
              return (
                <Link key={node.id} href={`/node/${node.id}`}>
                  <Card className={`cursor-pointer transition-all hover:border-primary border-l-4 ${isDown ? 'border-l-destructive bg-destructive/5' : 'border-l-success'}`}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{node.name}</CardTitle>
                        {isDown ? (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-destructive/20 text-destructive text-xs font-bold uppercase tracking-wider">
                            <AlertTriangle className="h-3 w-3" /> Stopped
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-success/20 text-success text-xs font-bold uppercase tracking-wider">
                            <Monitor className="h-3 w-3" /> Running
                          </div>
                        )}
                      </div>
                      <CardDescription className="font-mono text-xs">{node.id}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isDown && activeEvent ? (
                         <div className="mt-2 text-sm text-destructive flex items-center gap-2">
                           <Clock className="h-4 w-4" />
                           <span className="font-mono">
                            Down for {formatDistanceToNow(new Date(activeEvent.startTime))}
                           </span>
                         </div>
                      ) : (
                        <div className="mt-2 text-sm text-muted-foreground">
                          Operating normally
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Downtime Breakdown</CardTitle>
              <CardDescription>Reasons for downtime in {process.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                 {reasonStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reasonStats}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {reasonStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}
                        itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                 ) : (
                   <div className="h-full flex items-center justify-center text-muted-foreground">
                     No analytics data available yet.
                   </div>
                 )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { useAdminProcesses, useAdminNodes, useDowntimeStatsByReason } from '@/lib/queries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { BarChart3, Loader2, Filter, AlertTriangle } from 'lucide-react';
import { Label } from '@/components/ui/label';

type EntityType = 'process' | 'node';

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export default function Dashboard() {
  const [entityType, setEntityType] = useState<EntityType>('process');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  const { data: adminProcesses = [], isLoading: processesLoading } = useAdminProcesses();
  const { data: adminNodes = [], isLoading: nodesLoading } = useAdminNodes();
  const { data: stats = [], isLoading: statsLoading } = useDowntimeStatsByReason(
    selectedEntityId ? entityType : null,
    selectedEntityId
  );

  const entities = entityType === 'process' ? adminProcesses : adminNodes;
  const isLoadingEntities = entityType === 'process' ? processesLoading : nodesLoading;

  React.useEffect(() => {
    setSelectedEntityId(null);
  }, [entityType]);

  const chartData = useMemo(() => {
    if (stats.length === 0) return [];
    
    const total = stats.reduce((acc, s) => acc + s.totalDuration, 0);
    return stats.map((s) => ({
      name: s.reasonLabel,
      value: s.totalDuration,
      percentage: total > 0 ? ((s.totalDuration / total) * 100).toFixed(1) : '0',
      formattedDuration: formatDuration(s.totalDuration),
    }));
  }, [stats]);

  const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    'hsl(220, 70%, 50%)',
    'hsl(280, 70%, 50%)',
    'hsl(160, 70%, 50%)',
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-foreground">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            Duration: {data.formattedDuration}
          </p>
          <p className="text-sm font-medium text-primary">{data.percentage}%</p>
        </div>
      );
    }
    return null;
  };

  const hasNoAccess = adminProcesses.length === 0 && adminNodes.length === 0 && !processesLoading && !nodesLoading;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-display font-bold text-foreground">Analytics Dashboard</h2>
        <p className="text-muted-foreground">View downtime breakdown by reason for your processes and nodes.</p>
      </div>

      {hasNoAccess ? (
        <Card>
          <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[300px] text-center">
            <AlertTriangle className="h-12 w-12 text-warning mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Admin Access</h3>
            <p className="text-muted-foreground max-w-md">
              You don't have admin or owner access to any processes or nodes. 
              Analytics are only available for entities you manage.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Filters</CardTitle>
              </div>
              <CardDescription>Select an entity to view its downtime breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="entity-type">Entity Type</Label>
                  <Select
                    value={entityType}
                    onValueChange={(value: EntityType) => setEntityType(value)}
                  >
                    <SelectTrigger id="entity-type" data-testid="select-entity-type">
                      <SelectValue placeholder="Select entity type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="process" data-testid="option-process">Process</SelectItem>
                      <SelectItem value="node" data-testid="option-node">Node</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="entity-select">
                    {entityType === 'process' ? 'Select Process' : 'Select Node'}
                  </Label>
                  {isLoadingEntities ? (
                    <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-muted-foreground text-sm">Loading...</span>
                    </div>
                  ) : entities.length === 0 ? (
                    <div className="h-10 px-3 border rounded-md bg-muted/50 flex items-center">
                      <span className="text-muted-foreground text-sm">
                        No {entityType === 'process' ? 'processes' : 'nodes'} with admin access
                      </span>
                    </div>
                  ) : (
                    <Select
                      value={selectedEntityId || ''}
                      onValueChange={(value) => setSelectedEntityId(value || null)}
                    >
                      <SelectTrigger id="entity-select" data-testid="select-entity">
                        <SelectValue placeholder={`Select a ${entityType}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {entities.map((entity) => (
                          <SelectItem
                            key={entity.id}
                            value={entity.id}
                            data-testid={`option-entity-${entity.id}`}
                          >
                            {entity.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <CardTitle>Downtime by Reason</CardTitle>
              </div>
              <CardDescription>
                {selectedEntityId
                  ? `Percentage breakdown of downtime reasons`
                  : `Select a ${entityType} above to view data`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                {!selectedEntityId ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                    <BarChart3 className="h-16 w-16 mb-4 opacity-30" />
                    <p className="text-lg">No entity selected</p>
                    <p className="text-sm">Choose a {entityType} from the filter above to view analytics</p>
                  </div>
                ) : statsLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : chartData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                    <BarChart3 className="h-16 w-16 mb-4 opacity-30" />
                    <p className="text-lg">No downtime data</p>
                    <p className="text-sm">This {entityType} has no recorded downtime events</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={140}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percentage }) => `${name}: ${percentage}%`}
                        labelLine={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}
                      >
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                            stroke="hsl(var(--background))"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value) => (
                          <span className="text-foreground text-sm">{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {chartData.length > 0 && (
                <div className="mt-6 border-t pt-4">
                  <h4 className="font-medium mb-3">Summary</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {chartData.map((item, index) => (
                      <div
                        key={item.name}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                        data-testid={`stat-reason-${index}`}
                      >
                        <div
                          className="w-4 h-4 rounded-full shrink-0"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.formattedDuration} ({item.percentage}%)
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

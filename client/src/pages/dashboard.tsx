import React, { useState, useMemo } from 'react';
import { useAdminProcesses, useAdminNodes, useDowntimeStatsByReason, useDowntimeStatsByNode, useProcesses } from '@/lib/queries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { BarChart3, Loader2, Filter, AlertTriangle, Calendar as CalendarIcon, RotateCcw, Download } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { exportDowntimeEvents } from '@/lib/api';

type EntityType = 'process' | 'node';
type BreakdownType = 'reason' | 'node';

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
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [breakdownType, setBreakdownType] = useState<BreakdownType>('reason');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isExporting, setIsExporting] = useState(false);

  const resetFilters = () => {
    setEntityType('process');
    setSelectedProcessId(null);
    setSelectedNodeId(null);
    setBreakdownType('reason');
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const formatDateForApi = (date: Date | undefined): string | undefined => {
    if (!date) return undefined;
    return format(date, 'yyyy-MM-dd');
  };

  const formatLocalDateTime = (dateStr: string | null): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const csvQuote = (value: string | null | undefined): string => {
    const str = value ?? '';
    return '"' + str.replace(/"/g, '""') + '"';
  };

  const handleExportCsv = async () => {
    if (!selectedEntityId) return;
    setIsExporting(true);
    try {
      const events = await exportDowntimeEvents({
        processId: entityType === 'process' ? selectedEntityId : undefined,
        nodeId: entityType === 'node' ? selectedEntityId : undefined,
        startDate: formatDateForApi(startDate),
        endDate: formatDateForApi(endDate),
      });

      const formatDowntime = (stopTime: string, startTime: string | null): string => {
        if (!startTime) return '';
        const ms = new Date(startTime).getTime() - new Date(stopTime).getTime();
        if (ms <= 0) return '';
        const totalSec = Math.floor(ms / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      };

      const headerRow = ['Process', 'Node', 'Start Date/Time', 'Stop Date/Time', 'Down Time', 'Down Reason', 'Start Reason']
        .map(h => `"${h}"`).join(',');
      const dataRows = events.map(e => [
        csvQuote(e.processName),
        csvQuote(e.nodeName),
        csvQuote(formatLocalDateTime(e.stopTime)),
        csvQuote(e.startTime ? formatLocalDateTime(e.startTime) : null),
        csvQuote(formatDowntime(e.stopTime, e.startTime)),
        csvQuote(e.downReason),
        csvQuote(e.startReason),
      ].join(','));

      const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const entityName = entityType === 'process'
        ? (adminProcesses.find(p => p.id === selectedProcessId)?.name ?? 'unknown')
        : (uniqueAdminNodes.find(n => n.id === selectedNodeId)?.name ?? 'unknown');
      const safeName = entityName.replace(/[^a-zA-Z0-9_-]/g, '-');
      const fmtDate = (d: Date) => format(d, 'yyyy-MM-dd');
      const dateSuffix = startDate && endDate
        ? `${fmtDate(startDate)}-to-${fmtDate(endDate)}`
        : startDate
          ? `from-${fmtDate(startDate)}`
          : endDate
            ? `to-${fmtDate(endDate)}`
            : 'all-time';
      a.href = url;
      a.download = `downtime-log-${safeName}-${dateSuffix}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const { data: adminProcesses = [], isLoading: processesLoading } = useAdminProcesses();
  const { data: adminNodes = [], isLoading: nodesLoading } = useAdminNodes();
  const { data: allProcesses = [] } = useProcesses(); // For getting process names

  const uniqueAdminNodes = useMemo(() => {
    const seen = new Set<string>();
    return adminNodes.filter((node) => {
      if (seen.has(node.id)) return false;
      seen.add(node.id);
      return true;
    });
  }, [adminNodes]);

  // Derive unique processes from admin nodes (for node entity type selection)
  const processesFromAdminNodes = useMemo(() => {
    const processMap = new Map<string, { id: string; name: string }>();
    uniqueAdminNodes.forEach((node) => {
      if (!processMap.has(node.processId)) {
        // Get process name from allProcesses (which includes all accessible processes)
        const matchingProcess = allProcesses.find(p => p.id === node.processId);
        if (matchingProcess) {
          processMap.set(node.processId, { id: node.processId, name: matchingProcess.name });
        }
      }
    });
    return Array.from(processMap.values());
  }, [uniqueAdminNodes, allProcesses]);

  const filteredNodes = useMemo(() => {
    if (!selectedProcessId) return [];
    return uniqueAdminNodes.filter((node) => node.processId === selectedProcessId);
  }, [uniqueAdminNodes, selectedProcessId]);

  const selectedEntityId = entityType === 'process' ? selectedProcessId : selectedNodeId;

  const { data: reasonStats = [], isLoading: reasonStatsLoading } = useDowntimeStatsByReason(
    selectedEntityId ? entityType : null,
    selectedEntityId,
    formatDateForApi(startDate),
    formatDateForApi(endDate)
  );

  const { data: nodeStats = [], isLoading: nodeStatsLoading } = useDowntimeStatsByNode(
    entityType === 'process' && breakdownType === 'node' ? selectedProcessId : null,
    formatDateForApi(startDate),
    formatDateForApi(endDate)
  );

  const statsLoading = breakdownType === 'reason' ? reasonStatsLoading : nodeStatsLoading;

  React.useEffect(() => {
    setSelectedProcessId(null);
    setSelectedNodeId(null);
    setBreakdownType('reason');
  }, [entityType]);

  React.useEffect(() => {
    setSelectedNodeId(null);
  }, [selectedProcessId]);

  const chartData = useMemo(() => {
    if (breakdownType === 'reason') {
      if (reasonStats.length === 0) return [];
      const total = reasonStats.reduce((acc, s) => acc + s.totalDuration, 0);
      return reasonStats.map((s) => ({
        name: s.reasonLabel,
        value: s.totalDuration,
        percentage: total > 0 ? ((s.totalDuration / total) * 100).toFixed(1) : '0',
        formattedDuration: formatDuration(s.totalDuration),
      }));
    } else {
      if (nodeStats.length === 0) return [];
      const total = nodeStats.reduce((acc, s) => acc + s.totalDuration, 0);
      return nodeStats.map((s) => ({
        name: s.nodeName,
        value: s.totalDuration,
        percentage: total > 0 ? ((s.totalDuration / total) * 100).toFixed(1) : '0',
        formattedDuration: formatDuration(s.totalDuration),
      }));
    }
  }, [reasonStats, nodeStats, breakdownType]);

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

  const hasNoAccess = adminProcesses.length === 0 && uniqueAdminNodes.length === 0 && !processesLoading && !nodesLoading;

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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Filters</CardTitle>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  data-testid="button-reset-filters"
                  className="flex items-center gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </Button>
              </div>
              <CardDescription>Select an entity and optional date range to view its downtime breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    Start Date
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        data-testid="input-start-date"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'PPP') : <span className="text-muted-foreground">Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    End Date
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        data-testid="input-end-date"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'PPP') : <span className="text-muted-foreground">Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className={`grid grid-cols-1 gap-4 ${entityType === 'node' ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
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

                {entityType === 'process' ? (
                  <div className="space-y-2">
                    <Label htmlFor="process-select">Select Process</Label>
                    {processesLoading ? (
                      <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-muted-foreground text-sm">Loading...</span>
                      </div>
                    ) : adminProcesses.length === 0 ? (
                      <div className="h-10 px-3 border rounded-md bg-muted/50 flex items-center">
                        <span className="text-muted-foreground text-sm">No processes with admin access</span>
                      </div>
                    ) : (
                      <Select
                        value={selectedProcessId || ''}
                        onValueChange={(value) => setSelectedProcessId(value || null)}
                      >
                        <SelectTrigger id="process-select" data-testid="select-process">
                          <SelectValue placeholder="Select a process" />
                        </SelectTrigger>
                        <SelectContent>
                          {adminProcesses.map((process) => (
                            <SelectItem
                              key={process.id}
                              value={process.id}
                              data-testid={`option-process-${process.id}`}
                            >
                              {process.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="process-filter">Select Process</Label>
                      {nodesLoading ? (
                        <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-muted-foreground text-sm">Loading...</span>
                        </div>
                      ) : processesFromAdminNodes.length === 0 ? (
                        <div className="h-10 px-3 border rounded-md bg-muted/50 flex items-center">
                          <span className="text-muted-foreground text-sm">No nodes with admin access</span>
                        </div>
                      ) : (
                        <Select
                          value={selectedProcessId || ''}
                          onValueChange={(value) => setSelectedProcessId(value || null)}
                        >
                          <SelectTrigger id="process-filter" data-testid="select-process-filter">
                            <SelectValue placeholder="Select a process first" />
                          </SelectTrigger>
                          <SelectContent>
                            {processesFromAdminNodes.map((process) => (
                              <SelectItem
                                key={process.id}
                                value={process.id}
                                data-testid={`option-filter-process-${process.id}`}
                              >
                                {process.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="node-select">Select Node</Label>
                      {nodesLoading ? (
                        <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-muted-foreground text-sm">Loading...</span>
                        </div>
                      ) : !selectedProcessId ? (
                        <div className="h-10 px-3 border rounded-md bg-muted/50 flex items-center">
                          <span className="text-muted-foreground text-sm">Select a process first</span>
                        </div>
                      ) : filteredNodes.length === 0 ? (
                        <div className="h-10 px-3 border rounded-md bg-muted/50 flex items-center">
                          <span className="text-muted-foreground text-sm">No nodes in this process</span>
                        </div>
                      ) : (
                        <Select
                          value={selectedNodeId || ''}
                          onValueChange={(value) => setSelectedNodeId(value || null)}
                        >
                          <SelectTrigger id="node-select" data-testid="select-node">
                            <SelectValue placeholder="Select a node" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredNodes.map((node) => (
                              <SelectItem
                                key={node.id}
                                value={node.id}
                                data-testid={`option-node-${node.id}`}
                              >
                                {node.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <CardTitle>
                    Downtime {breakdownType === 'reason' ? 'by Reason' : 'by Node'}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-3">
                  {entityType === 'process' && selectedProcessId && (
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground">Breakdown:</Label>
                      <ToggleGroup
                        type="single"
                        value={breakdownType}
                        onValueChange={(value) => value && setBreakdownType(value as BreakdownType)}
                        className="bg-muted rounded-md p-1"
                      >
                        <ToggleGroupItem
                          value="reason"
                          className="text-sm px-3 py-1 data-[state=on]:bg-background data-[state=on]:shadow-sm"
                          data-testid="toggle-by-reason"
                        >
                          By Reason
                        </ToggleGroupItem>
                        <ToggleGroupItem
                          value="node"
                          className="text-sm px-3 py-1 data-[state=on]:bg-background data-[state=on]:shadow-sm"
                          data-testid="toggle-by-node"
                        >
                          By Node
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                  )}
                  {selectedEntityId && chartData.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportCsv}
                      disabled={isExporting}
                      data-testid="button-export-csv"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Export CSV
                    </Button>
                  )}
                </div>
              </div>
              <CardDescription>
                {selectedEntityId
                  ? `Percentage breakdown of downtime ${breakdownType === 'reason' ? 'reasons' : 'across nodes'}`
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
                        data-testid={`stat-${breakdownType}-${index}`}
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

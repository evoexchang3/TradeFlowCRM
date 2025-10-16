import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, TrendingUp, Phone, MessageSquare, Target, DollarSign, Activity, BarChart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

interface DepartmentComparison {
  department: string;
  totalTeams: number;
  totalAgents: number;
  totalClients: number;
  ftdCount: number;
  ftdConversionRate: number;
  totalFtdVolume: number;
  avgFtdAmount: number;
  totalCalls: number;
  totalCallDuration: number;
  avgCallDuration: number;
  totalComments: number;
  avgResponseTime: number;
  performanceScore: number;
}

interface CrossDepartmentMetrics {
  salesMetrics: DepartmentComparison;
  retentionMetrics: DepartmentComparison;
  globalTotals: {
    totalTeams: number;
    totalAgents: number;
    totalClients: number;
    ftdCount: number;
    totalFtdVolume: number;
    totalCalls: number;
    totalComments: number;
  };
}

export default function CRMDashboard() {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Fetch cross-department comparison
  const { data: crossDeptData, isLoading } = useQuery<CrossDepartmentMetrics>({
    queryKey: ['/api/dashboard/cross-department', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());
      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`/api/dashboard/cross-department${query}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch cross-department metrics');
      return response.json();
    },
  });

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const clearDateFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!crossDeptData && !isLoading) {
    return (
      <div className="p-8">
        <div className="text-center text-muted-foreground">
          No cross-department data available
        </div>
      </div>
    );
  }

  if (!crossDeptData) return null;

  const { salesMetrics, retentionMetrics, globalTotals } = crossDeptData;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-crm-dashboard">
            Global CRM Performance
          </h1>
          <p className="text-muted-foreground mt-1">
            <span className="text-sm">
              {globalTotals.totalTeams} teams • {globalTotals.totalAgents} agents • {globalTotals.totalClients} clients
            </span>
          </p>
        </div>
        
        {/* Date Range Filter */}
        <div className="flex items-center gap-2">
          {(startDate || endDate) && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearDateFilters}
              data-testid="button-clear-dates"
            >
              Clear Dates
            </Button>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" data-testid="button-start-date">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'PP') : 'Start Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" data-testid="button-end-date">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'PP') : 'End Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
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

      {/* Global Totals */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Organization Totals</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card data-testid="card-global-ftd-count">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total FTDs</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-global-ftd-count">{globalTotals.ftdCount}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-global-ftd-volume">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total FTD Volume</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-global-ftd-volume">
                ${globalTotals.totalFtdVolume.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-global-calls">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-global-calls">{globalTotals.totalCalls}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Department Comparison */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <BarChart className="h-5 w-5" />
          Sales vs Retention Comparison
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Sales Department */}
          <Card data-testid="card-sales-dept">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Sales Department</span>
                <Badge variant="outline" className="capitalize">Sales</Badge>
              </CardTitle>
              <CardDescription>
                {salesMetrics.totalTeams} teams • {salesMetrics.totalAgents} agents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Performance Score</span>
                  <span className={`text-2xl font-bold ${getPerformanceColor(salesMetrics.performanceScore)}`} data-testid="text-sales-score">
                    {salesMetrics.performanceScore}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Clients</span>
                  <span className="font-medium" data-testid="text-sales-clients">{salesMetrics.totalClients}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">FTDs</span>
                  <span className="font-medium" data-testid="text-sales-ftds">{salesMetrics.ftdCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Conversion Rate</span>
                  <span className="font-medium" data-testid="text-sales-conversion">{salesMetrics.ftdConversionRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">FTD Volume</span>
                  <span className="font-medium" data-testid="text-sales-volume">${salesMetrics.totalFtdVolume.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Calls</span>
                  <span className="font-medium" data-testid="text-sales-calls">{salesMetrics.totalCalls}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Avg Response Time</span>
                  <span className="font-medium" data-testid="text-sales-response">{formatDuration(salesMetrics.avgResponseTime)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Retention Department */}
          <Card data-testid="card-retention-dept">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Retention Department</span>
                <Badge variant="outline" className="capitalize">Retention</Badge>
              </CardTitle>
              <CardDescription>
                {retentionMetrics.totalTeams} teams • {retentionMetrics.totalAgents} agents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Performance Score</span>
                  <span className={`text-2xl font-bold ${getPerformanceColor(retentionMetrics.performanceScore)}`} data-testid="text-retention-score">
                    {retentionMetrics.performanceScore}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Clients</span>
                  <span className="font-medium" data-testid="text-retention-clients">{retentionMetrics.totalClients}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">FTDs</span>
                  <span className="font-medium" data-testid="text-retention-ftds">{retentionMetrics.ftdCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Conversion Rate</span>
                  <span className="font-medium" data-testid="text-retention-conversion">{retentionMetrics.ftdConversionRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">FTD Volume</span>
                  <span className="font-medium" data-testid="text-retention-volume">${retentionMetrics.totalFtdVolume.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Calls</span>
                  <span className="font-medium" data-testid="text-retention-calls">{retentionMetrics.totalCalls}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Avg Response Time</span>
                  <span className="font-medium" data-testid="text-retention-response">{formatDuration(retentionMetrics.avgResponseTime)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Key Insights */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Key Insights</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card data-testid="card-insight-conversion">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Best Conversion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {salesMetrics.ftdConversionRate > retentionMetrics.ftdConversionRate ? 'Sales' : 'Retention'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.max(salesMetrics.ftdConversionRate, retentionMetrics.ftdConversionRate).toFixed(1)}% conversion rate
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-insight-performance">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Top Performing Dept</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {salesMetrics.performanceScore > retentionMetrics.performanceScore ? 'Sales' : 'Retention'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Score: {Math.max(salesMetrics.performanceScore, retentionMetrics.performanceScore)}
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-insight-response">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Fastest Response</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {salesMetrics.avgResponseTime < retentionMetrics.avgResponseTime ? 'Sales' : 'Retention'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDuration(Math.min(salesMetrics.avgResponseTime, retentionMetrics.avgResponseTime))} avg
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

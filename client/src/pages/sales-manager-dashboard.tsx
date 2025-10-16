import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, TrendingUp, Phone, MessageSquare, Target, DollarSign, Activity, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

interface DepartmentMetrics {
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

interface TeamLanguageMetrics {
  teamId: string;
  teamName: string;
  language: string;
  totalAgents: number;
  totalClients: number;
  ftdCount: number;
  ftdConversionRate: number;
  totalFtdVolume: number;
  performanceScore: number;
}

export default function SalesManagerDashboard() {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Fetch department-level metrics
  const { data: deptMetrics, isLoading: deptLoading } = useQuery<DepartmentMetrics>({
    queryKey: ['/api/dashboard/department/sales', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());
      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`/api/dashboard/department/sales${query}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch department metrics');
      return response.json();
    },
  });

  // Fetch language breakdown
  const { data: languageMetrics, isLoading: langLoading } = useQuery<TeamLanguageMetrics[]>({
    queryKey: ['/api/dashboard/language-breakdown/sales', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());
      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`/api/dashboard/language-breakdown/sales${query}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch language metrics');
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

  const isLoading = deptLoading || langLoading;

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!deptMetrics) {
    return (
      <div className="p-8">
        <div className="text-center text-muted-foreground">
          No sales department data available
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-sales-manager-dashboard">
            Sales Department Performance
          </h1>
          <p className="text-muted-foreground mt-1">
            <Badge variant="outline" className="capitalize">{deptMetrics.department}</Badge>
            <span className="ml-2 text-sm">{deptMetrics.totalTeams} teams • {deptMetrics.totalAgents} agents</span>
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

      {/* Department Performance Score */}
      <Card data-testid="card-dept-performance-score">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Department Performance Score
          </CardTitle>
          <CardDescription>
            Overall sales department rating based on all teams' FTD conversion, activity, and response time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`text-5xl font-bold ${getPerformanceColor(deptMetrics.performanceScore)}`} data-testid="text-dept-performance-score">
            {deptMetrics.performanceScore}
            <span className="text-2xl text-muted-foreground">/100</span>
          </div>
        </CardContent>
      </Card>

      {/* Department FTD Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Department FTD Performance</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card data-testid="card-dept-total-clients">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-dept-total-clients">{deptMetrics.totalClients}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-dept-ftd-count">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">FTD Count</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-dept-ftd-count">{deptMetrics.ftdCount}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-dept-conversion-rate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-dept-conversion-rate">{deptMetrics.ftdConversionRate.toFixed(1)}%</div>
            </CardContent>
          </Card>

          <Card data-testid="card-dept-ftd-volume">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total FTD Volume</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-dept-ftd-volume">
                ${deptMetrics.totalFtdVolume.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Avg: ${deptMetrics.avgFtdAmount.toFixed(0)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Department Activity Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Department Activity Metrics</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card data-testid="card-dept-total-calls">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-dept-total-calls">{deptMetrics.totalCalls}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Avg duration: {formatDuration(deptMetrics.avgCallDuration)}
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-dept-total-comments">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comments Added</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-dept-total-comments">{deptMetrics.totalComments}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-dept-response-time">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-dept-response-time">
                {formatDuration(deptMetrics.avgResponseTime)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Language Team Comparison */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Performance by Language
        </h2>
        <Card data-testid="card-language-comparison">
          <CardHeader>
            <CardTitle className="text-sm">Sales Teams Comparison</CardTitle>
            <CardDescription>Performance metrics broken down by language teams</CardDescription>
          </CardHeader>
          <CardContent>
            {languageMetrics && languageMetrics.length > 0 ? (
              <div className="space-y-3">
                {languageMetrics.map((team, index) => (
                  <div
                    key={team.teamId}
                    className="flex items-center justify-between p-3 rounded-md border hover-elevate"
                    data-testid={`language-team-row-${index}`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Badge variant="outline" data-testid={`team-language-${index}`}>{team.language}</Badge>
                      <div>
                        <p className="font-medium" data-testid={`team-name-${index}`}>{team.teamName}</p>
                        <p className="text-xs text-muted-foreground">
                          {team.totalAgents} agents • {team.totalClients} clients • {team.ftdCount} FTDs
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl font-bold ${getPerformanceColor(team.performanceScore)}`} data-testid={`team-score-${index}`}>
                        {team.performanceScore}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {team.ftdConversionRate.toFixed(1)}% conv. • ${team.totalFtdVolume.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No language team data available
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

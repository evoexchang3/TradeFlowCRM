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
import { useLanguage } from "@/contexts/LanguageContext";

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

export default function RetentionManagerDashboard() {
  const { t } = useLanguage();
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Fetch department-level metrics
  const { data: deptMetrics, isLoading: deptLoading } = useQuery<DepartmentMetrics>({
    queryKey: ['/api/dashboard/department/retention', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());
      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`/api/dashboard/department/retention${query}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch department metrics');
      return response.json();
    },
  });

  // Fetch language breakdown
  const { data: languageMetrics, isLoading: langLoading } = useQuery<TeamLanguageMetrics[]>({
    queryKey: ['/api/dashboard/language-breakdown/retention', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());
      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`/api/dashboard/language-breakdown/retention${query}`, {
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

  if (!deptMetrics && !isLoading) {
    return (
      <div className="p-8">
        <div className="text-center text-muted-foreground">
          {t('dashboard.retentionManager.no.data')}
        </div>
      </div>
    );
  }

  if (!deptMetrics) return null;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-retention-manager-dashboard">
            {t('dashboard.retentionManager.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            <Badge variant="outline" className="capitalize">{deptMetrics.department}</Badge>
            <span className="ml-2 text-sm">{t('dashboard.retentionManager.teams.agents', { teams: deptMetrics.totalTeams, agents: deptMetrics.totalAgents })}</span>
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
              {t('dashboard.retentionManager.clear.dates')}
            </Button>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" data-testid="button-start-date">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'PP') : t('dashboard.retentionManager.start.date')}
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
                {endDate ? format(endDate, 'PP') : t('dashboard.retentionManager.end.date')}
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
            {t('dashboard.retentionManager.performance.score')}
          </CardTitle>
          <CardDescription>
            {t('dashboard.retentionManager.performance.score.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`text-5xl font-bold ${getPerformanceColor(deptMetrics.performanceScore)}`} data-testid="text-dept-performance-score">
            {deptMetrics.performanceScore}
            <span className="text-2xl text-muted-foreground">{t('dashboard.retentionManager.performance.score.outof')}</span>
          </div>
        </CardContent>
      </Card>

      {/* Department FTD Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">{t('dashboard.retentionManager.department.ftd.performance')}</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card data-testid="card-dept-total-clients">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.retentionManager.total.clients')}</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-dept-total-clients">{deptMetrics.totalClients}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-dept-ftd-count">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.retentionManager.ftd.count')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-dept-ftd-count">{deptMetrics.ftdCount}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-dept-conversion-rate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.retentionManager.conversion.rate')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-dept-conversion-rate">{deptMetrics.ftdConversionRate.toFixed(1)}%</div>
            </CardContent>
          </Card>

          <Card data-testid="card-dept-ftd-volume">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.retentionManager.total.ftd.volume')}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-dept-ftd-volume">
                ${deptMetrics.totalFtdVolume.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('dashboard.retentionManager.avg.label')} ${deptMetrics.avgFtdAmount.toFixed(0)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Department Activity Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">{t('dashboard.retentionManager.department.activity.metrics')}</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card data-testid="card-dept-total-calls">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.retentionManager.total.calls')}</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-dept-total-calls">{deptMetrics.totalCalls}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('dashboard.retentionManager.avg.duration')} {formatDuration(deptMetrics.avgCallDuration)}
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-dept-total-comments">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.retentionManager.comments.added')}</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-dept-total-comments">{deptMetrics.totalComments}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-dept-response-time">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.retentionManager.avg.response.time')}</CardTitle>
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
          {t('dashboard.retentionManager.team.performance.language')}
        </h2>
        <Card data-testid="card-language-comparison">
          <CardHeader>
            <CardTitle className="text-sm">{t('dashboard.retentionManager.retention.teams.comparison')}</CardTitle>
            <CardDescription>{t('dashboard.retentionManager.performance.metrics.breakdown')}</CardDescription>
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
                          {team.totalAgents} {t('dashboard.retentionManager.agents')} • {team.totalClients} {t('dashboard.retentionManager.clients')} • {team.ftdCount} {t('dashboard.retentionManager.ftds')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl font-bold ${getPerformanceColor(team.performanceScore)}`} data-testid={`team-score-${index}`}>
                        {team.performanceScore}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {team.ftdConversionRate.toFixed(1)}% {t('dashboard.retentionManager.conv')} • ${team.totalFtdVolume.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('dashboard.retentionManager.no.language.data')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

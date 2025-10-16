import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, TrendingUp, Phone, MessageSquare, Target, DollarSign, Activity, Trophy, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth";
import type { User } from "@shared/schema";

interface TeamPerformance {
  teamId: string;
  teamName: string;
  department?: string;
  language?: string;
  
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

interface AgentPerformance {
  agentId: string;
  agentName: string;
  totalClients: number;
  ftdCount: number;
  ftdConversionRate: number;
  totalFtdVolume: number;
  totalCalls: number;
  avgResponseTime: number;
  performanceScore: number;
}

export default function TeamDashboard() {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Fetch user's team
  const { data: userData } = useQuery<User>({
    queryKey: [`/api/users/${user?.id}`],
    enabled: !!user?.id,
  });

  const teamId = userData?.teamId;

  // Fetch team performance
  const { data: teamMetrics, isLoading: teamLoading } = useQuery<TeamPerformance>({
    queryKey: ['/api/dashboard/team', teamId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!teamId) throw new Error('No team ID');
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());
      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`/api/dashboard/team/${teamId}${query}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch team metrics');
      return response.json();
    },
    enabled: !!teamId,
  });

  // Fetch team members leaderboard
  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery<AgentPerformance[]>({
    queryKey: ['/api/dashboard/team-leaderboard', teamId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!teamId) throw new Error('No team ID');
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());
      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`/api/dashboard/team/${teamId}/leaderboard${query}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      return response.json();
    },
    enabled: !!teamId,
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

  const getRankBadge = (index: number) => {
    if (index === 0) return <Badge className="bg-yellow-500 hover:bg-yellow-600"><Trophy className="h-3 w-3 mr-1" /> 1st</Badge>;
    if (index === 1) return <Badge className="bg-gray-400 hover:bg-gray-500"><Trophy className="h-3 w-3 mr-1" /> 2nd</Badge>;
    if (index === 2) return <Badge className="bg-amber-700 hover:bg-amber-800"><Trophy className="h-3 w-3 mr-1" /> 3rd</Badge>;
    return <Badge variant="outline">{index + 1}</Badge>;
  };

  const clearDateFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const isLoading = teamLoading || leaderboardLoading;

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

  if (!teamMetrics && !isLoading) {
    return (
      <div className="p-8">
        <div className="text-center text-muted-foreground">
          No team data available. Please make sure you are assigned to a team.
        </div>
      </div>
    );
  }

  if (!teamMetrics) return null;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-team-dashboard">
            Team Performance: {teamMetrics.teamName}
          </h1>
          <p className="text-muted-foreground mt-1">
            {teamMetrics.language && <Badge variant="outline" className="mr-2">{teamMetrics.language}</Badge>}
            {teamMetrics.department && <Badge variant="outline" className="capitalize">{teamMetrics.department}</Badge>}
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

      {/* Team Performance Score */}
      <Card data-testid="card-team-performance-score">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Team Performance Score
          </CardTitle>
          <CardDescription>
            Overall team rating based on collective FTD conversion, activity, and response time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`text-5xl font-bold ${getPerformanceColor(teamMetrics.performanceScore)}`} data-testid="text-team-performance-score">
            {teamMetrics.performanceScore}
            <span className="text-2xl text-muted-foreground">/100</span>
          </div>
        </CardContent>
      </Card>

      {/* Team FTD Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Team FTD Performance</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card data-testid="card-team-total-clients">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-team-total-clients">{teamMetrics.totalClients}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-team-ftd-count">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">FTD Count</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-team-ftd-count">{teamMetrics.ftdCount}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-team-conversion-rate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-team-conversion-rate">{teamMetrics.ftdConversionRate.toFixed(1)}%</div>
            </CardContent>
          </Card>

          <Card data-testid="card-team-ftd-volume">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total FTD Volume</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-team-ftd-volume">
                ${teamMetrics.totalFtdVolume.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Avg: ${teamMetrics.avgFtdAmount.toFixed(0)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Team Activity Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Team Activity Metrics</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card data-testid="card-team-total-calls">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-team-total-calls">{teamMetrics.totalCalls}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Avg duration: {formatDuration(teamMetrics.avgCallDuration)}
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-team-total-comments">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comments Added</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-team-total-comments">{teamMetrics.totalComments}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-team-response-time">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-team-response-time">
                {formatDuration(teamMetrics.avgResponseTime)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Team Members Leaderboard */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Team Leaderboard
        </h2>
        <Card data-testid="card-leaderboard">
          <CardHeader>
            <CardTitle className="text-sm">Agent Performance Rankings</CardTitle>
            <CardDescription>Team members ranked by performance score</CardDescription>
          </CardHeader>
          <CardContent>
            {leaderboard && leaderboard.length > 0 ? (
              <div className="space-y-3">
                {leaderboard.map((agent, index) => (
                  <div
                    key={agent.agentId}
                    className="flex items-center justify-between p-3 rounded-md border hover-elevate"
                    data-testid={`leaderboard-row-${index}`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {getRankBadge(index)}
                      <div>
                        <p className="font-medium" data-testid={`agent-name-${index}`}>{agent.agentName}</p>
                        <p className="text-xs text-muted-foreground">
                          {agent.totalClients} clients • {agent.ftdCount} FTDs
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl font-bold ${getPerformanceColor(agent.performanceScore)}`} data-testid={`agent-score-${index}`}>
                        {agent.performanceScore}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {agent.ftdConversionRate.toFixed(1)}% conv.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No team members found
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

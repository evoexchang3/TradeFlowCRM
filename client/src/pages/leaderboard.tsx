import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trophy, Medal, Star, Target, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Leaderboard() {
  const [period, setPeriod] = useState("monthly");
  const [teamFilter, setTeamFilter] = useState("all");

  const { data: leaderboardData, isLoading } = useQuery<any>({
    queryKey: ['/api/leaderboard', { period, teamId: teamFilter !== 'all' ? teamFilter : undefined }],
    queryFn: async () => {
      const params = new URLSearchParams({ period });
      if (teamFilter !== 'all') params.append('teamId', teamFilter);
      
      const response = await fetch(`/api/leaderboard?${params.toString()}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }
      
      return response.json();
    },
  });

  const { data: teams = [] } = useQuery<any[]>({
    queryKey: ['/api/teams'],
  });

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (index === 1) return <Medal className="h-6 w-6 text-gray-400" />;
    if (index === 2) return <Medal className="h-6 w-6 text-orange-600" />;
    return <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>;
  };

  const getRankBadgeColor = (index: number) => {
    if (index === 0) return "bg-yellow-500 text-white";
    if (index === 1) return "bg-gray-400 text-white";
    if (index === 2) return "bg-orange-600 text-white";
    return "bg-muted text-muted-foreground";
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Trophy className="h-8 w-8 text-primary" />
            Leaderboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Top performers and achievement leaders
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Period</label>
            <Select value={period} onValueChange={setPeriod} data-testid="select-period">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Team</label>
            <Select value={teamFilter} onValueChange={setTeamFilter} data-testid="select-team">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Top 3 Podium */}
      {leaderboardData?.leaderboard && leaderboardData.leaderboard.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {leaderboardData.leaderboard.slice(0, 3).map((agent: any, index: number) => (
            <Card key={agent.agentId} className={index === 0 ? "border-primary" : ""}>
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-2">
                  {getRankIcon(index)}
                </div>
                <CardTitle className="text-xl">{agent.agentName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary" data-testid={`text-points-${index}`}>
                    {agent.totalPoints}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Points</p>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="font-semibold">{agent.achievementCount}</div>
                    <div className="text-muted-foreground text-xs">Achievements</div>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="font-semibold">{agent.targetCompletionRate}%</div>
                    <div className="text-muted-foreground text-xs">Targets Met</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Full Leaderboard Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Rank</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead className="text-center">Points</TableHead>
                <TableHead className="text-center">Achievements</TableHead>
                <TableHead className="text-center">Targets Met</TableHead>
                <TableHead className="text-center">Completion Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboardData?.leaderboard && leaderboardData.leaderboard.length > 0 ? (
                leaderboardData.leaderboard.map((agent: any, index: number) => (
                  <TableRow key={agent.agentId} data-testid={`row-agent-${index}`}>
                    <TableCell>
                      <div className="flex items-center justify-center">
                        {index < 3 ? (
                          <Badge className={getRankBadgeColor(index)}>
                            {getRankIcon(index)}
                          </Badge>
                        ) : (
                          <span className="text-sm font-medium">#{index + 1}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{agent.agentName}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="font-semibold">{agent.totalPoints}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{agent.achievementCount}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Target className="h-4 w-4 text-primary" />
                        <span>{agent.targetsMet}/{agent.totalTargets}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <TrendingUp className={`h-4 w-4 ${Number(agent.targetCompletionRate) >= 80 ? 'text-green-500' : 'text-muted-foreground'}`} />
                        <span className={Number(agent.targetCompletionRate) >= 80 ? 'text-green-600 font-medium' : ''}>
                          {agent.targetCompletionRate}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No leaderboard data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Period Info */}
      {leaderboardData && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              Showing data for {period} period from{' '}
              {new Date(leaderboardData.startDate).toLocaleDateString()} to{' '}
              {new Date(leaderboardData.endDate).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

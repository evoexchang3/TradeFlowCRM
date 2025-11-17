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
import { useLanguage } from "@/contexts/LanguageContext";

export default function Leaderboard() {
  const { t } = useLanguage();
  const [period, setPeriod] = useState("monthly");
  const [teamFilter, setTeamFilter] = useState("all");

  // Build query URL with params
  const buildLeaderboardUrl = () => {
    const params = new URLSearchParams({ period });
    if (teamFilter !== 'all') params.append('teamId', teamFilter);
    return `/api/leaderboard?${params.toString()}`;
  };

  const { data: leaderboardData, isLoading } = useQuery<any>({
    queryKey: [buildLeaderboardUrl()],
  });

  const { data: teams = [] } = useQuery<any[]>({
    queryKey: ['/api/teams'],
  });

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (index === 1) return <Medal className="h-6 w-6 text-gray-400" />;
    if (index === 2) return <Medal className="h-6 w-6 text-orange-600" />;
    return null;
  };

  const getRankBadgeColor = (index: number) => {
    if (index === 0) return "bg-yellow-500 text-white";
    if (index === 1) return "bg-gray-400 text-white";
    if (index === 2) return "bg-orange-600 text-white";
    return "bg-muted text-muted-foreground";
  };

  const formatTargetValue = (value: number, department: string | null) => {
    if (department === 'retention') {
      return `$${value.toLocaleString()}`;
    }
    return value.toString();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">{t('leaderboard.loading')}</p>
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
            {t('leaderboard.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('leaderboard.subtitle')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('leaderboard.filters')}</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">{t('leaderboard.filter.period')}</label>
            <Select value={period} onValueChange={setPeriod} data-testid="select-period">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{t('leaderboard.period.daily')}</SelectItem>
                <SelectItem value="weekly">{t('leaderboard.period.weekly')}</SelectItem>
                <SelectItem value="monthly">{t('leaderboard.period.monthly')}</SelectItem>
                <SelectItem value="quarterly">{t('leaderboard.period.quarterly')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">{t('leaderboard.filter.team')}</label>
            <Select value={teamFilter} onValueChange={setTeamFilter} data-testid="select-team">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('leaderboard.all.teams')}</SelectItem>
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
                  <p className="text-sm text-muted-foreground">{t('leaderboard.total.points')}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="font-semibold">{agent.achievementCount}</div>
                    <div className="text-muted-foreground text-xs">{t('leaderboard.achievements')}</div>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="font-semibold">{agent.targetCompletionRate}%</div>
                    <div className="text-muted-foreground text-xs">{t('leaderboard.targets.met')}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Team Totals Section */}
      {leaderboardData?.leaderboard && leaderboardData.leaderboard.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('leaderboard.team.totals') || 'Team Totals'}</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              // Calculate team totals
              const teamTotals = new Map<string, any>();
              
              leaderboardData.leaderboard.forEach((agent: any) => {
                if (agent.team) {
                  if (!teamTotals.has(agent.team)) {
                    const team = teams.find((t: any) => t.id === agent.team);
                    teamTotals.set(agent.team, {
                      teamId: agent.team,
                      teamName: team?.name || 'Unknown Team',
                      department: agent.department,
                      totalPoints: 0,
                      totalAchievements: 0,
                      currentValue: 0,
                      targetValue: 0,
                      agentCount: 0,
                    });
                  }
                  const totals = teamTotals.get(agent.team)!;
                  totals.totalPoints += agent.totalPoints;
                  totals.totalAchievements += agent.achievementCount;
                  totals.currentValue += agent.currentValue;
                  totals.targetValue += agent.targetValue;
                  totals.agentCount += 1;
                }
              });
              
              const sortedTeams = Array.from(teamTotals.values()).sort((a, b) => b.totalPoints - a.totalPoints);
              
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedTeams.map((team, index) => (
                    <Card key={team.teamId} className={index === 0 ? "border-primary" : ""}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{team.teamName}</CardTitle>
                          {index === 0 && <Trophy className="h-5 w-5 text-yellow-500" />}
                        </div>
                        <p className="text-xs text-muted-foreground">{team.agentCount} agents</p>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Total Points</span>
                          <span className="font-semibold">{team.totalPoints}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Target Progress</span>
                          <span className="font-semibold">
                            {formatTargetValue(team.currentValue, team.department)}/{formatTargetValue(team.targetValue, team.department)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Completion</span>
                          <span className={`font-semibold ${team.targetValue > 0 && (team.currentValue / team.targetValue) >= 0.8 ? 'text-green-600' : ''}`}>
                            {team.targetValue > 0 ? ((team.currentValue / team.targetValue) * 100).toFixed(1) : '0'}%
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Full Leaderboard Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('leaderboard.all.rankings')}</CardTitle>
        </CardHeader>
        <CardContent>
          {leaderboardData?.leaderboard && leaderboardData.leaderboard.length > 0 ? (
            <>
              {/* Group by team */}
              {(() => {
                // Group agents by team
                const teamGroups = new Map<string, any[]>();
                const unassigned: any[] = [];
                
                leaderboardData.leaderboard.forEach((agent: any) => {
                  if (agent.team) {
                    if (!teamGroups.has(agent.team)) {
                      teamGroups.set(agent.team, []);
                    }
                    teamGroups.get(agent.team)!.push(agent);
                  } else {
                    unassigned.push(agent);
                  }
                });
                
                return (
                  <div className="space-y-6">
                    {Array.from(teamGroups.entries()).map(([teamId, agents]) => {
                      const team = teams.find((t: any) => t.id === teamId);
                      return (
                        <div key={teamId} className="space-y-2">
                          <h3 className="text-lg font-semibold text-primary border-b pb-2">
                            {team?.name || 'Unknown Team'}
                          </h3>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-20">{t('leaderboard.rank')}</TableHead>
                                <TableHead>{t('leaderboard.agent')}</TableHead>
                                <TableHead className="text-center">{t('leaderboard.points')}</TableHead>
                                <TableHead className="text-center">{t('leaderboard.achievements')}</TableHead>
                                <TableHead className="text-center">{t('leaderboard.targets.met')}</TableHead>
                                <TableHead className="text-center">{t('leaderboard.completion.rate')}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {agents.map((agent: any, index: number) => {
                                const globalIndex = leaderboardData.leaderboard.findIndex((a: any) => a.agentId === agent.agentId);
                                const rankIcon = getRankIcon(globalIndex);
                                return (
                                  <TableRow key={agent.agentId} data-testid={`row-agent-${globalIndex >= 0 ? globalIndex : index}`}>
                                    <TableCell>
                                      <div className="flex items-center justify-center">
                                        {globalIndex >= 0 && globalIndex < 3 ? (
                                          <Badge className={getRankBadgeColor(globalIndex)}>
                                            {globalIndex + 1}
                                          </Badge>
                                        ) : (
                                          <span className="text-sm font-medium">{globalIndex >= 0 ? globalIndex + 1 : index + 1}</span>
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
                                        <span>{formatTargetValue(agent.currentValue, agent.department)}/{formatTargetValue(agent.targetValue, agent.department)}</span>
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
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      );
                    })}
                    {unassigned.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-muted-foreground border-b pb-2">
                          Unassigned
                        </h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-20">{t('leaderboard.rank')}</TableHead>
                              <TableHead>{t('leaderboard.agent')}</TableHead>
                              <TableHead className="text-center">{t('leaderboard.points')}</TableHead>
                              <TableHead className="text-center">{t('leaderboard.achievements')}</TableHead>
                              <TableHead className="text-center">{t('leaderboard.targets.met')}</TableHead>
                              <TableHead className="text-center">{t('leaderboard.completion.rate')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {unassigned.map((agent: any, index: number) => {
                              const globalIndex = leaderboardData.leaderboard.findIndex((a: any) => a.agentId === agent.agentId);
                              const rankIcon = getRankIcon(globalIndex);
                              return (
                                <TableRow key={agent.agentId} data-testid={`row-agent-${globalIndex >= 0 ? globalIndex : index}`}>
                                  <TableCell>
                                    <div className="flex items-center justify-center">
                                      {globalIndex >= 0 && globalIndex < 3 ? (
                                        <Badge className={getRankBadgeColor(globalIndex)}>
                                          {globalIndex + 1}
                                        </Badge>
                                      ) : (
                                        <span className="text-sm font-medium">{globalIndex >= 0 ? globalIndex + 1 : index + 1}</span>
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
                                      <span>{formatTargetValue(agent.currentValue, agent.department)}/{formatTargetValue(agent.targetValue, agent.department)}</span>
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
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                );
              })()}
            </>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              {t('leaderboard.no.data')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Period Info */}
      {leaderboardData && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              {t('leaderboard.period.info', { 
                period, 
                startDate: new Date(leaderboardData.startDate).toLocaleDateString(),
                endDate: new Date(leaderboardData.endDate).toLocaleDateString()
              })}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

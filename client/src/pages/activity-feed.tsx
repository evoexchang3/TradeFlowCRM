import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Activity, MessageSquare, UserPlus, DollarSign, TrendingUp, RefreshCcw, User, Edit } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

interface ActivityItem {
  id: string;
  type: 'audit' | 'comment';
  action: string;
  actorName: string;
  actorId?: string;
  description: string;
  clientName?: string | null;
  clientId?: string;
  commentPreview?: string;
  details?: any;
  createdAt: string;
}

export default function ActivityFeed() {
  const { t } = useLanguage();
  const [teamFilter, setTeamFilter] = useState("all");
  const [limit, setLimit] = useState("50");

  const { data: response, isLoading, refetch } = useQuery<{ activities: ActivityItem[]; total: number }>({
    queryKey: ['/api/activity-feed', teamFilter, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (teamFilter !== 'all') params.append('teamId', teamFilter);
      params.append('limit', limit);
      
      const res = await fetch(`/api/activity-feed?${params.toString()}`, {
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch activity feed');
      }
      
      return res.json();
    },
    refetchInterval: 10000, // Auto-refresh every 10 seconds for real-time updates
  });

  const { data: teams = [] } = useQuery<any[]>({
    queryKey: ['/api/teams'],
  });

  const getActivityIcon = (action: string, type: string) => {
    if (type === 'comment') return MessageSquare;
    
    switch (action) {
      case 'client_create':
        return UserPlus;
      case 'client_ftd_marked':
        return DollarSign;
      case 'trade_create':
      case 'trade_close':
        return TrendingUp;
      case 'client_edit':
        return Edit;
      default:
        return Activity;
    }
  };

  const getActivityColor = (action: string, type: string) => {
    if (type === 'comment') return 'text-blue-500';
    
    switch (action) {
      case 'client_create':
        return 'text-green-500';
      case 'client_ftd_marked':
        return 'text-emerald-500';
      case 'trade_create':
        return 'text-purple-500';
      case 'trade_close':
        return 'text-orange-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">{t('activity.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">{t('activity.page.title')}</h1>
          <p className="text-muted-foreground">
            {t('activity.page.subtitle')}
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" data-testid="button-refresh">
          <RefreshCcw className="h-4 w-4 mr-2" />
          {t('common.refresh')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t('activity.filters')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="teamFilter">{t('activity.team.filter')}</Label>
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger id="teamFilter" data-testid="select-team-filter">
                  <SelectValue placeholder={t('activity.all.teams')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('activity.all.teams')}</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="limit">{t('activity.show.activities')}</Label>
              <Select value={limit} onValueChange={setLimit}>
                <SelectTrigger id="limit" data-testid="select-limit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">{t('activity.last.25')}</SelectItem>
                  <SelectItem value="50">{t('activity.last.50')}</SelectItem>
                  <SelectItem value="100">{t('activity.last.100')}</SelectItem>
                  <SelectItem value="200">{t('activity.last.200')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>{t('activity.recent.activity')} ({response?.total || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {response?.activities && response.activities.length > 0 ? (
            <div className="space-y-4">
              {response.activities.map((activity) => {
                const Icon = getActivityIcon(activity.action, activity.type);
                const iconColor = getActivityColor(activity.action, activity.type);
                
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 p-4 rounded-lg border hover-elevate transition-colors"
                    data-testid={`activity-item-${activity.id}`}
                  >
                    {/* Icon */}
                    <div className={`mt-1 ${iconColor}`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {getInitials(activity.actorName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{activity.actorName}</span>
                        <span className="text-muted-foreground">{activity.description}</span>
                      </div>

                      {/* Comment Preview */}
                      {activity.type === 'comment' && activity.commentPreview && (
                        <p className="text-sm text-muted-foreground mt-2 pl-8 italic">
                          "{activity.commentPreview}..."
                        </p>
                      )}

                      {/* Client Link */}
                      {activity.clientId && (
                        <div className="flex items-center gap-2 mt-2 pl-8">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <a 
                            href={`/clients/${activity.clientId}`}
                            className="text-sm text-primary hover:underline"
                            data-testid={`link-client-${activity.clientId}`}
                          >
                            {t('activity.view.client')}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('activity.no.activity')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

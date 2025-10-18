import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, Users, TrendingUp, DollarSign, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLanguage } from "@/contexts/LanguageContext";

export default function TeamDetail() {
  const { t } = useLanguage();
  const params = useParams();
  const teamId = params.id;

  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: [`/api/teams/${teamId}`],
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients'],
  });

  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
  });

  if (teamLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">{t('teamDetail.not.found')}</p>
      </div>
    );
  }

  const teamClients = clients.filter((c: any) => c.teamId === teamId);
  const teamMembers = users.filter((u: any) => u.teamId === teamId);
  
  const activeClients = teamClients.filter((c: any) => c.isActive).length;
  const totalBalance = teamClients.reduce((sum: number, c: any) => sum + (c.account?.balance || 0), 0);
  const convertedClients = teamClients.filter((c: any) => c.status === 'converted').length;

  const clientDistribution = teamMembers.map((member: any) => {
    const memberClients = teamClients.filter((c: any) => c.assignedAgentId === member.id);
    return {
      agent: member,
      count: memberClients.length,
      activeCount: memberClients.filter((c: any) => c.isActive).length,
    };
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild data-testid="button-back">
          <Link href="/teams">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold" data-testid="text-team-name">
            {team.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('teamDetail.team.leader')} {team.leader?.name || t('teamDetail.not.assigned')}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('teamDetail.total.clients')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-total-clients">{teamClients.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {activeClients} {t('teamDetail.active')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              {t('teamDetail.team.members')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-total-members">{teamMembers.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {teamMembers.filter((m: any) => m.isActive).length} {t('teamDetail.active')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              {t('teamDetail.total.balance')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-total-balance">
              ${totalBalance.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('teamDetail.avg')} ${teamClients.length > 0 ? Math.round(totalBalance / teamClients.length).toLocaleString() : '0'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {t('teamDetail.conversions')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-conversions">{convertedClients}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {teamClients.length > 0 ? Math.round((convertedClients / teamClients.length) * 100) : 0}% {t('teamDetail.rate')}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('teamDetail.team.members')}</CardTitle>
          </CardHeader>
          <CardContent>
            {teamMembers.length > 0 ? (
              <div className="space-y-3">
                {teamMembers.map((member: any) => {
                  const memberClients = teamClients.filter((c: any) => c.assignedAgentId === member.id);
                  return (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md" data-testid={`member-${member.id}`}>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {member.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{memberClients.length} {t('teamDetail.clients')}</p>
                        <p className="text-xs text-muted-foreground">
                          {memberClients.filter((c: any) => c.isActive).length} {t('teamDetail.active')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">{t('teamDetail.no.members')}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('teamDetail.client.distribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('teamDetail.agent')}</TableHead>
                  <TableHead className="text-right">{t('common.total')}</TableHead>
                  <TableHead className="text-right">{t('common.active')}</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientDistribution.map((item: any) => (
                  <TableRow key={item.agent.id}>
                    <TableCell className="font-medium">{item.agent.name}</TableCell>
                    <TableCell className="text-right">{item.count}</TableCell>
                    <TableCell className="text-right">{item.activeCount}</TableCell>
                    <TableCell className="text-right">
                      {teamClients.length > 0 ? Math.round((item.count / teamClients.length) * 100) : 0}%
                    </TableCell>
                  </TableRow>
                ))}
                {clientDistribution.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-sm text-muted-foreground">
                      {t('teamDetail.no.data')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('teamDetail.team.clients')}</CardTitle>
        </CardHeader>
        <CardContent>
          {teamClients.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('teamDetail.client')}</TableHead>
                  <TableHead>{t('teamDetail.agent')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>{t('common.balance')}</TableHead>
                  <TableHead>{t('common.active')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamClients.map((client: any) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <Link href={`/clients/${client.id}`}>
                        <span className="font-medium hover:underline cursor-pointer">
                          {client.firstName} {client.lastName}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {client.assignedAgent?.name || t('teamDetail.unassigned')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {client.status || t('teamDetail.status.new')}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      ${(client.account?.balance || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={client.isActive ? 'default' : 'secondary'} className="text-xs">
                        {client.isActive ? t('common.active') : t('common.inactive')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">{t('teamDetail.no.clients')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

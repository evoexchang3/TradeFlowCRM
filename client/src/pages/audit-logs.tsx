import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Filter, Download, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { useLanguage } from "@/contexts/LanguageContext";

export default function AuditLogs() {
  const { t } = useLanguage();
  const [actionFilter, setActionFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("week");

  const { data: logs, isLoading } = useQuery({
    queryKey: ['/api/audit-logs', actionFilter, userFilter, dateFilter],
  });

  const actionTypes = [
    { value: 'all', label: t('audit.all.actions') },
    { value: 'login', label: t('audit.action.login') },
    { value: 'client_create', label: t('audit.action.client.create') },
    { value: 'client_edit', label: t('audit.action.client.edit') },
    { value: 'trade_create', label: t('audit.action.trade.create') },
    { value: 'trade_edit', label: t('audit.action.trade.edit') },
    { value: 'balance_adjust', label: t('audit.action.balance.adjust') },
    { value: 'role_change', label: t('audit.action.role.change') },
    { value: 'impersonation', label: t('audit.action.impersonation') },
    { value: 'import', label: t('audit.action.import') },
    { value: 'export', label: t('audit.action.export') },
  ];

  const getActionBadge = (action: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      login: { variant: 'default', label: t('audit.action.login') },
      client_create: { variant: 'default', label: t('audit.action.client.create') },
      client_edit: { variant: 'secondary', label: t('audit.action.client.edit') },
      trade_create: { variant: 'default', label: t('audit.action.trade.create') },
      trade_edit: { variant: 'secondary', label: t('audit.action.trade.edit') },
      balance_adjust: { variant: 'destructive', label: t('audit.action.balance.adjust') },
      impersonation: { variant: 'destructive', label: t('audit.action.impersonation') },
    };
    const badgeConfig = config[action] || { variant: 'secondary', label: action };
    return (
      <Badge variant={badgeConfig.variant as any} className="text-xs">
        {badgeConfig.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-audit-title">{t('audit.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('audit.subtitle.full')}
          </p>
        </div>
        <Button variant="outline" size="sm" data-testid="button-export-logs" className="hover-elevate active-elevate-2">
          <Download className="h-4 w-4 mr-2" />
          {t('audit.export.logs')}
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[200px]" data-testid="select-action-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {actionTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-date-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">{t('audit.date.today')}</SelectItem>
                <SelectItem value="week">{t('audit.date.last.7.days')}</SelectItem>
                <SelectItem value="month">{t('audit.date.last.30.days')}</SelectItem>
                <SelectItem value="all">{t('audit.date.all.time')}</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder={t('audit.search.by.user')}
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="max-w-xs"
              data-testid="input-user-filter"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('audit.timestamp')}</TableHead>
                  <TableHead>{t('audit.user')}</TableHead>
                  <TableHead>{t('audit.action')}</TableHead>
                  <TableHead>{t('audit.target')}</TableHead>
                  <TableHead>{t('audit.details')}</TableHead>
                  <TableHead>{t('audit.ip.address')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.map((log: any) => (
                  <TableRow key={log.id} className="hover-elevate">
                    <TableCell className="text-sm">
                      <div>
                        <p>{new Date(log.createdAt).toLocaleDateString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{log.user?.name || t('audit.system')}</p>
                        <p className="text-xs text-muted-foreground">{log.user?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{log.targetType || '-'}</p>
                        {log.targetId && (
                          <p className="text-xs text-muted-foreground font-mono">
                            {log.targetId.slice(0, 8)}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details).slice(0, 50) + '...' : '-'}
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">
                      {log.ipAddress || '-'}
                    </TableCell>
                  </TableRow>
                )) || (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <p className="text-sm text-muted-foreground">{t('audit.no.logs.found')}</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

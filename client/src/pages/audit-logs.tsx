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

export default function AuditLogs() {
  const [actionFilter, setActionFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("week");

  const { data: logs, isLoading } = useQuery({
    queryKey: ['/api/audit-logs', actionFilter, userFilter, dateFilter],
  });

  const actionTypes = [
    { value: 'all', label: 'All Actions' },
    { value: 'login', label: 'Login' },
    { value: 'client_create', label: 'Client Create' },
    { value: 'client_edit', label: 'Client Edit' },
    { value: 'trade_create', label: 'Trade Create' },
    { value: 'trade_edit', label: 'Trade Edit' },
    { value: 'balance_adjust', label: 'Balance Adjust' },
    { value: 'role_change', label: 'Role Change' },
    { value: 'impersonation', label: 'Impersonation' },
    { value: 'import', label: 'Import' },
    { value: 'export', label: 'Export' },
  ];

  const getActionBadge = (action: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      login: { variant: 'default', label: 'Login' },
      client_create: { variant: 'default', label: 'Client Create' },
      client_edit: { variant: 'secondary', label: 'Client Edit' },
      trade_create: { variant: 'default', label: 'Trade Create' },
      trade_edit: { variant: 'secondary', label: 'Trade Edit' },
      balance_adjust: { variant: 'destructive', label: 'Balance Adjust' },
      impersonation: { variant: 'destructive', label: 'Impersonation' },
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
          <h1 className="text-2xl font-semibold" data-testid="text-audit-title">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">
            Track all system activities and changes
          </p>
        </div>
        <Button variant="outline" size="sm" data-testid="button-export-logs" className="hover-elevate active-elevate-2">
          <Download className="h-4 w-4 mr-2" />
          Export Logs
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
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Search by user..."
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
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>IP Address</TableHead>
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
                        <p className="font-medium text-sm">{log.user?.name || 'System'}</p>
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
                      <p className="text-sm text-muted-foreground">No audit logs found</p>
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

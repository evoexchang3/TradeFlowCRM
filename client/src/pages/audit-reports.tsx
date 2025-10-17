import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Download, Search, Filter, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const ACTION_TYPES = [
  'login',
  'logout',
  'client_create',
  'client_edit',
  'client_delete',
  'client_ftd_marked',
  'client_transferred',
  'trade_create',
  'trade_edit',
  'trade_close',
  'trade_delete',
  'balance_adjust',
  'role_create',
  'role_edit',
  'role_delete',
  'permission_change',
  'import',
  'export',
  'impersonation',
  'api_key_create',
  'api_key_revoke',
  'api_key_use',
  'symbol_create',
  'symbol_edit',
  'symbol_delete',
  'symbol_group_create',
  'symbol_group_edit',
  'symbol_group_delete',
  'calendar_event_create',
  'calendar_event_edit',
  'calendar_event_delete',
  'email_template_create',
  'email_template_edit',
  'email_template_delete',
  'webhook_received',
  'workload_adjusted',
  'routing_rule_create',
  'routing_rule_edit',
  'routing_rule_delete',
  'smart_assignment_toggle',
  'smart_assignment_config',
];

const TARGET_TYPES = [
  'client',
  'user',
  'order',
  'position',
  'account',
  'role',
  'team',
  'settings',
  'performance_target',
];

export default function AuditReports() {
  const [userId, setUserId] = useState("");
  const [actionType, setActionType] = useState("all");
  const [targetType, setTargetType] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const limit = 50;

  const queryParams = {
    ...(userId && { userId }),
    ...(actionType !== 'all' && { actionType }),
    ...(targetType !== 'all' && { targetType }),
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    limit: limit.toString(),
    offset: (page * limit).toString(),
  };

  const { data: auditData, isLoading } = useQuery({
    queryKey: ['/api/audit/reports', queryParams],
    queryFn: async () => {
      const params = new URLSearchParams(queryParams as Record<string, string>);
      const response = await fetch(`/api/audit/reports?${params.toString()}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch audit reports');
      }
      
      return response.json();
    },
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
  });

  const handleExport = () => {
    const params = new URLSearchParams({
      ...queryParams,
      export: 'csv',
    } as Record<string, string>);
    
    window.open(`/api/audit/reports?${params.toString()}`, '_blank');
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('create')) return "bg-green-500 text-white";
    if (action.includes('edit')) return "bg-blue-500 text-white";
    if (action.includes('delete')) return "bg-red-500 text-white";
    if (action === 'login') return "bg-purple-500 text-white";
    if (action === 'logout') return "bg-gray-500 text-white";
    if (action === 'impersonation') return "bg-orange-500 text-white";
    if (action.includes('adjust')) return "bg-yellow-500 text-white";
    if (action.includes('marked')) return "bg-cyan-500 text-white";
    return "bg-muted";
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <FileText className="h-8 w-8 text-primary" />
            Enhanced Audit Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive audit trail with advanced filtering
          </p>
        </div>
        
        <Button onClick={handleExport} variant="outline" data-testid="button-export">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">User</label>
              <Select value={userId} onValueChange={setUserId} data-testid="select-user">
                <SelectTrigger>
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Users</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Action Type</label>
              <Select value={actionType} onValueChange={setActionType} data-testid="select-action">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {ACTION_TYPES.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action.replace(/_/g, ' ').toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Target Type</label>
              <Select value={targetType} onValueChange={setTargetType} data-testid="select-target">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {TARGET_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, ' ').toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-start-date"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="input-end-date"
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => {
                  setUserId("");
                  setActionType("all");
                  setTargetType("all");
                  setStartDate("");
                  setEndDate("");
                  setPage(0);
                }}
                variant="outline"
                className="w-full"
                data-testid="button-reset-filters"
              >
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
          {auditData && (
            <p className="text-sm text-muted-foreground">
              Showing {auditData.logs.length} of {auditData.pagination.total} records
            </p>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Loading audit logs...</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Target Type</TableHead>
                    <TableHead>Target ID</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead className="text-center">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditData?.logs && auditData.logs.length > 0 ? (
                    auditData.logs.map((log: any) => (
                      <TableRow key={log.id} data-testid={`row-log-${log.id}`}>
                        <TableCell className="text-sm">
                          {format(new Date(log.createdAt), 'MMM dd, yyyy HH:mm:ss')}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{log.userName}</div>
                            {log.userEmail && (
                              <div className="text-xs text-muted-foreground">{log.userEmail}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getActionBadgeColor(log.action)}>
                            {log.action.replace(/_/g, ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.targetType ? (
                            <Badge variant="outline">
                              {log.targetType.replace(/_/g, ' ').toUpperCase()}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {log.targetId ? log.targetId.substring(0, 8) + '...' : '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.ipAddress || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {log.details && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedLog(log)}
                              data-testid={`button-view-details-${log.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No audit logs found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {auditData && auditData.pagination.total > limit && (
                <div className="flex items-center justify-between mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 0}
                    data-testid="button-prev-page"
                  >
                    Previous
                  </Button>
                  
                  <span className="text-sm text-muted-foreground">
                    Page {page + 1} of {Math.ceil(auditData.pagination.total / limit)}
                  </span>
                  
                  <Button
                    variant="outline"
                    onClick={() => setPage(page + 1)}
                    disabled={!auditData.pagination.hasMore}
                    data-testid="button-next-page"
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date & Time</label>
                  <p className="font-medium">{format(new Date(selectedLog.createdAt), 'PPpp')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">User</label>
                  <p className="font-medium">{selectedLog.userName}</p>
                  {selectedLog.userEmail && (
                    <p className="text-sm text-muted-foreground">{selectedLog.userEmail}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Action</label>
                  <p>
                    <Badge className={getActionBadgeColor(selectedLog.action)}>
                      {selectedLog.action.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Target</label>
                  <p>
                    <Badge variant="outline">
                      {selectedLog.targetType?.replace(/_/g, ' ').toUpperCase() || 'N/A'}
                    </Badge>
                  </p>
                  {selectedLog.targetId && (
                    <p className="text-xs font-mono text-muted-foreground mt-1">{selectedLog.targetId}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">IP Address</label>
                  <p className="font-medium">{selectedLog.ipAddress || 'N/A'}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Details</label>
                <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <pre className="text-sm">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

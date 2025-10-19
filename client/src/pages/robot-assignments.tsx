import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TradingRobot, Client, Account, RobotClientAssignment } from "@shared/schema";
import { ArrowLeft, Users } from "lucide-react";
import { Link } from "wouter";

interface ClientWithAccount extends Client {
  account?: Account;
}

export default function RobotAssignmentsPage() {
  const { id: robotId } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [balanceFilter, setBalanceFilter] = useState<string>("all");

  const { data: robot } = useQuery<TradingRobot>({
    queryKey: ["/api/robots", robotId],
  });

  const { data: clients = [], isLoading: clientsLoading } = useQuery<ClientWithAccount[]>({
    queryKey: ["/api/clients"],
  });

  const { data: assignments = [] } = useQuery<RobotClientAssignment[]>({
    queryKey: ["/api/robots", robotId, "assignments"],
  });

  const assignMutation = useMutation({
    mutationFn: ({ accountId, isActive }: { accountId: string; isActive: boolean }) =>
      apiRequest(`/api/robots/${robotId}/assignments`, "POST", { accountId, isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/robots", robotId, "assignments"] });
      toast({
        title: "Success",
        description: "Assignment updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkAssignMutation = useMutation({
    mutationFn: ({ accountIds, isActive }: { accountIds: string[]; isActive: boolean }) =>
      apiRequest(`/api/robots/${robotId}/assignments/bulk`, "POST", { accountIds, isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/robots", robotId, "assignments"] });
      setSelectedClients([]);
      toast({
        title: "Success",
        description: "Bulk assignment completed successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter clients
  const filteredClients = clients.filter((client) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = `${client.firstName} ${client.lastName}`.toLowerCase().includes(query);
      const matchesEmail = client.email?.toLowerCase().includes(query);
      if (!matchesName && !matchesEmail) return false;
    }

    // Team filter
    if (teamFilter !== "all" && client.teamId !== teamFilter) return false;

    // Status filter
    if (statusFilter !== "all" && client.status !== statusFilter) return false;

    // Balance filter
    if (balanceFilter !== "all" && client.account) {
      const balance = parseFloat(client.account.balance || "0");
      if (balanceFilter === "high" && balance < 10000) return false;
      if (balanceFilter === "medium" && (balance < 1000 || balance >= 10000)) return false;
      if (balanceFilter === "low" && balance >= 1000) return false;
    }

    return true;
  });

  const handleToggleAssignment = (accountId: string, isActive: boolean) => {
    assignMutation.mutate({ accountId, isActive });
  };

  const handleBulkEnable = () => {
    if (selectedClients.length === 0) {
      toast({
        title: "No clients selected",
        description: "Please select at least one client",
        variant: "destructive",
      });
      return;
    }

    const accountIds = selectedClients
      .map((clientId) => {
        const client = clients.find((c) => c.id === clientId);
        return client?.account?.id;
      })
      .filter((id): id is string => !!id);

    if (accountIds.length === 0) {
      toast({
        title: "No valid accounts",
        description: "Selected clients don't have trading accounts",
        variant: "destructive",
      });
      return;
    }

    if (accountIds.length < selectedClients.length) {
      toast({
        title: "Warning",
        description: `${selectedClients.length - accountIds.length} client(s) skipped (no account)`,
      });
    }

    bulkAssignMutation.mutate({ accountIds, isActive: true });
  };

  const handleBulkDisable = () => {
    if (selectedClients.length === 0) {
      toast({
        title: "No clients selected",
        description: "Please select at least one client",
        variant: "destructive",
      });
      return;
    }

    const accountIds = selectedClients
      .map((clientId) => {
        const client = clients.find((c) => c.id === clientId);
        return client?.account?.id;
      })
      .filter((id): id is string => !!id);

    if (accountIds.length === 0) {
      toast({
        title: "No valid accounts",
        description: "Selected clients don't have trading accounts",
        variant: "destructive",
      });
      return;
    }

    if (accountIds.length < selectedClients.length) {
      toast({
        title: "Warning",
        description: `${selectedClients.length - accountIds.length} client(s) skipped (no account)`,
      });
    }

    bulkAssignMutation.mutate({ accountIds, isActive: false });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedClients(filteredClients.map((c) => c.id));
    } else {
      setSelectedClients([]);
    }
  };

  const isClientAssigned = (accountId?: string) => {
    if (!accountId) return false;
    const assignment = assignments.find((a) => a.accountId === accountId);
    return assignment?.isActive ?? false;
  };

  if (clientsLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Loading clients...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/configuration/robots">
          <Button variant="outline" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Assign Robot to Clients</h1>
          {robot && (
            <p className="text-muted-foreground">
              Managing assignments for "{robot.name}"
            </p>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter clients by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search"
              />
            </div>
            <div>
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger data-testid="select-team-filter">
                  <SelectValue placeholder="Filter by team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {/* Add team options dynamically */}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={balanceFilter} onValueChange={setBalanceFilter}>
                <SelectTrigger data-testid="select-balance-filter">
                  <SelectValue placeholder="Filter by balance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Balances</SelectItem>
                  <SelectItem value="high">High (&gt;$10k)</SelectItem>
                  <SelectItem value="medium">Medium ($1k-$10k)</SelectItem>
                  <SelectItem value="low">Low (&lt;$1k)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Client Assignments
              </CardTitle>
              <CardDescription>
                {selectedClients.length} of {filteredClients.length} clients selected
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleBulkEnable}
                disabled={selectedClients.length === 0 || bulkAssignMutation.isPending}
                data-testid="button-bulk-enable"
              >
                Enable Selected
              </Button>
              <Button
                variant="outline"
                onClick={handleBulkDisable}
                disabled={selectedClients.length === 0 || bulkAssignMutation.isPending}
                data-testid="button-bulk-disable"
              >
                Disable Selected
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b">
              <Checkbox
                id="select-all"
                checked={
                  filteredClients.length > 0 &&
                  selectedClients.length === filteredClients.length
                }
                onCheckedChange={handleSelectAll}
                data-testid="checkbox-select-all"
              />
              <label
                htmlFor="select-all"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Select All
              </label>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredClients.map((client) => {
                const isAssigned = isClientAssigned(client.account?.id);
                const balance = client.account?.balance
                  ? parseFloat(client.account.balance)
                  : 0;

                return (
                  <div
                    key={client.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
                    data-testid={`client-row-${client.id}`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Checkbox
                        id={`client-${client.id}`}
                        checked={selectedClients.includes(client.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedClients([...selectedClients, client.id]);
                          } else {
                            setSelectedClients(
                              selectedClients.filter((id) => id !== client.id)
                            );
                          }
                        }}
                        data-testid={`checkbox-client-${client.id}`}
                      />
                      <div className="flex-1">
                        <div className="font-medium">
                          {client.firstName} {client.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {client.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          ${balance.toFixed(2)}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {client.status || "New"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm ${
                            isAssigned ? "text-green-600" : "text-muted-foreground"
                          }`}
                        >
                          {isAssigned ? "Enabled" : "Disabled"}
                        </span>
                        <Switch
                          checked={isAssigned}
                          onCheckedChange={(checked) =>
                            client.account &&
                            handleToggleAssignment(client.account.id, checked)
                          }
                          disabled={!client.account || assignMutation.isPending}
                          data-testid={`switch-assignment-${client.id}`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredClients.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                No clients match your filters
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

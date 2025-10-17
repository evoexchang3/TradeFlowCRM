import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ChevronDown, ChevronRight, Plus, Users, TrendingUp, Crown, User } from "lucide-react";
import { insertTeamSchema } from "@shared/schema";
import * as z from "zod";

const teamFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  level: z.string().default("team"),
  parentTeamId: z.string().optional(),
  leaderId: z.string().optional(),
  commissionSplit: z.string().optional(),
});

type TeamFormData = z.infer<typeof teamFormSchema>;

interface TeamNode {
  id: string;
  name: string;
  parentTeamId: string | null;
  level: string;
  leaderId: string | null;
  commissionSplit: string | null;
  children?: TeamNode[];
}

interface TeamPerformance {
  totalClients: number;
  ftdCount: number;
  conversionRate: number;
  childrenMetrics: Array<{
    teamId: string;
    teamName: string;
    ftdCount: number;
  }>;
}

function TeamTreeNode({ team, level = 0, allUsers = [] }: { team: TeamNode; level?: number; allUsers?: any[] }) {
  const [isExpanded, setIsExpanded] = useState(level === 0);
  const { toast } = useToast();

  const { data: performance } = useQuery<TeamPerformance>({
    queryKey: ['/api/teams', team.id, 'performance'],
  });

  const teamLeader = allUsers.find(u => u.id === team.leaderId);
  const teamMembers = allUsers.filter(u => u.teamId === team.id);

  const hasChildren = team.children && team.children.length > 0;
  const hasContent = hasChildren || teamMembers.length > 0;

  return (
    <div className="space-y-2">
      <Card className="hover-elevate">
        <CardHeader className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1">
              {hasContent && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsExpanded(!isExpanded)}
                  data-testid={`button-toggle-${team.id}`}
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              )}
              <div className="flex-1">
                <CardTitle className="text-base" data-testid={`text-team-name-${team.id}`}>
                  {team.name}
                </CardTitle>
                <CardDescription className="text-xs">
                  {team.level}
                  {teamLeader && ` • Leader: ${teamLeader.firstName} ${teamLeader.lastName}`}
                  {teamMembers.length > 0 && ` • ${teamMembers.length} member${teamMembers.length !== 1 ? 's' : ''}`}
                  {team.commissionSplit && ` • ${team.commissionSplit}% commission`}
                </CardDescription>
              </div>
            </div>
            
            {performance && (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1" data-testid={`text-clients-${team.id}`}>
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{performance.totalClients}</span>
                </div>
                <div className="flex items-center gap-1" data-testid={`text-ftd-${team.id}`}>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span>{performance.ftdCount} FTD</span>
                </div>
                <div className="text-muted-foreground" data-testid={`text-conversion-${team.id}`}>
                  {performance.conversionRate.toFixed(1)}%
                </div>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {isExpanded && (
        <div className="ml-8 space-y-2">
          {teamMembers.length > 0 && (
            <Card>
              <CardHeader className="p-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team Members ({teamMembers.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="space-y-1">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center gap-2 text-sm p-2 rounded-md hover-elevate" data-testid={`text-member-${member.id}`}>
                      {member.id === team.leaderId ? (
                        <Crown className="h-3 w-3 text-yellow-600 dark:text-yellow-500" />
                      ) : (
                        <User className="h-3 w-3 text-muted-foreground" />
                      )}
                      <span>{member.firstName} {member.lastName}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{member.email}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {hasChildren && team.children!.map((child) => (
            <TeamTreeNode key={child.id} team={child} level={level + 1} allUsers={allUsers} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Hierarchy() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: hierarchyTree = [], isLoading } = useQuery<TeamNode[]>({
    queryKey: ['/api/hierarchy/tree'],
  });

  const { data: allTeams = [] } = useQuery<any[]>({
    queryKey: ['/api/teams'],
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
  });

  const form = useForm<TeamFormData>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: {
      name: "",
      level: "team",
      parentTeamId: undefined,
      leaderId: undefined,
      commissionSplit: undefined,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: TeamFormData) => apiRequest('POST', '/api/teams', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hierarchy/tree'] });
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      toast({ title: "Success", description: "Team created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (data: TeamFormData) => {
    const finalData = {
      ...data,
      parentTeamId: data.parentTeamId || undefined,
      leaderId: data.leaderId || undefined,
      commissionSplit: data.commissionSplit || undefined,
    };
    createMutation.mutate(finalData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading hierarchy...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Organizational Hierarchy</h1>
          <p className="text-muted-foreground">Manage team structure and commission splits</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-team">
              <Plus className="h-4 w-4 mr-2" />
              Add Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Sales Team" data-testid="input-team-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-level">
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="region">Region</SelectItem>
                          <SelectItem value="country">Country</SelectItem>
                          <SelectItem value="team">Team</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="parentTeamId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Team (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-parent">
                            <SelectValue placeholder="Select parent team" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {allTeams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name} ({team.level})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="leaderId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team Leader (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-leader">
                            <SelectValue placeholder="Select team leader" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.firstName} {user.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="commissionSplit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Commission Split % (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          placeholder="10.00"
                          data-testid="input-commission"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit">
                    {createMutation.isPending ? "Creating..." : "Create Team"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {hierarchyTree.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No teams in hierarchy. Create your first team to get started.
            </CardContent>
          </Card>
        ) : (
          hierarchyTree.map((team) => <TeamTreeNode key={team.id} team={team} allUsers={users} />)
        )}
      </div>
    </div>
  );
}

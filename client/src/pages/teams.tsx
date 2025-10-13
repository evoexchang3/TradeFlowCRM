import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, UsersRound, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Teams() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', leaderId: '' });
  const { toast } = useToast();

  const { data: teams, isLoading } = useQuery({
    queryKey: ['/api/teams'],
  });

  const { data: users } = useQuery({
    queryKey: ['/api/users'],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/teams', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      toast({ title: "Team created successfully" });
      setIsOpen(false);
      setFormData({ name: '', leaderId: '' });
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-teams-title">Teams</h1>
          <p className="text-sm text-muted-foreground">
            Manage teams and member assignments
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-create-team" className="hover-elevate active-elevate-2">
              <Plus className="h-4 w-4 mr-2" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Team Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Sales Team Alpha"
                  data-testid="input-team-name"
                />
              </div>
              <div>
                <Label>Team Leader</Label>
                <Select value={formData.leaderId} onValueChange={(value) => setFormData({ ...formData, leaderId: value })}>
                  <SelectTrigger data-testid="select-team-leader">
                    <SelectValue placeholder="Select team leader" />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.map((user: any) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => createMutation.mutate(formData)}
                  disabled={createMutation.isPending}
                  data-testid="button-save-team"
                  className="hover-elevate active-elevate-2"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Team'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams?.map((team: any) => (
            <Card key={team.id} className="hover-elevate">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <UsersRound className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg" data-testid={`text-team-${team.id}`}>{team.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Team Leader</p>
                    <p className="text-sm text-muted-foreground">{team.leader?.name || 'Not assigned'}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Members</span>
                    <span className="font-medium">{team.memberCount || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Clients</span>
                    <span className="font-medium">{team.clientCount || 0}</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full" asChild data-testid={`button-manage-team-${team.id}`}>
                  <Link href={`/teams/${team.id}`}>Manage Team</Link>
                </Button>
              </CardContent>
            </Card>
          )) || (
            <div className="col-span-full text-center py-12">
              <p className="text-sm text-muted-foreground">No teams found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Edit, TrendingUp } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { insertPerformanceTargetSchema, type PerformanceTarget, type User, type Team } from '@shared/schema';
import { format } from 'date-fns';

const createTargetSchema = insertPerformanceTargetSchema.extend({
  targetValue: z.coerce.number().positive('Target value must be positive'),
  targetMonth: z.string().min(1, 'Target month is required'),
}).omit({
  startDate: true,
  endDate: true,
  createdBy: true,
});

type CreateTargetFormData = z.infer<typeof createTargetSchema> & {
  targetMonth: string;
};

export default function Targets() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [filterAssignment, setFilterAssignment] = useState<string>('all');

  const { data: targets = [], isLoading } = useQuery<PerformanceTarget[]>({
    queryKey: ['/api/performance-targets'],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users/agents'],
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
  });

  const { data: me } = useQuery<{ user?: { id: string } }>({
    queryKey: ['/api/me'],
  });

  const form = useForm<CreateTargetFormData>({
    resolver: zodResolver(createTargetSchema),
    defaultValues: {
      targetType: 'ftd',
      period: 'monthly',
      targetValue: '' as any,
      agentId: undefined,
      teamId: undefined,
      department: undefined,
      targetMonth: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateTargetFormData) => apiRequest('POST', '/api/performance-targets', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/performance-targets'] });
      toast({
        title: t('targets.created.title'),
        description: t('targets.created.description'),
      });
      setCreateDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('targets.create.failed'),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/performance-targets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/performance-targets'] });
      toast({
        title: t('targets.deleted.title'),
        description: t('targets.deleted.description'),
      });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('targets.delete.failed'),
      });
    },
  });

  const onSubmit = (data: CreateTargetFormData) => {
    if (!me?.user?.id) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: 'User not authenticated',
      });
      return;
    }

    const [year, month] = data.targetMonth.split('-');
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

    const submitData = {
      targetType: data.targetType,
      period: data.period,
      targetValue: data.targetValue.toString(),
      agentId: data.agentId,
      teamId: data.teamId,
      department: data.department as any,
      startDate: startDate,
      endDate: endDate,
      createdBy: me.user.id,
    };
    
    createMutation.mutate(submitData);
  };

  const filteredTargets = targets.filter((target) => {
    if (filterPeriod !== 'all' && target.period !== filterPeriod) return false;
    if (filterAssignment === 'individual' && !target.agentId) return false;
    if (filterAssignment === 'team' && !target.teamId) return false;
    if (filterAssignment === 'department' && !target.department) return false;
    return true;
  });

  const calculateProgress = (current: string, target: string) => {
    const currentNum = parseFloat(current);
    const targetNum = parseFloat(target);
    if (targetNum === 0) return 0;
    return Math.min(Math.round((currentNum / targetNum) * 100), 100);
  };

  const getAssignmentLabel = (target: PerformanceTarget) => {
    if (target.agentId) {
      const user = users.find(u => u.id === target.agentId);
      return user ? `${user.firstName} ${user.lastName}` : t('targets.individual');
    }
    if (target.teamId) {
      const team = teams.find(t => t.id === target.teamId);
      return team ? team.name : t('targets.team');
    }
    if (target.department) {
      return target.department.charAt(0).toUpperCase() + target.department.slice(1);
    }
    return t('targets.unassigned');
  };

  const getTargetTypeLabel = (type: string) => {
    switch (type) {
      case 'ftd': return t('targets.type.ftd');
      case 'std': return t('targets.type.std');
      case 'calls': return t('targets.type.calls');
      case 'revenue': return t('targets.type.revenue');
      default: return type;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('targets.title')}</h1>
          <p className="text-muted-foreground">{t('targets.description')}</p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          data-testid="button-create-target"
          className="hover-elevate active-elevate-2"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('targets.create.new')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter-period">
                <SelectValue placeholder={t('targets.filter.period')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('targets.filter.all')}</SelectItem>
                <SelectItem value="monthly">{t('targets.filter.monthly')}</SelectItem>
                <SelectItem value="quarterly">{t('targets.filter.quarterly')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterAssignment} onValueChange={setFilterAssignment}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter-assignment">
                <SelectValue placeholder={t('targets.filter.assignment')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('targets.filter.all')}</SelectItem>
                <SelectItem value="individual">{t('targets.filter.individual')}</SelectItem>
                <SelectItem value="team">{t('targets.filter.team')}</SelectItem>
                <SelectItem value="department">{t('targets.filter.department')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredTargets.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">{t('targets.empty.title')}</h3>
              <p className="text-sm text-muted-foreground mt-1">{t('targets.empty.description')}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('targets.table.assignment')}</TableHead>
                    <TableHead>{t('targets.table.type')}</TableHead>
                    <TableHead>{t('targets.table.period')}</TableHead>
                    <TableHead>{t('targets.table.target')}</TableHead>
                    <TableHead>{t('targets.table.current')}</TableHead>
                    <TableHead>{t('targets.table.progress')}</TableHead>
                    <TableHead>{t('targets.table.dates')}</TableHead>
                    <TableHead>{t('targets.table.status')}</TableHead>
                    <TableHead className="w-[100px]">{t('targets.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTargets.map((target) => {
                    const progress = calculateProgress(target.currentValue, target.targetValue);
                    return (
                      <TableRow key={target.id} data-testid={`row-target-${target.id}`}>
                        <TableCell>
                          <div className="font-medium">{getAssignmentLabel(target)}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getTargetTypeLabel(target.targetType)}</Badge>
                        </TableCell>
                        <TableCell className="capitalize">{target.period}</TableCell>
                        <TableCell className="font-medium">{target.targetValue}</TableCell>
                        <TableCell>{target.currentValue}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Progress value={progress} className="h-2" />
                            <p className="text-xs text-muted-foreground">{progress}%</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(target.startDate), 'MMM d')} - {format(new Date(target.endDate), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={target.isActive ? 'default' : 'secondary'}>
                            {target.isActive ? t('targets.status.active') : t('targets.status.inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(target.id)}
                            data-testid={`button-delete-target-${target.id}`}
                            className="hover-elevate active-elevate-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('targets.create.title')}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="targetType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('targets.form.type')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} onOpenChange={(open) => !open && field.onBlur()}>
                        <FormControl>
                          <SelectTrigger data-testid="select-target-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ftd">{t('targets.type.ftd')}</SelectItem>
                          <SelectItem value="std">{t('targets.type.std')}</SelectItem>
                          <SelectItem value="calls">{t('targets.type.calls')}</SelectItem>
                          <SelectItem value="revenue">{t('targets.type.revenue')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="period"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('targets.form.period')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} onOpenChange={(open) => !open && field.onBlur()}>
                        <FormControl>
                          <SelectTrigger data-testid="select-period">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="monthly">{t('targets.filter.monthly')}</SelectItem>
                          <SelectItem value="quarterly">{t('targets.filter.quarterly')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="targetValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('targets.form.target.value')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="1" 
                          min="1"
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? '' : parseInt(e.target.value))}
                          onBlur={field.onBlur}
                          name={field.name}
                          data-testid="input-target-value" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="agentId"
                  render={({ field}) => (
                    <FormItem>
                      <FormLabel>{t('targets.form.agent')}</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          const agentId = value === 'none' ? undefined : value;
                          field.onChange(agentId);
                          
                          if (agentId) {
                            const agent = users.find(u => u.id === agentId);
                            if (agent?.teamId) {
                              form.setValue('teamId', agent.teamId);
                              const team = teams.find(t => t.id === agent.teamId);
                              if (team?.department) {
                                form.setValue('department', team.department as any);
                              }
                            }
                          }
                        }} 
                        value={field.value || 'none'}
                        onOpenChange={(open) => !open && field.onBlur()}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-agent">
                            <SelectValue placeholder={t('targets.form.select.agent')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">{t('targets.form.none')}</SelectItem>
                          {users.length > 0 ? (
                            users.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-agents" disabled>No agents available</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="teamId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('targets.form.team')}</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value === 'none' ? undefined : value)} 
                        value={field.value || 'none'}
                        onOpenChange={(open) => !open && field.onBlur()}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-team">
                            <SelectValue placeholder={t('targets.form.select.team')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">{t('targets.form.none')}</SelectItem>
                          {teams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name}
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
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('targets.form.department')}</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value === 'none' ? undefined : value)} 
                        value={field.value || 'none'}
                        onOpenChange={(open) => !open && field.onBlur()}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-department">
                            <SelectValue placeholder={t('targets.form.select.department')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">{t('targets.form.none')}</SelectItem>
                          <SelectItem value="sales">{t('targets.department.sales')}</SelectItem>
                          <SelectItem value="retention">{t('targets.department.retention')}</SelectItem>
                          <SelectItem value="support">{t('targets.department.support')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="targetMonth"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>{t('targets.form.target.month')}</FormLabel>
                      <FormControl>
                        <Input {...field} type="month" data-testid="input-target-month" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                  data-testid="button-cancel"
                  className="hover-elevate active-elevate-2"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-submit"
                  className="hover-elevate active-elevate-2"
                >
                  {createMutation.isPending ? t('targets.creating') : t('targets.create.target')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, TrendingUp, TrendingDown, MoreVertical, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/LanguageContext";

export default function GlobalClosedPositions() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSymbol, setFilterSymbol] = useState<string>('all');
  const [filterSide, setFilterSide] = useState<string>('all');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<any>(null);
  const { toast } = useToast();
  
  const editClosedPositionSchema = z.object({
    openPrice: z.string().refine((val) => val === "" || (!isNaN(parseFloat(val)) && parseFloat(val) > 0), {
      message: t('positions.validation.open.price.positive'),
    }).optional(),
    closePrice: z.string().refine((val) => val === "" || (!isNaN(parseFloat(val)) && parseFloat(val) > 0), {
      message: t('positions.validation.close.price.positive'),
    }).optional(),
    quantity: z.string().refine((val) => val === "" || (!isNaN(parseFloat(val)) && parseFloat(val) > 0), {
      message: t('positions.validation.quantity.positive'),
    }).optional(),
    realizedPnl: z.string().refine((val) => val === "" || !isNaN(parseFloat(val)), {
      message: t('positions.validation.realized.pnl.valid'),
    }).optional(),
  });

  type EditClosedPositionData = z.infer<typeof editClosedPositionSchema>;
  
  const { data: positions = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/positions/all/closed'],
  });

  const form = useForm<EditClosedPositionData>({
    resolver: zodResolver(editClosedPositionSchema),
    defaultValues: {
      openPrice: "",
      closePrice: "",
      quantity: "",
      realizedPnl: "",
    },
  });

  const editMutation = useMutation({
    mutationFn: async (data: EditClosedPositionData) => {
      const processedData: Record<string, any> = {};
      
      if (data.openPrice && data.openPrice !== "") {
        processedData.openPrice = parseFloat(data.openPrice).toString();
      }
      if (data.closePrice && data.closePrice !== "") {
        processedData.closePrice = parseFloat(data.closePrice).toString();
      }
      if (data.quantity && data.quantity !== "") {
        processedData.quantity = parseFloat(data.quantity).toString();
      }
      if (data.realizedPnl && data.realizedPnl !== "") {
        processedData.realizedPnl = parseFloat(data.realizedPnl).toString();
      }
      
      return apiRequest('PATCH', `/api/positions/${selectedPosition.id}`, processedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/positions/all/closed'] });
      setEditDialogOpen(false);
      toast({
        title: t('positions.toast.updated.title'),
        description: t('positions.toast.updated.description'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('positions.toast.update.failed'),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (positionId: string) => {
      return apiRequest('DELETE', `/api/positions/${positionId}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/positions/all/closed'] });
      setDeleteDialogOpen(false);
      toast({
        title: t('positions.toast.deleted.title'),
        description: t('positions.toast.deleted.description'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('positions.toast.delete.failed'),
        variant: "destructive",
      });
    },
  });

  const handleEdit = (position: any) => {
    setSelectedPosition(position);
    form.reset({
      openPrice: position.openPrice || "",
      closePrice: position.closePrice || "",
      quantity: position.quantity || "",
      realizedPnl: position.realizedPnl || "",
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (position: any) => {
    setSelectedPosition(position);
    setDeleteDialogOpen(true);
  };

  const onEditSubmit = (data: EditClosedPositionData) => {
    editMutation.mutate(data);
  };

  const onDeleteConfirm = () => {
    if (selectedPosition) {
      deleteMutation.mutate(selectedPosition.id);
    }
  };

  const filteredPositions = positions?.filter((position: any) => {
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      const matchesSearch = 
        position.clientName?.toLowerCase().includes(search) ||
        position.clientEmail?.toLowerCase().includes(search) ||
        position.symbol?.toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }

    if (filterSymbol && filterSymbol !== 'all') {
      if (position.symbol !== filterSymbol) return false;
    }

    if (filterSide && filterSide !== 'all') {
      if (position.side !== filterSide) return false;
    }

    return true;
  });

  const uniqueSymbols = positions 
    ? Array.from(new Set(positions.map((p: any) => p.symbol))).sort()
    : [];

  const totalPnL = filteredPositions?.reduce((sum: number, p: any) => 
    sum + parseFloat(p.realizedPnl || '0'), 0) || 0;
  
  const profitableCount = filteredPositions?.filter((p: any) => parseFloat(p.realizedPnl || '0') > 0).length || 0;

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">{t('positions.loading.closed')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">{t('positions.closed.title')}</h1>
          <p className="text-muted-foreground">
            {t('positions.closed.subtitle')}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle data-testid="text-stats-title">{t('positions.performance.overview')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('positions.total.positions')}</p>
              <p className="text-2xl font-bold" data-testid="text-total-positions">{filteredPositions?.length || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('positions.total.realized.pnl')}</p>
              <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-total-pnl">
                ${totalPnL.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('positions.profitable.trades')}</p>
              <p className="text-2xl font-bold" data-testid="text-profitable-trades">
                {profitableCount}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('positions.win.rate')}</p>
              <p className="text-2xl font-bold" data-testid="text-win-rate">
                {filteredPositions && filteredPositions.length > 0 
                  ? ((profitableCount / filteredPositions.length) * 100).toFixed(1) 
                  : 0}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('positions.search.placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Select value={filterSymbol} onValueChange={setFilterSymbol}>
              <SelectTrigger className="w-full md:w-[200px]" data-testid="select-symbol-filter">
                <SelectValue placeholder={t('positions.all.symbols')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('positions.all.symbols')}</SelectItem>
                {uniqueSymbols.map((symbol: any) => (
                  <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSide} onValueChange={setFilterSide}>
              <SelectTrigger className="w-full md:w-[200px]" data-testid="select-side-filter">
                <SelectValue placeholder={t('positions.all.sides')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('positions.all.sides')}</SelectItem>
                <SelectItem value="buy">{t('positions.buy')}</SelectItem>
                <SelectItem value="sell">{t('positions.sell')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('positions.client')}</TableHead>
                <TableHead>{t('positions.symbol')}</TableHead>
                <TableHead>{t('positions.side')}</TableHead>
                <TableHead>{t('positions.quantity')}</TableHead>
                <TableHead>{t('positions.open.price')}</TableHead>
                <TableHead>{t('positions.close.price')}</TableHead>
                <TableHead>{t('positions.realized.pnl')}</TableHead>
                <TableHead>{t('positions.closed')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPositions && filteredPositions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <p className="text-muted-foreground" data-testid="text-no-positions">{t('positions.no.closed.positions')}</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPositions?.map((position: any) => {
                  const pnl = parseFloat(position.realizedPnl || '0');
                  return (
                    <TableRow key={position.id} data-testid={`row-position-${position.id}`}>
                      <TableCell>
                        <Link href={`/clients/${position.clientId}`}>
                          <a className="hover:underline" data-testid={`link-client-${position.id}`}>
                            <div className="font-medium">{position.clientName}</div>
                            <div className="text-sm text-muted-foreground">{position.accountNumber}</div>
                          </a>
                        </Link>
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`text-symbol-${position.id}`}>
                        {position.symbol}
                      </TableCell>
                      <TableCell>
                        <Badge variant={position.side === 'buy' ? 'default' : 'secondary'} data-testid={`badge-side-${position.id}`}>
                          {position.side === 'buy' ? (
                            <><TrendingUp className="h-3 w-3 mr-1" /> {t('positions.buy')}</>
                          ) : (
                            <><TrendingDown className="h-3 w-3 mr-1" /> {t('positions.sell')}</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-quantity-${position.id}`}>{position.quantity}</TableCell>
                      <TableCell data-testid={`text-open-price-${position.id}`}>${parseFloat(position.openPrice).toFixed(2)}</TableCell>
                      <TableCell data-testid={`text-close-price-${position.id}`}>${parseFloat(position.closePrice || '0').toFixed(2)}</TableCell>
                      <TableCell className={pnl >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'} data-testid={`text-pnl-${position.id}`}>
                        ${pnl.toFixed(2)}
                      </TableCell>
                      <TableCell data-testid={`text-closed-${position.id}`}>
                        {position.closedAt ? new Date(position.closedAt).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-actions-${position.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEdit(position)} data-testid={`button-edit-${position.id}`}>
                              <Edit className="h-4 w-4 mr-2" />
                              {t('positions.edit.position')}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(position)} 
                              className="text-destructive"
                              data-testid={`button-delete-${position.id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('positions.delete.position')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent data-testid="dialog-edit-position">
          <DialogHeader>
            <DialogTitle>{t('positions.edit.closed.position')}</DialogTitle>
            <DialogDescription>
              {t('positions.edit.description', { symbol: selectedPosition?.symbol })}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="openPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('positions.open.price')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="text" placeholder="0.00" data-testid="input-open-price" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="closePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('positions.close.price')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="text" placeholder="0.00" data-testid="input-close-price" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('positions.quantity')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="text" placeholder="0.00" data-testid="input-quantity" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="realizedPnl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('positions.realized.pnl')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="text" placeholder="0.00" data-testid="input-realized-pnl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} data-testid="button-cancel-edit">
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={editMutation.isPending} data-testid="button-submit-edit">
                  {editMutation.isPending ? t('positions.updating') : t('positions.update.position')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent data-testid="dialog-delete-position">
          <DialogHeader>
            <DialogTitle>{t('positions.delete.position')}</DialogTitle>
            <DialogDescription>
              {t('positions.delete.confirm')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm"><strong>{t('positions.delete.symbol')}</strong> {selectedPosition?.symbol}</p>
            <p className="text-sm"><strong>{t('positions.delete.client')}</strong> {selectedPosition?.clientName}</p>
            <p className="text-sm"><strong>{t('positions.delete.quantity')}</strong> {selectedPosition?.quantity}</p>
            <p className="text-sm"><strong>{t('positions.delete.realized.pnl')}</strong> ${parseFloat(selectedPosition?.realizedPnl || '0').toFixed(2)}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} data-testid="button-cancel-delete">
              {t('common.cancel')}
            </Button>
            <Button 
              variant="destructive" 
              onClick={onDeleteConfirm} 
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? t('positions.deleting') : t('positions.delete.position')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, TrendingUp, TrendingDown, MoreVertical, Edit, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportMode, setExportMode] = useState<'filtered' | 'all'>('filtered');
  const { toast } = useToast();
  
  const editClosedPositionSchema = z.object({
    side: z.enum(['buy', 'sell']).optional(),
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
    openedAt: z.string().refine((val) => val === "" || !isNaN(Date.parse(val)), {
      message: t('positions.validation.opened.date.valid'),
    }).optional(),
    closedAt: z.string().refine((val) => val === "" || !isNaN(Date.parse(val)), {
      message: t('positions.validation.closed.date.valid'),
    }).optional(),
    commission: z.string().refine((val) => val === "" || !isNaN(parseFloat(val)), {
      message: t('positions.validation.commission.valid'),
    }).optional(),
    notes: z.string().optional(),
  });

  type EditClosedPositionData = z.infer<typeof editClosedPositionSchema>;
  
  const { data: positions = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/positions/all/closed'],
  });

  const form = useForm<EditClosedPositionData>({
    resolver: zodResolver(editClosedPositionSchema),
    defaultValues: {
      side: undefined,
      openPrice: "",
      closePrice: "",
      quantity: "",
      realizedPnl: "",
      openedAt: "",
      closedAt: "",
      commission: "",
      notes: "",
    },
  });

  const editMutation = useMutation({
    mutationFn: async (data: EditClosedPositionData) => {
      const processedData: Record<string, any> = {};
      
      if (data.side) {
        processedData.side = data.side;
      }
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
      if (data.openedAt && data.openedAt !== "") {
        // Convert datetime-local to ISO 8601 with timezone
        processedData.openedAt = new Date(data.openedAt).toISOString();
      }
      if (data.closedAt && data.closedAt !== "") {
        // Convert datetime-local to ISO 8601 with timezone
        processedData.closedAt = new Date(data.closedAt).toISOString();
      }
      if (data.commission && data.commission !== "") {
        processedData.commission = parseFloat(data.commission).toString();
      }
      if (data.notes !== undefined) {
        processedData.notes = data.notes;
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

  // Convert ISO string to datetime-local format (preserving the instant in local time)
  const toDatetimeLocal = (isoString: string): string => {
    if (!isoString) return "";
    const date = new Date(isoString);
    // Format as YYYY-MM-DDTHH:MM (local timezone)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleEdit = (position: any) => {
    setSelectedPosition(position);
    
    form.reset({
      side: position.side || undefined,
      openPrice: position.openPrice || "",
      closePrice: position.closePrice || "",
      quantity: position.quantity || "",
      realizedPnl: position.realizedPnl || "",
      openedAt: toDatetimeLocal(position.openedAt),
      closedAt: toDatetimeLocal(position.closedAt),
      commission: position.commission || "",
      notes: position.notes || "",
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

  const exportToCSV = () => {
    // Determine which positions to export
    let positionsToExport: any[] = [];
    
    if (exportMode === 'filtered') {
      positionsToExport = filteredPositions || [];
    } else {
      positionsToExport = positions || [];
    }

    if (positionsToExport.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no positions to export",
        variant: "destructive",
      });
      return;
    }

    // CSV Headers
    const headers = [
      'Client Name',
      'Account Number',
      'Symbol',
      'Side',
      'Quantity',
      'Open Price',
      'Close Price',
      'Realized P/L',
      'Commission',
      'Opened At',
      'Closed At',
      'Hold Time (hours)',
      'Notes'
    ];

    // CSV Rows
    const rows = positionsToExport.map((pos: any) => {
      const openTime = pos.openedAt ? new Date(pos.openedAt) : null;
      const closeTime = pos.closedAt ? new Date(pos.closedAt) : null;
      const holdTimeHours = openTime && closeTime 
        ? ((closeTime.getTime() - openTime.getTime()) / (1000 * 60 * 60)).toFixed(2)
        : '';
      
      return [
        pos.clientName || '',
        pos.accountNumber || '',
        pos.symbol || '',
        pos.side || '',
        pos.quantity || '',
        pos.openPrice || '',
        pos.closePrice || '',
        pos.realizedPnl || '',
        pos.commission || '',
        openTime ? openTime.toLocaleString() : '',
        closeTime ? closeTime.toLocaleString() : '',
        holdTimeHours,
        pos.notes || ''
      ].map(field => {
        // Escape double quotes and wrap in quotes if contains comma or newline
        const str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().split('T')[0];
    
    link.setAttribute('href', url);
    link.setAttribute('download', `positions_closed_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export successful",
      description: `Exported ${positionsToExport.length} positions to CSV`,
    });

    setExportDialogOpen(false);
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

  // Enhanced performance metrics
  const winningTrades = filteredPositions?.filter((p: any) => parseFloat(p.realizedPnl || '0') > 0) || [];
  const losingTrades = filteredPositions?.filter((p: any) => parseFloat(p.realizedPnl || '0') < 0) || [];
  
  const totalWins = winningTrades.reduce((sum: number, p: any) => sum + parseFloat(p.realizedPnl || '0'), 0);
  const totalLosses = Math.abs(losingTrades.reduce((sum: number, p: any) => sum + parseFloat(p.realizedPnl || '0'), 0));
  
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;
  const averageWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
  const averageLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;
  
  const largestWin = winningTrades.length > 0 
    ? Math.max(...winningTrades.map((p: any) => parseFloat(p.realizedPnl || '0')))
    : 0;
  const largestLoss = losingTrades.length > 0 
    ? Math.abs(Math.min(...losingTrades.map((p: any) => parseFloat(p.realizedPnl || '0'))))
    : 0;

  const totalCommission = filteredPositions?.reduce((sum: number, p: any) => 
    sum + parseFloat(p.commission || '0'), 0) || 0;
  const netPnL = totalPnL - totalCommission;

  // Calculate average hold time
  let totalHoldTime = 0;
  let holdTimeCount = 0;
  filteredPositions?.forEach((p: any) => {
    if (p.openedAt && p.closedAt) {
      const openTime = new Date(p.openedAt).getTime();
      const closeTime = new Date(p.closedAt).getTime();
      totalHoldTime += (closeTime - openTime);
      holdTimeCount++;
    }
  });
  const averageHoldTimeHours = holdTimeCount > 0
    ? totalHoldTime / holdTimeCount / (1000 * 60 * 60)
    : 0;

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
        <Button
          variant="outline"
          onClick={() => setExportDialogOpen(true)}
          data-testid="button-export"
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle data-testid="text-overview-title">Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <p className="text-sm text-muted-foreground">Net P/L (After Commission)</p>
              <p className={`text-2xl font-bold ${netPnL >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-net-pnl">
                ${netPnL.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Commission</p>
              <p className="text-xl font-semibold text-muted-foreground" data-testid="text-total-commission">
                ${totalCommission.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle data-testid="text-win-loss-title">Win/Loss Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('positions.win.rate')}</p>
              <p className="text-2xl font-bold" data-testid="text-win-rate">
                {filteredPositions && filteredPositions.length > 0 
                  ? ((profitableCount / filteredPositions.length) * 100).toFixed(1) 
                  : 0}%
              </p>
              <p className="text-xs text-muted-foreground">
                {profitableCount} wins / {losingTrades.length} losses
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Profit Factor</p>
              <p className={`text-2xl font-bold ${profitFactor >= 1 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-profit-factor">
                {profitFactor >= 999 ? '∞' : profitFactor.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                ${totalWins.toFixed(2)} wins / ${totalLosses.toFixed(2)} losses
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Average Win</p>
              <p className="text-xl font-semibold text-green-600" data-testid="text-average-win">
                ${averageWin.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Average Loss</p>
              <p className="text-xl font-semibold text-red-600" data-testid="text-average-loss">
                ${averageLoss.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle data-testid="text-extremes-title">Extremes & Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Largest Win</p>
              <p className="text-2xl font-bold text-green-600" data-testid="text-largest-win">
                ${largestWin.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Largest Loss</p>
              <p className="text-2xl font-bold text-red-600" data-testid="text-largest-loss">
                ${largestLoss.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Average Hold Time</p>
              <p className="text-xl font-semibold" data-testid="text-average-hold-time">
                {averageHoldTimeHours < 24 
                  ? `${averageHoldTimeHours.toFixed(1)} hours`
                  : `${(averageHoldTimeHours / 24).toFixed(1)} days`
                }
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Risk/Reward Ratio</p>
              <p className="text-xl font-semibold" data-testid="text-risk-reward">
                {averageLoss > 0 
                  ? `1:${(averageWin / averageLoss).toFixed(2)}`
                  : averageWin > 0 
                    ? '1:∞'
                    : 'N/A'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

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
                        <Link href={`/clients/${position.clientId}`} className="hover:underline" data-testid={`link-client-${position.id}`}>
                          <div className="font-medium">{position.clientName}</div>
                          <div className="text-sm text-muted-foreground">{position.accountNumber}</div>
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
                name="side"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('positions.side')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-side">
                          <SelectValue placeholder={t('positions.select.side')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="buy">{t('positions.buy')}</SelectItem>
                        <SelectItem value="sell">{t('positions.sell')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="openedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('positions.opened.at')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="datetime-local" data-testid="input-opened-at" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="closedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('positions.closed.at')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="datetime-local" data-testid="input-closed-at" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              <FormField
                control={form.control}
                name="commission"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('positions.commission')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="text" placeholder="0.00" data-testid="input-commission" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('positions.notes')}</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder={t('positions.notes.placeholder')} rows={3} data-testid="input-notes" />
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

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent data-testid="dialog-export">
          <DialogHeader>
            <DialogTitle>Export Closed Positions</DialogTitle>
            <DialogDescription>
              Choose what data to export and download as CSV file
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Export Mode</label>
              <Select value={exportMode} onValueChange={(value: any) => setExportMode(value)}>
                <SelectTrigger data-testid="select-export-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="filtered">
                    Export Filtered ({filteredPositions?.length || 0} positions)
                  </SelectItem>
                  <SelectItem value="all">
                    Export All ({positions?.length || 0} positions)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">
                <strong>Export includes:</strong> Client Name, Account Number, Symbol, Side, Quantity, 
                Open Price, Close Price, Realized P/L, Commission, Opened At, Closed At, 
                Hold Time (hours), and Notes
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setExportDialogOpen(false)} data-testid="button-cancel-export">
              Cancel
            </Button>
            <Button type="button" onClick={exportToCSV} data-testid="button-confirm-export">
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, TrendingUp, TrendingDown, MoreVertical, Edit, Trash2, CheckSquare, Square, Filter, X, Download } from "lucide-react";
import { TagManagementDialog } from "@/components/tag-management-dialog";
import { PositionTags } from "@/components/position-tags";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
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

export default function GlobalOpenPositions() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSymbol, setFilterSymbol] = useState<string>('all');
  const [filterSide, setFilterSide] = useState<string>('all');
  const [filterTags, setFilterTags] = useState<Set<string>>(new Set());
  const [tagFilterOpen, setTagFilterOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<any>(null);
  const [selectedPositions, setSelectedPositions] = useState<Set<string>>(new Set());
  const [bulkTagsToAdd, setBulkTagsToAdd] = useState<Set<string>>(new Set());
  const [bulkTagsToRemove, setBulkTagsToRemove] = useState<Set<string>>(new Set());
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportMode, setExportMode] = useState<'selected' | 'filtered' | 'all'>('filtered');
  const { toast } = useToast();
  
  const editPositionSchema = z.object({
    side: z.enum(['buy', 'sell']).optional(),
    openPrice: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: t('positions.validation.open.price.positive'),
    }).optional(),
    closePrice: z.string().refine((val) => val === "" || (!isNaN(parseFloat(val)) && parseFloat(val) > 0), {
      message: t('positions.validation.close.price.positive'),
    }).optional(),
    quantity: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: t('positions.validation.quantity.positive'),
    }).optional(),
    unrealizedPnl: z.string().refine((val) => val === "" || !isNaN(parseFloat(val)), {
      message: t('positions.validation.unrealized.pnl.valid'),
    }).optional(),
    openedAt: z.string().refine((val) => val === "" || !isNaN(Date.parse(val)), {
      message: t('positions.validation.opened.date.valid'),
    }).optional(),
    stopLoss: z.string().refine((val) => val === "" || (!isNaN(parseFloat(val)) && parseFloat(val) > 0), {
      message: t('positions.validation.stop.loss.valid'),
    }).optional(),
    takeProfit: z.string().refine((val) => val === "" || (!isNaN(parseFloat(val)) && parseFloat(val) > 0), {
      message: t('positions.validation.take.profit.valid'),
    }).optional(),
    notes: z.string().optional(),
  });
  
  type EditPositionData = z.infer<typeof editPositionSchema>;
  
  const { data: positions = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/positions/all/open'],
  });

  const { data: allTags = [] } = useQuery<any[]>({
    queryKey: ['/api/position-tags'],
  });

  const form = useForm<EditPositionData>({
    resolver: zodResolver(editPositionSchema),
    defaultValues: {
      side: undefined,
      openPrice: "",
      closePrice: "",
      quantity: "",
      unrealizedPnl: "",
      openedAt: "",
      stopLoss: "",
      takeProfit: "",
      notes: "",
    },
  });

  const bulkEditSchema = z.object({
    stopLoss: z.string().refine((val) => val === "" || (!isNaN(parseFloat(val)) && parseFloat(val) > 0), {
      message: t('positions.validation.stop.loss.valid'),
    }).optional(),
    takeProfit: z.string().refine((val) => val === "" || (!isNaN(parseFloat(val)) && parseFloat(val) > 0), {
      message: t('positions.validation.take.profit.valid'),
    }).optional(),
    commission: z.string().refine((val) => val === "" || !isNaN(parseFloat(val)), {
      message: t('positions.validation.commission.valid'),
    }).optional(),
    notes: z.string().optional(),
  });

  type BulkEditData = z.infer<typeof bulkEditSchema>;

  const bulkForm = useForm<BulkEditData>({
    resolver: zodResolver(bulkEditSchema),
    defaultValues: {
      stopLoss: "",
      takeProfit: "",
      commission: "",
      notes: "",
    },
  });

  const editMutation = useMutation({
    mutationFn: async (data: EditPositionData) => {
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
      if (data.unrealizedPnl && data.unrealizedPnl !== "") {
        processedData.unrealizedPnl = parseFloat(data.unrealizedPnl).toString();
      }
      if (data.openedAt && data.openedAt !== "") {
        // Convert datetime-local to ISO 8601 with timezone
        processedData.openedAt = new Date(data.openedAt).toISOString();
      }
      if (data.stopLoss && data.stopLoss !== "") {
        processedData.stopLoss = parseFloat(data.stopLoss).toString();
      }
      if (data.takeProfit && data.takeProfit !== "") {
        processedData.takeProfit = parseFloat(data.takeProfit).toString();
      }
      if (data.notes !== undefined) {
        processedData.notes = data.notes;
      }
      
      return apiRequest('PATCH', `/api/positions/${selectedPosition.id}`, processedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/positions/all/open'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/positions/all/open'] });
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

  const bulkEditMutation = useMutation({
    mutationFn: async ({ data, positionIds }: { data: BulkEditData, positionIds: string[] }) => {
      const processedData: Record<string, any> = {};
      
      if (data.stopLoss && data.stopLoss !== "") {
        processedData.stopLoss = parseFloat(data.stopLoss).toString();
      }
      if (data.takeProfit && data.takeProfit !== "") {
        processedData.takeProfit = parseFloat(data.takeProfit).toString();
      }
      if (data.commission && data.commission !== "") {
        processedData.commission = parseFloat(data.commission).toString();
      }
      if (data.notes !== undefined && data.notes !== "") {
        processedData.notes = data.notes;
      }
      
      return apiRequest('PATCH', '/api/positions/bulk-update', {
        positionIds,
        updates: processedData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/positions/all/open'] });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('positions.toast.bulk.update.failed'),
        variant: "destructive",
      });
    },
  });

  const togglePosition = (positionId: string) => {
    const newSelected = new Set(selectedPositions);
    if (newSelected.has(positionId)) {
      newSelected.delete(positionId);
    } else {
      newSelected.add(positionId);
    }
    setSelectedPositions(newSelected);
  };

  const toggleAll = () => {
    if (selectedPositions.size === filteredPositions?.length) {
      setSelectedPositions(new Set());
    } else {
      setSelectedPositions(new Set(filteredPositions?.map((p: any) => p.id)));
    }
  };

  const bulkTagMutation = useMutation({
    mutationFn: async ({ positionIds, tagsToAdd, tagsToRemove }: { positionIds: string[], tagsToAdd: string[], tagsToRemove: string[] }) => {
      return apiRequest('POST', '/api/positions/bulk/tags', {
        positionIds,
        tagsToAdd,
        tagsToRemove,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/positions/all/open'] });
      queryClient.invalidateQueries({ queryKey: ['/api/positions'] });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || "Failed to update tags",
        variant: "destructive",
      });
    },
  });

  const onBulkEditSubmit = async (data: BulkEditData) => {
    // Cache the selected position IDs and count before mutations
    const positionIds = Array.from(selectedPositions);
    const positionCount = positionIds.length;
    const tagsToAdd = Array.from(bulkTagsToAdd);
    const tagsToRemove = Array.from(bulkTagsToRemove);
    
    // Check if there are any updates to perform
    const hasFieldUpdates = data.stopLoss !== "" || data.takeProfit !== "" || data.commission !== "" || data.notes !== "";
    const hasTagUpdates = tagsToAdd.length > 0 || tagsToRemove.length > 0;
    
    if (!hasFieldUpdates && !hasTagUpdates) {
      toast({
        title: t('common.error'),
        description: t('positions.validation.at.least.one.field'),
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Perform bulk edit if there are field updates
      if (hasFieldUpdates) {
        await bulkEditMutation.mutateAsync({ data, positionIds });
      }
      
      // Perform bulk tag operations if any tags are selected
      if (hasTagUpdates) {
        await bulkTagMutation.mutateAsync({ positionIds, tagsToAdd, tagsToRemove });
      }
      
      // Show success toast with cached count
      toast({
        title: t('positions.toast.bulk.updated.title'),
        description: t('positions.toast.bulk.updated.description', { count: positionCount }),
      });
      
      // Reset states after both operations complete
      setBulkEditDialogOpen(false);
      setSelectedPositions(new Set());
      setBulkTagsToAdd(new Set());
      setBulkTagsToRemove(new Set());
      bulkForm.reset();
    } catch (error) {
      // Error handling is done in individual mutation error handlers
    }
  };

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
      unrealizedPnl: position.unrealizedPnl || "",
      openedAt: toDatetimeLocal(position.openedAt),
      stopLoss: position.stopLoss || "",
      takeProfit: position.takeProfit || "",
      notes: position.notes || "",
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (position: any) => {
    setSelectedPosition(position);
    setDeleteDialogOpen(true);
  };

  const onEditSubmit = (data: EditPositionData) => {
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
    
    if (exportMode === 'selected') {
      if (selectedPositions.size === 0) {
        toast({
          title: "No positions selected",
          description: "Please select positions to export",
          variant: "destructive",
        });
        return;
      }
      positionsToExport = positions.filter((p: any) => selectedPositions.has(p.id));
    } else if (exportMode === 'filtered') {
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
      'Current Price',
      'Unrealized P/L',
      'Stop Loss',
      'Take Profit',
      'Commission',
      'Opened At',
      'Tags',
      'Notes'
    ];

    // CSV Rows
    const rows = positionsToExport.map((pos: any) => {
      const tags = pos.tags?.map((tag: any) => tag.name).join('; ') || '';
      return [
        pos.clientName || '',
        pos.accountNumber || '',
        pos.symbol || '',
        pos.side || '',
        pos.quantity || '',
        pos.openPrice || '',
        pos.currentPrice || '',
        pos.unrealizedPnl || '',
        pos.stopLoss || '',
        pos.takeProfit || '',
        pos.commission || '',
        pos.openedAt ? new Date(pos.openedAt).toLocaleString() : '',
        tags,
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
    link.setAttribute('download', `positions_open_${timestamp}.csv`);
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

  // Client-side filtering
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

    // Tag filtering - show positions that have ANY of the selected tags (OR logic)
    if (filterTags.size > 0) {
      const positionTagIds = position.tags?.map((tag: any) => tag.id) || [];
      const hasMatchingTag = Array.from(filterTags).some(tagId => positionTagIds.includes(tagId));
      if (!hasMatchingTag) return false;
    }

    return true;
  });

  const uniqueSymbols = positions 
    ? Array.from(new Set(positions.map((p: any) => p.symbol))).sort()
    : [];

  const totalPnL = filteredPositions?.reduce((sum: number, p: any) => 
    sum + parseFloat(p.unrealizedPnl || '0'), 0) || 0;
  
  const totalVolume = filteredPositions?.reduce((sum: number, p: any) => 
    sum + parseFloat(p.quantity || '0'), 0) || 0;

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">{t('positions.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">{t('positions.open.title')}</h1>
          <p className="text-muted-foreground">
            {t('positions.active.across.all.clients')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setExportDialogOpen(true)}
            data-testid="button-export"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <TagManagementDialog />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle data-testid="text-stats-title">{t('positions.overview.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('positions.total.positions')}</p>
              <p className="text-2xl font-bold" data-testid="text-total-positions">{filteredPositions?.length || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('positions.total.pnl')}</p>
              <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-total-pnl">
                ${totalPnL.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('positions.buy.positions')}</p>
              <p className="text-2xl font-bold" data-testid="text-buy-positions">
                {filteredPositions?.filter((p: any) => p.side === 'buy').length || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('positions.sell.positions')}</p>
              <p className="text-2xl font-bold" data-testid="text-sell-positions">
                {filteredPositions?.filter((p: any) => p.side === 'sell').length || 0}
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
            
            <Popover open={tagFilterOpen} onOpenChange={setTagFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full md:w-[200px] justify-start"
                  data-testid="button-tag-filter"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {filterTags.size > 0 ? `${filterTags.size} Tags` : 'Filter by Tags'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[250px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search tags..." data-testid="input-search-tag-filter" />
                  <CommandList>
                    <CommandEmpty>No tags found.</CommandEmpty>
                    <CommandGroup>
                      {allTags.map((tag: any) => (
                        <CommandItem
                          key={tag.id}
                          onSelect={() => {
                            const newFilterTags = new Set(filterTags);
                            if (newFilterTags.has(tag.id)) {
                              newFilterTags.delete(tag.id);
                            } else {
                              newFilterTags.add(tag.id);
                            }
                            setFilterTags(newFilterTags);
                          }}
                          data-testid={`command-item-tag-${tag.id}`}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <Checkbox
                              checked={filterTags.has(tag.id)}
                              onCheckedChange={() => {}}
                              data-testid={`checkbox-tag-filter-${tag.id}`}
                            />
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: tag.color }}
                            />
                            <span className="flex-1">{tag.name}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
                {filterTags.size > 0 && (
                  <div className="p-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFilterTags(new Set())}
                      className="w-full"
                      data-testid="button-clear-tag-filter"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear Selection
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
          
          {filterTags.size > 0 && (
            <div className="flex flex-wrap gap-2 pt-4">
              <span className="text-sm text-muted-foreground">Active tag filters:</span>
              {Array.from(filterTags).map(tagId => {
                const tag = allTags.find((t: any) => t.id === tagId);
                if (!tag) return null;
                return (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    className="gap-1"
                    data-testid={`badge-active-filter-${tag.id}`}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                    <X
                      className="h-3 w-3 cursor-pointer hover:bg-muted rounded-sm"
                      onClick={() => {
                        const newFilterTags = new Set(filterTags);
                        newFilterTags.delete(tag.id);
                        setFilterTags(newFilterTags);
                      }}
                      data-testid={`button-remove-filter-${tag.id}`}
                    />
                  </Badge>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedPositions.size > 0 && (
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-primary" />
                <span className="font-medium" data-testid="text-selected-count">
                  {selectedPositions.size} {t('positions.selected')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setBulkEditDialogOpen(true)}
                  data-testid="button-bulk-edit"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {t('positions.bulk.edit')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedPositions(new Set())}
                  data-testid="button-clear-selection"
                >
                  {t('common.clear')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedPositions.size > 0 && selectedPositions.size === filteredPositions?.length}
                    onCheckedChange={toggleAll}
                    data-testid="checkbox-select-all"
                  />
                </TableHead>
                <TableHead>{t('positions.client')}</TableHead>
                <TableHead>{t('positions.symbol')}</TableHead>
                <TableHead>{t('positions.side')}</TableHead>
                <TableHead>{t('positions.quantity')}</TableHead>
                <TableHead>{t('positions.open.price')}</TableHead>
                <TableHead>{t('positions.current.pnl')}</TableHead>
                <TableHead>{t('positions.opened')}</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPositions && filteredPositions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <p className="text-muted-foreground" data-testid="text-no-positions">{t('positions.no.positions')}</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPositions?.map((position: any) => {
                  const pnl = parseFloat(position.unrealizedPnl || '0');
                  return (
                    <TableRow key={position.id} data-testid={`row-position-${position.id}`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedPositions.has(position.id)}
                          onCheckedChange={() => togglePosition(position.id)}
                          data-testid={`checkbox-position-${position.id}`}
                        />
                      </TableCell>
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
                      <TableCell className={pnl >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'} data-testid={`text-pnl-${position.id}`}>
                        ${pnl.toFixed(2)}
                      </TableCell>
                      <TableCell data-testid={`text-opened-${position.id}`}>
                        {new Date(position.openedAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <PositionTags positionId={position.id} />
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
            <DialogTitle>{t('positions.edit.position')}</DialogTitle>
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
                name="unrealizedPnl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('positions.unrealized.pnl')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="text" placeholder="0.00" data-testid="input-unrealized-pnl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stopLoss"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('positions.stop.loss')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="text" placeholder="0.00" data-testid="input-stop-loss" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="takeProfit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('positions.take.profit')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="text" placeholder="0.00" data-testid="input-take-profit" />
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

      <Dialog open={bulkEditDialogOpen} onOpenChange={setBulkEditDialogOpen}>
        <DialogContent data-testid="dialog-bulk-edit">
          <DialogHeader>
            <DialogTitle>{t('positions.bulk.edit')}</DialogTitle>
            <DialogDescription>
              {t('positions.bulk.edit.description', { count: selectedPositions.size })}
            </DialogDescription>
          </DialogHeader>
          <Form {...bulkForm}>
            <form onSubmit={bulkForm.handleSubmit(onBulkEditSubmit)} className="space-y-4">
              <FormField
                control={bulkForm.control}
                name="stopLoss"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('positions.stop.loss')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="text" placeholder={t('positions.optional.leave.blank')} data-testid="input-bulk-stop-loss" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={bulkForm.control}
                name="takeProfit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('positions.take.profit')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="text" placeholder={t('positions.optional.leave.blank')} data-testid="input-bulk-take-profit" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={bulkForm.control}
                name="commission"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('positions.commission')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="text" placeholder={t('positions.optional.leave.blank')} data-testid="input-bulk-commission" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={bulkForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('positions.notes')}</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder={t('positions.bulk.notes.placeholder')} rows={3} data-testid="input-bulk-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-3 pt-2 border-t">
                <h4 className="font-medium text-sm">Tag Operations</h4>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Add Tags</label>
                  <div className="flex flex-wrap gap-2 min-h-[2rem] p-2 border rounded-md">
                    {bulkTagsToAdd.size === 0 ? (
                      <span className="text-sm text-muted-foreground">No tags selected</span>
                    ) : (
                      Array.from(bulkTagsToAdd).map(tagId => {
                        const tag = allTags.find((t: any) => t.id === tagId);
                        if (!tag) return null;
                        return (
                          <Badge
                            key={tag.id}
                            variant="outline"
                            className="gap-1"
                            data-testid={`badge-bulk-add-${tag.id}`}
                          >
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: tag.color }}
                            />
                            {tag.name}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => {
                                const newTags = new Set(bulkTagsToAdd);
                                newTags.delete(tag.id);
                                setBulkTagsToAdd(newTags);
                              }}
                              data-testid={`button-remove-bulk-add-${tag.id}`}
                            />
                          </Badge>
                        );
                      })
                    )}
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        data-testid="button-select-tags-to-add"
                      >
                        <Filter className="h-4 w-4 mr-2" />
                        Select Tags to Add
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[250px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search tags..." data-testid="input-search-bulk-add-tags" />
                        <CommandList>
                          <CommandEmpty>No tags found.</CommandEmpty>
                          <CommandGroup>
                            {allTags.map((tag: any) => (
                              <CommandItem
                                key={tag.id}
                                onSelect={() => {
                                  const newTags = new Set(bulkTagsToAdd);
                                  if (newTags.has(tag.id)) {
                                    newTags.delete(tag.id);
                                  } else {
                                    newTags.add(tag.id);
                                    // Remove from "remove" list if present
                                    const newRemoveTags = new Set(bulkTagsToRemove);
                                    newRemoveTags.delete(tag.id);
                                    setBulkTagsToRemove(newRemoveTags);
                                  }
                                  setBulkTagsToAdd(newTags);
                                }}
                                data-testid={`command-item-bulk-add-${tag.id}`}
                              >
                                <div className="flex items-center gap-2 w-full">
                                  <Checkbox
                                    checked={bulkTagsToAdd.has(tag.id)}
                                    onCheckedChange={() => {}}
                                    data-testid={`checkbox-bulk-add-${tag.id}`}
                                  />
                                  <div
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: tag.color }}
                                  />
                                  <span className="flex-1">{tag.name}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Remove Tags</label>
                  <div className="flex flex-wrap gap-2 min-h-[2rem] p-2 border rounded-md">
                    {bulkTagsToRemove.size === 0 ? (
                      <span className="text-sm text-muted-foreground">No tags selected</span>
                    ) : (
                      Array.from(bulkTagsToRemove).map(tagId => {
                        const tag = allTags.find((t: any) => t.id === tagId);
                        if (!tag) return null;
                        return (
                          <Badge
                            key={tag.id}
                            variant="outline"
                            className="gap-1"
                            data-testid={`badge-bulk-remove-${tag.id}`}
                          >
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: tag.color }}
                            />
                            {tag.name}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => {
                                const newTags = new Set(bulkTagsToRemove);
                                newTags.delete(tag.id);
                                setBulkTagsToRemove(newTags);
                              }}
                              data-testid={`button-remove-bulk-remove-${tag.id}`}
                            />
                          </Badge>
                        );
                      })
                    )}
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        data-testid="button-select-tags-to-remove"
                      >
                        <Filter className="h-4 w-4 mr-2" />
                        Select Tags to Remove
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[250px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search tags..." data-testid="input-search-bulk-remove-tags" />
                        <CommandList>
                          <CommandEmpty>No tags found.</CommandEmpty>
                          <CommandGroup>
                            {allTags.map((tag: any) => (
                              <CommandItem
                                key={tag.id}
                                onSelect={() => {
                                  const newTags = new Set(bulkTagsToRemove);
                                  if (newTags.has(tag.id)) {
                                    newTags.delete(tag.id);
                                  } else {
                                    newTags.add(tag.id);
                                    // Remove from "add" list if present
                                    const newAddTags = new Set(bulkTagsToAdd);
                                    newAddTags.delete(tag.id);
                                    setBulkTagsToAdd(newAddTags);
                                  }
                                  setBulkTagsToRemove(newTags);
                                }}
                                data-testid={`command-item-bulk-remove-${tag.id}`}
                              >
                                <div className="flex items-center gap-2 w-full">
                                  <Checkbox
                                    checked={bulkTagsToRemove.has(tag.id)}
                                    onCheckedChange={() => {}}
                                    data-testid={`checkbox-bulk-remove-${tag.id}`}
                                  />
                                  <div
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: tag.color }}
                                  />
                                  <span className="flex-1">{tag.name}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setBulkEditDialogOpen(false)} data-testid="button-cancel-bulk-edit">
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={bulkEditMutation.isPending} data-testid="button-submit-bulk-edit">
                  {bulkEditMutation.isPending ? t('positions.updating') : t('positions.bulk.update', { count: selectedPositions.size })}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent data-testid="dialog-export">
          <DialogHeader>
            <DialogTitle>Export Positions</DialogTitle>
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
                  <SelectItem value="selected" disabled={selectedPositions.size === 0}>
                    Export Selected ({selectedPositions.size} positions)
                  </SelectItem>
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
                Open Price, Current Price, Unrealized P/L, Stop Loss, Take Profit, Commission, 
                Opened At, Tags, and Notes
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

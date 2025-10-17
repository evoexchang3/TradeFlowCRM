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

const editClosedPositionSchema = z.object({
  openPrice: z.string().refine((val) => val === "" || (!isNaN(parseFloat(val)) && parseFloat(val) > 0), {
    message: "Open price must be a positive number",
  }).optional(),
  closePrice: z.string().refine((val) => val === "" || (!isNaN(parseFloat(val)) && parseFloat(val) > 0), {
    message: "Close price must be a positive number",
  }).optional(),
  quantity: z.string().refine((val) => val === "" || (!isNaN(parseFloat(val)) && parseFloat(val) > 0), {
    message: "Quantity must be a positive number",
  }).optional(),
  realizedPnl: z.string().refine((val) => val === "" || !isNaN(parseFloat(val)), {
    message: "Realized P/L must be a valid number",
  }).optional(),
});

type EditClosedPositionData = z.infer<typeof editClosedPositionSchema>;

export default function GlobalClosedPositions() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSymbol, setFilterSymbol] = useState<string>('all');
  const [filterSide, setFilterSide] = useState<string>('all');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<any>(null);
  const { toast } = useToast();
  
  const { data: positions, isLoading } = useQuery({
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
      // Filter out empty values and convert to proper format
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
      
      return apiRequest(`/api/positions/${selectedPosition.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processedData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/positions/all/closed'] });
      setEditDialogOpen(false);
      toast({
        title: "Position updated",
        description: "The position has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update position",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (positionId: string) => {
      return apiRequest(`/api/positions/${positionId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/positions/all/closed'] });
      setDeleteDialogOpen(false);
      toast({
        title: "Position deleted",
        description: "The position has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete position",
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
          <p className="text-muted-foreground">Loading closed positions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Global Closed Positions</h1>
          <p className="text-muted-foreground">
            All closed positions across all clients
          </p>
        </div>
      </div>

      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle data-testid="text-stats-title">Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Positions</p>
              <p className="text-2xl font-bold" data-testid="text-total-positions">{filteredPositions?.length || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Realized P/L</p>
              <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-total-pnl">
                ${totalPnL.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Profitable Trades</p>
              <p className="text-2xl font-bold" data-testid="text-profitable-trades">
                {profitableCount}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Win Rate</p>
              <p className="text-2xl font-bold" data-testid="text-win-rate">
                {filteredPositions && filteredPositions.length > 0 
                  ? ((profitableCount / filteredPositions.length) * 100).toFixed(1) 
                  : 0}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by client, email, or symbol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Select value={filterSymbol} onValueChange={setFilterSymbol}>
              <SelectTrigger className="w-full md:w-[200px]" data-testid="select-symbol-filter">
                <SelectValue placeholder="All Symbols" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Symbols</SelectItem>
                {uniqueSymbols.map((symbol: any) => (
                  <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSide} onValueChange={setFilterSide}>
              <SelectTrigger className="w-full md:w-[200px]" data-testid="select-side-filter">
                <SelectValue placeholder="All Sides" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sides</SelectItem>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="sell">Sell</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Positions Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Side</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Open Price</TableHead>
                <TableHead>Close Price</TableHead>
                <TableHead>Realized P/L</TableHead>
                <TableHead>Closed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPositions && filteredPositions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <p className="text-muted-foreground" data-testid="text-no-positions">No closed positions found</p>
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
                            <><TrendingUp className="h-3 w-3 mr-1" /> Buy</>
                          ) : (
                            <><TrendingDown className="h-3 w-3 mr-1" /> Sell</>
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
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEdit(position)} data-testid={`button-edit-${position.id}`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Position
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(position)} 
                              className="text-destructive"
                              data-testid={`button-delete-${position.id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Position
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

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent data-testid="dialog-edit-position">
          <DialogHeader>
            <DialogTitle>Edit Closed Position</DialogTitle>
            <DialogDescription>
              Update position details for {selectedPosition?.symbol}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="openPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Open Price</FormLabel>
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
                    <FormLabel>Close Price</FormLabel>
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
                    <FormLabel>Quantity</FormLabel>
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
                    <FormLabel>Realized P/L</FormLabel>
                    <FormControl>
                      <Input {...field} type="text" placeholder="0.00" data-testid="input-realized-pnl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} data-testid="button-cancel-edit">
                  Cancel
                </Button>
                <Button type="submit" disabled={editMutation.isPending} data-testid="button-submit-edit">
                  {editMutation.isPending ? "Updating..." : "Update Position"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent data-testid="dialog-delete-position">
          <DialogHeader>
            <DialogTitle>Delete Position</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this position? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm"><strong>Symbol:</strong> {selectedPosition?.symbol}</p>
            <p className="text-sm"><strong>Client:</strong> {selectedPosition?.clientName}</p>
            <p className="text-sm"><strong>Quantity:</strong> {selectedPosition?.quantity}</p>
            <p className="text-sm"><strong>Realized P/L:</strong> ${parseFloat(selectedPosition?.realizedPnl || '0').toFixed(2)}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={onDeleteConfirm} 
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Position"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

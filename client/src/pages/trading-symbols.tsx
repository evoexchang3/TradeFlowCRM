import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

const symbolFormSchema = z.object({
  symbol: z.string().min(1, "Symbol is required"),
  displayName: z.string().min(1, "Display name is required"),
  category: z.enum(["forex", "crypto", "metals", "indices", "commodities"]),
  groupId: z.string().optional(),
  baseAsset: z.string().optional(),
  quoteAsset: z.string().optional(),
  twelveDataSymbol: z.string().min(1, "Twelve Data symbol is required"),
  contractSize: z.string().default("100000"),
  minLotSize: z.string().default("0.01"),
  maxLotSize: z.string().default("100"),
  spreadDefault: z.string().default("0"),
  commissionRate: z.string().default("0"),
  leverage: z.coerce.number().default(100),
  digits: z.coerce.number().default(5),
  isActive: z.boolean().default(true),
});

type SymbolFormData = z.infer<typeof symbolFormSchema>;

interface TradingSymbol {
  id: string;
  symbol: string;
  displayName: string;
  category: string;
  groupId: string | null;
  twelveDataSymbol: string;
  contractSize: string;
  minLotSize: string;
  maxLotSize: string;
  spreadDefault: string;
  commissionRate: string;
  leverage: number;
  digits: number;
  isActive: boolean;
  createdAt: string;
}

interface SymbolGroup {
  id: string;
  name: string;
  displayName: string;
}

export default function TradingSymbolsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSymbol, setEditingSymbol] = useState<TradingSymbol | null>(null);
  const [deletingSymbol, setDeletingSymbol] = useState<TradingSymbol | null>(null);

  // Fetch symbols
  const { data: symbols = [], isLoading } = useQuery<TradingSymbol[]>({
    queryKey: ["/api/symbols"],
  });

  // Fetch symbol groups for dropdown
  const { data: groups = [] } = useQuery<SymbolGroup[]>({
    queryKey: ["/api/symbol-groups"],
  });

  // Create symbol mutation
  const createMutation = useMutation({
    mutationFn: async (data: SymbolFormData) => {
      return await apiRequest("/api/symbols", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/symbols"] });
      toast({
        title: "Symbol Created",
        description: "Trading symbol has been created successfully.",
      });
      setIsAddDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create symbol",
        variant: "destructive",
      });
    },
  });

  // Update symbol mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SymbolFormData> }) => {
      return await apiRequest(`/api/symbols/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/symbols"] });
      toast({
        title: "Symbol Updated",
        description: "Trading symbol has been updated successfully.",
      });
      setEditingSymbol(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update symbol",
        variant: "destructive",
      });
    },
  });

  // Delete symbol mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/symbols/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/symbols"] });
      toast({
        title: "Symbol Deleted",
        description: "Trading symbol has been deleted successfully.",
      });
      setDeletingSymbol(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete symbol",
        variant: "destructive",
      });
    },
  });

  // Filter symbols
  const filteredSymbols = symbols.filter((symbol) => {
    const matchesSearch =
      symbol.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      symbol.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || symbol.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Trading Symbols
          </h1>
          <p className="text-muted-foreground">
            Manage trading instruments and their configurations
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-symbol">
              <Plus className="w-4 h-4 mr-2" />
              Add Symbol
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Trading Symbol</DialogTitle>
              <DialogDescription>
                Configure a new trading instrument for the platform
              </DialogDescription>
            </DialogHeader>
            <SymbolForm
              onSubmit={(data) => createMutation.mutate(data)}
              groups={groups}
              isPending={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search symbols..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-symbols"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-category-filter">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="forex">Forex</SelectItem>
            <SelectItem value="crypto">Crypto</SelectItem>
            <SelectItem value="metals">Metals</SelectItem>
            <SelectItem value="indices">Indices</SelectItem>
            <SelectItem value="commodities">Commodities</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Symbols Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Contract Size</TableHead>
              <TableHead>Lot Range</TableHead>
              <TableHead>Spread</TableHead>
              <TableHead>Leverage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading symbols...
                </TableCell>
              </TableRow>
            ) : filteredSymbols.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  No symbols found
                </TableCell>
              </TableRow>
            ) : (
              filteredSymbols.map((symbol) => (
                <TableRow key={symbol.id} data-testid={`row-symbol-${symbol.id}`}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{symbol.symbol}</div>
                      <div className="text-sm text-muted-foreground">
                        {symbol.displayName}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {symbol.category}
                    </Badge>
                  </TableCell>
                  <TableCell>{Number(symbol.contractSize).toLocaleString()}</TableCell>
                  <TableCell>
                    {symbol.minLotSize} - {symbol.maxLotSize}
                  </TableCell>
                  <TableCell>{symbol.spreadDefault} pips</TableCell>
                  <TableCell>{symbol.leverage}:1</TableCell>
                  <TableCell>
                    <Badge variant={symbol.isActive ? "default" : "secondary"}>
                      {symbol.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditingSymbol(symbol)}
                        data-testid={`button-edit-symbol-${symbol.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeletingSymbol(symbol)}
                        data-testid={`button-delete-symbol-${symbol.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      {editingSymbol && (
        <Dialog open={!!editingSymbol} onOpenChange={() => setEditingSymbol(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Trading Symbol</DialogTitle>
              <DialogDescription>
                Update the configuration for {editingSymbol.symbol}
              </DialogDescription>
            </DialogHeader>
            <SymbolForm
              defaultValues={editingSymbol}
              onSubmit={(data) =>
                updateMutation.mutate({ id: editingSymbol.id, data })
              }
              groups={groups}
              isPending={updateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingSymbol}
        onOpenChange={() => setDeletingSymbol(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trading Symbol?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingSymbol?.symbol}? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSymbol && deleteMutation.mutate(deletingSymbol.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Symbol Form Component
function SymbolForm({
  defaultValues,
  onSubmit,
  groups,
  isPending,
}: {
  defaultValues?: Partial<SymbolFormData>;
  onSubmit: (data: SymbolFormData) => void;
  groups: SymbolGroup[];
  isPending: boolean;
}) {
  const form = useForm<SymbolFormData>({
    resolver: zodResolver(symbolFormSchema),
    defaultValues: {
      symbol: "",
      displayName: "",
      category: "forex",
      twelveDataSymbol: "",
      contractSize: "100000",
      minLotSize: "0.01",
      maxLotSize: "100",
      spreadDefault: "0",
      commissionRate: "0",
      leverage: 100,
      digits: 5,
      isActive: true,
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="symbol"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Symbol *</FormLabel>
                <FormControl>
                  <Input placeholder="EUR/USD" {...field} data-testid="input-symbol" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Euro vs US Dollar" {...field} data-testid="input-display-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-category">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="forex">Forex</SelectItem>
                    <SelectItem value="crypto">Crypto</SelectItem>
                    <SelectItem value="metals">Metals</SelectItem>
                    <SelectItem value="indices">Indices</SelectItem>
                    <SelectItem value="commodities">Commodities</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="groupId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Symbol Group</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger data-testid="select-group">
                      <SelectValue placeholder="Select group" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="twelveDataSymbol"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Twelve Data Symbol *</FormLabel>
              <FormControl>
                <Input placeholder="EUR/USD" {...field} data-testid="input-twelve-data-symbol" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="contractSize"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contract Size</FormLabel>
                <FormControl>
                  <Input placeholder="100000" {...field} data-testid="input-contract-size" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="minLotSize"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Min Lot Size</FormLabel>
                <FormControl>
                  <Input placeholder="0.01" {...field} data-testid="input-min-lot-size" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="maxLotSize"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Lot Size</FormLabel>
                <FormControl>
                  <Input placeholder="100" {...field} data-testid="input-max-lot-size" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="spreadDefault"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default Spread (pips)</FormLabel>
                <FormControl>
                  <Input placeholder="0" {...field} data-testid="input-spread" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="leverage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Leverage</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="100"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                    data-testid="input-leverage"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="digits"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Decimal Digits</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="5"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                    data-testid="input-digits"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={field.onChange}
                  className="w-4 h-4"
                  data-testid="checkbox-is-active"
                />
              </FormControl>
              <FormLabel className="!mt-0">Symbol is active</FormLabel>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="submit"
            disabled={isPending}
            data-testid="button-submit-symbol"
          >
            {isPending ? "Saving..." : defaultValues ? "Update Symbol" : "Create Symbol"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

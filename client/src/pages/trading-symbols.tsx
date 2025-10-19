import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/contexts/LanguageContext";
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

type SymbolFormData = {
  symbol: string;
  displayName: string;
  category: "forex" | "crypto" | "metals" | "indices" | "commodities";
  groupId?: string;
  baseAsset?: string;
  quoteAsset?: string;
  twelveDataSymbol: string;
  contractSize: string;
  minLotSize: string;
  maxLotSize: string;
  spreadDefault: string;
  commissionRate: string;
  leverage: number;
  digits: number;
  isActive: boolean;
};

interface TradingSymbol {
  id: string;
  symbol: string;
  displayName: string;
  category: "forex" | "crypto" | "metals" | "indices" | "commodities";
  groupId?: string;
  baseAsset?: string;
  quoteAsset?: string;
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
  const { t } = useLanguage();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSymbol, setEditingSymbol] = useState<TradingSymbol | null>(null);
  const [deletingSymbol, setDeletingSymbol] = useState<TradingSymbol | null>(null);

  const { data: symbols = [], isLoading } = useQuery<TradingSymbol[]>({
    queryKey: ["/api/symbols"],
  });

  const { data: groups = [] } = useQuery<SymbolGroup[]>({
    queryKey: ["/api/symbol-groups"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: SymbolFormData) => {
      return await apiRequest("POST", "/api/symbols", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/symbols"] });
      toast({
        title: t('symbols.toast.created.title'),
        description: t('symbols.toast.created.description'),
      });
      setIsAddDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('symbols.toast.error.create'),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SymbolFormData> }) => {
      return await apiRequest("PATCH", `/api/symbols/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/symbols"] });
      toast({
        title: t('symbols.toast.updated.title'),
        description: t('symbols.toast.updated.description'),
      });
      setEditingSymbol(null);
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('symbols.toast.error.update'),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/symbols/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/symbols"] });
      toast({
        title: t('symbols.toast.deleted.title'),
        description: t('symbols.toast.deleted.description'),
      });
      setDeletingSymbol(null);
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('symbols.toast.error.delete'),
        variant: "destructive",
      });
    },
  });

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            {t('symbols.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('symbols.subtitle')}
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-symbol">
              <Plus className="w-4 h-4 mr-2" />
              {t('symbols.add.symbol')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('symbols.add.new.title')}</DialogTitle>
              <DialogDescription>
                {t('symbols.add.new.description')}
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

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('symbols.search.placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-symbols"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-category-filter">
            <SelectValue placeholder={t('symbols.all.categories')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('symbols.all.categories')}</SelectItem>
            <SelectItem value="forex">{t('symbols.category.forex')}</SelectItem>
            <SelectItem value="crypto">{t('symbols.category.crypto')}</SelectItem>
            <SelectItem value="metals">{t('symbols.category.metals')}</SelectItem>
            <SelectItem value="indices">{t('symbols.category.indices')}</SelectItem>
            <SelectItem value="commodities">{t('symbols.category.commodities')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('symbols.table.symbol')}</TableHead>
              <TableHead>{t('symbols.table.category')}</TableHead>
              <TableHead>{t('symbols.table.contract.size')}</TableHead>
              <TableHead>{t('symbols.table.lot.range')}</TableHead>
              <TableHead>{t('symbols.table.spread')}</TableHead>
              <TableHead>{t('symbols.table.leverage')}</TableHead>
              <TableHead>{t('common.status')}</TableHead>
              <TableHead className="text-right">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  {t('symbols.loading')}
                </TableCell>
              </TableRow>
            ) : filteredSymbols.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  {t('symbols.no.symbols')}
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
                  <TableCell>{symbol.spreadDefault} {t('symbols.pips')}</TableCell>
                  <TableCell>{symbol.leverage}:1</TableCell>
                  <TableCell>
                    <Badge variant={symbol.isActive ? "default" : "secondary"}>
                      {symbol.isActive ? t('common.active') : t('common.inactive')}
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

      {editingSymbol && (
        <Dialog open={!!editingSymbol} onOpenChange={() => setEditingSymbol(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('symbols.edit.title')}</DialogTitle>
              <DialogDescription>
                {t('symbols.edit.description', { symbol: editingSymbol.symbol })}
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

      <AlertDialog
        open={!!deletingSymbol}
        onOpenChange={() => setDeletingSymbol(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('symbols.delete.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('symbols.delete.description', { symbol: deletingSymbol?.symbol || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSymbol && deleteMutation.mutate(deletingSymbol.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

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
  const { t } = useLanguage();

  const symbolFormSchema = z.object({
    symbol: z.string().min(1, t('symbols.validation.symbol.required')),
    displayName: z.string().min(1, t('symbols.validation.display.name.required')),
    category: z.enum(["forex", "crypto", "metals", "indices", "commodities"]),
    groupId: z.string().optional(),
    baseAsset: z.string().optional(),
    quoteAsset: z.string().optional(),
    twelveDataSymbol: z.string().min(1, t('symbols.validation.twelve.data.required')),
    contractSize: z.string().default("100000"),
    minLotSize: z.string().default("0.01"),
    maxLotSize: z.string().default("100"),
    spreadDefault: z.string().default("0"),
    commissionRate: z.string().default("0"),
    leverage: z.coerce.number().default(100),
    digits: z.coerce.number().default(5),
    isActive: z.boolean().default(true),
  });

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
                <FormLabel>{t('symbols.form.symbol')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('symbols.form.placeholder.symbol')} {...field} data-testid="input-symbol" />
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
                <FormLabel>{t('symbols.form.display.name')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('symbols.form.placeholder.display.name')} {...field} data-testid="input-display-name" />
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
                <FormLabel>{t('symbols.form.category')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-category">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="forex">{t('symbols.category.forex')}</SelectItem>
                    <SelectItem value="crypto">{t('symbols.category.crypto')}</SelectItem>
                    <SelectItem value="metals">{t('symbols.category.metals')}</SelectItem>
                    <SelectItem value="indices">{t('symbols.category.indices')}</SelectItem>
                    <SelectItem value="commodities">{t('symbols.category.commodities')}</SelectItem>
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
                <FormLabel>{t('symbols.form.symbol.group')}</FormLabel>
                <Select onValueChange={(val) => field.onChange(val === "none" ? null : val)} value={field.value || "none"}>
                  <FormControl>
                    <SelectTrigger data-testid="select-group">
                      <SelectValue placeholder={t('symbols.form.placeholder.select.group')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">{t('common.none')}</SelectItem>
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
              <FormLabel>{t('symbols.form.twelve.data.symbol')}</FormLabel>
              <FormControl>
                <Input placeholder={t('symbols.form.placeholder.symbol')} {...field} data-testid="input-twelve-data-symbol" />
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
                <FormLabel>{t('symbols.form.contract.size')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('symbols.form.placeholder.contract.size')} {...field} data-testid="input-contract-size" />
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
                <FormLabel>{t('symbols.form.min.lot.size')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('symbols.form.placeholder.min.lot')} {...field} data-testid="input-min-lot-size" />
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
                <FormLabel>{t('symbols.form.max.lot.size')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('symbols.form.placeholder.max.lot')} {...field} data-testid="input-max-lot-size" />
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
                <FormLabel>{t('symbols.form.default.spread')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('symbols.form.placeholder.spread')} {...field} data-testid="input-spread" />
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
                <FormLabel>{t('symbols.form.leverage')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder={t('symbols.form.placeholder.leverage')}
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
                <FormLabel>{t('symbols.form.decimal.digits')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder={t('symbols.form.placeholder.digits')}
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
              <FormLabel className="!mt-0">{t('symbols.form.is.active')}</FormLabel>
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
            {isPending ? t('symbols.button.saving') : defaultValues ? t('symbols.button.update') : t('symbols.button.create')}
          </Button>
        </div>
      </form>
    </Form>
  );
}

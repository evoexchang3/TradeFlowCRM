import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, X, Search, User, Edit, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMarketData } from "@/hooks/use-market-data";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";

type CategoryType = 'forex' | 'crypto' | 'commodities' | 'stocks' | 'etf';

interface TwelveDataSymbol {
  symbol: string;
  name?: string;
  currency_base?: string;
  currency_quote?: string;
  currency_group?: string;
  exchange?: string;
  mic_code?: string;
  country?: string;
  type?: string;
  category?: string;
}

const LEVERAGE_OPTIONS = [
  { value: "1", label: "1:1" },
  { value: "5", label: "1:5" },
  { value: "10", label: "1:10" },
  { value: "20", label: "1:20" },
  { value: "50", label: "1:50" },
  { value: "100", label: "1:100" },
  { value: "200", label: "1:200" },
  { value: "500", label: "1:500" },
];

export default function Trading() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('forex');
  const [selectedSymbol, setSelectedSymbol] = useState<TwelveDataSymbol | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [orderType, setOrderType] = useState<"market" | "limit" | "stop" | "stop_limit">("market");
  const [orderSide, setOrderSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("1.0");
  const [orderPrice, setOrderPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [leverage, setLeverage] = useState("100");
  const [spread, setSpread] = useState("0.00001");
  const [fees, setFees] = useState("0");
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [clientComboOpen, setClientComboOpen] = useState(false);
  const [modifyPositionDialogOpen, setModifyPositionDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<any>(null);
  const [modifyOpenPrice, setModifyOpenPrice] = useState('');
  const [modifyQuantity, setModifyQuantity] = useState('');
  const [modifySide, setModifySide] = useState<'buy' | 'sell'>('buy');
  const [inputMode, setInputMode] = useState<'margin' | 'quantity'>('margin');
  const [marginInput, setMarginInput] = useState("1000");

  // Fetch symbols dynamically from Twelve Data API (100,000+ symbols)
  const { data: categorySymbols = [] } = useQuery<TwelveDataSymbol[]>({
    queryKey: ['/api/symbols', selectedCategory],
    queryFn: async () => {
      const res = await fetch(`/api/symbols/${selectedCategory}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      return res.json();
    }
  });

  // Set initial selected symbol when symbols load
  useEffect(() => {
    if (categorySymbols.length > 0 && !selectedSymbol) {
      setSelectedSymbol(categorySymbols[0]);
    }
  }, [categorySymbols, selectedSymbol]);

  // Fetch user's role to determine permissions
  const { data: userData } = useQuery<{ user?: any; client?: any }>({
    queryKey: ['/api/me'],
    enabled: !!user,
  });

  const actualUser = userData?.user;
  const isClient = user?.type === 'client';

  const { data: role } = useQuery<{ id: string; name: string; }>({
    queryKey: [`/api/roles/${actualUser?.roleId}`],
    enabled: !!actualUser?.roleId,
  });

  const roleName = role?.name?.toLowerCase() || '';
  const canTradeForClients = !isClient && ['administrator', 'crm manager', 'team leader', 'agent'].includes(roleName);

  // Fetch available clients based on role
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['/api/clients'],
    enabled: canTradeForClients,
  });

  // Get client's own account if they're a client
  const { data: clientAccount } = useQuery({
    queryKey: ['/api/me'],
    enabled: isClient,
    select: (data: any) => data.account
  });

  // Get selected account (first selected client or client's own account)
  const selectedAccountId = isClient ? clientAccount?.id : 
    selectedClientIds.length > 0 ? clients.find((c: any) => c.id === selectedClientIds[0])?.id : null;

  // Fetch account for selected client
  const { data: selectedClientAccounts = [] } = useQuery({
    queryKey: ['/api/accounts', selectedClientIds[0]],
    enabled: !isClient && selectedClientIds.length > 0,
    queryFn: async () => {
      const res = await fetch(`/api/clients/${selectedClientIds[0]}/accounts`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      return res.json();
    }
  });

  const selectedAccount = isClient ? clientAccount : selectedClientAccounts[0];

  // Fetch positions for selected account
  const { data: positions = [] } = useQuery({
    queryKey: ['/api/positions', selectedAccount?.id],
    enabled: !!selectedAccount,
    queryFn: async () => {
      const res = await fetch(`/api/positions?accountId=${selectedAccount.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      return res.json();
    }
  });

  // Fetch initiator names for positions
  const { data: initiatorNames = {} } = useQuery({
    queryKey: ['/api/users'],
    enabled: positions.length > 0 && positions.some((p: any) => p.initiatorId),
    select: (users: any[]) => {
      const map: Record<string, string> = {};
      users.forEach(u => {
        map[u.id] = u.name;
      });
      return map;
    }
  });

  // Get symbols for market data: include category symbols AND position symbols
  const categorySymbolsList = categorySymbols.slice(0, 20).map((s: TwelveDataSymbol) => s.symbol);
  const positionSymbols = positions?.map((p: any) => p.symbol) || [];
  const uniqueSymbols = categorySymbolsList.concat(positionSymbols.filter((s: string) => !categorySymbolsList.includes(s)));
  const quotes = useMarketData(uniqueSymbols);

  const placeOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/orders', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/positions'] });
      toast({ title: t('trading.order.placed.successfully') });
      setQuantity("1.0");
      setOrderPrice("");
      setStopLoss("");
      setTakeProfit("");
    },
    onError: (error: any) => {
      toast({
        title: t('trading.order.failed'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const closePositionMutation = useMutation({
    mutationFn: async ({ id, quantity }: any) => {
      const res = await apiRequest('POST', `/api/positions/${id}/close`, { quantity });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/positions'] });
      toast({ title: t('trading.position.closed.successfully') });
    },
  });

  const modifyPositionMutation = useMutation({
    mutationFn: (data: { openPrice?: string; quantity?: string; side?: 'buy' | 'sell' }) =>
      apiRequest('PATCH', `/api/positions/${selectedPosition?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/positions'] });
      setModifyPositionDialogOpen(false);
      setSelectedPosition(null);
      toast({
        title: t('trading.position.modified'),
        description: t('trading.position.updated.successfully'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('trading.position.modification.failed'),
        description: error.message || t('trading.failed.to.modify.position'),
        variant: "destructive",
      });
    },
  });

  const deletePositionMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/positions/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/positions'] });
      toast({
        title: t('trading.position.deleted'),
        description: t('trading.position.deleted.successfully'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('trading.delete.failed'),
        description: error.message || t('trading.failed.to.delete.position'),
        variant: "destructive",
      });
    },
  });

  const handlePlaceOrder = () => {
    if (!selectedAccount) {
      toast({
        title: t('trading.no.account.selected'),
        description: canTradeForClients ? t('trading.please.select.client') : t('trading.no.account.available'),
        variant: "destructive",
      });
      return;
    }

    if (!selectedSymbol) {
      toast({
        title: t('trading.no.symbol.selected.error'),
        description: t('trading.please.select.symbol'),
        variant: "destructive",
      });
      return;
    }

    const currentPrice = quotes[selectedSymbol.symbol]?.price || 1.0;
    
    // Normalize numeric inputs (replace comma with period for European locales)
    const normalizeNumber = (value: string) => value.replace(',', '.');
    
    const orderData: any = {
      symbol: selectedSymbol.symbol,
      type: orderType,
      side: orderSide,
      leverage: normalizeNumber(leverage),
      spread: normalizeNumber(spread),
      fees: normalizeNumber(fees),
      stopLoss: stopLoss ? parseFloat(normalizeNumber(stopLoss)) : undefined,
      takeProfit: takeProfit ? parseFloat(normalizeNumber(takeProfit)) : undefined,
    };

    // Use margin input (preferred) or fallback to quantity
    if (inputMode === 'margin') {
      orderData.margin = normalizeNumber(marginInput);
    } else {
      orderData.quantity = parseFloat(normalizeNumber(quantity));
    }

    // Add price for non-market orders
    if (orderType !== 'market') {
      if (!orderPrice) {
        toast({
          title: t('trading.price.required'),
          description: t('trading.order.type.requires.price', { orderType }),
          variant: "destructive",
        });
        return;
      }
      orderData.price = parseFloat(normalizeNumber(orderPrice));
    } else {
      orderData.price = currentPrice;
    }

    // Include accountId for staff users
    if (canTradeForClients) {
      orderData.accountId = selectedAccount.id;
    }
    
    placeOrderMutation.mutate(orderData);
  };

  const currentQuote = selectedSymbol ? quotes[selectedSymbol.symbol] : null;

  // Filter symbols by search query
  const filteredSymbols = categorySymbols.filter((symbol: TwelveDataSymbol) =>
    symbol.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (symbol.name && symbol.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Auto-select first client for staff if none selected
  useEffect(() => {
    if (canTradeForClients && clients.length > 0 && selectedClientIds.length === 0) {
      setSelectedClientIds([clients[0].id]);
    }
  }, [canTradeForClients, clients, selectedClientIds]);

  const getInitiatorDisplay = (position: any) => {
    if (!position.initiatorType) return t('trading.client');
    if (position.initiatorType === 'client') return t('trading.client');
    
    const initiatorName = position.initiatorId ? (initiatorNames[position.initiatorId] || t('trading.unknown')) : t('trading.system');
    const type = position.initiatorType.replace('_', ' ').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return `${type} (${initiatorName})`;
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-trading-title">{t('trading.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('trading.subtitle')}</p>
      </div>

      {canTradeForClients && (
        <Card>
          <CardHeader>
            <CardTitle>{t('trading.client.selection')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Popover open={clientComboOpen} onOpenChange={setClientComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientComboOpen}
                    className="w-full justify-between"
                    data-testid="button-select-client"
                  >
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {selectedClientIds.length > 0
                        ? `${clients.find((c: any) => c.id === selectedClientIds[0])?.firstName} ${clients.find((c: any) => c.id === selectedClientIds[0])?.lastName}`
                        : t('trading.select.client')}
                    </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder={t('trading.search.clients')} data-testid="input-search-clients" />
                    <CommandEmpty>{t('trading.no.client.found')}</CommandEmpty>
                    <CommandGroup>
                      <ScrollArea className="h-[200px]">
                        {clients.map((client: any) => (
                          <CommandItem
                            key={client.id}
                            value={`${client.firstName} ${client.lastName}`}
                            onSelect={() => {
                              setSelectedClientIds([client.id]);
                              setClientComboOpen(false);
                            }}
                            data-testid={`option-client-${client.id}`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{client.firstName} {client.lastName}</span>
                              <span className="text-xs text-muted-foreground">{client.email}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </ScrollArea>
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>

              {selectedAccount && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{t('trading.account')} {selectedAccount.accountNumber}</p>
                    <p className="text-xs text-muted-foreground">{t('trading.balance')} ${parseFloat(selectedAccount.balance).toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{t('trading.equity')} ${parseFloat(selectedAccount.equity).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{t('trading.leverage')} 1:{selectedAccount.leverage}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('trading.market.watch')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={selectedCategory} onValueChange={(value) => {
                setSelectedCategory(value as CategoryType);
                setSelectedSymbol(null);
              }}>
                <TabsList className="grid grid-cols-5 w-full">
                  <TabsTrigger value="forex" data-testid="tab-forex">{t('trading.forex')}</TabsTrigger>
                  <TabsTrigger value="crypto" data-testid="tab-crypto">{t('trading.crypto')}</TabsTrigger>
                  <TabsTrigger value="commodities" data-testid="tab-commodities">{t('trading.commodities')}</TabsTrigger>
                  <TabsTrigger value="stocks" data-testid="tab-stocks">{t('trading.stocks')}</TabsTrigger>
                  <TabsTrigger value="etf" data-testid="tab-etf">{t('trading.etfs')}</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('trading.search.symbols')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-symbols"
                />
              </div>

              <ScrollArea className="h-[400px]">
                <div className="grid gap-2">
                  {filteredSymbols.slice(0, 30).map((symbol) => {
                    const quote = quotes[symbol.symbol];
                    return (
                      <div
                        key={symbol.symbol}
                        className={`flex items-center justify-between p-3 rounded-lg hover-elevate active-elevate-2 cursor-pointer ${selectedSymbol?.symbol === symbol.symbol ? 'bg-accent' : ''}`}
                        onClick={() => setSelectedSymbol(symbol)}
                        data-testid={`symbol-${symbol.symbol}`}
                      >
                        <div>
                          <p className="font-medium">{symbol.symbol}</p>
                          <p className="text-xs text-muted-foreground">
                            {symbol.name || 
                             (symbol.currency_base && symbol.currency_quote 
                               ? `${symbol.currency_base}/${symbol.currency_quote}` 
                               : symbol.currency_group || symbol.type || symbol.exchange || '')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono">{quote?.price?.toFixed(5) || '—'}</p>
                          {quote && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(quote.timestamp).toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('trading.open.positions')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('trading.symbol')}</TableHead>
                    <TableHead>{t('trading.type')}</TableHead>
                    <TableHead>{t('trading.quantity')}</TableHead>
                    <TableHead>{t('trading.entry')}</TableHead>
                    <TableHead>{t('trading.current')}</TableHead>
                    <TableHead>{t('trading.leverage.label')}</TableHead>
                    <TableHead>{t('trading.pnl')}</TableHead>
                    <TableHead>{t('trading.opened')}</TableHead>
                    <TableHead>{t('trading.initiator')}</TableHead>
                    <TableHead>{t('trading.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground">
                        {t('trading.no.open.positions')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    positions.map((position: any) => (
                      <TableRow key={position.id}>
                        <TableCell className="font-medium">{position.symbol}</TableCell>
                        <TableCell>
                          <Badge variant={position.side === 'buy' ? 'default' : 'secondary'}>
                            {position.side.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{position.quantity}</TableCell>
                        <TableCell className="font-mono">{parseFloat(position.openPrice).toFixed(5)}</TableCell>
                        <TableCell className="font-mono">{parseFloat(position.currentPrice).toFixed(5)}</TableCell>
                        <TableCell>1:{position.leverage || '1'}</TableCell>
                        <TableCell>
                          <span className={parseFloat(position.unrealizedPnl) >= 0 ? 'text-success' : 'text-destructive'}>
                            ${parseFloat(position.unrealizedPnl).toFixed(8).replace(/\.?0+$/, '')}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {position.openedAt ? format(new Date(position.openedAt), 'MMM d, HH:mm') : '-'}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {getInitiatorDisplay(position)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedPosition(position);
                                setModifyOpenPrice(position.openPrice);
                                setModifyQuantity(position.quantity);
                                setModifySide(position.side);
                                setModifyPositionDialogOpen(true);
                              }}
                              data-testid={`button-modify-position-${position.id}`}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => closePositionMutation.mutate({ id: position.id, quantity: position.quantity })}
                              disabled={closePositionMutation.isPending}
                              data-testid={`button-close-position-${position.id}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deletePositionMutation.mutate(position.id)}
                              disabled={deletePositionMutation.isPending}
                              data-testid={`button-delete-position-${position.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>{t('trading.place.order')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('trading.selected.symbol')}</label>
                {selectedSymbol ? (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium">{selectedSymbol.symbol}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedSymbol.name || 
                       (selectedSymbol.currency_base && selectedSymbol.currency_quote 
                         ? `${selectedSymbol.currency_base} / ${selectedSymbol.currency_quote}` 
                         : selectedSymbol.currency_group || selectedSymbol.type || selectedSymbol.exchange || t('trading.trading.instrument'))}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">{t('trading.no.symbol.selected')}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('trading.order.type')}</label>
                <Select value={orderType} onValueChange={(value: any) => setOrderType(value)}>
                  <SelectTrigger data-testid="select-order-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="market">{t('trading.market')}</SelectItem>
                    <SelectItem value="limit">{t('trading.limit')}</SelectItem>
                    <SelectItem value="stop">{t('trading.stop')}</SelectItem>
                    <SelectItem value="stop_limit">{t('trading.stop.limit')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={orderSide === 'buy' ? 'default' : 'outline'}
                  onClick={() => setOrderSide('buy')}
                  data-testid="button-order-buy"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  {t('trading.buy')}
                </Button>
                <Button
                  variant={orderSide === 'sell' ? 'default' : 'outline'}
                  onClick={() => setOrderSide('sell')}
                  data-testid="button-order-sell"
                >
                  <TrendingDown className="h-4 w-4 mr-2" />
                  {t('trading.sell')}
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('trading.input.mode')}</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={inputMode === 'margin' ? 'default' : 'outline'}
                    onClick={() => setInputMode('margin')}
                    data-testid="button-input-margin"
                    size="sm"
                  >
                    {t('trading.margin')}
                  </Button>
                  <Button
                    variant={inputMode === 'quantity' ? 'default' : 'outline'}
                    onClick={() => setInputMode('quantity')}
                    data-testid="button-input-quantity"
                    size="sm"
                  >
                    {t('trading.quantity.lots')}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {inputMode === 'margin' ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('trading.margin')}</label>
                    <Input
                      type="number"
                      step="100"
                      value={marginInput}
                      onChange={(e) => setMarginInput(e.target.value)}
                      data-testid="input-order-margin"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('trading.quantity.lots')}</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      data-testid="input-order-quantity"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('trading.leverage.label')}</label>
                  <Select value={leverage} onValueChange={setLeverage}>
                    <SelectTrigger data-testid="select-leverage">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEVERAGE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {inputMode === 'margin' && currentQuote && (() => {
                const entryPrice = orderType === 'market' ? currentQuote.price : parseFloat(orderPrice || '0');
                const leverageNum = parseFloat(leverage);
                const marginNum = parseFloat(marginInput || '0');
                const contractMultiplier = 1;
                
                if (entryPrice > 0 && leverageNum > 0 && marginNum > 0) {
                  const positionSize = marginNum * leverageNum;
                  const calculatedQty = positionSize / (entryPrice * contractMultiplier);
                  
                  return (
                    <div className="p-3 bg-accent/30 rounded-lg space-y-1">
                      <p className="text-xs text-muted-foreground">{t('trading.calculated.values')}</p>
                      <div className="flex justify-between">
                        <span className="text-sm">{t('trading.position.size')}</span>
                        <span className="text-sm font-semibold">${positionSize.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">{t('trading.quantity.lots.label')}</span>
                        <span className="text-sm font-semibold">{calculatedQty.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {orderType !== 'market' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {orderType === 'limit' ? t('trading.limit.price') : t('trading.stop.price')}
                  </label>
                  <Input
                    type="number"
                    step="0.00001"
                    value={orderPrice}
                    onChange={(e) => setOrderPrice(e.target.value)}
                    placeholder={currentQuote ? currentQuote.price.toFixed(5) : t('trading.enter.price')}
                    data-testid="input-order-price"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('trading.spread')}</label>
                  <Input
                    type="number"
                    step="0.00001"
                    value={spread}
                    onChange={(e) => setSpread(e.target.value)}
                    data-testid="input-spread"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('trading.fees')}</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={fees}
                    onChange={(e) => setFees(e.target.value)}
                    data-testid="input-fees"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('trading.stop.loss.optional')}</label>
                <Input
                  type="number"
                  step="0.00001"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  placeholder={t('trading.example.price.1')}
                  data-testid="input-stop-loss"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('trading.take.profit.optional')}</label>
                <Input
                  type="number"
                  step="0.00001"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  placeholder={t('trading.example.price.2')}
                  data-testid="input-take-profit"
                />
              </div>

              {currentQuote && (() => {
                const now = Date.now();
                const quoteAge = now - currentQuote.timestamp;
                const isLive = quoteAge < 30000; // 30 seconds threshold for live market data
                
                return (
                  <div className="p-3 bg-accent/50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm text-muted-foreground">{t('trading.current.price')}</p>
                      <Badge 
                        variant={isLive ? "default" : "destructive"}
                        className="text-xs"
                        data-testid={`badge-market-${isLive ? 'live' : 'stale'}`}
                      >
                        {isLive ? `🟢 ${t('trading.live')}` : `🔴 ${t('trading.stale')}`}
                      </Badge>
                    </div>
                    <p className="text-2xl font-mono font-semibold">{currentQuote.price.toFixed(5)}</p>
                    {!isLive && (
                      <p className="text-xs text-destructive mt-1">
                        {t('trading.market.data.stale')}
                      </p>
                    )}
                  </div>
                );
              })()}

              <Button
                className="w-full"
                onClick={handlePlaceOrder}
                disabled={
                  placeOrderMutation.isPending || 
                  !selectedAccount || 
                  (currentQuote && (Date.now() - currentQuote.timestamp > 30000)) // 30 seconds threshold
                }
                data-testid="button-place-order"
              >
                {placeOrderMutation.isPending ? t('trading.placing.order') : (orderSide === 'buy' ? t('trading.place.buy.order') : t('trading.place.sell.order'))}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={modifyPositionDialogOpen} onOpenChange={(open) => {
        setModifyPositionDialogOpen(open);
        if (!open) {
          setSelectedPosition(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('trading.modify.position')}</DialogTitle>
            <DialogDescription>
              {t('trading.edit.position.details')} {selectedPosition?.symbol} ({selectedPosition?.id})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="modify-side">{t('trading.type')}</Label>
              <Select value={modifySide} onValueChange={(value: 'buy' | 'sell') => setModifySide(value)}>
                <SelectTrigger id="modify-side" data-testid="select-modify-side">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy">{t('trading.buy')}</SelectItem>
                  <SelectItem value="sell">{t('trading.sell')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="modify-quantity">{t('trading.volume.lot')}</Label>
              <Input
                id="modify-quantity"
                type="number"
                step="0.01"
                placeholder="1.00"
                value={modifyQuantity}
                onChange={(e) => setModifyQuantity(e.target.value)}
                data-testid="input-modify-quantity"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modify-open-price">{t('trading.open.price')}</Label>
              <Input
                id="modify-open-price"
                type="number"
                step="0.00001"
                placeholder="1.16000"
                value={modifyOpenPrice}
                onChange={(e) => setModifyOpenPrice(e.target.value)}
                data-testid="input-modify-open-price"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                modifyPositionMutation.mutate({
                  side: modifySide,
                  quantity: modifyQuantity,
                  openPrice: modifyOpenPrice,
                });
              }}
              disabled={modifyPositionMutation.isPending}
              data-testid="button-save-position"
            >
              {modifyPositionMutation.isPending ? t('trading.saving') : t('trading.save.changes')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

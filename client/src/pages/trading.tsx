import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, X, Search, User } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMarketData } from "@/hooks/use-market-data";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";

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

  // Get symbols for market data based on category
  const symbolsForMarketData = categorySymbols.slice(0, 20).map((s: TwelveDataSymbol) => s.symbol);
  const quotes = useMarketData(symbolsForMarketData); // Limit to 20 for performance

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

  const placeOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/orders', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/positions'] });
      toast({ title: "Order placed successfully" });
      setQuantity("1.0");
      setOrderPrice("");
      setStopLoss("");
      setTakeProfit("");
    },
    onError: (error: any) => {
      toast({
        title: "Order failed",
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
      toast({ title: "Position closed successfully" });
    },
  });

  const handlePlaceOrder = () => {
    if (!selectedAccount) {
      toast({
        title: "No account selected",
        description: canTradeForClients ? "Please select a client to trade for" : "No account available",
        variant: "destructive",
      });
      return;
    }

    if (!selectedSymbol) {
      toast({
        title: "No symbol selected",
        description: "Please select a trading symbol",
        variant: "destructive",
      });
      return;
    }

    const currentPrice = quotes[selectedSymbol.symbol]?.price || 1.0;
    
    const orderData: any = {
      symbol: selectedSymbol.symbol,
      type: orderType,
      side: orderSide,
      quantity: parseFloat(quantity),
      leverage,
      spread,
      fees,
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
      takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
    };

    // Add price for non-market orders
    if (orderType !== 'market') {
      if (!orderPrice) {
        toast({
          title: "Price required",
          description: `${orderType} orders require a price`,
          variant: "destructive",
        });
        return;
      }
      orderData.price = parseFloat(orderPrice);
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
    if (!position.initiatorType) return 'Client';
    if (position.initiatorType === 'client') return 'Client';
    
    const initiatorName = position.initiatorId ? (initiatorNames[position.initiatorId] || 'Unknown') : 'System';
    const type = position.initiatorType.replace('_', ' ').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return `${type} (${initiatorName})`;
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-trading-title">Trading Terminal</h1>
        <p className="text-sm text-muted-foreground">Multi-client trading with comprehensive market coverage</p>
      </div>

      {canTradeForClients && (
        <Card>
          <CardHeader>
            <CardTitle>Client Selection</CardTitle>
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
                        : "Select client..."}
                    </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search clients..." data-testid="input-search-clients" />
                    <CommandEmpty>No client found.</CommandEmpty>
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
                    <p className="text-sm font-medium">Account: {selectedAccount.accountNumber}</p>
                    <p className="text-xs text-muted-foreground">Balance: ${parseFloat(selectedAccount.balance).toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">Equity: ${parseFloat(selectedAccount.equity).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Leverage: 1:{selectedAccount.leverage}</p>
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
              <CardTitle>Market Watch</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={selectedCategory} onValueChange={(value) => {
                setSelectedCategory(value as CategoryType);
                setSelectedSymbol(null); // Will be auto-selected by useEffect
              }}>
                <TabsList className="grid grid-cols-5 w-full">
                  <TabsTrigger value="forex" data-testid="tab-forex">Forex</TabsTrigger>
                  <TabsTrigger value="crypto" data-testid="tab-crypto">Crypto</TabsTrigger>
                  <TabsTrigger value="commodities" data-testid="tab-commodities">Commodities</TabsTrigger>
                  <TabsTrigger value="stocks" data-testid="tab-stocks">Stocks</TabsTrigger>
                  <TabsTrigger value="etf" data-testid="tab-etf">ETFs</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search symbols..."
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
              <CardTitle>Open Positions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Entry</TableHead>
                    <TableHead>Current</TableHead>
                    <TableHead>Leverage</TableHead>
                    <TableHead>P/L</TableHead>
                    <TableHead>Initiator</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
                        No open positions
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
                            ${parseFloat(position.unrealizedPnl).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {getInitiatorDisplay(position)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => closePositionMutation.mutate({ id: position.id, quantity: position.quantity })}
                            disabled={closePositionMutation.isPending}
                            data-testid={`button-close-position-${position.id}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
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
              <CardTitle>Place Order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Selected Symbol</label>
                {selectedSymbol ? (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium">{selectedSymbol.symbol}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedSymbol.name || 
                       (selectedSymbol.currency_base && selectedSymbol.currency_quote 
                         ? `${selectedSymbol.currency_base} / ${selectedSymbol.currency_quote}` 
                         : selectedSymbol.currency_group || selectedSymbol.type || selectedSymbol.exchange || 'Trading Instrument')}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">No symbol selected</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Order Type</label>
                <Select value={orderType} onValueChange={(value: any) => setOrderType(value)}>
                  <SelectTrigger data-testid="select-order-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="market">Market</SelectItem>
                    <SelectItem value="limit">Limit</SelectItem>
                    <SelectItem value="stop">Stop</SelectItem>
                    <SelectItem value="stop_limit">Stop Limit</SelectItem>
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
                  Buy
                </Button>
                <Button
                  variant={orderSide === 'sell' ? 'default' : 'outline'}
                  onClick={() => setOrderSide('sell')}
                  data-testid="button-order-sell"
                >
                  <TrendingDown className="h-4 w-4 mr-2" />
                  Sell
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quantity (lots)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    data-testid="input-order-quantity"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Leverage</label>
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

              {orderType !== 'market' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {orderType === 'limit' ? 'Limit Price' : 'Stop Price'}
                  </label>
                  <Input
                    type="number"
                    step="0.00001"
                    value={orderPrice}
                    onChange={(e) => setOrderPrice(e.target.value)}
                    placeholder={currentQuote ? currentQuote.price.toFixed(5) : "Enter price"}
                    data-testid="input-order-price"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Spread</label>
                  <Input
                    type="number"
                    step="0.00001"
                    value={spread}
                    onChange={(e) => setSpread(e.target.value)}
                    data-testid="input-spread"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Fees ($)</label>
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
                <label className="text-sm font-medium">Stop Loss (optional)</label>
                <Input
                  type="number"
                  step="0.00001"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  placeholder="e.g., 1.0800"
                  data-testid="input-stop-loss"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Take Profit (optional)</label>
                <Input
                  type="number"
                  step="0.00001"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  placeholder="e.g., 1.0900"
                  data-testid="input-take-profit"
                />
              </div>

              {currentQuote && (
                <div className="p-3 bg-accent/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Current Price</p>
                  <p className="text-2xl font-mono font-semibold">{currentQuote.price.toFixed(5)}</p>
                </div>
              )}

              <Button
                className="w-full"
                onClick={handlePlaceOrder}
                disabled={placeOrderMutation.isPending || !selectedAccount}
                data-testid="button-place-order"
              >
                {placeOrderMutation.isPending ? 'Placing Order...' : `Place ${orderSide.toUpperCase()} Order`}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

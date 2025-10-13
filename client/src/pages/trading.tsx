import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMarketData } from "@/hooks/use-market-data";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

export default function Trading() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedSymbol, setSelectedSymbol] = useState("EUR/USD");
  const [orderSide, setOrderSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("1.0");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");

  const symbols = ["EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD"];
  const quotes = useMarketData(symbols);

  const { data: account } = useQuery({
    queryKey: ['/api/me'],
    enabled: !!user,
    select: (data: any) => data.account
  });

  const { data: positions = [] } = useQuery({
    queryKey: ['/api/positions', account?.id],
    enabled: !!account,
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
    if (!account && user?.type !== 'client') {
      toast({
        title: "Trading not available",
        description: "Admin users cannot place trades directly. Please select a client account.",
        variant: "destructive",
      });
      return;
    }

    const currentPrice = quotes[selectedSymbol]?.price || parseFloat(orderSide === 'buy' ? '1.0850' : '1.0851');
    
    const orderData: any = {
      symbol: selectedSymbol,
      type: 'market',
      side: orderSide,
      quantity: parseFloat(quantity),
      price: currentPrice,
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
      takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
    };

    // Only include accountId for admin users (clients have it derived server-side)
    if (user?.type === 'user' && account) {
      orderData.accountId = account.id;
    }
    
    placeOrderMutation.mutate(orderData);
  };

  const currentQuote = quotes[selectedSymbol];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-trading-title">Trading Terminal</h1>
        <p className="text-sm text-muted-foreground">Real-time trading and position management</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Market Watch</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {symbols.map((symbol) => {
                  const quote = quotes[symbol];
                  return (
                    <div
                      key={symbol}
                      className={`flex items-center justify-between p-3 rounded-lg hover-elevate active-elevate-2 cursor-pointer ${selectedSymbol === symbol ? 'bg-accent' : ''}`}
                      onClick={() => setSelectedSymbol(symbol)}
                    >
                      <span className="font-medium">{symbol}</span>
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
                    <TableHead>P/L</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No open positions
                      </TableCell>
                    </TableRow>
                  ) : (
                    positions.map((position: any) => (
                      <TableRow key={position.id}>
                        <TableCell className="font-medium">{position.symbol}</TableCell>
                        <TableCell>
                          <Badge variant={position.type === 'buy' ? 'default' : 'secondary'}>
                            {position.type.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{position.quantity}</TableCell>
                        <TableCell className="font-mono">{parseFloat(position.entryPrice).toFixed(5)}</TableCell>
                        <TableCell className="font-mono">{parseFloat(position.currentPrice).toFixed(5)}</TableCell>
                        <TableCell>
                          <span className={parseFloat(position.unrealizedPnl) >= 0 ? 'text-success' : 'text-destructive'}>
                            ${parseFloat(position.unrealizedPnl).toFixed(2)}
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
                <label className="text-sm font-medium">Symbol</label>
                <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                  <SelectTrigger data-testid="select-order-symbol">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {symbols.map((symbol) => (
                      <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={orderSide === 'buy' ? 'default' : 'outline'}
                  onClick={() => setOrderSide('buy')}
                  className="hover-elevate active-elevate-2"
                  data-testid="button-order-buy"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Buy
                </Button>
                <Button
                  variant={orderSide === 'sell' ? 'default' : 'outline'}
                  onClick={() => setOrderSide('sell')}
                  className="hover-elevate active-elevate-2"
                  data-testid="button-order-sell"
                >
                  <TrendingDown className="h-4 w-4 mr-2" />
                  Sell
                </Button>
              </div>

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
                className="w-full hover-elevate active-elevate-2"
                onClick={handlePlaceOrder}
                disabled={placeOrderMutation.isPending || !account}
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

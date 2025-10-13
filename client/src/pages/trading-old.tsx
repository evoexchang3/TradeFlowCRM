import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, X } from "lucide-react";

export default function Trading() {
  const [selectedSymbol, setSelectedSymbol] = useState("EUR/USD");
  const [orderType, setOrderType] = useState("market");
  const [orderSide, setOrderSide] = useState("buy");

  const { data: positions } = useQuery({
    queryKey: ['/api/positions'],
  });

  const { data: marketData } = useQuery({
    queryKey: ['/api/market-data', selectedSymbol],
    refetchInterval: 1000,
  });

  const symbols = [
    "EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF",
    "AUD/USD", "BTC/USD", "ETH/USD", "XAU/USD"
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-trading-title">Trading Terminal</h1>
        <p className="text-sm text-muted-foreground">
          Real-time trading and position management
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Market Watch</CardTitle>
                <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                  <SelectTrigger className="w-[180px]" data-testid="select-symbol">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {symbols.map((symbol) => (
                      <SelectItem key={symbol} value={symbol}>
                        {symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Bid</p>
                    <p className="text-2xl font-mono font-semibold text-destructive" data-testid="text-bid-price">
                      {marketData?.bid || '1.0850'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Ask</p>
                    <p className="text-2xl font-mono font-semibold text-success" data-testid="text-ask-price">
                      {marketData?.ask || '1.0852'}
                    </p>
                  </div>
                </div>

                <div className="h-[300px] bg-card border rounded-md flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Chart placeholder - Live price data from Twelve Data</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Open Positions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Volume</TableHead>
                    <TableHead>Entry</TableHead>
                    <TableHead>Current</TableHead>
                    <TableHead>P/L</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions?.map((position: any) => (
                    <TableRow key={position.id} className="hover-elevate">
                      <TableCell className="font-medium">{position.symbol}</TableCell>
                      <TableCell>
                        <Badge variant={position.side === 'buy' ? 'default' : 'destructive'}>
                          {position.side === 'buy' ? (
                            <TrendingUp className="h-3 w-3 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 mr-1" />
                          )}
                          {position.side}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{position.quantity}</TableCell>
                      <TableCell className="font-mono">{position.openPrice}</TableCell>
                      <TableCell className="font-mono">{position.currentPrice || '-'}</TableCell>
                      <TableCell>
                        <span className={`font-mono font-semibold ${
                          (position.unrealizedPnl || 0) >= 0 ? 'text-success' : 'text-destructive'
                        }`}>
                          {(position.unrealizedPnl || 0) >= 0 ? '+' : ''}${position.unrealizedPnl || 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          data-testid={`button-close-position-${position.id}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) || (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <p className="text-sm text-muted-foreground">No open positions</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg">New Order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Symbol</label>
                <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                  <SelectTrigger data-testid="select-order-symbol">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {symbols.map((symbol) => (
                      <SelectItem key={symbol} value={symbol}>
                        {symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Tabs value={orderSide} onValueChange={setOrderSide}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="buy" className="data-[state=active]:bg-success/20 data-[state=active]:text-success" data-testid="tab-buy">
                    Buy
                  </TabsTrigger>
                  <TabsTrigger value="sell" className="data-[state=active]:bg-destructive/20 data-[state=active]:text-destructive" data-testid="tab-sell">
                    Sell
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div>
                <label className="text-sm font-medium mb-2 block">Order Type</label>
                <Select value={orderType} onValueChange={setOrderType}>
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

              <div>
                <label className="text-sm font-medium mb-2 block">Volume</label>
                <Input
                  type="number"
                  placeholder="0.01"
                  step="0.01"
                  defaultValue="0.01"
                  data-testid="input-volume"
                />
              </div>

              {orderType !== 'market' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Price</label>
                  <Input
                    type="number"
                    placeholder="1.0850"
                    step="0.0001"
                    data-testid="input-price"
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">Stop Loss (Optional)</label>
                <Input
                  type="number"
                  placeholder="1.0800"
                  step="0.0001"
                  data-testid="input-stop-loss"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Take Profit (Optional)</label>
                <Input
                  type="number"
                  placeholder="1.0900"
                  step="0.0001"
                  data-testid="input-take-profit"
                />
              </div>

              <Button
                className={`w-full ${
                  orderSide === 'buy'
                    ? 'bg-success hover:bg-success/90 text-success-foreground'
                    : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                } hover-elevate active-elevate-2`}
                data-testid="button-place-order"
              >
                {orderSide === 'buy' ? 'Buy' : 'Sell'} {selectedSymbol}
              </Button>

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Margin Required</span>
                  <span className="font-mono font-medium">$10.85</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Free Margin</span>
                  <span className="font-mono font-medium">$9,989.15</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Margin Level</span>
                  <span className="font-mono font-medium text-success">9,200%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

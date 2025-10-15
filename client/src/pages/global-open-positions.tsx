import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, TrendingUp, TrendingDown } from "lucide-react";
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

export default function GlobalOpenPositions() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSymbol, setFilterSymbol] = useState<string>('all');
  const [filterSide, setFilterSide] = useState<string>('all');
  
  const { data: positions, isLoading } = useQuery({
    queryKey: ['/api/positions/all/open'],
  });

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
    sum + parseFloat(p.unrealizedPnl || '0'), 0) || 0;
  
  const totalVolume = filteredPositions?.reduce((sum: number, p: any) => 
    sum + parseFloat(p.quantity || '0'), 0) || 0;

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading open positions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Global Open Positions</h1>
          <p className="text-muted-foreground">
            All active positions across all clients
          </p>
        </div>
      </div>

      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle data-testid="text-stats-title">Position Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Positions</p>
              <p className="text-2xl font-bold" data-testid="text-total-positions">{filteredPositions?.length || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total P/L</p>
              <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-total-pnl">
                ${totalPnL.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Buy Positions</p>
              <p className="text-2xl font-bold" data-testid="text-buy-positions">
                {filteredPositions?.filter((p: any) => p.side === 'buy').length || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sell Positions</p>
              <p className="text-2xl font-bold" data-testid="text-sell-positions">
                {filteredPositions?.filter((p: any) => p.side === 'sell').length || 0}
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
                <TableHead>Current P/L</TableHead>
                <TableHead>Opened</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPositions && filteredPositions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-muted-foreground" data-testid="text-no-positions">No open positions found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPositions?.map((position: any) => {
                  const pnl = parseFloat(position.unrealizedPnl || '0');
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
                      <TableCell className={pnl >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'} data-testid={`text-pnl-${position.id}`}>
                        ${pnl.toFixed(2)}
                      </TableCell>
                      <TableCell data-testid={`text-opened-${position.id}`}>
                        {new Date(position.openedAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

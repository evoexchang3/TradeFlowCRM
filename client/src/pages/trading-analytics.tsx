import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Activity, Target, Zap, X } from "lucide-react";

interface TradingAnalytics {
  overview: {
    totalPositions: number;
    openPositions: number;
    closedPositions: number;
    totalVolume: number;
    totalGrossPnL: number;
    totalNetPnL: number;
    totalCommission: number;
    winRate: number;
  };
  bySymbol: Array<{
    symbol: string;
    totalTrades: number;
    volume: number;
    grossPnL: number;
    netPnL: number;
    commission: number;
    wins: number;
    losses: number;
    winRate: number;
  }>;
  robotVsManual: {
    robot: {
      totalTrades: number;
      volume: number;
      grossPnL: number;
      netPnL: number;
      commission: number;
      closedTrades: number;
      wins: number;
      winRate: number;
    };
    manual: {
      totalTrades: number;
      volume: number;
      grossPnL: number;
      netPnL: number;
      commission: number;
      closedTrades: number;
      wins: number;
      winRate: number;
    };
  };
  timeSeries: Array<{
    date: string;
    volume: number;
    grossPnL: number;
    netPnL: number;
    trades: number;
  }>;
}

export default function TradingAnalytics() {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [symbol, setSymbol] = useState<string>('');
  const [accountType, setAccountType] = useState<string>('');

  // Memoize query params to prevent refetch loop
  const queryParams = useMemo(() => {
    const params: Record<string, string> = {
      startDate,
      endDate,
    };
    if (symbol) params.symbol = symbol;
    if (accountType) params.accountType = accountType;
    return params;
  }, [startDate, endDate, symbol, accountType]);

  const { data: analytics, isLoading } = useQuery<TradingAnalytics>({
    queryKey: ['/api/analytics/trading', queryParams],
  });

  const handleClearFilters = () => {
    setSymbol('');
    setAccountType('');
  };

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return <div className="flex-1 flex items-center justify-center">No data available</div>;
  }

  const { overview, bySymbol, robotVsManual, timeSeries } = analytics;

  // Prepare data for Robot vs Manual comparison
  const robotManualData = [
    {
      name: 'Robot Trading',
      totalTrades: robotVsManual.robot.totalTrades,
      volume: robotVsManual.robot.volume,
      netPnL: robotVsManual.robot.netPnL,
      winRate: robotVsManual.robot.winRate,
    },
    {
      name: 'Manual Trading',
      totalTrades: robotVsManual.manual.totalTrades,
      volume: robotVsManual.manual.volume,
      netPnL: robotVsManual.manual.netPnL,
      winRate: robotVsManual.manual.winRate,
    },
  ];

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Trading Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive trading performance analysis and insights
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Filters</CardTitle>
          {(symbol || accountType) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              data-testid="button-clear-filters"
            >
              <X className="h-4 w-4 mr-1" />
              Clear Optional Filters
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-start-date"
              />
            </div>
            <div>
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="input-end-date"
              />
            </div>
            <div>
              <Label htmlFor="symbol-filter">Symbol (Optional)</Label>
              <Input
                id="symbol-filter"
                type="text"
                placeholder="e.g., EUR/USD"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                data-testid="input-symbol-filter"
              />
            </div>
            <div>
              <Label htmlFor="account-type-filter">Account Type (Optional)</Label>
              <Input
                id="account-type-filter"
                type="text"
                placeholder="e.g., demo, real"
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                data-testid="input-account-type-filter"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-metric-volume">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-volume">
              ${overview.totalVolume.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {overview.totalPositions} positions
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-metric-pnl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net P/L</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div 
              className={`text-2xl font-bold ${overview.totalNetPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}
              data-testid="text-net-pnl"
            >
              ${overview.totalNetPnL.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Gross: ${overview.totalGrossPnL.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-metric-winrate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-win-rate">
              {overview.winRate}%
            </div>
            <p className="text-xs text-muted-foreground">
              {overview.closedPositions} closed positions
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-metric-commission">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commission</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-commission">
              ${overview.totalCommission.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {overview.openPositions} open positions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* P/L Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>P/L Trend Over Time</CardTitle>
          <CardDescription>Daily profit/loss and trading volume</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeSeries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="netPnL" stroke="#2563eb" name="Net P/L ($)" strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="volume" stroke="#10b981" name="Volume ($)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Robot vs Manual Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Robot vs Manual Trading</CardTitle>
            <CardDescription>Performance comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={robotManualData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="netPnL" fill="#2563eb" name="Net P/L ($)" />
                <Bar dataKey="winRate" fill="#10b981" name="Win Rate (%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trading Volume Distribution</CardTitle>
            <CardDescription>Robot vs Manual volume breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={robotManualData}
                  dataKey="volume"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.name}: $${entry.volume.toLocaleString()}`}
                >
                  {robotManualData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Symbol Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Symbol Performance</CardTitle>
          <CardDescription>Breakdown by trading symbol</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Symbol</th>
                  <th className="text-right p-2">Trades</th>
                  <th className="text-right p-2">Volume</th>
                  <th className="text-right p-2">Net P/L</th>
                  <th className="text-right p-2">Commission</th>
                  <th className="text-right p-2">Win Rate</th>
                </tr>
              </thead>
              <tbody>
                {bySymbol.map((symbol, index) => (
                  <tr key={index} className="border-b" data-testid={`row-symbol-${symbol.symbol}`}>
                    <td className="p-2 font-medium">{symbol.symbol}</td>
                    <td className="text-right p-2">{symbol.totalTrades}</td>
                    <td className="text-right p-2">${symbol.volume.toLocaleString()}</td>
                    <td className={`text-right p-2 font-medium ${symbol.netPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${symbol.netPnL.toLocaleString()}
                    </td>
                    <td className="text-right p-2">${symbol.commission.toLocaleString()}</td>
                    <td className="text-right p-2">{symbol.winRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

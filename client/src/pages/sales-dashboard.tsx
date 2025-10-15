import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, TrendingUp, Target } from "lucide-react";

export default function SalesDashboard() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['/api/reports/sales-dashboard'],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Sales Dashboard</h1>
        <p className="text-muted-foreground">
          Sales performance metrics and analytics
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-clients">{metrics?.totalClients || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.salesClients || 0} in sales, {metrics?.retentionClients || 0} in retention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-conversion-rate">{metrics?.conversionRate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              FTD conversion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total FTD Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-ftd-value">${metrics?.totalFTDAmount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Avg: ${metrics?.avgFTDAmount || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent FTDs</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-recent-ftds">{metrics?.recentFTDsCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics?.pipelineDistribution && Object.entries(metrics.pipelineDistribution).map(([status, count]: any) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-32 text-sm font-medium capitalize">{status.replace(/_/g, ' ')}</div>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden" style={{ minWidth: '200px' }}>
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${(count / metrics.totalClients) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm font-bold ml-4" data-testid={`text-pipeline-${status}`}>{count}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sales vs Retention */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Sales Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-2" data-testid="text-sales-clients">{metrics?.salesClients || 0}</div>
            <p className="text-sm text-muted-foreground">
              {metrics?.totalClients > 0 
                ? ((metrics.salesClients / metrics.totalClients) * 100).toFixed(1) 
                : 0}% of total clients
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Retention Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-2" data-testid="text-retention-clients">{metrics?.retentionClients || 0}</div>
            <p className="text-sm text-muted-foreground">
              {metrics?.totalClients > 0 
                ? ((metrics.retentionClients / metrics.totalClients) * 100).toFixed(1) 
                : 0}% of total clients
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

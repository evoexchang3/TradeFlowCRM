import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, DollarSign, TrendingUp, Award } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function AffiliateDashboard() {
  const { t } = useLanguage();
  const { data: metrics, isLoading } = useQuery<any>({
    queryKey: ["/api/reports/affiliate-dashboard"],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">{t('affiliateDashboard.loading.dashboard')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">{t('affiliateDashboard.title')}</h1>
        <p className="text-muted-foreground">
          {t('affiliateDashboard.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('affiliateDashboard.total.affiliates')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-affiliates">{metrics?.totalAffiliates || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.activeAffiliates || 0} {t('affiliateDashboard.active.affiliates')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('affiliateDashboard.total.referrals')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-referrals">{metrics?.totalReferrals || 0}</div>
            <p className="text-xs text-muted-foreground">
              {t('affiliateDashboard.all.time.referrals')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('affiliateDashboard.total.commissions')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-commissions">${metrics?.totalCommissions || 0}</div>
            <p className="text-xs text-muted-foreground">
              {t('affiliateDashboard.all.time.earnings')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('affiliateDashboard.pending.payouts')}</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-payouts">${metrics?.pendingPayouts || 0}</div>
            <p className="text-xs text-muted-foreground">
              {t('affiliateDashboard.awaiting.payment')}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('affiliateDashboard.top.performing')}</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics?.leaderboard && metrics.leaderboard.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('affiliateDashboard.rank')}</TableHead>
                  <TableHead>{t('affiliateDashboard.affiliate')}</TableHead>
                  <TableHead>{t('affiliateDashboard.code')}</TableHead>
                  <TableHead className="text-right">{t('affiliateDashboard.referrals')}</TableHead>
                  <TableHead className="text-right">{t('affiliateDashboard.total.commission')}</TableHead>
                  <TableHead className="text-right">{t('affiliateDashboard.pending')}</TableHead>
                  <TableHead className="text-right">{t('affiliateDashboard.rate')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.leaderboard.map((affiliate: any, index: number) => (
                  <TableRow key={affiliate.affiliateId} data-testid={`row-leaderboard-${index}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {index === 0 && <Award className="h-4 w-4 text-yellow-500" />}
                        {index === 1 && <Award className="h-4 w-4 text-gray-400" />}
                        {index === 2 && <Award className="h-4 w-4 text-amber-600" />}
                        <span className="font-medium">#{index + 1}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{affiliate.affiliateName}</TableCell>
                    <TableCell>{affiliate.code}</TableCell>
                    <TableCell className="text-right">{affiliate.referralCount}</TableCell>
                    <TableCell className="text-right">${affiliate.totalCommission}</TableCell>
                    <TableCell className="text-right">${affiliate.pendingCommission}</TableCell>
                    <TableCell className="text-right">{affiliate.commissionRate}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t('affiliateDashboard.no.data')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

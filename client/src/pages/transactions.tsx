import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { useLanguage } from "@/contexts/LanguageContext";

export default function Transactions() {
  const { t } = useLanguage();
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['/api/transactions', typeFilter, statusFilter],
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-transactions-title">{t('transactions.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('transactions.monitor.subtitle')}
          </p>
        </div>
        <Button size="sm" data-testid="button-new-transaction" className="hover-elevate active-elevate-2">
          <Plus className="h-4 w-4 mr-2" />
          {t('transactions.new.transaction')}
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-type-filter">
                <SelectValue placeholder={t('transactions.type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('transactions.filter.all.types')}</SelectItem>
                <SelectItem value="deposit">{t('transactions.filter.type.deposits')}</SelectItem>
                <SelectItem value="withdrawal">{t('transactions.filter.type.withdrawals')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder={t('transactions.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('transactions.filter.all.statuses')}</SelectItem>
                <SelectItem value="pending">{t('transactions.status.pending')}</SelectItem>
                <SelectItem value="completed">{t('transactions.status.completed')}</SelectItem>
                <SelectItem value="rejected">{t('transactions.status.rejected')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('transactions.date')}</TableHead>
                  <TableHead>{t('transactions.client')}</TableHead>
                  <TableHead>{t('transactions.type')}</TableHead>
                  <TableHead>{t('transactions.fund.type')}</TableHead>
                  <TableHead>{t('transactions.amount')}</TableHead>
                  <TableHead>{t('transactions.method')}</TableHead>
                  <TableHead>{t('transactions.status')}</TableHead>
                  <TableHead>{t('transactions.processed.by')}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions?.map((transaction: any) => (
                  <TableRow key={transaction.id} className="hover-elevate">
                    <TableCell className="text-sm">
                      {new Date(transaction.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{transaction.client?.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {transaction.account?.accountNumber}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={transaction.type === 'deposit' ? 'default' : 'secondary'}>
                        {transaction.type === 'deposit' ? t('transactions.type.deposit') : t('transactions.type.withdrawal')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          transaction.fundType === 'real'
                            ? 'bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 border-green-500/20'
                            : transaction.fundType === 'demo'
                            ? 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-500/20'
                            : 'bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400 border-yellow-500/20'
                        }
                        data-testid={`badge-fundtype-${transaction.id}`}
                      >
                        {transaction.fundType === 'real' ? t('transactions.fund.real') : transaction.fundType === 'demo' ? t('transactions.fund.demo') : transaction.fundType === 'bonus' ? t('transactions.fund.bonus') : t('common.na')}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono font-semibold">
                      ${transaction.amount}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {transaction.method || t('common.na')}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          transaction.status === 'completed'
                            ? 'default'
                            : transaction.status === 'rejected'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {transaction.status === 'completed' ? t('transactions.status.completed') : transaction.status === 'rejected' ? t('transactions.status.rejected') : t('transactions.status.pending')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {transaction.processor?.name || '-'}
                    </TableCell>
                    <TableCell>
                      {transaction.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" data-testid={`button-approve-${transaction.id}`}>
                            {t('transactions.approve')}
                          </Button>
                          <Button variant="outline" size="sm" data-testid={`button-reject-${transaction.id}`}>
                            {t('transactions.reject')}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )) || (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <p className="text-sm text-muted-foreground">{t('transactions.no.transactions')}</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

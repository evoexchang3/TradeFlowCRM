import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, ArrowUpCircle, ArrowDownCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "wouter";
import type { Transaction } from "@shared/schema";
import { CreateTransactionModal } from "@/components/CreateTransactionModal";
import { ApproveTransactionModal } from "@/components/ApproveTransactionModal";
import { DeclineTransactionModal } from "@/components/DeclineTransactionModal";

type TransactionWithRelations = Transaction & {
  client?: { id: number; name: string };
  account?: { id: number; accountNumber: string };
  initiator?: { id: number; name: string };
  approver?: { id: number; name: string };
  decliner?: { id: number; name: string };
};

export default function Transactions() {
  const { t } = useLanguage();
  const [typeFilter, setTypeFilter] = useState<"all" | "deposit" | "withdrawal">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "declined">("all");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithRelations | null>(null);

  const { data: transactions, isLoading } = useQuery<TransactionWithRelations[]>({
    queryKey: ['/api/transactions', { type: typeFilter !== "all" ? typeFilter : undefined, status: statusFilter !== "all" ? statusFilter : undefined }],
  });

  const pendingCount = transactions?.filter(t => t.status === 'pending').length || 0;

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return 'default';
      case 'declined':
      case 'rejected':
        return 'destructive';
      case 'cancelled':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400 border-yellow-500/20';
      case 'approved':
      case 'completed':
        return 'bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 border-green-500/20';
      case 'declined':
      case 'rejected':
        return 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 border-red-500/20';
      case 'cancelled':
        return 'bg-gray-500/10 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400 border-gray-500/20';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-transactions-title">
            {t('transactions.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('transactions.subtitle')}
            {pendingCount > 0 && (
              <span className="ml-2 text-yellow-600 dark:text-yellow-400">
                {t('transactions.pending.count', { count: pendingCount })}
              </span>
            )}
          </p>
        </div>
        <Button 
          size="default" 
          data-testid="button-new-transaction" 
          className="hover-elevate active-elevate-2"
          onClick={() => setCreateModalOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('transactions.new.button')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)} className="w-auto">
              <TabsList>
                <TabsTrigger value="all" data-testid="tab-all-transactions">
                  {t('transactions.filter.all')}
                </TabsTrigger>
                <TabsTrigger value="deposit" data-testid="tab-deposits" className="gap-2">
                  <ArrowDownCircle className="h-4 w-4" />
                  {t('transactions.filter.deposits')}
                </TabsTrigger>
                <TabsTrigger value="withdrawal" data-testid="tab-withdrawals" className="gap-2">
                  <ArrowUpCircle className="h-4 w-4" />
                  {t('transactions.filter.withdrawals')}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder={t('transactions.table.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('transactions.filter.all')}</SelectItem>
                <SelectItem value="pending">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    {t('transactions.filter.pending')}
                  </div>
                </SelectItem>
                <SelectItem value="approved">{t('transactions.filter.approved')}</SelectItem>
                <SelectItem value="declined">{t('transactions.filter.declined')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : transactions && transactions.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('transactions.table.client')}</TableHead>
                    <TableHead>{t('transactions.table.type')}</TableHead>
                    <TableHead>{t('transactions.table.amount')}</TableHead>
                    <TableHead>{t('transactions.table.fund.type')}</TableHead>
                    <TableHead>{t('transactions.table.method')}</TableHead>
                    <TableHead>{t('transactions.table.status')}</TableHead>
                    <TableHead>{t('transactions.table.date')}</TableHead>
                    <TableHead>{t('transactions.table.initiated.by')}</TableHead>
                    <TableHead className="text-right">{t('transactions.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id} className="hover-elevate" data-testid={`row-transaction-${transaction.id}`}>
                      <TableCell>
                        {transaction.client ? (
                          <Link href={`/clients/${transaction.client.id}`}>
                            <div className="hover-elevate active-elevate-2 rounded-md p-1 -m-1">
                              <p className="font-medium text-sm" data-testid={`text-client-name-${transaction.id}`}>
                                {transaction.client.name}
                              </p>
                              {transaction.account && (
                                <p className="text-xs text-muted-foreground font-mono">
                                  {transaction.account.accountNumber}
                                </p>
                              )}
                            </div>
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={transaction.type === 'deposit' ? 'default' : 'outline'}
                          data-testid={`badge-type-${transaction.id}`}
                        >
                          {transaction.type === 'deposit' && <ArrowDownCircle className="h-3 w-3 mr-1" />}
                          {transaction.type === 'withdrawal' && <ArrowUpCircle className="h-3 w-3 mr-1" />}
                          {t(`transactions.type.${transaction.type}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono font-semibold" data-testid={`text-amount-${transaction.id}`}>
                        ${transaction.amount.toLocaleString()}
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
                          {t(`transactions.fund.type.${transaction.fundType}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {transaction.method ? t(`transactions.method.${transaction.method}`) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getStatusBadgeVariant(transaction.status)}
                          className={getStatusBadgeColor(transaction.status)}
                          data-testid={`badge-status-${transaction.id}`}
                        >
                          {transaction.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                          {t(`transactions.status.${transaction.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(transaction.createdAt).toLocaleDateString()} {new Date(transaction.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {transaction.initiator?.name || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {transaction.status === 'pending' && (
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              data-testid={`button-approve-${transaction.id}`}
                              className="hover-elevate active-elevate-2"
                              onClick={() => {
                                setSelectedTransaction(transaction);
                                setApproveModalOpen(true);
                              }}
                            >
                              {t('transactions.action.approve')}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              data-testid={`button-decline-${transaction.id}`}
                              className="hover-elevate active-elevate-2"
                              onClick={() => {
                                setSelectedTransaction(transaction);
                                setDeclineModalOpen(true);
                              }}
                            >
                              {t('transactions.action.decline')}
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-lg font-medium text-muted-foreground">
                {t('transactions.empty.title')}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('transactions.empty.description')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateTransactionModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />

      <ApproveTransactionModal
        open={approveModalOpen}
        onOpenChange={setApproveModalOpen}
        transaction={selectedTransaction}
      />

      <DeclineTransactionModal
        open={declineModalOpen}
        onOpenChange={setDeclineModalOpen}
        transaction={selectedTransaction}
      />
    </div>
  );
}

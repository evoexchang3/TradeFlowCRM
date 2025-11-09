import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Transaction } from "@shared/schema";
import { AlertTriangle, CheckCircle } from "lucide-react";

const approveFormSchema = z.object({
  reviewNotes: z.string().optional(),
});

type ApproveFormData = z.infer<typeof approveFormSchema>;

interface ApproveTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction & {
    client?: { id: number; name: string };
    account?: { id: number; accountNumber: string; balance: number };
  } | null;
}

export function ApproveTransactionModal({ open, onOpenChange, transaction }: ApproveTransactionModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const form = useForm<ApproveFormData>({
    resolver: zodResolver(approveFormSchema),
    defaultValues: {
      reviewNotes: "",
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (data: ApproveFormData) => {
      if (!transaction) return;
      return apiRequest('POST', `/api/transactions/${transaction.id}/approve`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      toast({
        title: t('transactions.approve.success'),
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: t('transactions.approve.error'),
        description: error.message === 'Insufficient funds' 
          ? t('transactions.approve.insufficient.funds')
          : error.message,
      });
    },
  });

  const onSubmit = (data: ApproveFormData) => {
    approveMutation.mutate(data);
  };

  if (!transaction) return null;

  const isWithdrawal = transaction.type === 'withdrawal';
  const hasInsufficientFunds = isWithdrawal && transaction.account && transaction.account.balance < Number(transaction.amount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="text-approve-title">
            <CheckCircle className="h-5 w-5 text-green-600" />
            {t('transactions.approve.title')}
          </DialogTitle>
          <DialogDescription>
            {t('transactions.approve.confirm', { type: t(`transactions.type.${transaction.type}`) })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('transactions.approve.details')}</span>
              <span className="font-medium">{transaction.client?.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('transactions.approve.amount.details')}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-lg">
                  ${transaction.amount.toLocaleString()}
                </span>
                <Badge variant="outline">
                  {t(`transactions.fund.type.${transaction.fundType}`)}
                </Badge>
              </div>
            </div>
            {transaction.account && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('common.account')}</span>
                <span className="font-mono text-sm">{transaction.account.accountNumber}</span>
              </div>
            )}
            {transaction.account && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('common.current.balance')}</span>
                <span className="font-mono font-semibold">
                  ${transaction.account.balance.toLocaleString()}
                </span>
              </div>
            )}
            {isWithdrawal && transaction.account && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('common.new.balance')}</span>
                <span className={`font-mono font-semibold ${hasInsufficientFunds ? 'text-red-600 dark:text-red-400' : ''}`}>
                  ${(transaction.account.balance - Number(transaction.amount)).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {hasInsufficientFunds && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive font-medium">
                {t('transactions.approve.insufficient.funds')}
              </p>
            </div>
          )}

          <div className="bg-muted/50 p-3 rounded-md">
            <p className="text-sm text-muted-foreground">
              {t('transactions.approve.balance.update')}
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="reviewNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('transactions.approve.review.notes')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('transactions.approve.review.notes.placeholder')}
                        className="resize-none"
                        rows={3}
                        data-testid="textarea-review-notes"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    form.reset();
                  }}
                  data-testid="button-cancel"
                >
                  {t('transactions.approve.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={approveMutation.isPending || hasInsufficientFunds}
                  data-testid="button-confirm-approve"
                >
                  {approveMutation.isPending ? t('transactions.approve.processing') : t('transactions.approve.button')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

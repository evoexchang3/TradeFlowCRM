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
import { XCircle } from "lucide-react";

const declineFormSchema = z.object({
  declineReason: z.string().min(1, "Decline reason is required"),
  reviewNotes: z.string().optional(),
});

type DeclineFormData = z.infer<typeof declineFormSchema>;

interface DeclineTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction & {
    client?: { id: number; name: string };
    account?: { id: number; accountNumber: string };
  } | null;
}

export function DeclineTransactionModal({ open, onOpenChange, transaction }: DeclineTransactionModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const form = useForm<DeclineFormData>({
    resolver: zodResolver(declineFormSchema),
    defaultValues: {
      declineReason: "",
      reviewNotes: "",
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (data: DeclineFormData) => {
      if (!transaction) return;
      return apiRequest('POST', `/api/transactions/${transaction.id}/decline`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      toast({
        title: t('transactions.decline.success'),
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: t('transactions.decline.error'),
        description: error.message,
      });
    },
  });

  const onSubmit = (data: DeclineFormData) => {
    declineMutation.mutate(data);
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="text-decline-title">
            <XCircle className="h-5 w-5 text-destructive" />
            {t('transactions.decline.title')}
          </DialogTitle>
          <DialogDescription>
            {t('transactions.decline.confirm', { type: t(`transactions.type.${transaction.type}`) })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('transactions.table.client')}</span>
              <span className="font-medium">{transaction.client?.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('transactions.table.amount')}</span>
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
          </div>

          <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-md">
            <p className="text-sm text-destructive">
              {t('transactions.decline.reason.required')}
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="declineReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('transactions.decline.reason')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('transactions.decline.reason.placeholder')}
                        className="resize-none"
                        rows={3}
                        data-testid="textarea-decline-reason"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reviewNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('transactions.decline.review.notes')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('transactions.decline.review.notes.placeholder')}
                        className="resize-none"
                        rows={2}
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
                  {t('transactions.decline.cancel')}
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={declineMutation.isPending}
                  data-testid="button-confirm-decline"
                >
                  {declineMutation.isPending ? t('transactions.decline.processing') : t('transactions.decline.button')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

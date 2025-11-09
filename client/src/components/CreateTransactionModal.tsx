import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertTransactionSchema } from "@shared/schema";

const createTransactionFormSchema = insertTransactionSchema.extend({
  clientId: z.number({ required_error: "Client is required" }).min(1, "Client is required"),
  accountId: z.number({ required_error: "Account is required" }).min(1, "Account is required"),
  amount: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        const parsed = parseFloat(val);
        return isNaN(parsed) ? undefined : parsed;
      }
      return val;
    },
    z.number({ required_error: "Amount is required" })
      .positive("Amount must be greater than 0")
      .finite("Amount must be a valid number")
  ),
});

type CreateTransactionFormData = z.infer<typeof createTransactionFormSchema>;

interface CreateTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTransactionModal({ open, onOpenChange }: CreateTransactionModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  const { data: clients } = useQuery<Array<{ id: number; name: string; email: string }>>({
    queryKey: ['/api/clients'],
    enabled: open,
  });

  const { data: accounts } = useQuery<Array<{ id: number; accountNumber: string; balance: number }>>({
    queryKey: ['/api/accounts', { clientId: selectedClientId }],
    enabled: open && selectedClientId !== null,
  });

  const form = useForm<any>({
    resolver: zodResolver(createTransactionFormSchema),
    defaultValues: {
      type: "deposit",
      fundType: "real",
      method: "bank_transfer",
      referenceId: "",
      notes: "",
      amount: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateTransactionFormData) => {
      return apiRequest('POST', '/api/transactions', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      toast({
        title: t('transactions.create.success'),
      });
      onOpenChange(false);
      form.reset();
      setSelectedClientId(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: t('transactions.create.error'),
        description: error.message,
      });
    },
  });

  const onSubmit = (data: CreateTransactionFormData) => {
    createMutation.mutate(data);
  };

  const handleClientChange = (clientId: string) => {
    const id = parseInt(clientId);
    setSelectedClientId(id);
    form.setValue('clientId', id);
    // Clear account selection when client changes
    form.resetField('accountId');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="text-create-transaction-title">
            {t('transactions.create.title')}
          </DialogTitle>
          <DialogDescription>
            {form.watch('type') === 'deposit' 
              ? t('transactions.create.deposit.title')
              : t('transactions.create.withdrawal.title')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('transactions.create.select.client')}</FormLabel>
                  <Select
                    value={field.value?.toString()}
                    onValueChange={handleClientChange}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-client">
                        <SelectValue placeholder={t('transactions.create.select.client.placeholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients?.map((client) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.name} ({client.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedClientId && accounts && accounts.length > 0 && (
              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common.account')}</FormLabel>
                    <Select
                      value={field.value?.toString()}
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-account">
                          <SelectValue placeholder={t('common.select.account')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id.toString()}>
                            {account.accountNumber} (Balance: ${account.balance.toLocaleString()})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('transactions.create.transaction.type')}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger data-testid="select-transaction-type">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="deposit">{t('transactions.type.deposit')}</SelectItem>
                      <SelectItem value="withdrawal">{t('transactions.type.withdrawal')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('transactions.create.amount')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder={t('transactions.create.amount.placeholder')}
                      data-testid="input-amount"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fundType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('transactions.create.fund.type')}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger data-testid="select-fund-type">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="real">{t('transactions.fund.type.real')}</SelectItem>
                      <SelectItem value="demo">{t('transactions.fund.type.demo')}</SelectItem>
                      <SelectItem value="bonus">{t('transactions.fund.type.bonus')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('transactions.create.payment.method')}</FormLabel>
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger data-testid="select-payment-method">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="bank_transfer">{t('transactions.method.bank_transfer')}</SelectItem>
                      <SelectItem value="credit_card">{t('transactions.method.credit_card')}</SelectItem>
                      <SelectItem value="debit_card">{t('transactions.method.debit_card')}</SelectItem>
                      <SelectItem value="crypto">{t('transactions.method.crypto')}</SelectItem>
                      <SelectItem value="e_wallet">{t('transactions.method.e_wallet')}</SelectItem>
                      <SelectItem value="wire_transfer">{t('transactions.method.wire_transfer')}</SelectItem>
                      <SelectItem value="other">{t('transactions.method.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="referenceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('transactions.create.reference.id')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('transactions.create.reference.id.placeholder')}
                      data-testid="input-reference-id"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('transactions.create.notes')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('transactions.create.notes.placeholder')}
                      className="resize-none"
                      rows={3}
                      data-testid="textarea-notes"
                      {...field}
                      value={field.value || ""}
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
                  setSelectedClientId(null);
                }}
                data-testid="button-cancel"
              >
                {t('transactions.create.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                data-testid="button-submit-transaction"
              >
                {createMutation.isPending ? t('transactions.create.processing') : t('transactions.create.submit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

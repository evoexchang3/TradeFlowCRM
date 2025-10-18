import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Download, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ExportData() {
  const { t } = useLanguage();
  const [exportType, setExportType] = useState("clients");
  const [format, setFormat] = useState("csv");
  const [dateRange, setDateRange] = useState("all");
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const { toast } = useToast();

  const exportFields: Record<string, { id: string; label: string }[]> = {
    clients: [
      { id: 'id', label: t('export.field.id') },
      { id: 'firstName', label: t('export.field.firstName') },
      { id: 'lastName', label: t('export.field.lastName') },
      { id: 'email', label: t('export.field.email') },
      { id: 'phone', label: t('export.field.phone') },
      { id: 'kycStatus', label: t('export.field.kycStatus') },
      { id: 'balance', label: t('export.field.balance') },
      { id: 'equity', label: t('export.field.equity') },
      { id: 'createdAt', label: t('export.field.createdAt') },
    ],
    transactions: [
      { id: 'id', label: t('export.field.id') },
      { id: 'type', label: t('export.field.type') },
      { id: 'amount', label: t('export.field.amount') },
      { id: 'status', label: t('export.field.status') },
      { id: 'method', label: t('export.field.method') },
      { id: 'createdAt', label: t('export.field.date') },
    ],
    trades: [
      { id: 'id', label: t('export.field.id') },
      { id: 'symbol', label: t('export.field.symbol') },
      { id: 'side', label: t('export.field.side') },
      { id: 'quantity', label: t('export.field.quantity') },
      { id: 'openPrice', label: t('export.field.openPrice') },
      { id: 'unrealizedPnl', label: t('export.field.unrealizedPnl') },
      { id: 'createdAt', label: t('export.field.date') },
    ],
  };

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/export', {
        type: exportType,
        format,
        fields: selectedFields,
        dateRange,
      });
      
      // Create download link
      const blob = new Blob([response], { type: format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportType}_export_${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      return response;
    },
    onSuccess: () => {
      toast({ title: t('export.toast.success') });
    },
    onError: () => {
      toast({
        title: t('export.toast.failed'),
        description: t('export.toast.failed.description'),
        variant: "destructive",
      });
    },
  });

  const toggleField = (fieldId: string) => {
    setSelectedFields(prev =>
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const selectAll = () => {
    setSelectedFields(exportFields[exportType].map(f => f.id));
  };

  const deselectAll = () => {
    setSelectedFields([]);
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-export-title">{t('export.title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('export.subtitle')}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t('export.configuration')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>{t('export.data.type')}</Label>
                <Select value={exportType} onValueChange={setExportType}>
                  <SelectTrigger data-testid="select-export-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clients">{t('export.type.clients')}</SelectItem>
                    <SelectItem value="transactions">{t('export.type.transactions')}</SelectItem>
                    <SelectItem value="trades">{t('export.type.trades')}</SelectItem>
                    <SelectItem value="audit">{t('export.type.audit')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t('export.format')}</Label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger data-testid="select-export-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">{t('export.format.csv')}</SelectItem>
                    <SelectItem value="xlsx">{t('export.format.xlsx')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>{t('export.date.range')}</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger data-testid="select-date-range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('export.date.all')}</SelectItem>
                  <SelectItem value="today">{t('export.date.today')}</SelectItem>
                  <SelectItem value="week">{t('export.date.week')}</SelectItem>
                  <SelectItem value="month">{t('export.date.month')}</SelectItem>
                  <SelectItem value="quarter">{t('export.date.quarter')}</SelectItem>
                  <SelectItem value="year">{t('export.date.year')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>{t('export.select.fields')}</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={selectAll}
                    data-testid="button-select-all"
                  >
                    {t('export.select.all')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={deselectAll}
                    data-testid="button-deselect-all"
                  >
                    {t('export.deselect.all')}
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 p-4 border rounded-md">
                {exportFields[exportType]?.map((field) => (
                  <div key={field.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={field.id}
                      checked={selectedFields.includes(field.id)}
                      onCheckedChange={() => toggleField(field.id)}
                      data-testid={`checkbox-field-${field.id}`}
                    />
                    <Label htmlFor={field.id} className="text-sm font-normal cursor-pointer">
                      {field.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending || selectedFields.length === 0}
              className="w-full hover-elevate active-elevate-2"
              data-testid="button-export"
            >
              <Download className="h-4 w-4 mr-2" />
              {exportMutation.isPending ? t('export.button.exporting') : t('export.button.export')}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('export.summary')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('export.summary.data.type')}</span>
                <span className="font-medium capitalize">{exportType}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('export.summary.format')}</span>
                <span className="font-medium uppercase">{format}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('export.summary.fields.selected')}</span>
                <span className="font-medium">{selectedFields.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('export.summary.date.range')}</span>
                <span className="font-medium capitalize">{dateRange.replace('_', ' ')}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('export.recent.exports')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 border rounded-md hover-elevate">
                  <FileDown className="h-4 w-4 text-primary mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t('export.recent.example.file')}</p>
                    <p className="text-xs text-muted-foreground">{t('export.recent.example.time')}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Download, FileDown, Calendar } from "lucide-react";
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

export default function ExportData() {
  const [exportType, setExportType] = useState("clients");
  const [format, setFormat] = useState("csv");
  const [dateRange, setDateRange] = useState("all");
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const { toast } = useToast();

  const exportFields: Record<string, { id: string; label: string }[]> = {
    clients: [
      { id: 'id', label: 'Client ID' },
      { id: 'firstName', label: 'First Name' },
      { id: 'lastName', label: 'Last Name' },
      { id: 'email', label: 'Email' },
      { id: 'phone', label: 'Phone' },
      { id: 'kycStatus', label: 'KYC Status' },
      { id: 'balance', label: 'Balance' },
      { id: 'equity', label: 'Equity' },
      { id: 'createdAt', label: 'Created Date' },
    ],
    transactions: [
      { id: 'id', label: 'Transaction ID' },
      { id: 'type', label: 'Type' },
      { id: 'amount', label: 'Amount' },
      { id: 'status', label: 'Status' },
      { id: 'method', label: 'Method' },
      { id: 'createdAt', label: 'Date' },
    ],
    trades: [
      { id: 'id', label: 'Trade ID' },
      { id: 'symbol', label: 'Symbol' },
      { id: 'side', label: 'Side' },
      { id: 'quantity', label: 'Volume' },
      { id: 'openPrice', label: 'Open Price' },
      { id: 'unrealizedPnl', label: 'P/L' },
      { id: 'createdAt', label: 'Date' },
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
      toast({ title: "Export completed successfully" });
    },
    onError: () => {
      toast({
        title: "Export failed",
        description: "Failed to export data",
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
        <h1 className="text-2xl font-semibold" data-testid="text-export-title">Export Data</h1>
        <p className="text-sm text-muted-foreground">
          Export data to CSV or Excel format
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Export Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Data Type</Label>
                <Select value={exportType} onValueChange={setExportType}>
                  <SelectTrigger data-testid="select-export-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clients">Clients</SelectItem>
                    <SelectItem value="transactions">Transactions</SelectItem>
                    <SelectItem value="trades">Trades</SelectItem>
                    <SelectItem value="audit">Audit Logs</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Format</Label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger data-testid="select-export-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger data-testid="select-date-range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="quarter">Last 90 Days</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Select Fields</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={selectAll}
                    data-testid="button-select-all"
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={deselectAll}
                    data-testid="button-deselect-all"
                  >
                    Deselect All
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
              {exportMutation.isPending ? 'Exporting...' : 'Export Data'}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Export Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Data Type</span>
                <span className="font-medium capitalize">{exportType}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Format</span>
                <span className="font-medium uppercase">{format}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Fields Selected</span>
                <span className="font-medium">{selectedFields.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Date Range</span>
                <span className="font-medium capitalize">{dateRange.replace('_', ' ')}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Exports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 border rounded-md hover-elevate">
                  <FileDown className="h-4 w-4 text-primary mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">clients_export.csv</p>
                    <p className="text-xs text-muted-foreground">2 hours ago</p>
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

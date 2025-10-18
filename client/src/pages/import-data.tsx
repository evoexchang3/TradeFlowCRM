import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Upload, FileUp, Download, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ImportData() {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState("clients");
  const [preview, setPreview] = useState<{ headers: string[]; rows: any[][] }>({ headers: [], rows: [] });
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<any[]>([]);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', importType);
      const response = await apiRequest('POST', '/api/import/preview', formData);
      return await response.json();
    },
    onSuccess: (data) => {
      setPreview({ headers: data.headers || [], rows: data.rows || [] });
      setColumnMapping(data.suggestedMapping || {});
      toast({ title: t('import.toast.file.uploaded') });
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error(t('import.error.no.file.selected'));
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', importType);
      formData.append('mapping', JSON.stringify(columnMapping));
      
      try {
        const response = await apiRequest('POST', '/api/import/execute', formData);
        const data = await response.json();
        
        // Handle partial success (some imported, some failed)
        if (data.errorCount > 0) {
          setErrors(data.errors || []);
        }
        return data;
      } catch (error: any) {
        // Parse error response from apiRequest
        const errorMessage = error.message || '';
        const jsonMatch = errorMessage.match(/\{.*\}/);
        if (jsonMatch) {
          try {
            const errorData = JSON.parse(jsonMatch[0]);
            if (errorData.errors) {
              setErrors(errorData.errors);
            }
            throw new Error(errorData.error || errorMessage);
          } catch (parseError) {
            // If JSON parsing fails, throw original error
            throw error;
          }
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      
      if (data.errorCount > 0) {
        toast({ 
          title: t('import.toast.import.partially.completed'),
          description: t('import.toast.import.partial.description', { successCount: data.successCount, errorCount: data.errorCount }),
          variant: "default"
        });
      } else {
        toast({ 
          title: t('import.toast.import.completed'),
          description: t('import.toast.import.success.description', { successCount: data.successCount })
        });
        setFile(null);
        setPreview({ headers: [], rows: [] });
        setErrors([]);
      }
    },
    onError: (error: any) => {
      console.error('Import error:', error);
      toast({
        title: t('import.toast.import.failed'),
        description: error.message || t('import.toast.import.error.description'),
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      uploadMutation.mutate(selectedFile);
    }
  };

  const availableFields: Record<string, string[]> = {
    clients: ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'country', 'dateOfBirth'],
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-import-title">{t('import.title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('import.subtitle')}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t('import.upload.file')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{t('import.import.type')}</Label>
              <Select value={importType} onValueChange={setImportType}>
                <SelectTrigger data-testid="select-import-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clients">{t('import.type.clients')}</SelectItem>
                  <SelectItem value="transactions">{t('import.type.transactions')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('import.select.file')}</Label>
              <div className="mt-2">
                <label className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-md cursor-pointer hover-elevate active-elevate-2">
                  <div className="space-y-2 text-center">
                    {file ? (
                      <>
                        <FileUp className="mx-auto h-8 w-8 text-primary" />
                        <div>
                          <p className="text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(2)} {t('import.kb')}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{t('import.click.to.upload')}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('import.csv.file.only')}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".csv"
                    onChange={handleFileChange}
                    data-testid="input-file-upload"
                  />
                </label>
              </div>
            </div>

            {preview.headers.length > 0 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-3">{t('import.column.mapping')}</h3>
                  <div className="grid gap-3">
                    {preview.headers.map((column) => (
                      <div key={column} className="grid grid-cols-2 gap-3 items-center">
                        <div className="text-sm text-muted-foreground">{column}</div>
                        <Select
                          value={columnMapping[column] || ''}
                          onValueChange={(value) => setColumnMapping({ ...columnMapping, [column]: value })}
                        >
                          <SelectTrigger data-testid={`select-mapping-${column}`}>
                            <SelectValue placeholder={t('import.skip')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="skip">{t('import.skip')}</SelectItem>
                            {availableFields[importType]?.map((field) => (
                              <SelectItem key={field} value={field}>
                                {field}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-3">{t('import.preview.rows', { count: preview.rows.length })}</h3>
                  <div className="border rounded-md max-h-64 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {preview.headers.map((column) => (
                            <TableHead key={column}>{column}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.rows.slice(0, 5).map((row, idx) => (
                          <TableRow key={idx}>
                            {row.map((value: any, cellIdx) => (
                              <TableCell key={cellIdx} className="text-sm">
                                {value}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <p className="font-medium">{t('import.found.errors', { count: errors.length })}</p>
                      <ul className="mt-2 space-y-1">
                        {errors.slice(0, 5).map((error, idx) => (
                          <li key={idx} className="text-sm">{t('import.row.error', { row: error.row, message: error.message })}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={() => importMutation.mutate()}
                  disabled={importMutation.isPending || errors.length > 0}
                  className="w-full hover-elevate active-elevate-2"
                  data-testid="button-import"
                >
                  {importMutation.isPending ? t('import.importing') : t('import.import.records', { count: preview.rows.length })}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('import.guide')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">{t('import.file.format')}</h4>
              <p className="text-xs text-muted-foreground">
                {t('import.file.format.description')}
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">{t('import.required.fields')}</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• {t('import.field.first.name')}</li>
                <li>• {t('import.field.last.name')}</li>
                <li>• {t('import.field.email')}</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">{t('import.download.template')}</h4>
              <Button variant="outline" size="sm" className="w-full hover-elevate active-elevate-2" data-testid="button-download-template">
                <Download className="h-4 w-4 mr-2" />
                {t('import.download.csv.template')}
              </Button>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">{t('import.validation')}</h4>
              <p className="text-xs text-muted-foreground">
                {t('import.validation.description')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

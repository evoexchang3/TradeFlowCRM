import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { FileText, Upload, Download, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Document {
  id: string;
  clientId: string;
  fileName: string;
  originalFileName: string;
  fileType: string;
  fileSize: number;
  category: string;
  description: string | null;
  filePath: string;
  uploadedBy: string;
  isVerified: boolean;
  verifiedBy: string | null;
  verifiedAt: string | null;
  expiryDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DocumentManagementProps {
  clientId: string;
}

export function DocumentManagement({ clientId }: DocumentManagementProps) {
  const { toast } = useToast();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ['/api/documents/client', clientId],
    enabled: !!clientId,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file || !category) throw new Error('File and category required');
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientId', clientId);
      formData.append('category', category);
      if (description) formData.append('description', description);

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Upload failed');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents/client', clientId] });
      toast({ title: 'Document uploaded successfully' });
      setIsUploadOpen(false);
      setFile(null);
      setCategory('');
      setDescription('');
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      const res = await apiRequest('DELETE', `/api/documents/${docId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents/client', clientId] });
      toast({ title: 'Document deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: 'destructive' });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (docId: string) => {
      const res = await apiRequest('PATCH', `/api/documents/${docId}/verify`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents/client', clientId] });
      toast({ title: 'Document verified successfully' });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: 'destructive' });
    },
  });

  const handleDownload = async (docId: string, fileName: string) => {
    try {
      const res = await fetch(`/api/documents/${docId}/download`, {
        credentials: 'include',
      });
      
      if (!res.ok) throw new Error('Download failed');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({ title: 'Document downloaded' });
    } catch (error) {
      toast({ title: 'Download failed', variant: 'destructive' });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      kyc: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      contract: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      compliance: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      statement: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      proof_of_address: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      proof_of_id: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    };
    return colors[cat] || colors.other;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Documents</h3>
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-upload-document" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-upload-document">
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="file">File</Label>
                <Input
                  id="file"
                  type="file"
                  data-testid="input-file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Max 10MB. Allowed: PDF, Images, Word, Excel
                </p>
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kyc">KYC</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="statement">Statement</SelectItem>
                    <SelectItem value="proof_of_address">Proof of Address</SelectItem>
                    <SelectItem value="proof_of_id">Proof of ID</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  data-testid="input-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add notes about this document..."
                />
              </div>
              <Button
                data-testid="button-submit-upload"
                onClick={() => uploadMutation.mutate()}
                disabled={!file || !category || uploadMutation.isPending}
                className="w-full"
              >
                {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading documents...</div>
      ) : documents && documents.length > 0 ? (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              data-testid={`document-${doc.id}`}
              className="flex items-center justify-between p-3 border rounded-md hover-elevate"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate" data-testid={`text-filename-${doc.id}`}>
                      {doc.originalFileName}
                    </span>
                    <Badge className={getCategoryColor(doc.category)}>
                      {doc.category.replace('_', ' ')}
                    </Badge>
                    {doc.isVerified ? (
                      <CheckCircle className="w-4 h-4 text-green-600" data-testid={`icon-verified-${doc.id}`} />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(doc.fileSize)} • {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                  {doc.description && (
                    <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  data-testid={`button-download-${doc.id}`}
                  onClick={() => handleDownload(doc.id, doc.originalFileName)}
                >
                  <Download className="w-4 h-4" />
                </Button>
                {!doc.isVerified && (
                  <Button
                    size="sm"
                    variant="ghost"
                    data-testid={`button-verify-${doc.id}`}
                    onClick={() => verifyMutation.mutate(doc.id)}
                    disabled={verifyMutation.isPending}
                  >
                    <CheckCircle className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  data-testid={`button-delete-${doc.id}`}
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this document?')) {
                      deleteMutation.mutate(doc.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground" data-testid="text-no-documents">
          No documents uploaded yet
        </div>
      )}
    </div>
  );
}

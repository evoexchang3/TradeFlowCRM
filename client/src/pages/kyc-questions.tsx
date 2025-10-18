import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Trash2, GripVertical, Edit } from "lucide-react";
import * as z from "zod";
import { useLanguage } from "@/contexts/LanguageContext";

interface KYCQuestion {
  id: string;
  questionText: string;
  questionType: string;
  category: string;
  isRequired: boolean;
  options: any;
  conditionalLogic: any;
  displayOrder: number;
  createdAt: string;
}

function QuestionCard({ question, onEdit, onDelete }: {
  question: KYCQuestion;
  onEdit: (question: KYCQuestion) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useLanguage();
  
  return (
    <Card className="hover-elevate">
      <CardHeader className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-2 flex-1">
            <GripVertical className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <CardTitle className="text-base" data-testid={`text-question-${question.id}`}>
                {question.questionText}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                {question.questionType}{t('kycQuestions.separator')}{question.category}
                {question.isRequired && t('kycQuestions.required.badge')}
              </CardDescription>
              {question.options && Array.isArray(question.options) && question.options.length > 0 && (
                <div className="text-xs text-muted-foreground mt-2">
                  {t('kycQuestions.options.label')} {question.options.join(", ")}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(question)}
              data-testid={`button-edit-${question.id}`}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(question.id)}
              data-testid={`button-delete-${question.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

export default function KYCQuestions() {
  const { t } = useLanguage();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<KYCQuestion | null>(null);
  const [optionsText, setOptionsText] = useState("[]");
  const [conditionalText, setConditionalText] = useState("{}");
  const { toast } = useToast();

  const questionFormSchema = z.object({
    questionText: z.string().min(1, t('kycQuestions.validation.questionTextRequired')),
    questionType: z.string(),
    category: z.string(),
    isRequired: z.boolean().default(false),
    options: z.string().optional(),
    conditionalLogic: z.string().optional(),
    displayOrder: z.number().default(0),
  });

  type QuestionFormData = z.infer<typeof questionFormSchema>;

  const { data: questions = [], isLoading } = useQuery<KYCQuestion[]>({
    queryKey: ['/api/kyc-questions'],
  });

  const form = useForm<QuestionFormData>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: {
      questionText: "",
      questionType: "text",
      category: "personal",
      isRequired: false,
      options: "[]",
      conditionalLogic: "{}",
      displayOrder: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/kyc-questions', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/kyc-questions'] });
      toast({ title: t('kycQuestions.toast.created.title'), description: t('kycQuestions.toast.created.description') });
      setOptionsText("[]");
      setConditionalText("{}");
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({ title: t('kycQuestions.toast.error.title'), description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest(`/api/kyc-questions/${id}`, 'PATCH', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/kyc-questions'] });
      toast({ title: t('kycQuestions.toast.created.title'), description: t('kycQuestions.toast.updated.description') });
      setEditingQuestion(null);
      setOptionsText("[]");
      setConditionalText("{}");
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({ title: t('kycQuestions.toast.error.title'), description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/kyc-questions/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/kyc-questions'] });
      toast({ title: t('kycQuestions.toast.created.title'), description: t('kycQuestions.toast.deleted.description') });
    },
    onError: (error) => {
      toast({ title: t('kycQuestions.toast.error.title'), description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (data: QuestionFormData) => {
    try {
      const options = JSON.parse(optionsText);
      const conditional = JSON.parse(conditionalText);
      
      const finalData = {
        ...data,
        options,
        conditionalLogic: conditional,
      };
      
      if (editingQuestion) {
        updateMutation.mutate({ id: editingQuestion.id, ...finalData });
      } else {
        createMutation.mutate(finalData);
      }
    } catch (e) {
      toast({ 
        title: t('kycQuestions.validation.invalidJson'), 
        description: t('kycQuestions.validation.invalidJson.description'), 
        variant: "destructive" 
      });
    }
  };

  const handleEdit = (question: KYCQuestion) => {
    setEditingQuestion(question);
    setOptionsText(JSON.stringify(question.options || [], null, 2));
    setConditionalText(JSON.stringify(question.conditionalLogic || {}, null, 2));
    form.reset({
      questionText: question.questionText,
      questionType: question.questionType,
      category: question.category,
      isRequired: question.isRequired,
      displayOrder: question.displayOrder,
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingQuestion(null);
      setOptionsText("[]");
      setConditionalText("{}");
      form.reset();
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t('kycQuestions.delete.confirm'))) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">{t('kycQuestions.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('kycQuestions.title')}</h1>
          <p className="text-muted-foreground">{t('kycQuestions.subtitle')}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-question">
              <Plus className="h-4 w-4 mr-2" />
              {t('kycQuestions.addQuestion')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingQuestion ? t('kycQuestions.editQuestion') : t('kycQuestions.createQuestion')}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="questionText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('kycQuestions.questionText')}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder={t('kycQuestions.questionText.placeholder')}
                          data-testid="input-question-text"
                          rows={2}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="questionType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('kycQuestions.questionType')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-question-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="text">{t('kycQuestions.type.text')}</SelectItem>
                            <SelectItem value="textarea">{t('kycQuestions.type.textarea')}</SelectItem>
                            <SelectItem value="select">{t('kycQuestions.type.select')}</SelectItem>
                            <SelectItem value="radio">{t('kycQuestions.type.radio')}</SelectItem>
                            <SelectItem value="checkbox">{t('kycQuestions.type.checkbox')}</SelectItem>
                            <SelectItem value="date">{t('kycQuestions.type.date')}</SelectItem>
                            <SelectItem value="file">{t('kycQuestions.type.file')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('kycQuestions.category')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-category">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="personal">{t('kycQuestions.category.personal')}</SelectItem>
                            <SelectItem value="financial">{t('kycQuestions.category.financial')}</SelectItem>
                            <SelectItem value="employment">{t('kycQuestions.category.employment')}</SelectItem>
                            <SelectItem value="trading">{t('kycQuestions.category.trading')}</SelectItem>
                            <SelectItem value="identification">{t('kycQuestions.category.identification')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="isRequired"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>{t('kycQuestions.requiredField')}</FormLabel>
                        <FormDescription>
                          {t('kycQuestions.requiredField.description')}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-required"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="displayOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('kycQuestions.displayOrder')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          onChange={e => field.onChange(parseInt(e.target.value))}
                          data-testid="input-display-order"
                        />
                      </FormControl>
                      <FormDescription>
                        {t('kycQuestions.displayOrder.description')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('kycQuestions.options')}</label>
                  <Textarea
                    value={optionsText}
                    onChange={(e) => setOptionsText(e.target.value)}
                    onBlur={() => {
                      try {
                        JSON.parse(optionsText);
                      } catch (e) {
                        toast({ 
                          title: t('kycQuestions.validation.invalidJson'), 
                          description: t('kycQuestions.validation.options.invalidJson'), 
                          variant: "destructive" 
                        });
                      }
                    }}
                    placeholder={t('kycQuestions.options.placeholder')}
                    data-testid="input-options"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('kycQuestions.conditionalLogic')}</label>
                  <Textarea
                    value={conditionalText}
                    onChange={(e) => setConditionalText(e.target.value)}
                    onBlur={() => {
                      try {
                        JSON.parse(conditionalText);
                      } catch (e) {
                        toast({ 
                          title: t('kycQuestions.validation.invalidJson'), 
                          description: t('kycQuestions.validation.conditionalLogic.invalidJson'), 
                          variant: "destructive" 
                        });
                      }
                    }}
                    placeholder={t('kycQuestions.conditionalLogic.placeholder')}
                    data-testid="input-conditional"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDialogClose(false)}
                    data-testid="button-cancel"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? t('common.saving')
                      : editingQuestion
                      ? t('kycQuestions.updateQuestion')
                      : t('kycQuestions.createQuestionButton')}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {questions.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              {t('kycQuestions.empty')}
            </CardContent>
          </Card>
        ) : (
          questions
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
        )}
      </div>
    </div>
  );
}

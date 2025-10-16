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

const questionFormSchema = z.object({
  questionText: z.string().min(1, "Question text is required"),
  questionType: z.string(),
  category: z.string(),
  isRequired: z.boolean().default(false),
  options: z.string().optional(),
  conditionalLogic: z.string().optional(),
  displayOrder: z.number().default(0),
});

type QuestionFormData = z.infer<typeof questionFormSchema>;

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
                {question.questionType} • {question.category}
                {question.isRequired && " • Required"}
              </CardDescription>
              {question.options && Array.isArray(question.options) && question.options.length > 0 && (
                <div className="text-xs text-muted-foreground mt-2">
                  Options: {question.options.join(", ")}
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<KYCQuestion | null>(null);
  const [optionsText, setOptionsText] = useState("[]");
  const [conditionalText, setConditionalText] = useState("{}");
  const { toast } = useToast();

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
      toast({ title: "Success", description: "Question created successfully" });
      setOptionsText("[]");
      setConditionalText("{}");
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest(`/api/kyc-questions/${id}`, 'PATCH', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/kyc-questions'] });
      toast({ title: "Success", description: "Question updated successfully" });
      setEditingQuestion(null);
      setOptionsText("[]");
      setConditionalText("{}");
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/kyc-questions/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/kyc-questions'] });
      toast({ title: "Success", description: "Question deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
        title: "Invalid JSON", 
        description: "Please fix JSON syntax in options or conditional logic", 
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
    if (window.confirm("Are you sure you want to delete this question?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading KYC questions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">KYC Questions Builder</h1>
          <p className="text-muted-foreground">Create and manage dynamic KYC questions</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-question">
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingQuestion ? "Edit Question" : "Create New Question"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="questionText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Question Text</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="What is your full name?"
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
                        <FormLabel>Question Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-question-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="text">Text Input</SelectItem>
                            <SelectItem value="textarea">Long Text</SelectItem>
                            <SelectItem value="select">Dropdown</SelectItem>
                            <SelectItem value="radio">Radio Buttons</SelectItem>
                            <SelectItem value="checkbox">Checkboxes</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="file">File Upload</SelectItem>
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
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-category">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="personal">Personal Information</SelectItem>
                            <SelectItem value="financial">Financial Information</SelectItem>
                            <SelectItem value="employment">Employment Details</SelectItem>
                            <SelectItem value="trading">Trading Experience</SelectItem>
                            <SelectItem value="identification">Identification</SelectItem>
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
                        <FormLabel>Required Field</FormLabel>
                        <FormDescription>
                          Mark this question as mandatory
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
                      <FormLabel>Display Order</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          onChange={e => field.onChange(parseInt(e.target.value))}
                          data-testid="input-display-order"
                        />
                      </FormControl>
                      <FormDescription>
                        Questions are displayed in ascending order
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <label className="text-sm font-medium">Options (JSON array, for select/radio/checkbox types)</label>
                  <Textarea
                    value={optionsText}
                    onChange={(e) => setOptionsText(e.target.value)}
                    onBlur={() => {
                      try {
                        JSON.parse(optionsText);
                      } catch (e) {
                        toast({ 
                          title: "Invalid JSON", 
                          description: "Options must be valid JSON array", 
                          variant: "destructive" 
                        });
                      }
                    }}
                    placeholder='["Option 1", "Option 2", "Option 3"]'
                    data-testid="input-options"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Conditional Logic (JSON object)</label>
                  <Textarea
                    value={conditionalText}
                    onChange={(e) => setConditionalText(e.target.value)}
                    onBlur={() => {
                      try {
                        JSON.parse(conditionalText);
                      } catch (e) {
                        toast({ 
                          title: "Invalid JSON", 
                          description: "Conditional logic must be valid JSON object", 
                          variant: "destructive" 
                        });
                      }
                    }}
                    placeholder='{"showIf": {"questionId": "123", "value": "Yes"}}'
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
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? "Saving..."
                      : editingQuestion
                      ? "Update Question"
                      : "Create Question"}
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
              No KYC questions configured. Create your first question to get started.
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

import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Circle } from "lucide-react";

interface KycProgressProps {
  clientId: string;
  showDetails?: boolean;
}

export function KycProgress({ clientId, showDetails = false }: KycProgressProps) {
  const { data: progress, isLoading } = useQuery<{
    totalQuestions: number;
    answeredQuestions: number;
    requiredQuestions: number;
    answeredRequiredQuestions: number;
    completionPercentage: number;
    requiredCompletionPercentage: number;
    isComplete: boolean;
    isRequiredComplete: boolean;
  }>({
    queryKey: ['/api/clients', clientId, 'kyc-progress'],
    enabled: !!clientId,
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  if (!progress) {
    return null;
  }

  const { completionPercentage, requiredCompletionPercentage, answeredQuestions, totalQuestions, requiredQuestions, answeredRequiredQuestions, isComplete, isRequiredComplete } = progress;

  const getStatusIcon = () => {
    if (isComplete) {
      return <CheckCircle2 className="h-4 w-4 text-green-600" data-testid="icon-kyc-complete" />;
    } else if (isRequiredComplete) {
      return <AlertCircle className="h-4 w-4 text-yellow-600" data-testid="icon-kyc-required-complete" />;
    } else {
      return <Circle className="h-4 w-4 text-muted-foreground" data-testid="icon-kyc-incomplete" />;
    }
  };

  const getStatusColor = () => {
    if (completionPercentage === 100) return "text-green-600";
    if (completionPercentage >= 75) return "text-blue-600";
    if (completionPercentage >= 50) return "text-yellow-600";
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-2" data-testid="kyc-progress-container">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm font-medium">KYC Progress</span>
        </div>
        <span className={`text-sm font-semibold ${getStatusColor()}`} data-testid="text-kyc-percentage">
          {completionPercentage}%
        </span>
      </div>
      
      <Progress value={completionPercentage} className="h-2" data-testid="progress-kyc" />
      
      {showDetails && (
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>All Questions:</span>
            <span data-testid="text-questions-count">{answeredQuestions} / {totalQuestions}</span>
          </div>
          {requiredQuestions > 0 && (
            <div className="flex items-center justify-between">
              <span>Required:</span>
              <div className="flex items-center gap-1">
                <span data-testid="text-required-count">{answeredRequiredQuestions} / {requiredQuestions}</span>
                {isRequiredComplete && (
                  <Badge variant="default" className="h-4 px-1 text-[10px]">Complete</Badge>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

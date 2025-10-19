import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { SystemSetting } from "@shared/schema";

// Common timezones for trading platforms
const COMMON_TIMEZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "America/New York (EST/EDT)" },
  { value: "America/Chicago", label: "America/Chicago (CST/CDT)" },
  { value: "America/Los_Angeles", label: "America/Los Angeles (PST/PDT)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (CET/CEST)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST)" },
  { value: "Asia/Hong_Kong", label: "Asia/Hong Kong (HKT)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEDT/AEST)" },
];

export default function SystemSettings() {
  const { toast } = useToast();
  const [selectedTimezone, setSelectedTimezone] = useState<string>("");

  // Fetch current timezone setting
  const { data: timezoneSetting, isLoading } = useQuery<SystemSetting>({
    queryKey: ["/api/system-settings/timezone"],
  });

  // Update timezone mutation
  const updateTimezoneMutation = useMutation({
    mutationFn: async (timezone: string) => {
      return await apiRequest("PATCH", `/api/system-settings/timezone`, { value: timezone });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-settings/timezone"] });
      toast({
        title: "Success",
        description: "Platform timezone has been updated successfully.",
      });
      setSelectedTimezone("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update timezone",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!selectedTimezone) {
      toast({
        title: "Error",
        description: "Please select a timezone",
        variant: "destructive",
      });
      return;
    }
    updateTimezoneMutation.mutate(selectedTimezone);
  };

  const currentTimezone = timezoneSetting?.value || "UTC";
  const displayTimezone = selectedTimezone || currentTimezone;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>System Settings</CardTitle>
            <CardDescription>Loading...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">System Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure global platform settings
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Platform Timezone</CardTitle>
            <CardDescription>
              This timezone is used for robot execution scheduling and historical trade timestamp generation.
              All times in the platform will be displayed and calculated in this timezone.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="timezone-select">Select Timezone</Label>
                <Select
                  value={displayTimezone}
                  onValueChange={setSelectedTimezone}
                >
                  <SelectTrigger id="timezone-select" data-testid="select-timezone">
                    <SelectValue placeholder="Select a timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_TIMEZONES.map((tz) => (
                      <SelectItem 
                        key={tz.value} 
                        value={tz.value}
                        data-testid={`timezone-option-${tz.value}`}
                      >
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg border p-4 bg-muted/50">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">Current Timezone</p>
                    <p className="text-2xl font-bold mt-1" data-testid="text-current-timezone">
                      {currentTimezone}
                    </p>
                  </div>
                  {selectedTimezone && selectedTimezone !== currentTimezone && (
                    <div className="text-right">
                      <p className="text-sm font-medium text-muted-foreground">Will change to</p>
                      <p className="text-lg font-semibold text-primary mt-1">
                        {selectedTimezone}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {selectedTimezone && selectedTimezone !== currentTimezone && (
                <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
                  <p className="text-sm font-medium text-yellow-600 dark:text-yellow-500">
                    ⚠️ Warning
                  </p>
                  <p className="text-sm mt-1">
                    Changing the timezone will affect robot execution times and trade timestamp generation.
                    Make sure to update your robot schedules accordingly.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleSave}
                disabled={!selectedTimezone || selectedTimezone === currentTimezone || updateTimezoneMutation.isPending}
                data-testid="button-save-timezone"
              >
                {updateTimezoneMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
              {selectedTimezone && selectedTimezone !== currentTimezone && (
                <Button
                  variant="outline"
                  onClick={() => setSelectedTimezone("")}
                  data-testid="button-cancel-timezone"
                >
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timezone Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium">Robot Execution:</p>
                <p className="text-muted-foreground">
                  Trading robots will execute at the scheduled time in the selected timezone.
                  For example, if a robot is set to run at 5:00 AM and the timezone is EST, it will run at 5:00 AM EST.
                </p>
              </div>
              <div>
                <p className="font-medium">Trade Timestamps:</p>
                <p className="text-muted-foreground">
                  Historical trades generated by robots will have timestamps in the selected timezone.
                  This ensures consistency across the platform.
                </p>
              </div>
              <div>
                <p className="font-medium">Recommendation:</p>
                <p className="text-muted-foreground">
                  Use UTC for global operations or select your primary market timezone (e.g., America/New York for US markets).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

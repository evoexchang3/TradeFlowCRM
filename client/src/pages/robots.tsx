import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Play, Users } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TradingRobot } from "@shared/schema";

// Robot form schema
const robotFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  status: z.enum(["active", "paused", "stopped"]),
  symbols: z.array(z.string()).min(1, "At least one symbol is required"),
  winRate: z.string(),
  profitRangeMin: z.string(),
  profitRangeMax: z.string(),
  minTradesPerDay: z.coerce.number().min(1),
  maxTradesPerDay: z.coerce.number().min(1),
  executionTime: z.string(),
  tradeWindowStart: z.string(),
  tradeWindowEnd: z.string(),
});

type RobotFormData = z.infer<typeof robotFormSchema>;

// Crypto symbols available for selection
const CRYPTO_SYMBOLS = [
  { value: "BTC/USD", label: "Bitcoin (BTC/USD)" },
  { value: "ETH/USD", label: "Ethereum (ETH/USD)" },
  { value: "XRP/USD", label: "Ripple (XRP/USD)" },
  { value: "LTC/USD", label: "Litecoin (LTC/USD)" },
  { value: "ADA/USD", label: "Cardano (ADA/USD)" },
  { value: "DOT/USD", label: "Polkadot (DOT/USD)" },
  { value: "LINK/USD", label: "Chainlink (LINK/USD)" },
  { value: "SOL/USD", label: "Solana (SOL/USD)" },
  { value: "MATIC/USD", label: "Polygon (MATIC/USD)" },
  { value: "AVAX/USD", label: "Avalanche (AVAX/USD)" },
];

function RobotFormDialog({
  robot,
  open,
  onOpenChange,
}: {
  robot?: TradingRobot;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const isEdit = !!robot;

  const form = useForm<RobotFormData>({
    resolver: zodResolver(robotFormSchema),
    defaultValues: robot
      ? {
          name: robot.name,
          status: robot.status as "active" | "paused" | "stopped",
          symbols: robot.symbols || [],
          winRate: robot.winRate || "70",
          profitRangeMin: robot.profitRangeMin || "20",
          profitRangeMax: robot.profitRangeMax || "25",
          minTradesPerDay: robot.minTradesPerDay || 5,
          maxTradesPerDay: robot.maxTradesPerDay || 10,
          executionTime: robot.executionTime || "05:00",
          tradeWindowStart: robot.tradeWindowStart || "01:00",
          tradeWindowEnd: robot.tradeWindowEnd || "04:00",
        }
      : {
          name: "",
          status: "active",
          symbols: [],
          winRate: "70",
          profitRangeMin: "20",
          profitRangeMax: "25",
          minTradesPerDay: 5,
          maxTradesPerDay: 10,
          executionTime: "05:00",
          tradeWindowStart: "01:00",
          tradeWindowEnd: "04:00",
        },
  });

  const createMutation = useMutation({
    mutationFn: (data: RobotFormData) => apiRequest("POST", "/api/robots", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/robots"] });
      toast({
        title: "Success",
        description: "Robot created successfully",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: RobotFormData) =>
      apiRequest("PUT", `/api/robots/${robot?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/robots"] });
      toast({
        title: "Success",
        description: "Robot updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RobotFormData) => {
    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const winRateValue = parseFloat(form.watch("winRate") || "70");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Robot" : "Create New Robot"}</DialogTitle>
          <DialogDescription>
            Configure automated trading robot for generating historical trades
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Robot Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Crypto Daily Robot"
                      data-testid="input-robot-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-robot-status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="stopped">Stopped</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Active robots will execute at scheduled times
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="symbols"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trading Symbols</FormLabel>
                  <FormDescription>
                    Select crypto symbols for trade generation
                  </FormDescription>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {CRYPTO_SYMBOLS.map((symbol) => (
                      <div key={symbol.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`symbol-${symbol.value}`}
                          checked={field.value?.includes(symbol.value)}
                          onCheckedChange={(checked) => {
                            const current = field.value || [];
                            if (checked) {
                              field.onChange([...current, symbol.value]);
                            } else {
                              field.onChange(current.filter((s) => s !== symbol.value));
                            }
                          }}
                          data-testid={`checkbox-symbol-${symbol.value}`}
                        />
                        <label
                          htmlFor={`symbol-${symbol.value}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {symbol.label}
                        </label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="winRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Win Rate: {winRateValue.toFixed(0)}%</FormLabel>
                  <FormControl>
                    <Slider
                      min={0}
                      max={100}
                      step={5}
                      value={[winRateValue]}
                      onValueChange={(value) => field.onChange(value[0].toString())}
                      data-testid="slider-win-rate"
                    />
                  </FormControl>
                  <FormDescription>
                    Target percentage of winning trades
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="profitRangeMin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Profit per Client ($)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        min="0"
                        data-testid="input-profit-min"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="profitRangeMax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Profit per Client ($)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        min="0"
                        data-testid="input-profit-max"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="minTradesPerDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Trades per Day</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="1"
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        data-testid="input-trades-min"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxTradesPerDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Trades per Day</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="1"
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        data-testid="input-trades-max"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="executionTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Daily Execution Time</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="time"
                      data-testid="input-execution-time"
                    />
                  </FormControl>
                  <FormDescription>
                    Time when robot will execute daily (server time)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tradeWindowStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trade Window Start</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="time"
                        data-testid="input-window-start"
                      />
                    </FormControl>
                    <FormDescription>Historical time range start</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tradeWindowEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trade Window End</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="time"
                        data-testid="input-window-end"
                      />
                    </FormControl>
                    <FormDescription>Historical time range end</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-submit"
              >
                {isEdit ? "Update Robot" : "Create Robot"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function RobotsPage() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingRobot, setEditingRobot] = useState<TradingRobot | null>(null);

  const { data: robots = [], isLoading } = useQuery<TradingRobot[]>({
    queryKey: ["/api/robots"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/robots/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/robots"] });
      toast({
        title: "Success",
        description: "Robot deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const executeMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/robots/${id}/execute`),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Robot executed successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Loading robots...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trading Robots</h1>
          <p className="text-muted-foreground">
            Configure automated trading history generators
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          data-testid="button-create-robot"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Robot
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {robots.map((robot) => (
          <Card key={robot.id} data-testid={`card-robot-${robot.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {robot.name}
                    <Badge
                      variant={
                        robot.status === "active"
                          ? "default"
                          : robot.status === "paused"
                          ? "secondary"
                          : "outline"
                      }
                      data-testid={`badge-status-${robot.id}`}
                    >
                      {robot.status}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Win Rate: {robot.winRate}% | Profit: ${robot.profitRangeMin}-$
                    {robot.profitRangeMax}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Symbols:</span>
                  <span className="font-medium">
                    {robot.symbols?.join(", ") || "None"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trades/Day:</span>
                  <span className="font-medium">
                    {robot.minTradesPerDay}-{robot.maxTradesPerDay}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Execution:</span>
                  <span className="font-medium">{robot.executionTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Run:</span>
                  <span className="font-medium">
                    {robot.lastRunAt
                      ? new Date(robot.lastRunAt).toLocaleDateString()
                      : "Never"}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Link href={`/configuration/robots/${robot.id}/assignments`}>
                  <Button
                    size="sm"
                    variant="default"
                    data-testid={`button-manage-clients-${robot.id}`}
                  >
                    <Users className="h-3 w-3 mr-1" />
                    Manage Clients
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingRobot(robot)}
                  data-testid={`button-edit-${robot.id}`}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => executeMutation.mutate(robot.id)}
                  disabled={executeMutation.isPending}
                  data-testid={`button-execute-${robot.id}`}
                >
                  <Play className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (
                      confirm(
                        `Are you sure you want to delete robot "${robot.name}"?`
                      )
                    ) {
                      deleteMutation.mutate(robot.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-${robot.id}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {robots.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">No robots configured yet</p>
            <Button onClick={() => setCreateDialogOpen(true)} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Robot
            </Button>
          </CardContent>
        </Card>
      )}

      <RobotFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {editingRobot && (
        <RobotFormDialog
          robot={editingRobot}
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditingRobot(null);
          }}
        />
      )}
    </div>
  );
}

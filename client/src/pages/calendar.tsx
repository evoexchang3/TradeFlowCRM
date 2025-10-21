import { useState, Fragment } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Calendar as CalendarIcon, 
  Download, 
  Clock, 
  User, 
  MapPin,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  addMonths,
  addWeeks,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  endOfDay
} from "date-fns";

const eventFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  eventType: z.enum(["meeting", "call", "follow_up", "demo", "kyc_review"]),
  userId: z.string().optional(),
  clientId: z.string().optional(),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  location: z.string().optional(),
  status: z.enum(["scheduled", "completed", "cancelled", "rescheduled"]).default("scheduled"),
  isRecurring: z.boolean().default(false),
  recurrenceFrequency: z.enum(["daily", "weekly", "monthly"]).optional(),
  recurrenceInterval: z.preprocess(
    (val) => val === "" || val === null || val === undefined ? 1 : parseInt(String(val), 10),
    z.number().int().min(1, "Interval must be at least 1").default(1)
  ),
  recurrenceDaysOfWeek: z.array(z.number()).optional(),
  recurrenceEndDate: z.string().optional(),
  recurrenceCount: z.preprocess(
    (val) => val === "" || val === null || val === undefined ? undefined : parseInt(String(val), 10),
    z.number().int().min(1, "Count must be at least 1").optional()
  ),
}).refine(
  (data) => {
    // If recurring is checked, frequency is required
    if (data.isRecurring && !data.recurrenceFrequency) {
      return false;
    }
    return true;
  },
  {
    message: "Recurrence frequency is required for recurring events",
    path: ["recurrenceFrequency"],
  }
);

type EventFormData = z.infer<typeof eventFormSchema>;

interface RecurrencePattern {
  frequency: "daily" | "weekly" | "monthly";
  interval: number;
  daysOfWeek?: number[];
  endDate?: string;
  count?: number;
}

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  eventType: "meeting" | "call" | "follow_up" | "demo" | "kyc_review";
  userId?: string;
  clientId?: string;
  startTime: string;
  endTime: string;
  status: "scheduled" | "completed" | "cancelled" | "rescheduled";
  location?: string;
  reminders?: any[];
  notes?: string;
  isRecurring?: boolean;
  recurrencePattern?: RecurrencePattern;
  recurrenceExceptions?: string[];
  parentEventId?: string;
  createdAt: string;
  updatedAt: string;
}

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

function EventForm({
  defaultValues,
  onSubmit,
  isPending,
}: {
  defaultValues?: Partial<EventFormData>;
  onSubmit: (data: EventFormData) => void;
  isPending: boolean;
}) {
  const { t } = useLanguage();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: defaultValues || {
      eventType: "meeting",
      status: "scheduled",
      isRecurring: false,
      recurrenceInterval: 1,
    },
  });

  const isRecurring = watch("isRecurring");
  const recurrenceFrequency = watch("recurrenceFrequency");

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="title">{t('calendar.title.label')}</Label>
        <Input
          id="title"
          {...register("title")}
          placeholder={t('calendar.placeholder.event.title')}
          data-testid="input-event-title"
        />
        {errors.title && (
          <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="description">{t('common.description')}</Label>
        <Textarea
          id="description"
          {...register("description")}
          placeholder={t('calendar.placeholder.event.description')}
          data-testid="input-event-description"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="eventType">{t('calendar.event.type')}</Label>
          <select
            id="eventType"
            {...register("eventType")}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            data-testid="select-event-type"
          >
            <option value="meeting">{t('calendar.event.type.meeting')}</option>
            <option value="call">{t('calendar.event.type.call')}</option>
            <option value="follow_up">{t('calendar.follow.up')}</option>
            <option value="demo">{t('calendar.event.type.demo')}</option>
            <option value="kyc_review">{t('calendar.event.type.kyc_review')}</option>
          </select>
          {errors.eventType && (
            <p className="text-sm text-destructive mt-1">{errors.eventType.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="status">{t('common.status')}</Label>
          <select
            id="status"
            {...register("status")}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            data-testid="select-event-status"
          >
            <option value="scheduled">{t('calendar.event.status.scheduled')}</option>
            <option value="completed">{t('calendar.event.status.completed')}</option>
            <option value="cancelled">{t('calendar.event.status.cancelled')}</option>
            <option value="rescheduled">{t('calendar.event.status.rescheduled')}</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="clientId">{t('calendar.client')}</Label>
          <select
            id="clientId"
            {...register("clientId")}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            data-testid="select-client"
          >
            <option value="">{t('calendar.no.client')}</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.firstName} {client.lastName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="userId">{t('calendar.assign.to')}</Label>
          <select
            id="userId"
            {...register("userId")}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            data-testid="select-user"
          >
            <option value="">{t('calendar.no.assignment')}</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.firstName} {user.lastName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startTime">{t('calendar.start.time')}</Label>
          <Input
            id="startTime"
            type="datetime-local"
            {...register("startTime")}
            data-testid="input-start-time"
          />
          {errors.startTime && (
            <p className="text-sm text-destructive mt-1">{errors.startTime.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="endTime">{t('calendar.end.time')}</Label>
          <Input
            id="endTime"
            type="datetime-local"
            {...register("endTime")}
            data-testid="input-end-time"
          />
          {errors.endTime && (
            <p className="text-sm text-destructive mt-1">{errors.endTime.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="location">{t('calendar.location')}</Label>
        <Input
          id="location"
          {...register("location")}
          placeholder={t('calendar.placeholder.location')}
          data-testid="input-location"
        />
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center space-x-2 mb-4">
          <input
            type="checkbox"
            id="isRecurring"
            {...register("isRecurring")}
            className="h-4 w-4 rounded border-gray-300"
            data-testid="checkbox-recurring"
          />
          <Label htmlFor="isRecurring" className="font-medium">Recurring Event</Label>
        </div>

        {isRecurring && (
          <div className="space-y-4 pl-6 border-l-2 border-primary/20">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="recurrenceFrequency">Repeat Every</Label>
                <select
                  id="recurrenceFrequency"
                  {...register("recurrenceFrequency")}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  data-testid="select-frequency"
                >
                  <option value="">Select frequency</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                {errors.recurrenceFrequency && (
                  <p className="text-sm text-destructive mt-1">{errors.recurrenceFrequency.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="recurrenceInterval">Interval</Label>
                <Input
                  id="recurrenceInterval"
                  type="number"
                  min="1"
                  {...register("recurrenceInterval")}
                  placeholder="1"
                  data-testid="input-interval"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {recurrenceFrequency === 'daily' && 'Repeat every N days'}
                  {recurrenceFrequency === 'weekly' && 'Repeat every N weeks'}
                  {recurrenceFrequency === 'monthly' && 'Repeat every N months'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="recurrenceEndDate">End Date (Optional)</Label>
                <Input
                  id="recurrenceEndDate"
                  type="date"
                  {...register("recurrenceEndDate")}
                  data-testid="input-end-date"
                />
              </div>

              <div>
                <Label htmlFor="recurrenceCount">Or End After (Occurrences)</Label>
                <Input
                  id="recurrenceCount"
                  type="number"
                  min="1"
                  {...register("recurrenceCount")}
                  placeholder="10"
                  data-testid="input-count"
                />
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Note: The event will repeat according to the pattern above. You can specify either an end date or a number of occurrences.
            </p>
          </div>
        )}
      </div>

      <Button type="submit" disabled={isPending} data-testid="button-submit-event">
        {isPending ? t('calendar.saving') : t('calendar.save.event')}
      </Button>
    </form>
  );
}

export default function Calendar() {
  const { user, hasAnyPermission } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [calendarView, setCalendarView] = useState<"default" | "my" | "team" | "all">("default");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterUser, setFilterUser] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [deleteEvent, setDeleteEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data: events = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/calendar/events${calendarView !== "default" ? `?view=${calendarView}` : ""}`],
  });
  
  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
    enabled: calendarView === "team" || calendarView === "all",
  });

  const createMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      console.log('Submitting event data:', data);
      return await apiRequest("POST", "/api/calendar/events", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0]?.toString().startsWith('/api/calendar/events') 
      });
      setIsCreateOpen(false);
      toast({ title: t('toast.success.created') });
    },
    onError: (error: any) => {
      console.error('Calendar event creation error:', error);
      toast({ 
        title: t('common.error'), 
        description: error.message || 'Failed to create event',
        variant: 'destructive' 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: EventFormData & { id: string }) => {
      return await apiRequest("PATCH", `/api/calendar/events/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0]?.toString().startsWith('/api/calendar/events') 
      });
      setEditEvent(null);
      toast({ title: t('toast.success.updated') });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/calendar/events/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0]?.toString().startsWith('/api/calendar/events') 
      });
      setDeleteEvent(null);
      toast({ title: t('toast.success.deleted') });
    },
  });

  const filteredEvents = events.filter((event) => {
    if (filterType !== "all" && event.eventType !== filterType) return false;
    if (filterStatus !== "all" && event.status !== filterStatus) return false;
    if (filterUser !== "all" && event.userId !== filterUser) return false;
    return true;
  });

  const getUserColor = (userId: string | null | undefined) => {
    if (!userId || userId === user?.id) return 'bg-primary/10 text-primary hover:bg-primary/20';
    const colors = [
      'bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20',
      'bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20',
      'bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20',
      'bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20',
      'bg-pink-500/10 text-pink-600 dark:text-pink-400 hover:bg-pink-500/20',
    ];
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const canViewAllCalendars = () => hasAnyPermission(['calendar.manage', '*']);
  const canViewTeamCalendar = () => hasAnyPermission(['team.view', 'team.manage', 'calendar.manage', '*']);

  const navigateDate = (direction: "prev" | "next") => {
    if (view === "month") {
      setCurrentDate(addMonths(currentDate, direction === "next" ? 1 : -1));
    } else if (view === "week") {
      setCurrentDate(addWeeks(currentDate, direction === "next" ? 1 : -1));
    } else {
      setCurrentDate(addDays(currentDate, direction === "next" ? 1 : -1));
    }
  };

  const getEventsForDate = (date: Date) => {
    return filteredEvents.filter((event) => {
      const eventDate = parseISO(event.startTime);
      return isSameDay(eventDate, date);
    });
  };

  const exportToICal = () => {
    let icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Trading Platform CRM//EN
`;

    filteredEvents.forEach((event) => {
      const start = new Date(event.startTime);
      const end = new Date(event.endTime);
      
      icalContent += `BEGIN:VEVENT
UID:${event.id}@tradingplatform.com
DTSTART:${format(start, "yyyyMMdd'T'HHmmss")}
DTEND:${format(end, "yyyyMMdd'T'HHmmss")}
SUMMARY:${event.title}
DESCRIPTION:${event.description || ''}
LOCATION:${event.location || ''}
STATUS:${event.status.toUpperCase()}
END:VEVENT
`;
    });

    icalContent += `END:VCALENDAR`;

    const blob = new Blob([icalContent], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `calendar-export-${format(new Date(), "yyyy-MM-dd")}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const days = [];
    let day = calendarStart;

    while (day <= calendarEnd) {
      days.push(day);
      day = addDays(day, 1);
    }

    return (
      <div className="grid grid-cols-7 gap-px bg-border">
        {[
          t('calendar.day.sunday'),
          t('calendar.day.monday'),
          t('calendar.day.tuesday'),
          t('calendar.day.wednesday'),
          t('calendar.day.thursday'),
          t('calendar.day.friday'),
          t('calendar.day.saturday')
        ].map((dayName) => (
          <div key={dayName} className="bg-muted p-2 text-center text-sm font-medium">
            {dayName}
          </div>
        ))}
        {days.map((day, idx) => {
          const dayEvents = getEventsForDate(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={idx}
              className={`min-h-24 bg-card p-2 hover-elevate active-elevate-2 cursor-pointer ${
                !isCurrentMonth ? "opacity-40" : ""
              } ${isToday ? "ring-2 ring-primary" : ""}`}
              onClick={() => {
                setSelectedDate(day);
                setIsCreateOpen(true);
              }}
              data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
            >
              <div className="text-sm font-medium mb-1">{format(day, "d")}</div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className={`text-xs truncate p-1 rounded ${getUserColor(event.userId)}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditEvent(event);
                    }}
                    data-testid={`event-${event.id}`}
                  >
                    {format(parseISO(event.startTime), "HH:mm")} {event.title}
                    {(calendarView === "team" || calendarView === "all") && event.userFirstName && (
                      <span className="text-xs opacity-75 ml-1">
                        ({event.userFirstName})
                      </span>
                    )}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground">{t('calendar.more.events', { count: dayEvents.length - 3 })}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="overflow-auto">
        <div className="grid grid-cols-8 gap-px bg-border min-w-max">
          <div className="bg-muted p-2"></div>
          {days.map((day) => (
            <div key={day.toISOString()} className="bg-muted p-2 text-center min-w-32">
              <div className="font-medium">{format(day, "EEE")}</div>
              <div className={isSameDay(day, new Date()) ? "text-primary font-bold" : ""}>
                {format(day, "MMM d")}
              </div>
            </div>
          ))}
          {hours.map((hour) => (
            <Fragment key={`hour-row-${hour}`}>
              <div className="bg-card p-2 text-sm text-muted-foreground text-right">
                {format(new Date().setHours(hour, 0), "ha")}
              </div>
              {days.map((day) => {
                const dayEvents = getEventsForDate(day).filter((event) => {
                  const eventHour = parseISO(event.startTime).getHours();
                  return eventHour === hour;
                });

                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className="bg-card p-1 min-h-16 border-t border-border hover-elevate cursor-pointer"
                    onClick={() => {
                      const dateTime = new Date(day);
                      dateTime.setHours(hour, 0);
                      setSelectedDate(dateTime);
                      setIsCreateOpen(true);
                    }}
                    data-testid={`week-slot-${format(day, "yyyy-MM-dd")}-${hour}`}
                  >
                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        className={`text-xs p-1 mb-1 rounded ${getUserColor(event.userId)}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditEvent(event);
                        }}
                        data-testid={`event-${event.id}`}
                      >
                        <div className="font-medium truncate">{event.title}</div>
                        <div className="opacity-75">
                          {format(parseISO(event.startTime), "HH:mm")}
                          {(calendarView === "team" || calendarView === "all") && event.userFirstName && (
                            <span> • {event.userFirstName}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayEvents = getEventsForDate(currentDate);

    return (
      <div className="space-y-px bg-border">
        <div className="bg-muted p-4 text-center">
          <div className="text-2xl font-bold">{format(currentDate, "EEEE")}</div>
          <div className="text-muted-foreground">{format(currentDate, "MMMM d, yyyy")}</div>
        </div>
        {hours.map((hour) => {
          const hourEvents = dayEvents.filter((event) => {
            const eventHour = parseISO(event.startTime).getHours();
            return eventHour === hour;
          });

          return (
            <div
              key={hour}
              className="grid grid-cols-12 gap-4 bg-card p-4 hover-elevate cursor-pointer"
              onClick={() => {
                const dateTime = new Date(currentDate);
                dateTime.setHours(hour, 0);
                setSelectedDate(dateTime);
                setIsCreateOpen(true);
              }}
              data-testid={`day-slot-${format(currentDate, "yyyy-MM-dd")}-${hour}`}
            >
              <div className="col-span-2 text-sm text-muted-foreground">
                {format(new Date().setHours(hour, 0), "h:mm a")}
              </div>
              <div className="col-span-10 space-y-2">
                {hourEvents.map((event) => (
                  <Card
                    key={event.id}
                    className="hover-elevate cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditEvent(event);
                    }}
                    data-testid={`event-${event.id}`}
                  >
                    <CardHeader className="p-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{event.title}</CardTitle>
                        <Badge variant="outline">{event.eventType}</Badge>
                      </div>
                      <CardDescription className="text-xs">
                        {format(parseISO(event.startTime), "h:mm a")} - {format(parseISO(event.endTime), "h:mm a")}
                      </CardDescription>
                    </CardHeader>
                    {event.description && (
                      <CardContent className="p-3 pt-0">
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('calendar.title')}</h1>
          <p className="text-muted-foreground">{t('calendar.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={exportToICal}
            data-testid="button-export-ical"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button onClick={() => {
            setSelectedDate(null);
            setIsCreateOpen(true);
          }} data-testid="button-create-event">
            <Plus className="h-4 w-4 mr-2" />
            {t('calendar.create.event')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateDate("prev")}
                data-testid="button-prev-period"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentDate(new Date())}
                data-testid="button-today"
              >
                {t('calendar.today')}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateDate("next")}
                data-testid="button-next-period"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="text-lg font-semibold ml-2">
                {view === "month" && format(currentDate, "MMMM yyyy")}
                {view === "week" && t('calendar.week.of', { date: format(startOfWeek(currentDate), "MMM d, yyyy") })}
                {view === "day" && format(currentDate, "MMMM d, yyyy")}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {(canViewTeamCalendar() || canViewAllCalendars()) && (
                <Select value={calendarView} onValueChange={(v: any) => setCalendarView(v)}>
                  <SelectTrigger className="w-48" data-testid="select-calendar-view">
                    <User className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">{t('calendar.view.default')}</SelectItem>
                    <SelectItem value="my">{t('calendar.view.my')}</SelectItem>
                    {canViewTeamCalendar() && (
                      <SelectItem value="team">{t('calendar.view.team')}</SelectItem>
                    )}
                    {canViewAllCalendars() && (
                      <SelectItem value="all">{t('calendar.view.all')}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
              
              {(calendarView === "team" || calendarView === "all") && (
                <Select value={filterUser} onValueChange={setFilterUser}>
                  <SelectTrigger className="w-48" data-testid="select-filter-user">
                    <SelectValue placeholder={t('calendar.filter.by.user')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('calendar.all.users')}</SelectItem>
                    {allUsers.map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.firstName} {u.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40" data-testid="select-filter-type">
                  <SelectValue placeholder={t('calendar.placeholder.event.type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('calendar.all.types')}</SelectItem>
                  <SelectItem value="meeting">{t('calendar.event.type.meeting')}</SelectItem>
                  <SelectItem value="call">{t('calendar.event.type.call')}</SelectItem>
                  <SelectItem value="follow_up">{t('calendar.follow.up')}</SelectItem>
                  <SelectItem value="demo">{t('calendar.event.type.demo')}</SelectItem>
                  <SelectItem value="kyc_review">{t('calendar.event.type.kyc_review')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40" data-testid="select-filter-status">
                  <SelectValue placeholder={t('calendar.placeholder.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('calendar.all.status')}</SelectItem>
                  <SelectItem value="scheduled">{t('calendar.event.status.scheduled')}</SelectItem>
                  <SelectItem value="completed">{t('calendar.event.status.completed')}</SelectItem>
                  <SelectItem value="cancelled">{t('calendar.event.status.cancelled')}</SelectItem>
                  <SelectItem value="rescheduled">{t('calendar.event.status.rescheduled')}</SelectItem>
                </SelectContent>
              </Select>

              <Tabs value={view} onValueChange={(v) => setView(v as any)}>
                <TabsList data-testid="tabs-view-selector">
                  <TabsTrigger value="month" data-testid="tab-month">{t('calendar.view.month')}</TabsTrigger>
                  <TabsTrigger value="week" data-testid="tab-week">{t('calendar.view.week')}</TabsTrigger>
                  <TabsTrigger value="day" data-testid="tab-day">{t('calendar.view.day')}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-muted-foreground">{t('calendar.loading')}</div>
            </div>
          ) : (
            <>
              {view === "month" && renderMonthView()}
              {view === "week" && renderWeekView()}
              {view === "day" && renderDayView()}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent data-testid="dialog-create-event">
          <DialogHeader>
            <DialogTitle>{t('calendar.create.event.dialog.title')}</DialogTitle>
            <DialogDescription>{t('calendar.create.event.dialog.description')}</DialogDescription>
          </DialogHeader>
          <EventForm
            defaultValues={selectedDate ? {
              startTime: format(selectedDate, "yyyy-MM-dd'T'HH:mm"),
              endTime: format(addDays(selectedDate, 0).setHours(selectedDate.getHours() + 1, 0, 0, 0), "yyyy-MM-dd'T'HH:mm"),
            } : undefined}
            onSubmit={(data) => {
              console.log('Creating event with data:', data);
              createMutation.mutate(data);
            }}
            isPending={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editEvent} onOpenChange={(open) => !open && setEditEvent(null)}>
        <DialogContent data-testid="dialog-edit-event">
          <DialogHeader>
            <DialogTitle>{t('calendar.edit.event.dialog.title')}</DialogTitle>
            <DialogDescription>{t('calendar.edit.event.dialog.description')}</DialogDescription>
          </DialogHeader>
          {editEvent && (
            <div className="space-y-4">
              <EventForm
                defaultValues={{
                  title: editEvent.title,
                  description: editEvent.description,
                  eventType: editEvent.eventType,
                  userId: editEvent.userId,
                  clientId: editEvent.clientId,
                  startTime: format(parseISO(editEvent.startTime), "yyyy-MM-dd'T'HH:mm"),
                  endTime: format(parseISO(editEvent.endTime), "yyyy-MM-dd'T'HH:mm"),
                  location: editEvent.location,
                  status: editEvent.status,
                }}
                onSubmit={(data) => updateMutation.mutate({ id: editEvent.id, ...data })}
                isPending={updateMutation.isPending}
              />
              <Button
                variant="destructive"
                onClick={() => {
                  setDeleteEvent(editEvent);
                  setEditEvent(null);
                }}
                data-testid="button-delete-event"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('calendar.delete.event')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteEvent} onOpenChange={(open) => !open && setDeleteEvent(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('calendar.delete.event.dialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('calendar.delete.event.dialog.description', { title: deleteEvent?.title || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteEvent && deleteMutation.mutate(deleteEvent.id)}
              data-testid="button-confirm-delete"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

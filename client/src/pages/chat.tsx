import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { MessageSquare, Plus, Send, Users, User, CheckCheck, Check, Wifi, WifiOff, Paperclip, X, FileText, Loader2 } from "lucide-react";
import * as z from "zod";
import { useAuth } from "@/lib/auth";
import { formatDistanceToNow } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { useChatWebSocket } from "@/hooks/use-chat-websocket";

const roomFormSchema = z.object({
  type: z.string(),
  clientId: z.string().optional(),
  participantId: z.string().optional(),
  name: z.string().optional(),
});

type RoomFormData = z.infer<typeof roomFormSchema>;

interface ChatRoom {
  id: string;
  type: string;
  clientId: string | null;
  participantId: string | null;
  name: string | null;
  createdAt: string;
  unreadCount?: number;
  client?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  participant?: {
    id: string;
    name: string;
  };
}

interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderType: string;
  message: string;
  attachments: any;
  isRead: boolean;
  createdAt: string;
}

function MessageBubble({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  return (
    <div className={`flex items-start gap-2 mb-4 ${isOwn ? 'flex-row-reverse' : ''}`}>
      <Avatar className="h-8 w-8">
        <AvatarFallback>
          {message.senderType === 'user' ? 'U' : 'C'}
        </AvatarFallback>
      </Avatar>
      <div className={`flex flex-col gap-1 max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-lg px-3 py-2 ${
            isOwn 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap" data-testid={`message-${message.id}`}>
            {message.message}
          </p>
          
          {/* Attachments */}
          {message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.attachments.map((attachment: any, idx: number) => {
                const isImage = attachment.mimetype?.startsWith('image/');
                
                return (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    {isImage ? (
                      <a 
                        href={attachment.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block"
                        data-testid={`attachment-image-${idx}`}
                      >
                        <img 
                          src={attachment.url} 
                          alt={attachment.filename}
                          className="max-w-xs max-h-48 rounded border"
                        />
                      </a>
                    ) : (
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 px-2 py-1 rounded ${
                          isOwn 
                            ? 'bg-primary-foreground/20 hover:bg-primary-foreground/30' 
                            : 'bg-background hover:bg-background/80'
                        }`}
                        data-testid={`attachment-file-${idx}`}
                      >
                        <FileText className="h-4 w-4" />
                        <span>{attachment.filename}</span>
                        <span className="text-xs opacity-70">
                          ({(attachment.size / 1024).toFixed(1)} KB)
                        </span>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}</span>
          {isOwn && (
            <span>
              {message.isRead ? (
                <CheckCheck className="h-3 w-3 text-primary" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function RoomListItem({ room, isActive, onClick }: {
  room: ChatRoom;
  isActive: boolean;
  onClick: () => void;
}) {
  const { t } = useLanguage();
  
  const getRoomName = () => {
    if (room.name) return room.name;
    if (room.type === 'internal') return t('chat.team.chat');
    if (room.type === 'client_support' && room.client) {
      return `${room.client.firstName} ${room.client.lastName}`;
    }
    if (room.type === 'direct' && room.participant) {
      return room.participant.name;
    }
    return room.type === 'direct' ? t('chat.room.type.direct_message') : t('chat.room.type.client_support');
  };

  return (
    <button
      onClick={onClick}
      className={`w-full p-3 text-left hover-elevate rounded-md transition-colors ${
        isActive ? 'bg-accent' : ''
      }`}
      data-testid={`room-${room.id}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {room.type === 'internal' ? (
            <Users className="h-4 w-4 flex-shrink-0" />
          ) : room.type === 'direct' ? (
            <MessageSquare className="h-4 w-4 flex-shrink-0" />
          ) : (
            <User className="h-4 w-4 flex-shrink-0" />
          )}
          <span className="font-medium truncate">
            {getRoomName()}
          </span>
        </div>
        {room.unreadCount && room.unreadCount > 0 && (
          <Badge variant="default" className="ml-2">
            {room.unreadCount}
          </Badge>
        )}
      </div>
    </button>
  );
}

export default function Chat() {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [roomFilter, setRoomFilter] = useState<string>("all");
  const [typingUsers, setTypingUsers] = useState<Map<string, Set<string>>>(new Map());
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast} = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();

  // WebSocket integration for real-time chat
  const { isConnected, joinRoom, leaveRoom, sendTyping, markMessageRead: markReadViaWebSocket } = useChatWebSocket({
    enabled: true,
    onTyping: (roomId, userId, isTyping) => {
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        if (!newMap.has(roomId)) {
          newMap.set(roomId, new Set());
        }
        const roomTypers = newMap.get(roomId)!;
        if (isTyping) {
          roomTypers.add(userId);
        } else {
          roomTypers.delete(userId);
        }
        return newMap;
      });
    },
    onUserStatus: (userId, status) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        if (status === 'online') {
          newSet.add(userId);
        } else {
          newSet.delete(userId);
        }
        return newSet;
      });
    },
  });

  const { data: rooms = [], isLoading: roomsLoading } = useQuery<ChatRoom[]>({
    queryKey: ['/api/chat/rooms'],
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ['/api/chat/rooms', selectedRoomId, 'messages'],
    enabled: !!selectedRoomId,
  });

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['/api/clients'],
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
  });

  const form = useForm<RoomFormData>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: {
      type: "internal",
      clientId: undefined,
      name: "",
    },
  });

  const createRoomMutation = useMutation({
    mutationFn: async (data: RoomFormData) => {
      console.log('Creating chat room with data:', data);
      const response = await apiRequest('POST', '/api/chat/rooms', data);
      return await response.json();
    },
    onSuccess: (newRoom: any) => {
      console.log('Chat room created successfully:', newRoom);
      queryClient.invalidateQueries({ queryKey: ['/api/chat/rooms'] });
      toast({ title: t('common.success'), description: t('chat.room.created') });
      if (newRoom?.id) {
        setSelectedRoomId(newRoom.id);
      }
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      console.error('Chat room creation error:', error);
      toast({ title: t('common.error'), description: error.message || 'Failed to create room', variant: "destructive" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data: { roomId: string; message: string; attachments?: any[] }) =>
      apiRequest('POST', `/api/chat/rooms/${data.roomId}/messages`, { 
        message: data.message,
        attachments: data.attachments || []
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/rooms', selectedRoomId, 'messages'] });
      setMessageText("");
    },
    onError: (error) => {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (messageId: string) =>
      apiRequest('PATCH', `/api/chat/messages/${messageId}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/rooms', selectedRoomId, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chat/rooms'] });
    },
  });

  useEffect(() => {
    if (messages.length > 0 && selectedRoomId) {
      const unreadMessages = messages.filter(
        m => !m.isRead && m.senderId !== user?.id
      );
      unreadMessages.forEach(m => {
        // Use REST API to mark as read in database
        markReadMutation.mutate(m.id);
        
        // Also send WebSocket event to notify other clients
        if (isConnected) {
          markReadViaWebSocket(selectedRoomId, m.id);
        }
      });
    }
  }, [messages, selectedRoomId, user?.id, isConnected, markReadViaWebSocket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-join/leave rooms via WebSocket
  useEffect(() => {
    if (selectedRoomId && isConnected) {
      joinRoom(selectedRoomId);
      return () => {
        leaveRoom(selectedRoomId);
      };
    }
  }, [selectedRoomId, isConnected, joinRoom, leaveRoom]);

  const handleSubmit = (data: RoomFormData) => {
    createRoomMutation.mutate(data);
  };

  const handleMessageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessageText(value);

    // Send typing indicator
    if (selectedRoomId && isConnected) {
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Send typing=true
      sendTyping(selectedRoomId, true);

      // Set timeout to send typing=false
      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(selectedRoomId, false);
      }, 2000);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    if (!selectedRoomId || (!messageText.trim() && selectedFiles.length === 0)) return;
    
    // Clear typing indicator when sending message
    if (isConnected && typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      sendTyping(selectedRoomId, false);
    }

    try {
      let attachments: any[] = [];

      // Upload files if any
      if (selectedFiles.length > 0) {
        setUploadingFiles(true);
        
        for (const file of selectedFiles) {
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch('/api/chat/upload', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            },
            body: formData,
          });

          if (!response.ok) throw new Error('File upload failed');

          const fileData = await response.json();
          attachments.push(fileData);
        }
        
        setUploadingFiles(false);
        setSelectedFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }

      // Send message with attachments
      sendMessageMutation.mutate({ 
        roomId: selectedRoomId, 
        message: messageText || 'Attachment',
        attachments 
      });
    } catch (error) {
      setUploadingFiles(false);
      toast({
        variant: 'destructive',
        title: t('chat.upload.failed'),
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  const filteredRooms = roomFilter === "all" 
    ? rooms 
    : rooms.filter(r => r.type === roomFilter);

  if (roomsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">{t('chat.loading')}</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 p-6">
      {/* Room List */}
      <Card className="w-80 flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">{t('chat.rooms')}</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost" data-testid="button-new-room">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('chat.create.room')}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('chat.room.type')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-room-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="internal">{t('chat.room.type.internal')}</SelectItem>
                            <SelectItem value="client_support">{t('chat.room.type.client_support')}</SelectItem>
                            <SelectItem value="direct">{t('chat.room.type.direct_message')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch("type") === "client_support" && (
                    <FormField
                      control={form.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('chat.client')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-client">
                                <SelectValue placeholder={t('chat.select.client.placeholder')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {clients.map((client) => (
                                <SelectItem key={client.id} value={client.id}>
                                  {client.firstName} {client.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {form.watch("type") === "direct" && (
                    <FormField
                      control={form.control}
                      name="participantId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('chat.user')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-user">
                                <SelectValue placeholder={t('chat.select.user.placeholder')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {users.filter(u => u.id !== user?.id).map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('chat.room.name.optional')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('chat.room.name.placeholder')} data-testid="input-room-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      data-testid="button-cancel"
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button type="submit" disabled={createRoomMutation.isPending} data-testid="button-submit">
                      {createRoomMutation.isPending ? t('chat.creating') : t('chat.create.room.button')}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <div className="p-3 border-b">
            <div className="flex gap-2">
              <Button
                variant={roomFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setRoomFilter("all")}
                data-testid="filter-all"
                className="flex-1"
              >
                {t('common.all')}
              </Button>
              <Button
                variant={roomFilter === "internal" ? "default" : "outline"}
                size="sm"
                onClick={() => setRoomFilter("internal")}
                data-testid="filter-internal"
                className="flex-1"
              >
                {t('chat.filter.team')}
              </Button>
              <Button
                variant={roomFilter === "client_support" ? "default" : "outline"}
                size="sm"
                onClick={() => setRoomFilter("client_support")}
                data-testid="filter-clients"
                className="flex-1"
              >
                {t('chat.filter.clients')}
              </Button>
              <Button
                variant={roomFilter === "direct" ? "default" : "outline"}
                size="sm"
                onClick={() => setRoomFilter("direct")}
                data-testid="filter-direct"
                className="flex-1"
              >
                {t('chat.filter.direct')}
              </Button>
            </div>
          </div>
          <ScrollArea className="h-full px-4">
            {filteredRooms.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {roomFilter === "all" 
                  ? t('chat.no.rooms')
                  : roomFilter === "internal" 
                    ? t('chat.no.team.rooms')
                    : roomFilter === "client_support" 
                      ? t('chat.no.client.rooms')
                      : t('chat.no.direct.rooms')
                }
              </p>
            ) : (
              <div className="space-y-2 pb-4 pt-2">
                {filteredRooms.map((room) => (
                  <RoomListItem
                    key={room.id}
                    room={room}
                    isActive={room.id === selectedRoomId}
                    onClick={() => setSelectedRoomId(room.id)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Messages Area */}
      <Card className="flex-1 flex flex-col">
        {selectedRoom ? (
          <>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {selectedRoom.type === 'internal' ? (
                    <Users className="h-5 w-5" />
                  ) : selectedRoom.type === 'direct' ? (
                    <MessageSquare className="h-5 w-5" />
                  ) : (
                    <User className="h-5 w-5" />
                  )}
                  <CardTitle>
                    {selectedRoom.name || (
                      selectedRoom.type === 'internal' 
                        ? t('chat.team.chat')
                        : selectedRoom.type === 'direct' && selectedRoom.participant
                          ? selectedRoom.participant.name
                          : selectedRoom.type === 'client_support' && selectedRoom.client 
                            ? `${selectedRoom.client.firstName} ${selectedRoom.client.lastName}`
                            : selectedRoom.type === 'direct' 
                              ? t('chat.room.type.direct_message')
                              : t('chat.room.type.client_support')
                    )}
                  </CardTitle>
                </div>
                {isConnected ? (
                  <Badge variant="outline" className="gap-1">
                    <Wifi className="h-3 w-3" />
                    {t('chat.connected') || 'Connected'}
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <WifiOff className="h-3 w-3" />
                    {t('chat.disconnected') || 'Disconnected'}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full p-4">
                {messagesLoading ? (
                  <p className="text-center text-muted-foreground">{t('chat.loading.messages')}</p>
                ) : messages.length === 0 ? (
                  <p className="text-center text-muted-foreground">{t('chat.no.messages')}</p>
                ) : (
                  <>
                    {messages.map((message) => (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        isOwn={message.senderId === user?.id}
                      />
                    ))}
                    {/* Typing indicator */}
                    {selectedRoomId && typingUsers.get(selectedRoomId)?.size ? (
                      <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span>{t('chat.typing') || 'Someone is typing...'}</span>
                      </div>
                    ) : null}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </ScrollArea>
            </CardContent>
            <div className="border-t p-4">
              {/* File preview section */}
              {selectedFiles.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {selectedFiles.map((file, index) => (
                    <Badge key={index} variant="secondary" className="gap-2">
                      <Paperclip className="h-3 w-3" />
                      <span className="text-xs">{file.name}</span>
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className="hover:text-destructive"
                        data-testid={`button-remove-file-${index}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                  data-testid="input-file"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFiles}
                  data-testid="button-attach-file"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  value={messageText}
                  onChange={handleMessageInputChange}
                  placeholder={t('chat.type.message')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  onBlur={() => {
                    // Clear typing indicator when input loses focus
                    if (selectedRoomId && isConnected && typingTimeoutRef.current) {
                      clearTimeout(typingTimeoutRef.current);
                      sendTyping(selectedRoomId, false);
                    }
                  }}
                  disabled={uploadingFiles}
                  data-testid="input-message"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={(!messageText.trim() && selectedFiles.length === 0) || sendMessageMutation.isPending || uploadingFiles}
                  data-testid="button-send"
                >
                  {uploadingFiles ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('chat.select.room')}</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  read: boolean;
  createdAt: string;
}

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: open, // Only fetch when dropdown is open
    refetchInterval: open ? 30000 : false, // Poll every 30s when open
  });

  // Fetch unread count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 60000, // Poll every minute for unread count
  });

  const unreadCount = unreadData?.count || 0;

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/notifications/mark-all-read", {});
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  // Clear all notifications mutation
  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/notifications/clear", {});
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  // Mark single notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/notifications/${id}/read`, {});
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "warning":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "error":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    }
  };

  const unreadNotifications = notifications.filter((n) => !n.read);
  const readNotifications = notifications.filter((n) => n.read);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="notification-bell"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                data-testid="mark-all-read"
              >
                {markAllReadMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <CheckCheck className="h-3 w-3 mr-1" />
                    Mark all read
                  </>
                )}
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={() => clearAllMutation.mutate()}
                disabled={clearAllMutation.isPending}
                data-testid="clear-all"
              >
                {clearAllMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {unreadNotifications.length > 0 && (
                <>
                  {unreadNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => {
                        if (!notification.read) {
                          markAsReadMutation.mutate(notification.id);
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${getTypeColor(notification.type)}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium">{notification.title}</p>
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsReadMutation.mutate(notification.id);
                                }}
                                data-testid={`mark-read-${notification.id}`}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDistanceToNow(new Date(notification.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {readNotifications.length > 0 && <Separator />}
                </>
              )}

              {readNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 hover:bg-muted/50 transition-colors opacity-60"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${getTypeColor(notification.type)}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}


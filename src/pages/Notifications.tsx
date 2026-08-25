import { trpc } from "@/providers/trpc";
import { useNavigate } from "react-router";
import {
  Bell,
  Package,
  AlertTriangle,
  Info,
  Tag,
  Star,
  Loader2,
  Check,
} from "lucide-react";

const typeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  order: { icon: <Package className="h-5 w-5" />, color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30" },
  inventory: { icon: <AlertTriangle className="h-5 w-5" />, color: "text-orange-600 bg-orange-100 dark:bg-orange-900/30" },
  system: { icon: <Info className="h-5 w-5" />, color: "text-slate-600 bg-slate-100 dark:bg-slate-800" },
  promotion: { icon: <Tag className="h-5 w-5" />, color: "text-green-600 bg-green-100 dark:bg-green-900/30" },
  review: { icon: <Star className="h-5 w-5" />, color: "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30" },
};

export default function Notifications() {
  const navigate = useNavigate();
  const { data: notifications, isLoading } = trpc.notification.list.useQuery(undefined, {
    refetchInterval: 2000,
  });
  const utils = trpc.useUtils();
  const markRead = trpc.notification.markRead.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.unreadCount.invalidate();
    },
  });
  const markAllRead = trpc.notification.markAllRead.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.unreadCount.invalidate();
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Notifications</h1>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
            <Bell className="w-6 h-6 text-slate-400 dark:text-slate-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">No Notifications</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              You're all caught up! When you receive updates about your orders or account, they'll appear here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          Notifications
        </h1>
        <button
          onClick={() => markAllRead.mutate()}
          className="flex items-center gap-1 px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
        >
          <Check className="h-4 w-4" />
          Mark all read
        </button>
      </div>

      <div className="space-y-3">
        {notifications.map((n: any) => {
          const config = typeConfig[n.type] || typeConfig.system;
          return (
            <div
              key={n.id}
              onClick={() => {
                if (!n.isRead) markRead.mutate({ id: n.id });
                if (n.link) navigate(n.link);
              }}
              className={`flex items-start gap-4 p-4 rounded-xl border transition-colors cursor-pointer ${
                n.isRead
                  ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  : "bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800"
              }`}
            >
              <div className={`shrink-0 p-2 rounded-lg ${config.color}`}>
                {config.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm ${n.isRead ? "text-slate-700 dark:text-slate-300" : "text-slate-900 dark:text-white"}`}>
                  {n.title}
                </p>
                {n.message && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{n.message}</p>
                )}
                <p className="text-xs text-slate-400 mt-1">
                  {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ""}
                </p>
              </div>
              {!n.isRead && (
                <div className="shrink-0 w-2.5 h-2.5 bg-indigo-600 rounded-full mt-2" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

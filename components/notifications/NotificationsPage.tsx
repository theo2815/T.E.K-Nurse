import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getUnreadCount,
  listMyNotifications,
} from "@/lib/supabase/queries/notifications";
import { MarkAllReadButton } from "./MarkAllReadButton";
import { NotificationsListClient } from "./NotificationsListClient";
import { NotificationsPageRealtime } from "./NotificationsPageRealtime";

export async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [rows, unreadCount] = await Promise.all([
    listMyNotifications(),
    getUnreadCount(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-6 md:px-12 py-12 md:py-16">
      {user && <NotificationsPageRealtime userId={user.id} />}
      <div className="flex flex-col gap-8">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-2">
            <p className="font-mono uppercase text-[11px] tracking-[0.1em] text-slate">
              INBOX
              {unreadCount > 0 && (
                <span className="text-teal"> · {unreadCount} UNREAD</span>
              )}
            </p>
            <h1 className="text-display">Notifications</h1>
          </div>
          <MarkAllReadButton unreadCount={unreadCount} variant="page" />
        </div>
        <hr className="border-rule" />

        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          <NotificationsListClient rows={rows} />
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-paper border-[1.5px] border-rule rounded p-12 flex flex-col items-center text-center">
      <div className="w-12 h-12 rounded-full bg-rule/30 flex items-center justify-center mb-4">
        <Bell size={20} strokeWidth={1.5} className="text-slate" />
      </div>
      <p className="font-mono uppercase text-[11px] tracking-[0.1em] text-slate">
        No notifications yet
      </p>
      <p className="text-[14px] text-slate/70 mt-2 max-w-md">
        Updates about your borrows, returns, requests, and important lab events
        will appear here.
      </p>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, Clock, ExternalLink, X } from 'lucide-react';
import {
  getNotificationsAction,
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
} from '@/actions/notification';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    setLoading(true);
    const res = await getNotificationsAction();
    if (res.success && res.data) {
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadNotifications();
    // Refresh periodically (e.g. every 20 seconds)
    const timer = setInterval(loadNotifications, 20000);
    return () => clearInterval(timer);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsReadAction(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsReadAction();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) loadNotifications();
        }}
        className="relative p-2 rounded-xl bg-surface-soft hover:bg-surface-strong border border-hairline/80 text-body hover:text-ink transition flex items-center justify-center"
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-hairline overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 bg-surface-soft border-b border-hairline flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-ink uppercase tracking-wider">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="badge-pill !bg-rose-100 !text-rose-700 text-[10px] !py-0.5 !px-2 font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] text-brand hover:underline font-semibold flex items-center gap-1"
              >
                <CheckCheck className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-hairline">
            {loading && notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted">Loading alerts...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-muted">
                <Bell className="h-8 w-8 mx-auto text-muted mb-2 opacity-50" />
                <p className="text-xs">No notifications yet.</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => !item.isRead && handleMarkAsRead(item.id)}
                  className={`p-3.5 text-xs transition cursor-pointer hover:bg-surface-soft/60 ${
                    !item.isRead ? 'bg-sky-50/40 font-medium' : 'text-body'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {!item.isRead && (
                        <span className="h-2 w-2 rounded-full bg-brand shrink-0" />
                      )}
                      <span className="font-semibold text-ink leading-tight">
                        {item.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted whitespace-nowrap font-mono">
                      {item.timeAgo || 'Recent'}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted mt-1 leading-relaxed pl-3.5">
                    {item.message}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-surface-soft/50 border-t border-hairline text-center">
            <Link
              href="/appointments"
              onClick={() => setIsOpen(false)}
              className="text-[11px] text-muted hover:text-ink transition font-medium"
            >
              View appointment updates & alerts →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

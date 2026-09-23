import React, { useState, useEffect, useCallback } from 'react';
import { 
  Bell, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Camera, 
  Ticket, 
  Trash2,
  ExternalLink,
  Sparkles,
  Plane,
  Building2,
  Car,
  ShieldCheck,
  Lock,
  LogIn
} from 'lucide-react';
import { AppNotification } from '../../types';
import { 
  getStoredNotifications, 
  fetchAndSyncUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllStoredNotifications,
  purgeGuestNotificationLeaks,
  isPrivateNotification
} from '../../utils/notifications';
import { 
  UserProfile, 
  subscribeToUserNotifications 
} from '../../utils/supabaseClient';

interface RealTimeNotificationCenterProps {
  onOpenTracker?: (bookingRef?: string) => void;
  travelerUser?: UserProfile | null;
  onOpenTravelerAuth?: () => void;
}

export const RealTimeNotificationCenter: React.FC<RealTimeNotificationCenterProps> = ({
  onOpenTracker,
  travelerUser,
  onOpenTravelerAuth
}) => {
  const activeEmail = travelerUser?.email ? travelerUser.email.toLowerCase().trim() : undefined;
  
  // Only load user-specific notifications if user is logged in
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    if (!activeEmail) {
      purgeGuestNotificationLeaks();
      return [];
    }
    return getStoredNotifications(activeEmail);
  });
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);

  // Sync notifications from Supabase & user storage whenever user profile changes / logs in
  const syncNotifications = useCallback(async () => {
    if (activeEmail) {
      const synced = await fetchAndSyncUserNotifications(activeEmail);
      setNotifications(synced);
    } else {
      // User is not signed in: purge any residual leaked data and ensure list is empty
      purgeGuestNotificationLeaks();
      setNotifications([]);
    }
  }, [activeEmail]);

  useEffect(() => {
    syncNotifications();
  }, [syncNotifications]);

  // Real-time listener for dispatched in-app notifications
  useEffect(() => {
    const handleNewNotification = (e: Event) => {
      const customEvent = e as CustomEvent<AppNotification & { userEmail?: string }>;
      if (!customEvent.detail) return;
      const notif = customEvent.detail;
      const notifTargetEmail = notif.userEmail ? notif.userEmail.toLowerCase().trim() : undefined;

      // 1. If notification is tied to a specific user email:
      if (notifTargetEmail) {
        if (!activeEmail || notifTargetEmail !== activeEmail) {
          // Strictly reject: notification belongs to another traveler or current viewer is not signed in
          return;
        }
      }

      // 2. If current viewer is NOT signed in:
      // STRICT PRIVACY ENFORCEMENT: Never show private travel bookings, flight tickets, hotel vouchers or manifests to anonymous users
      if (!activeEmail) {
        if (isPrivateNotification(notif)) {
          return; // Do not leak to guest
        }
      }

      setNotifications((prev) => [notif, ...prev.filter((n) => n.id !== notif.id)]);
      setActiveToast(notif);
      
      // Subtle device haptic feedback if supported
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
    };

    const handleClearNotifications = () => {
      setNotifications([]);
      setActiveToast(null);
    };

    window.addEventListener('holiday_notification_event', handleNewNotification);
    window.addEventListener('holiday_notification_clear', handleClearNotifications);
    window.addEventListener('holiday_signed_out', handleClearNotifications);

    return () => {
      window.removeEventListener('holiday_notification_event', handleNewNotification);
      window.removeEventListener('holiday_notification_clear', handleClearNotifications);
      window.removeEventListener('holiday_signed_out', handleClearNotifications);
    };
  }, [activeEmail]);

  // Supabase Database Realtime Subscription for cross-device updates (phone, tablet, PC)
  useEffect(() => {
    if (!activeEmail) return;

    const unsubscribe = subscribeToUserNotifications(activeEmail, (payload) => {
      if (payload.eventType === 'INSERT' && payload.new) {
        const newNotif: AppNotification = {
          id: payload.new.id,
          title: payload.new.title,
          message: payload.new.message,
          type: (payload.new.type as any) || 'info',
          read: Boolean(payload.new.read),
          timestamp: payload.new.created_at 
            ? new Date(payload.new.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          bookingRef: payload.new.booking_ref || undefined,
          actionLabel: payload.new.action_label || undefined
        };

        setNotifications((prev) => {
          if (prev.some((n) => n.id === newNotif.id)) return prev;
          return [newNotif, ...prev];
        });
        setActiveToast(newNotif);
      } else if (payload.eventType === 'UPDATE' && payload.new) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === payload.new.id ? { ...n, read: Boolean(payload.new.read) } : n))
        );
      } else if (payload.eventType === 'DELETE' && payload.old) {
        setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [activeEmail]);

  // Auto-dismiss active toast after 6 seconds
  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      setActiveToast(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [activeToast]);

  // Unread badge count (always 0 if user is signed out)
  const unreadCount = activeEmail ? notifications.filter((n) => !n.read).length : 0;

  const handleMarkAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    markAllNotificationsAsRead(activeEmail);
  };

  const handleClearAll = () => {
    setNotifications([]);
    clearAllStoredNotifications(activeEmail);
  };

  const handleNotificationClick = (n: AppNotification) => {
    // Mark as read locally and in Supabase
    const updated = notifications.map((item) => (item.id === n.id ? { ...item, read: true } : item));
    setNotifications(updated);
    markNotificationAsRead(n.id, activeEmail);

    if (n.bookingRef && onOpenTracker) {
      setIsOpen(false);
      onOpenTracker(n.bookingRef);
    }
  };

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'payment_verified':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'receipt':
        return <Camera className="w-4 h-4 text-cyan-400" />;
      case 'audit_flag':
        return <AlertCircle className="w-4 h-4 text-amber-400" />;
      case 'booking':
        return <Ticket className="w-4 h-4 text-sunset-coral" />;
      case 'flight':
        return <Plane className="w-4 h-4 text-sky-400" />;
      case 'hotel':
        return <Building2 className="w-4 h-4 text-amber-300" />;
      case 'transport':
      case 'logistics':
        return <Car className="w-4 h-4 text-teal-300" />;
      default:
        return <Sparkles className="w-4 h-4 text-sand-muted" />;
    }
  };

  return (
    <>
      {/* Reactive Real-Time Floating Toast Alert (Only for authenticated traveler) */}
      {activeToast && activeEmail && (
        <div 
          className="fixed top-20 right-4 z-50 max-w-sm w-full bg-[#0D151D] border border-white/15 rounded-2xl p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto"
          role="alert"
          id="real-time-notification-toast"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
              {getIcon(activeToast.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-semibold text-ivory tracking-wide truncate">
                  {activeToast.title}
                </h4>
                <span className="text-[10px] font-mono text-sand-muted">{activeToast.timestamp}</span>
              </div>
              <p className="text-xs text-sand-muted mt-1 leading-relaxed">
                {activeToast.message}
              </p>

              {activeToast.bookingRef && onOpenTracker && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenTracker(activeToast.bookingRef);
                    setActiveToast(null);
                  }}
                  className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-sunset-coral hover:text-[#ff765b] transition-colors cursor-pointer"
                >
                  <span>Track Ref #{activeToast.bookingRef}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
            <button
              onClick={() => setActiveToast(null)}
              className="text-sand-muted hover:text-ivory transition-colors p-1 cursor-pointer"
              aria-label="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Bell Trigger */}
      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 rounded-full text-sand-muted hover:text-ivory hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
          title={activeEmail ? "Notifications & Booking Updates" : "Travel Alerts (Sign in to view personal bookings)"}
          id="real-time-notification-bell-btn"
          aria-label="View notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-sunset-coral text-white text-[9px] font-mono font-bold flex items-center justify-center shadow-lg shadow-sunset-coral/40 animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown Panel */}
        {isOpen && (
          <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-[#0B1015] border border-white/10 rounded-2xl shadow-2xl p-4 z-50 backdrop-blur-2xl text-left space-y-3 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-sunset-coral" />
                <span className="text-xs font-semibold text-ivory tracking-wide">
                  Notifications & Travel Alerts
                </span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-mono bg-sunset-coral/20 text-sunset-coral px-1.5 py-0.5 rounded border border-sunset-coral/30">
                    {unreadCount} new
                  </span>
                )}
              </div>
              
              {activeEmail && (
                <div className="flex items-center gap-2 text-[11px] text-sand-muted">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="hover:text-ivory transition-colors cursor-pointer"
                    >
                      Mark read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={handleClearAll}
                      className="hover:text-rose-400 transition-colors p-1 cursor-pointer"
                      title="Clear all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* List / Guest Security View */}
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {!activeEmail ? (
                /* GUEST / UNSIGNED-IN ENCLOSURE: Strict Data Privacy Guarantee */
                <div className="py-5 px-3 text-center space-y-3 bg-white/[0.02] border border-white/5 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-sunset-coral/10 border border-sunset-coral/30 flex items-center justify-center mx-auto text-sunset-coral">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-xs font-semibold text-ivory">Personal Travel Alerts Protected</h5>
                    <p className="text-[11px] text-sand-muted leading-relaxed">
                      Flight boarding passes, assigned seats, hotel vouchers, and transport dispatch are private and accessible only to verified traveler accounts.
                    </p>
                  </div>
                  <div className="pt-2 flex flex-col gap-2">
                    {onOpenTravelerAuth && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          onOpenTravelerAuth();
                        }}
                        className="w-full py-2 px-3 rounded-lg bg-sunset-coral hover:bg-[#ff765b] text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-sunset-coral/20"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Sign In to Access Alerts</span>
                      </button>
                    )}
                    {onOpenTracker && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          onOpenTracker();
                        }}
                        className="w-full py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-sand-muted hover:text-ivory text-xs font-sans-body transition-colors cursor-pointer border border-white/5"
                      >
                        Check Ticket by Booking Reference
                      </button>
                    )}
                  </div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-sand-muted space-y-1">
                  <Bell className="w-6 h-6 mx-auto opacity-30 text-sand-muted" />
                  <p>No new travel notifications.</p>
                  <p className="text-[10px] text-sand-muted/70">
                    Live updates for your confirmed bookings, flight tickets, and vouchers will appear here.
                  </p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all hover:border-white/20 ${
                      n.read
                        ? 'bg-white/[0.02] border-white/[0.05] text-sand-muted'
                        : 'bg-white/[0.06] border-white/15 text-ivory'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 shrink-0">{getIcon(n.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="font-medium text-[12px] truncate">{n.title}</p>
                          <span className="text-[10px] font-mono text-sand-muted shrink-0">
                            {n.timestamp}
                          </span>
                        </div>
                        <p className="text-[11px] text-sand-muted mt-0.5 leading-relaxed">
                          {n.message}
                        </p>
                        {n.bookingRef && (
                          <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-mono text-sunset-coral hover:underline">
                            <span>Ref: {n.bookingRef}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

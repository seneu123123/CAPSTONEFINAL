import { AppNotification } from '../types';
import {
  fetchUserNotificationsFromDb,
  saveUserNotificationToDb,
  markUserNotificationAsReadInDb,
  markAllUserNotificationsAsReadInDb,
  deleteUserNotificationFromDb,
  clearUserNotificationsFromDb
} from './supabaseClient';

export const getActiveUserEmail = (): string | null => {
  try {
    const raw = localStorage.getItem('holiday_traveler_profile');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.email?.toLowerCase().trim() || null;
  } catch {
    return null;
  }
};

/**
 * Checks whether a notification contains private traveler or booking information.
 * Private notifications must NEVER leak or be displayed to unauthenticated/guest users.
 */
export const isPrivateNotification = (n: Partial<AppNotification>): boolean => {
  if (n.bookingRef) return true;
  if (
    n.type &&
    ['flight', 'hotel', 'transport', 'logistics', 'booking', 'receipt', 'payment_verified', 'audit_flag'].includes(
      n.type
    )
  ) {
    return true;
  }
  const text = `${n.title || ''} ${n.message || ''}`.toLowerCase();
  if (
    text.includes('booking') ||
    text.includes('flight') ||
    text.includes('hotel') ||
    text.includes('shuttle') ||
    text.includes('manifest') ||
    text.includes('traveler') ||
    text.includes('ref #') ||
    text.includes('ref:') ||
    text.includes('passenger') ||
    text.includes('ticket') ||
    text.includes('voucher') ||
    text.includes('seat')
  ) {
    return true;
  }
  return false;
};

/**
 * Purges any leaked private demo or traveler notifications from the guest fallback key.
 */
export const purgeGuestNotificationLeaks = (): void => {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('holiday_app_notifications');
    if (!raw) return;
    const list: AppNotification[] = JSON.parse(raw);
    if (!Array.isArray(list)) {
      localStorage.removeItem('holiday_app_notifications');
      return;
    }
    const cleaned = list.filter((n) => !isPrivateNotification(n));
    if (cleaned.length === 0) {
      localStorage.removeItem('holiday_app_notifications');
    } else {
      localStorage.setItem('holiday_app_notifications', JSON.stringify(cleaned));
    }
  } catch {
    localStorage.removeItem('holiday_app_notifications');
  }
};

// Immediate cleanup on bundle execution
if (typeof window !== 'undefined') {
  purgeGuestNotificationLeaks();
}

export const getUserNotificationsStorageKey = (userEmail?: string): string => {
  const email = (userEmail || getActiveUserEmail() || '').toLowerCase().trim();
  if (email) {
    return `holiday_user_notifications_${email}`;
  }
  return 'holiday_app_notifications';
};

export const getStoredNotifications = (userEmail?: string): AppNotification[] => {
  try {
    const email = (userEmail || getActiveUserEmail() || '').toLowerCase().trim();
    
    // For anonymous / un-signed-in guests:
    if (!email) {
      purgeGuestNotificationLeaks();
      const raw = localStorage.getItem('holiday_app_notifications');
      if (!raw) return [];
      const parsed: AppNotification[] = JSON.parse(raw);
      // Strictly return non-private public notifications only
      return parsed.filter((n) => !isPrivateNotification(n));
    }

    const key = `holiday_user_notifications_${email}`;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: AppNotification[] = JSON.parse(raw);
    return parsed.filter(
      (n) =>
        !n.title?.toLowerCase().includes('operator tower') &&
        !n.message?.toLowerCase().includes('operator tower') &&
        !n.message?.toLowerCase().includes('administrative session')
    );
  } catch (err) {
    console.error('Failed to load notifications from storage:', err);
    return [];
  }
};

export const saveStoredNotifications = (
  notifications: AppNotification[],
  userEmail?: string
): void => {
  try {
    const email = (userEmail || getActiveUserEmail() || '').toLowerCase().trim();
    if (email) {
      const key = `holiday_user_notifications_${email}`;
      localStorage.setItem(key, JSON.stringify(notifications.slice(0, 100)));
    } else {
      // For anonymous guests: only store non-private system broadcasts
      const safe = notifications.filter((n) => !isPrivateNotification(n));
      if (safe.length > 0) {
        localStorage.setItem('holiday_app_notifications', JSON.stringify(safe.slice(0, 20)));
      } else {
        localStorage.removeItem('holiday_app_notifications');
      }
    }
  } catch (err) {
    console.error('Failed to save notifications to storage:', err);
  }
};

export const clearStoredNotifications = (userEmail?: string): void => {
  try {
    const email = (userEmail || getActiveUserEmail() || '').toLowerCase().trim();
    if (email) {
      localStorage.removeItem(`holiday_user_notifications_${email}`);
    }
    localStorage.removeItem('holiday_app_notifications');
  } catch (err) {
    console.error('Failed to clear notifications:', err);
  }
};

/**
 * Synchronizes user notifications between Supabase DB and local device storage.
 * Call this when a user logs in or when app mounts with an active session.
 */
export const fetchAndSyncUserNotifications = async (
  userEmail: string
): Promise<AppNotification[]> => {
  if (!userEmail) return [];
  const cleanEmail = userEmail.toLowerCase().trim();

  // 1. Get local cached notifications for this user
  const localList = getStoredNotifications(cleanEmail);
  const notifMap = new Map<string, AppNotification>();
  localList.forEach((n) => notifMap.set(n.id, n));

  try {
    // 2. Query Supabase database table
    const remoteList = await fetchUserNotificationsFromDb(cleanEmail);
    if (Array.isArray(remoteList) && remoteList.length > 0) {
      remoteList.forEach((dbItem) => {
        notifMap.set(dbItem.id, {
          id: dbItem.id,
          title: dbItem.title,
          message: dbItem.message,
          type: (dbItem.type as any) || 'info',
          read: Boolean(dbItem.read),
          timestamp: dbItem.created_at
            ? new Date(dbItem.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          bookingRef: dbItem.booking_ref || undefined,
          actionLabel: dbItem.action_label || undefined
        });
      });
    }
  } catch (err) {
    console.warn('Could not sync notifications from Supabase cloud:', err);
  }

  const merged = Array.from(notifMap.values()).sort((a, b) => {
    return b.id.localeCompare(a.id);
  });

  // Save merged list locally for quick instant access
  saveStoredNotifications(merged, cleanEmail);

  return merged;
};

export const dispatchAppNotification = (
  data: Omit<AppNotification, 'id' | 'timestamp' | 'read'>,
  userEmail?: string,
  userId?: string
): AppNotification => {
  let email = (userEmail || getActiveUserEmail() || '').toLowerCase().trim();

  // If no user email provided, but there is a bookingRef, try to auto-resolve from local bookings
  if (!email && data.bookingRef) {
    try {
      const raw = localStorage.getItem('holiday_travelers_bookings');
      if (raw) {
        const bookings = JSON.parse(raw);
        const match = bookings.find((b: any) => b.bookingRef === data.bookingRef || b.id === data.bookingRef);
        if (match?.customer?.email) {
          email = match.customer.email.toLowerCase().trim();
        }
      }
    } catch {
      // Ignore
    }
  }

  const newNotification: AppNotification = {
    ...data,
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    read: false
  };

  // If tied to an authenticated traveler, store in their private local container and sync to Supabase
  if (email) {
    const current = getStoredNotifications(email);
    const updated = [newNotification, ...current.filter((n) => n.id !== newNotification.id)];
    saveStoredNotifications(updated, email);

    // Cross-device cloud sync: push to Supabase in background
    saveUserNotificationToDb(newNotification, email, userId).catch((err) => {
      console.warn('Background Supabase notification save error:', err);
    });
  } else {
    // If not tied to an email, ONLY store if it is a general non-private announcement
    if (!isPrivateNotification(newNotification)) {
      const current = getStoredNotifications();
      const updated = [newNotification, ...current.filter((n) => n.id !== newNotification.id)];
      saveStoredNotifications(updated);
    }
  }

  // Dispatch custom window event for real-time reactivity in the active tab/window
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('holiday_notification_event', {
        detail: { ...newNotification, userEmail: email || undefined }
      })
    );
  }

  return newNotification;
};

export const markNotificationAsRead = (
  id: string,
  userEmail?: string
): void => {
  const email = (userEmail || getActiveUserEmail() || '').toLowerCase().trim();
  const current = getStoredNotifications(email || undefined);
  const updated = current.map((n) => (n.id === id ? { ...n, read: true } : n));
  saveStoredNotifications(updated, email || undefined);

  if (email) {
    markUserNotificationAsReadInDb(id).catch((err) =>
      console.warn('Supabase mark read error:', err)
    );
  }
};

export const markAllNotificationsAsRead = (userEmail?: string): void => {
  const email = (userEmail || getActiveUserEmail() || '').toLowerCase().trim();
  const current = getStoredNotifications(email || undefined);
  const updated = current.map((n) => ({ ...n, read: true }));
  saveStoredNotifications(updated, email || undefined);

  if (email) {
    markAllUserNotificationsAsReadInDb(email).catch((err) =>
      console.warn('Supabase mark all read error:', err)
    );
  }
};

export const deleteStoredNotification = (
  id: string,
  userEmail?: string
): void => {
  const email = (userEmail || getActiveUserEmail() || '').toLowerCase().trim();
  const current = getStoredNotifications(email || undefined);
  const updated = current.filter((n) => n.id !== id);
  saveStoredNotifications(updated, email || undefined);

  if (email) {
    deleteUserNotificationFromDb(id).catch((err) =>
      console.warn('Supabase delete notification error:', err)
    );
  }
};

export const clearAllStoredNotifications = (userEmail?: string): void => {
  const email = (userEmail || getActiveUserEmail() || '').toLowerCase().trim();
  clearStoredNotifications(email || undefined);

  if (email) {
    clearUserNotificationsFromDb(email).catch((err) =>
      console.warn('Supabase clear all notifications error:', err)
    );
  }
};

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Booking, 
  CustomerFeedback, 
  HotelReservation, 
  FlightReservation,
  PaymentInvoice, 
  PaymentRecord, 
  SubmoduleTab, 
  TourPackage, 
  TransportReservation, 
  ViewMode,
  AppSettings,
  SearchJourneyCriteria
} from './types';
import { 
  getStoredBookings, 
  getStoredFeedbacks, 
  getStoredPackages, 
  resetAllData, 
  saveBookings, 
  saveFeedbacks, 
  savePackages 
} from './utils/storage';
import { CapstoneInfoModal } from './components/CapstoneInfoModal';
import { ClientNavbar } from './components/client/ClientNavbar';
import { ClientPortal } from './components/client/ClientPortal';
import { ClientFooter } from './components/client/ClientFooter';
import { TravelerAuthModal } from './components/client/TravelerAuthModal';
import { MyAccountModal } from './components/client/MyAccountModal';
import { 
  UserProfile, 
  signOutUser, 
  getSupabase, 
  syncUserProfile, 
  getCurrentUserProfile, 
  subscribeToGlobalDatabaseChanges, 
  fetchSystemSettingsFromDb, 
  saveSystemSettingsToDb,
  fetchBookingsFromDb,
  saveBookingToDb
} from './utils/supabaseClient';
import { 
  syncAllStaffAccountsFromCloud, 
  getStoredStaffAccounts, 
  hasTabAccess 
} from './utils/rbac';
import { applyBookingsRLS } from './utils/rowLevelSecurity';
import { AdminNavbar } from './components/admin/AdminNavbar';
import { AdminPortal } from './components/admin/AdminPortal';
import { AdminLoginModal } from './components/admin/AdminLoginModal';
import { SessionInactivityGuard } from './components/admin/SessionInactivityGuard';
import { SkeletonLoader } from './components/common/SkeletonLoader';
import { AiCustomerConcierge } from './components/client/AiCustomerConcierge';
import { ClientPromoModal } from './components/client/ClientPromoModal';
import { GlobalWeatherRadarModal } from './components/client/GlobalWeatherRadarModal';
import { LegalComplianceModal } from './components/common/LegalComplianceModal';
import { CookieConsentBanner } from './components/common/CookieConsentBanner';
import { ActionConfirmModal } from './components/common/ActionConfirmModal';
import { dispatchAppNotification, purgeGuestNotificationLeaks } from './utils/notifications';
import { LegalPolicyTab } from './types/compliance';
import { trackEvent } from './utils/analytics';
import { applyAdminTheme } from './utils/theme';

const DEFAULT_SETTINGS: AppSettings = {
  agency: {
    companyName: 'Holiday Travelers Inc.',
    shortName: 'Holiday Travelers',
    accreditationNo: 'DOT-ACCR-NCR-2026',
    tagline: 'Online Booking, Passport & Visa Processing, and Curated Tour Packages',
    email: 'holidaytravelersinc2022@gmail.com',
    phone: '0916 525 3517',
    address: 'Unit 1101 City & Land Mega Plaza Inc., ADB Ave., Corner Garnet Rd., Ortigas Center San Antonio, Pasig City, Philippines, 1605',
    currencySymbol: '₱',
    defaultDownpaymentPct: 30
  },
  theme: {
    accentColor: 'coral',
    fontDisplay: 'cormorant',
    fontBody: 'jakarta',
    bgTone: 'obsidian',
    borderStyle: 'subtle',
    fontSize: 'standard',
    cardGlow: true,
    colorScheme: 'coral',
    density: 'spacious',
    showBorders: true,
    enableAnimations: true
  },
  promo: {
    enabled: true,
    badge: 'Limited Season Promo',
    title: 'Discover the World with 8% Off',
    tagline: 'Domestic & International Early Bird Reservations',
    description: 'Lock in your dream island or international expedition with only 50% downpayment today. Guaranteed boutique resort stays, chartered excursions, and certified local guides.',
    discountCode: 'HOLIDAY2026',
    discountPct: 8,
    imageUrl: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=1200&q=80',
    actionText: 'Claim Promo & Reserve Now',
    actionUrl: '#expeditions',
    expiresText: 'Limited to first 25 bookings this season'
  }
};

export default function App() {
  // Navigation & View Mode State (Check URL param ?view=admin or /admin for isolation)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('view') === 'admin' || window.location.pathname.includes('/admin')) {
      return 'operator';
    }
    const saved = localStorage.getItem('holiday_view_mode');
    return saved === 'operator' ? 'operator' : 'customer';
  });

  const [adminTab, setAdminTab] = useState<SubmoduleTab>('overview');
  const [isTabLoading, setIsTabLoading] = useState<boolean>(false);

  // Modals & Client State
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isTrackerOpen, setIsTrackerOpen] = useState<boolean>(false);
  const [targetTrackerRef, setTargetTrackerRef] = useState<string | undefined>(undefined);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);

  const handleOpenTracker = (ref?: unknown) => {
    if (typeof ref === 'string' && ref.trim()) {
      setTargetTrackerRef(ref.trim());
    } else {
      setTargetTrackerRef(undefined);
    }
    setIsTrackerOpen(true);
  };
  const [isCapstoneModalOpen, setIsCapstoneModalOpen] = useState<boolean>(false);
  const [isWeatherRadarOpen, setIsWeatherRadarOpen] = useState<boolean>(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState<boolean>(false);
  const [legalModalTab, setLegalModalTab] = useState<LegalPolicyTab>('privacy');
  const [isCookiePreferencesOpen, setIsCookiePreferencesOpen] = useState<boolean>(false);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState<boolean>(false);
  const [activePromoCode, setActivePromoCode] = useState<string | undefined>(undefined);
  const [isMyAccountModalOpen, setIsMyAccountModalOpen] = useState<boolean>(false);

  // Traveler Supabase Auth State
  const [travelerUser, setTravelerUser] = useState<UserProfile | null>(() => {
    const cached = localStorage.getItem('holiday_traveler_profile');
    if (cached) {
      try { return JSON.parse(cached); } catch {}
    }
    return null;
  });
  const [isTravelerAuthModalOpen, setIsTravelerAuthModalOpen] = useState<boolean>(false);
  const [travelerAuthReason, setTravelerAuthReason] = useState<string | undefined>(undefined);
  const [wasBookingRequestedBeforeAuth, setWasBookingRequestedBeforeAuth] = useState<boolean>(false);
  const [pendingSearchCriteria, setPendingSearchCriteria] = useState<SearchJourneyCriteria | null>(null);

  const handleTravelerAuthSuccess = (profile: UserProfile) => {
    setTravelerUser(profile);
    localStorage.setItem('holiday_traveler_profile', JSON.stringify(profile));
    setIsTravelerAuthModalOpen(false);
    setTravelerAuthReason(undefined);

    // If the traveler signed in as a guest, prevent access to checkout/booking modal
    if (profile.auth_provider === 'guest') {
      setWasBookingRequestedBeforeAuth(false);
      return;
    }

    // Only prompt/open the booking modal IF the customer explicitly clicked a booking action before logging in
    if (wasBookingRequestedBeforeAuth) {
      setIsBookingModalOpen(true);
      setWasBookingRequestedBeforeAuth(false);
    }
  };

  const handleOpenBookingModalWithAuth = (pkg?: TourPackage, searchCriteria?: SearchJourneyCriteria) => {
    if (pkg) setPreSelectedPackage(pkg);
    if (searchCriteria) setPendingSearchCriteria(searchCriteria);

    // Guest users cannot access the checkout section (guests are strictly for browsing and customer service)
    if (!travelerUser || travelerUser.auth_provider === 'guest') {
      setWasBookingRequestedBeforeAuth(true);
      const destName = searchCriteria?.destination || (pkg ? pkg.title : 'your selected journey');
      setTravelerAuthReason(`Guest traveler accounts are designed for browsing itineraries and customer service. Please sign in or create an account to access the booking & checkout section for ${destName}.`);
      setIsBookingModalOpen(false);
      setIsTravelerAuthModalOpen(true);
      return;
    }
    setIsBookingModalOpen(true);
  };

  // Sign Out Confirmation & Instant Logout Logic
  const [isTravelerSignOutConfirmOpen, setIsTravelerSignOutConfirmOpen] = useState<boolean>(false);
  const [isStaffSignOutConfirmOpen, setIsStaffSignOutConfirmOpen] = useState<boolean>(false);

  const handlePromptSignOutTraveler = () => {
    setIsTravelerSignOutConfirmOpen(true);
  };

  const handleExecuteSignOutTraveler = () => {
    setIsTravelerSignOutConfirmOpen(false);
    setIsMyAccountModalOpen(false);
    setIsBookingModalOpen(false);

    // React and log out IMMEDIATELY without waiting on network
    setTravelerUser(null);
    localStorage.removeItem('holiday_traveler_profile');
    localStorage.removeItem('holiday_my_booking_refs');
    localStorage.removeItem('holiday_concierge_active_chat_id');
    localStorage.removeItem('holiday_concierge_guest_user');
    localStorage.removeItem('holiday_concierge_closed_tickets');
    setTargetTrackerRef(undefined);
    setIsTrackerOpen(false);

    // Broadcast system-wide sign-out and notification clear events
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('holiday_signed_out'));
      window.dispatchEvent(new CustomEvent('holiday_notification_clear'));
    }

    // Instant toast confirmation
    dispatchAppNotification({
      title: 'Signed Out Successfully',
      message: 'You have been logged out of your traveler profile. See you on your next adventure!',
      type: 'info'
    });

    // Remote revocation in background
    signOutUser().catch((err) => console.error('Background sign out error:', err));
  };

  // Synchronize Supabase Auth state (Google OAuth redirect, Session restore, etc.)
  useEffect(() => {
    let isMounted = true;

    // Purge any leaked notifications from previous versions in guest storage
    purgeGuestNotificationLeaks();

    // Check active session / profile immediately on load
    getCurrentUserProfile().then((profile) => {
      if (isMounted && profile) {
        setTravelerUser(profile);
      }
    });

    // Hydrate system settings from Supabase
    fetchSystemSettingsFromDb().then((dbSettings) => {
      if (isMounted && dbSettings) {
        setAppSettings((prev) => ({ ...prev, ...dbSettings }));
      }
    });

    // 1. Initial Cloud Sync for Staff Accounts
    syncAllStaffAccountsFromCloud().catch((err) => console.warn('Staff cloud sync notice:', err));

    // 2. Initial Cloud Hydration for Bookings
    fetchBookingsFromDb().then((dbBookings) => {
      if (!isMounted) return;
      if (Array.isArray(dbBookings) && dbBookings.length > 0) {
        setBookings((prevLocal) => {
          const map = new Map<string, Booking>();
          prevLocal.forEach((b) => map.set(b.id, b));
          dbBookings.forEach((dbB: any) => {
            const existing = map.get(dbB.id);
            map.set(dbB.id, {
              id: dbB.id,
              bookingRef: dbB.booking_ref || dbB.bookingRef || existing?.bookingRef || `HT-${Date.now().toString().slice(-6)}`,
              tourPackageId: dbB.tour_package_id || dbB.tourPackageId || existing?.tourPackageId || '',
              tourTitle: dbB.tour_title || dbB.tourTitle || existing?.tourTitle || 'Curated Tour Package',
              destination: dbB.destination || existing?.destination || 'Philippines',
              customer: dbB.customer || existing?.customer || {
                fullName: dbB.customer_name || 'Traveler',
                email: dbB.customer_email || '',
                phone: dbB.customer_phone || ''
              },
              passengers: Array.isArray(dbB.passengers) ? dbB.passengers : (existing?.passengers || []),
              travelDate: dbB.travel_date || dbB.travelDate || existing?.travelDate || new Date().toISOString().split('T')[0],
              numPax: Number(dbB.num_pax || dbB.numPax || existing?.numPax || 1),
              totalPrice: Number(dbB.total_price || dbB.totalPrice || existing?.totalPrice || 0),
              depositRequired: Number(dbB.deposit_required || dbB.depositRequired || existing?.depositRequired || 0),
              bookingStatus: dbB.booking_status || dbB.bookingStatus || existing?.bookingStatus || 'Confirmed',
              paymentStatus: dbB.payment_status || dbB.paymentStatus || existing?.paymentStatus || 'Unpaid',
              assignedGuide: dbB.assigned_guide || dbB.assignedGuide || existing?.assignedGuide,
              hotelReservation: dbB.hotel_reservation || dbB.hotelReservation || existing?.hotelReservation,
              transportReservation: dbB.transport_reservation || dbB.transportReservation || existing?.transportReservation,
              flightReservation: dbB.flight_reservation || dbB.flightReservation || existing?.flightReservation,
              invoice: dbB.invoice || existing?.invoice || {
                id: `inv-${dbB.id}`,
                invoiceNo: `INV-${dbB.booking_ref || dbB.bookingRef || dbB.id}`,
                bookingRef: dbB.booking_ref || dbB.bookingRef || dbB.id,
                customerName: dbB.customer?.fullName || dbB.customer_name || 'Traveler',
                customerEmail: dbB.customer?.email || dbB.customer_email || '',
                totalAmount: Number(dbB.total_price || dbB.totalPrice || 0),
                amountPaid: dbB.payment_status === 'Paid' ? Number(dbB.total_price || 0) : 0,
                balanceDue: dbB.payment_status === 'Paid' ? 0 : Number(dbB.total_price || 0),
                status: dbB.payment_status === 'Paid' ? 'Paid' : 'Unpaid',
                dueDate: dbB.travel_date || new Date().toISOString(),
                createdAt: dbB.created_at || new Date().toISOString(),
                payments: []
              },
              createdAt: dbB.created_at || existing?.createdAt || new Date().toISOString()
            });
          });
          const merged = Array.from(map.values());
          saveBookings(merged);
          return merged;
        });
      }
    }).catch((err) => console.warn('Supabase initial bookings fetch notice:', err));

    // Subscribe to auth state changes (e.g. returning from Google OAuth popup/redirect)
    const supabase = getSupabase();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        // If current active session is a guest, do not let stale background token restoration overwrite the guest
        const cached = localStorage.getItem('holiday_traveler_profile');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed?.auth_provider === 'guest' && event !== 'SIGNED_IN') {
              return;
            }
          } catch {}
        }

        const profile = await syncUserProfile(session.user);
        if (profile) {
          setTravelerUser(profile);
        }
        // Clean up hash fragment or query params from URL after Google OAuth callback
        if (window.location.hash.includes('access_token') || window.location.search.includes('code=')) {
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState(null, '', cleanUrl);
        }
      } else if (event === 'SIGNED_OUT') {
        // Only clear traveler user if the user profile was explicitly cleared from localStorage
        const storedProfile = localStorage.getItem('holiday_traveler_profile');
        if (!storedProfile) {
          setTravelerUser(null);
        }
      }
    });

    // Subscribe to global Supabase Database Realtime Changes (RBAC, Bookings, Invoices, Packages, System Settings)
    const unsubscribeGlobalDb = subscribeToGlobalDatabaseChanges((payload) => {
      if (payload.table === 'staff_accounts') {
        syncAllStaffAccountsFromCloud().then(() => {
          window.dispatchEvent(new CustomEvent('holiday_rbac_changed', { detail: payload }));
        }).catch(() => {
          window.dispatchEvent(new CustomEvent('holiday_rbac_changed', { detail: payload }));
        });
      } else if (payload.table === 'bookings') {
        window.dispatchEvent(new CustomEvent('holiday_database_updated', { detail: payload }));
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const dbB = payload.new;
          if (dbB && dbB.id) {
            setBookings((prev) => {
              const existingIdx = prev.findIndex((b) => b.id === dbB.id);
              const mapped: Booking = {
                id: dbB.id,
                bookingRef: dbB.booking_ref || dbB.bookingRef || (existingIdx >= 0 ? prev[existingIdx].bookingRef : `HT-${Date.now().toString().slice(-6)}`),
                tourPackageId: dbB.tour_package_id || dbB.tourPackageId || (existingIdx >= 0 ? prev[existingIdx].tourPackageId : ''),
                tourTitle: dbB.tour_title || dbB.tourTitle || (existingIdx >= 0 ? prev[existingIdx].tourTitle : 'Curated Tour Package'),
                destination: dbB.destination || (existingIdx >= 0 ? prev[existingIdx].destination : 'Philippines'),
                customer: dbB.customer || (existingIdx >= 0 ? prev[existingIdx].customer : {
                  fullName: dbB.customer_name || 'Traveler',
                  email: dbB.customer_email || '',
                  phone: dbB.customer_phone || ''
                }),
                passengers: Array.isArray(dbB.passengers) ? dbB.passengers : (existingIdx >= 0 ? prev[existingIdx].passengers : []),
                travelDate: dbB.travel_date || dbB.travelDate || (existingIdx >= 0 ? prev[existingIdx].travelDate : new Date().toISOString().split('T')[0]),
                numPax: Number(dbB.num_pax || dbB.numPax || (existingIdx >= 0 ? prev[existingIdx].numPax : 1)),
                totalPrice: Number(dbB.total_price || dbB.totalPrice || (existingIdx >= 0 ? prev[existingIdx].totalPrice : 0)),
                depositRequired: Number(dbB.deposit_required || dbB.depositRequired || (existingIdx >= 0 ? prev[existingIdx].depositRequired : 0)),
                bookingStatus: dbB.booking_status || dbB.bookingStatus || (existingIdx >= 0 ? prev[existingIdx].bookingStatus : 'Confirmed'),
                paymentStatus: dbB.payment_status || dbB.paymentStatus || (existingIdx >= 0 ? prev[existingIdx].paymentStatus : 'Unpaid'),
                assignedGuide: dbB.assigned_guide || dbB.assignedGuide || (existingIdx >= 0 ? prev[existingIdx].assignedGuide : undefined),
                hotelReservation: dbB.hotel_reservation || dbB.hotelReservation || (existingIdx >= 0 ? prev[existingIdx].hotelReservation : undefined),
                transportReservation: dbB.transport_reservation || dbB.transportReservation || (existingIdx >= 0 ? prev[existingIdx].transportReservation : undefined),
                flightReservation: dbB.flight_reservation || dbB.flightReservation || (existingIdx >= 0 ? prev[existingIdx].flightReservation : undefined),
                invoice: dbB.invoice || (existingIdx >= 0 ? prev[existingIdx].invoice : {
                  id: `inv-${dbB.id}`,
                  invoiceNo: `INV-${dbB.booking_ref || dbB.bookingRef || dbB.id}`,
                  bookingRef: dbB.booking_ref || dbB.bookingRef || dbB.id,
                  customerName: dbB.customer?.fullName || dbB.customer_name || 'Traveler',
                  customerEmail: dbB.customer?.email || dbB.customer_email || '',
                  totalAmount: Number(dbB.total_price || dbB.totalPrice || 0),
                  amountPaid: dbB.payment_status === 'Paid' ? Number(dbB.total_price || 0) : 0,
                  balanceDue: dbB.payment_status === 'Paid' ? 0 : Number(dbB.total_price || 0),
                  status: dbB.payment_status === 'Paid' ? 'Paid' : 'Unpaid',
                  dueDate: dbB.travel_date || new Date().toISOString(),
                  createdAt: dbB.created_at || new Date().toISOString(),
                  payments: []
                }),
                createdAt: dbB.created_at || (existingIdx >= 0 ? prev[existingIdx].createdAt : new Date().toISOString())
              };

              let nextList: Booking[];
              if (existingIdx >= 0) {
                nextList = [...prev];
                nextList[existingIdx] = { ...nextList[existingIdx], ...mapped };
              } else {
                nextList = [mapped, ...prev];
              }
              saveBookings(nextList);
              return nextList;
            });
          }
        } else if (payload.eventType === 'DELETE' && payload.old?.id) {
          setBookings((prev) => {
            const filtered = prev.filter((b) => b.id !== payload.old.id);
            saveBookings(filtered);
            return filtered;
          });
        }
      } else if (payload.table === 'invoices') {
        window.dispatchEvent(new CustomEvent('holiday_database_updated', { detail: payload }));
      } else if (payload.table === 'system_settings') {
        if (payload.new && payload.new.settings_data) {
          setAppSettings(payload.new.settings_data);
        }
      }
    });

    // Listen for immediate signed out events across components/tabs
    const handleSignedOutEvent = () => {
      if (isMounted) setTravelerUser(null);
    };
    window.addEventListener('holiday_signed_out', handleSignedOutEvent);

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
      unsubscribeGlobalDb();
      window.removeEventListener('holiday_signed_out', handleSignedOutEvent);
    };
  }, []);

  const handleOpenLegalPolicy = (tab: LegalPolicyTab) => {
    setLegalModalTab(tab);
    setIsLegalModalOpen(true);
    trackEvent('view_legal_policy', 'compliance', { policy: tab });
  };

  useEffect(() => {
    trackEvent('page_view', 'navigation', { view: viewMode });
  }, [viewMode]);

  // Discrete Staff Hotkeys (Ctrl+Shift+A, Cmd+Shift+A, Ctrl+Alt+A, Ctrl+Shift+L, Cmd+Shift+L) & URL triggers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      const isShiftOrAlt = e.shiftKey || e.altKey;

      if (
        (isCmdOrCtrl && e.shiftKey && (e.key === 'A' || e.key === 'a')) ||
        (isCmdOrCtrl && e.altKey && (e.key === 'A' || e.key === 'a')) ||
        (isCmdOrCtrl && e.shiftKey && (e.key === 'L' || e.key === 'l')) ||
        (isCmdOrCtrl && e.altKey && (e.key === 'L' || e.key === 'l')) ||
        (e.altKey && e.shiftKey && (e.key === 'A' || e.key === 'a'))
      ) {
        e.preventDefault();
        setIsLoginModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Check for deep link staff query or hash
    const checkHashAndQuery = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      if (
        urlParams.get('admin') === 'login' || 
        urlParams.get('staff') === 'true' || 
        urlParams.get('portal') === 'operator' ||
        hash === '#staff' ||
        hash === '#admin' ||
        hash === '#terminal'
      ) {
        setIsLoginModalOpen(true);
      }
    };

    checkHashAndQuery();
    window.addEventListener('hashchange', checkHashAndQuery);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('hashchange', checkHashAndQuery);
    };
  }, []);

  const [adminSession, setAdminSession] = useState<{ email: string; role: string } | null>(() => {
    const saved = localStorage.getItem('holiday_admin_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // App Settings Customization with auto-migration to official Ortigas Pasig details
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('holiday_travelers_settings_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        let updatedStorage = false;
        if (parsed?.agency) {
          // If agency still has previous email or empty, migrate to holidaytravelersinc2022@gmail.com
          if (!parsed.agency.email || parsed.agency.email === 'karlljacob8@gmail.com') {
            parsed.agency.email = DEFAULT_SETTINGS.agency.email;
            updatedStorage = true;
          }
        }
        if (parsed?.promo) {
          // Align promo discountPct with 8% if previously 20% or unset
          if (parsed.promo.discountPct === 20 || !parsed.promo.discountPct) {
            parsed.promo.discountPct = 8;
            parsed.promo.title = 'Discover the World with 8% Off';
            updatedStorage = true;
          }
        }
        if (updatedStorage) {
          localStorage.setItem('holiday_travelers_settings_v2', JSON.stringify(parsed));
        }
        if (parsed) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    const legacy = localStorage.getItem('holiday_travelers_settings');
    if (legacy) {
      try {
        const parsed = JSON.parse(legacy);
        const updated = {
          ...parsed,
          agency: {
            ...parsed.agency,
            companyName: DEFAULT_SETTINGS.agency.companyName,
            shortName: DEFAULT_SETTINGS.agency.shortName,
            address: DEFAULT_SETTINGS.agency.address,
            phone: DEFAULT_SETTINGS.agency.phone,
            email: DEFAULT_SETTINGS.agency.email,
            tagline: DEFAULT_SETTINGS.agency.tagline,
            accreditationNo: DEFAULT_SETTINGS.agency.accreditationNo,
          }
        };
        localStorage.setItem('holiday_travelers_settings_v2', JSON.stringify(updated));
        return updated;
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem('holiday_travelers_settings_v2', JSON.stringify(appSettings));
  }, [appSettings]);

  // Auto-launch promotional advertisement popup for guests
  useEffect(() => {
    if (viewMode === 'customer') {
      const timer = setTimeout(() => {
        setIsPromoModalOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === 'operator') {
      applyAdminTheme(appSettings.theme);
    } else {
      if (travelerUser?.theme_preferences) {
        applyAdminTheme({
          ...appSettings.theme,
          accentColor: (travelerUser.theme_preferences.accentColor as any) || appSettings.theme.accentColor || 'coral',
          bgTone: (travelerUser.theme_preferences.bgTone as any) || appSettings.theme.bgTone || 'obsidian',
          cardGlow: travelerUser.theme_preferences.cardGlow ?? appSettings.theme.cardGlow ?? true,
        });
      } else {
        applyAdminTheme(appSettings.theme);
      }
    }
  }, [appSettings.theme, viewMode, travelerUser?.theme_preferences]);

  useEffect(() => {
    localStorage.setItem('holiday_view_mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (adminSession) {
      localStorage.setItem('holiday_admin_session', JSON.stringify(adminSession));
    } else {
      localStorage.removeItem('holiday_admin_session');
    }
  }, [adminSession]);

  // Persistent Data Collections
  const [packages, setPackages] = useState<TourPackage[]>(() => getStoredPackages());
  const [bookings, setBookings] = useState<Booking[]>(() => getStoredBookings());
  const [feedbacks, setFeedbacks] = useState<CustomerFeedback[]>(() => getStoredFeedbacks());

  const [preSelectedPackage, setPreSelectedPackage] = useState<TourPackage | null>(null);

  useEffect(() => {
    savePackages(packages);
  }, [packages]);

  useEffect(() => {
    saveBookings(bookings);
  }, [bookings]);

  useEffect(() => {
    saveFeedbacks(feedbacks);
  }, [feedbacks]);

  // CRUD Handlers for Packages
  const handleSavePackage = (newPkg: TourPackage) => {
    setPackages((prev) => {
      const idx = prev.findIndex((p) => p.id === newPkg.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = newPkg;
        return updated;
      }
      return [newPkg, ...prev];
    });
  };

  const handleDeletePackage = (id: string) => {
    setPackages((prev) => prev.filter((p) => p.id !== id));
  };

  const handleDuplicatePackage = (pkg: TourPackage) => {
    const duplicated: TourPackage = {
      ...pkg,
      id: `pkg-${Date.now()}`,
      code: `${pkg.code}-COPY`,
      title: `${pkg.title} (Copy)`
    };
    setPackages((prev) => [duplicated, ...prev]);
  };

  // Booking Operations Handlers
  const createdBookingIdsRef = useRef<Set<string>>(new Set());
  const handleCreateBooking = (newBooking: Booking) => {
    if (createdBookingIdsRef.current.has(newBooking.id) || createdBookingIdsRef.current.has(newBooking.bookingRef)) {
      return;
    }
    createdBookingIdsRef.current.add(newBooking.id);
    createdBookingIdsRef.current.add(newBooking.bookingRef);

    setBookings((prev) => {
      if (prev.some((b) => b.id === newBooking.id || b.bookingRef === newBooking.bookingRef)) {
        return prev;
      }
      return [newBooking, ...prev];
    });
    saveBookingToDb(newBooking).catch((err) => console.warn('Supabase booking save notice:', err));
  };

  const handleUpdateBookingStatus = (id: string, status: 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled') => {
    setBookings((prev) => {
      const updated = prev.map((b) => (b.id === id ? { ...b, bookingStatus: status } : b));
      const target = updated.find((b) => b.id === id);
      if (target) saveBookingToDb(target).catch(() => {});
      return updated;
    });
  };

  const handleUpdateBooking = (updatedBooking: Booking) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === updatedBooking.id ? updatedBooking : b))
    );
    saveBookingToDb(updatedBooking).catch(() => {});
  };

  // Dispatch & Allocations Handlers
  const handleUpdateGuide = (bookingId: string, guideName: string) => {
    setBookings((prev) => {
      const updated = prev.map((b) => (b.id === bookingId ? { ...b, assignedGuide: guideName } : b));
      const target = updated.find((b) => b.id === bookingId);
      if (target) saveBookingToDb(target).catch(() => {});
      return updated;
    });
  };

  const handleUpdateHotelReservation = (bookingId: string, hotel: HotelReservation) => {
    setBookings((prev) => {
      const updated = prev.map((b) => (b.id === bookingId ? { ...b, hotelReservation: hotel } : b));
      const target = updated.find((b) => b.id === bookingId);
      if (target) saveBookingToDb(target).catch(() => {});
      return updated;
    });
  };

  const handleUpdateTransportReservation = (bookingId: string, transport: TransportReservation) => {
    setBookings((prev) => {
      const updated = prev.map((b) => (b.id === bookingId ? { ...b, transportReservation: transport } : b));
      const target = updated.find((b) => b.id === bookingId);
      if (target) saveBookingToDb(target).catch(() => {});
      return updated;
    });
  };

  const handleUpdateFlightReservation = (bookingId: string, flight: FlightReservation) => {
    setBookings((prev) => {
      const updated = prev.map((b) => (b.id === bookingId ? { ...b, flightReservation: flight } : b));
      const target = updated.find((b) => b.id === bookingId);
      if (target) saveBookingToDb(target).catch(() => {});
      return updated;
    });
  };

  // Invoices & Payments Handler
  const handleAddPaymentRecord = (bookingId: string, payment: PaymentRecord) => {
    setBookings((prev) => {
      let targetToSave: Booking | null = null;
      const updated = prev.map((b) => {
        if (b.id !== bookingId) return b;
        const newPayments = [...b.invoice.payments, payment];
        const newPaid = newPayments.reduce((sum, p) => sum + p.amount, 0);
        const newBalance = Math.max(0, b.invoice.totalAmount - newPaid);
        const newInvoiceStatus = newBalance === 0 ? 'Paid' : newPaid > 0 ? 'Partial' : 'Unpaid';

        const updatedInvoice: PaymentInvoice = {
          ...b.invoice,
          amountPaid: newPaid,
          balanceDue: newBalance,
          status: newInvoiceStatus as any,
          payments: newPayments
        };

        const updatedBooking: Booking = {
          ...b,
          paymentStatus: newInvoiceStatus === 'Paid' ? 'Paid' : 'Partial',
          invoice: updatedInvoice
        };
        targetToSave = updatedBooking;
        return updatedBooking;
      });

      if (targetToSave) {
        saveBookingToDb(targetToSave).catch(() => {});
      }
      return updated;
    });
  };

  // Feedback Handler
  const handleSubmitFeedback = (newFeedback: CustomerFeedback) => {
    setFeedbacks((prev) => [newFeedback, ...prev]);
  };

  // Reset Demo Data
  const handleResetData = () => {
    resetAllData();
    window.location.reload();
  };

  const handleAdminTabChange = (newTab: SubmoduleTab) => {
    if (newTab === adminTab) return;
    setIsTabLoading(true);
    setAdminTab(newTab);
    setTimeout(() => setIsTabLoading(false), 150);
  };

  // Auth Operations
  const handleLoginSuccess = (email: string, role: string) => {
    setAdminSession({ email, role });
    setViewMode('operator');
    setAdminTab('overview');
  };

  const handlePromptStaffLogout = () => {
    setIsStaffSignOutConfirmOpen(true);
  };

  const handleExecuteStaffLogout = () => {
    setIsStaffSignOutConfirmOpen(false);
    setAdminSession(null);
    setViewMode('customer');
    localStorage.removeItem('holiday_admin_session');
    setTargetTrackerRef(undefined);
    setIsTrackerOpen(false);
  };

  // Row Level Security (RLS) Customer Isolation Filter:
  // - Staff members: see authorized bookings per staff role RLS
  // - Authenticated travelers: see ONLY bookings linked to their account email
  // - Logged-out / Guest users: see 0 tickets by default (eliminating ticket visibility leakage on logout)
  const customerVisibleBookings = useMemo(() => {
    if (adminSession) {
      return applyBookingsRLS(bookings, { email: adminSession.email, role: adminSession.role }).data;
    }
    if (travelerUser) {
      const userEmail = travelerUser.email.toLowerCase().trim();
      return bookings.filter((b) => (b.customer?.email || '').toLowerCase().trim() === userEmail);
    }
    if (targetTrackerRef) {
      return bookings.filter((b) => b.bookingRef === targetTrackerRef);
    }
    return [];
  }, [bookings, adminSession, travelerUser, targetTrackerRef]);

  const pendingPaymentsCount = bookings.filter((b) => b.invoice.balanceDue > 0).length;

  // Realtime cross-device RBAC & Submodule clearance listener
  const [rbacRevision, setRbacRevision] = useState<number>(0);

  useEffect(() => {
    const handleRbacChange = () => {
      setRbacRevision((r) => r + 1);
      const currentStaff = getStoredStaffAccounts();
      setAdminSession((session) => {
        if (!session) return null;
        const norm = session.email.toLowerCase().trim();
        // Root Super Admin is exempt from suspension/clearance downgrade
        if (norm === 'karlljacob8@gmail.com') return session;

        const account = currentStaff.find((a) => a.email.toLowerCase().trim() === norm);

        // 1. Account suspended or deleted
        if (!account || account.status === 'Suspended') {
          handleExecuteStaffLogout();
          dispatchAppNotification({
            title: 'Security Clearance Revoked',
            message: !account
              ? 'Your staff operator account was revoked globally by the Super Administrator.'
              : 'Your staff operator account has been suspended by the Super Administrator.',
            type: 'info'
          });
          return null;
        }

        // 2. Synchronize role change
        let nextSession = session;
        if (account.role && account.role !== session.role) {
          nextSession = { ...session, role: account.role };
        }

        // 3. Tab clearance check for the currently active tab
        setAdminTab((currentTab) => {
          if (!hasTabAccess(account, currentTab)) {
            dispatchAppNotification({
              title: 'Submodule Permissions Updated',
              message: `Your clearance for the "${currentTab}" submodule was modified globally by the Super Administrator. Returning to Overview.`,
              type: 'info'
            });
            return 'overview';
          }
          return currentTab;
        });

        return nextSession;
      });
    };

    window.addEventListener('holiday_rbac_changed', handleRbacChange);
    return () => window.removeEventListener('holiday_rbac_changed', handleRbacChange);
  }, []);

  return (
    <div className="min-h-screen bg-[#070B0E] text-[#F4F1EA] font-sans antialiased selection:bg-[#F26A4F] selection:text-white flex flex-col">
      {/* Accessible Skip Link for Screen Readers (ISO/IEC 40500 / WCAG 2.1 AA) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-sunset-coral focus:text-white focus:rounded-full focus:shadow-2xl focus:text-xs focus:font-semibold focus:outline-none"
      >
        Skip to main content (ISO/IEC 40500 Accessible)
      </a>

      {/* ========================================================================= */}
      {/* MODE 1: 100% IMMERSIVE CLIENT WEBSITE (Archipelago Emergent Design)       */}
      {/* ========================================================================= */}
      {viewMode === 'customer' ? (
        <>
          <ClientNavbar
            onOpenBooking={(pkgId) => {
              const found = pkgId ? packages.find((p) => p.id === pkgId) : undefined;
              handleOpenBookingModalWithAuth(found);
            }}
            onOpenTracker={handleOpenTracker}
            onOpenAdminAuth={() => setIsLoginModalOpen(true)}
            onOpenWeatherRadar={() => setIsWeatherRadarOpen(true)}
            isStaffLoggedIn={Boolean(adminSession)}
            onOpenAdminPortal={() => setViewMode('operator')}
            travelerUser={travelerUser}
            onOpenTravelerAuth={() => {
              setWasBookingRequestedBeforeAuth(false);
              setTravelerAuthReason(undefined);
              setIsTravelerAuthModalOpen(true);
            }}
            onSignOutTraveler={handlePromptSignOutTraveler}
            onOpenMyAccount={() => setIsMyAccountModalOpen(true)}
          />

          <main className="flex-1 w-full" id="main-content">
            <ClientPortal
              packages={packages}
              bookings={customerVisibleBookings}
              feedbacks={feedbacks}
              onCreateBooking={handleCreateBooking}
              onUpdateBooking={handleUpdateBooking}
              onSubmitFeedback={handleSubmitFeedback}
              preSelectedPackage={preSelectedPackage}
              onSelectBookPackage={(pkg) => setPreSelectedPackage(pkg)}
              onClearPreSelectedPackage={() => {
                setPreSelectedPackage(null);
                setPendingSearchCriteria(null);
              }}
              isTrackerOpen={isTrackerOpen}
              onCloseTracker={() => {
                setIsTrackerOpen(false);
                setTargetTrackerRef(undefined);
              }}
              onOpenTracker={handleOpenTracker}
              trackerTargetRef={targetTrackerRef}
              isBookingModalOpen={isBookingModalOpen}
              onCloseBookingModal={() => setIsBookingModalOpen(false)}
              onOpenBookingModal={(pkg, searchCriteria) => handleOpenBookingModalWithAuth(pkg, searchCriteria)}
              onOpenWeatherRadar={() => setIsWeatherRadarOpen(true)}
              onOpenLegalPolicy={handleOpenLegalPolicy}
              promoCode={activePromoCode || (appSettings.promo?.enabled ? appSettings.promo.discountCode : undefined)}
              promoDiscountPct={appSettings.promo?.discountPct || 8}
              currentUser={travelerUser}
              onOpenMyAccount={() => setIsMyAccountModalOpen(true)}
              initialSearchCriteria={pendingSearchCriteria}
              onRequireAuth={() => {
                setWasBookingRequestedBeforeAuth(true);
                setTravelerAuthReason('Guest traveler accounts are designed for browsing itineraries and customer service. Please sign in or register to access the booking and checkout section.');
                setIsBookingModalOpen(false);
                setIsTravelerAuthModalOpen(true);
              }}
            />
          </main>

          <ClientFooter
            onOpenAdminAuth={() => setIsLoginModalOpen(true)}
            onOpenTracker={handleOpenTracker}
            isStaffLoggedIn={Boolean(adminSession)}
            onOpenAdminPortal={() => setViewMode('operator')}
            onOpenLegalPolicy={handleOpenLegalPolicy}
            onOpenCookiePreferences={() => setIsCookiePreferencesOpen(true)}
          />

          <AiCustomerConcierge
            packages={packages}
            onSelectPackage={(pkg) => handleOpenBookingModalWithAuth(pkg)}
            travelerUser={travelerUser}
            onOpenTravelerAuth={() => {
              setWasBookingRequestedBeforeAuth(false);
              setTravelerAuthReason('Sign in or register to connect with a Live Staff Agent and save your tickets.');
              setIsTravelerAuthModalOpen(true);
            }}
          />
        </>
      ) : (
        /* ========================================================================= */
        /* MODE 2: ISOLATED ADMIN TOUR OPERATIONS ENTERPRISE PORTAL                  */
        /* ========================================================================= */
        <SessionInactivityGuard
          adminEmail={adminSession?.email || 'admin@holidaytravelers.ph'}
          adminRole={adminSession?.role || 'Super Admin'}
          onLogout={handleExecuteStaffLogout}
        >
          <div 
            className="min-h-screen admin-theme-wrapper flex flex-col transition-colors duration-300"
            style={{ backgroundColor: 'var(--admin-bg-base, #070B0E)' }}
          >
            <AdminNavbar
              activeTab={adminTab}
              onTabChange={handleAdminTabChange}
              onOpenCapstoneModal={() => setIsCapstoneModalOpen(true)}
              onLogout={handleExecuteStaffLogout}
              bookingCount={bookings.length}
              pendingPaymentCount={pendingPaymentsCount}
              adminEmail={adminSession?.email || 'admin@holidaytravelers.ph'}
              adminRole={adminSession?.role || 'Senior Tour Operations Manager'}
            />

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
              {isTabLoading ? (
                <div className="space-y-6">
                  <SkeletonLoader type="banner" />
                  <SkeletonLoader type="card" count={3} />
                </div>
              ) : (
                <AdminPortal
                  activeTab={adminTab}
                  onTabChange={handleAdminTabChange}
                  packages={packages}
                  bookings={bookings}
                  feedbacks={feedbacks}
                  appSettings={appSettings}
                  adminEmail={adminSession?.email || 'admin@holidaytravelers.ph'}
                  adminRole={adminSession?.role || 'Senior Tour Operations Manager'}
                  onSavePackage={handleSavePackage}
                  onDeletePackage={handleDeletePackage}
                  onDuplicatePackage={handleDuplicatePackage}
                  onUpdateBookingStatus={handleUpdateBookingStatus}
                  onUpdateBooking={handleUpdateBooking}
                  onUpdateGuide={handleUpdateGuide}
                  onUpdateHotelReservation={handleUpdateHotelReservation}
                  onUpdateTransportReservation={handleUpdateTransportReservation}
                  onUpdateFlightReservation={handleUpdateFlightReservation}
                  onAddPaymentRecord={handleAddPaymentRecord}
                  onSubmitFeedback={handleSubmitFeedback}
                  onUpdateSettings={(newSettings) => {
                    setAppSettings(newSettings);
                    saveSystemSettingsToDb(newSettings, adminSession?.email || 'Super Admin');
                  }}
                  onResetSettings={() => {
                    setAppSettings(DEFAULT_SETTINGS);
                    saveSystemSettingsToDb(DEFAULT_SETTINGS, adminSession?.email || 'Super Admin');
                  }}
                />
              )}
            </main>

            <footer 
              className="border-t border-white/[0.06] py-5 text-xs text-sand-muted transition-colors duration-300"
              style={{ backgroundColor: 'var(--admin-bg-base, #070B0E)' }}
            >
              <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <strong className="text-ivory">{appSettings.agency.companyName}</strong> — Operator Command Center ({appSettings.agency.accreditationNo})
                </div>
                <div className="flex items-center gap-3 text-[11px] text-sand-muted">
                  <button
                    onClick={() => setIsCapstoneModalOpen(true)}
                    className="hover:text-ivory transition-colors"
                    style={{ color: 'var(--admin-accent, #F26A4F)' }}
                  >
                    System Specs
                  </button>
                  <span>•</span>
                  <button
                    onClick={() => setViewMode('customer')}
                    className="text-sand-muted hover:text-ivory transition-colors"
                  >
                    Return to Public Website
                  </button>
                  <span>•</span>
                  <button
                    onClick={handlePromptStaffLogout}
                    className="text-rose-400 hover:underline transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </footer>
          </div>
        </SessionInactivityGuard>
      )}

      {/* Traveler Auth Modal (Supabase Sign In / Register / Guest) */}
      <TravelerAuthModal
        isOpen={isTravelerAuthModalOpen}
        onClose={() => {
          setIsTravelerAuthModalOpen(false);
          setTravelerAuthReason(undefined);
          setWasBookingRequestedBeforeAuth(false);
        }}
        onAuthSuccess={handleTravelerAuthSuccess}
        onContinueAsGuest={() => {
          const guestNum = Math.floor(1000 + Math.random() * 9000);
          const guestProfile: UserProfile = {
            id: 'guest_' + Math.random().toString(36).substring(2, 10),
            email: `guest_${guestNum}@holidaytravelers.ph`,
            full_name: 'Guest Traveler',
            phone: '',
            emergency_contact: '',
            nationality: 'Filipino',
            dietary_preferences: '',
            avatar_url: '',
            role: 'Traveler',
            status: 'Active',
            auth_provider: 'guest',
            last_login: new Date().toISOString()
          };
          handleTravelerAuthSuccess(guestProfile);
        }}
        reasonMessage={travelerAuthReason}
      />

      {/* Admin Login Modal (Accessible from discreet staff access trigger) */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Global Live Weather Radar Modal */}
      <GlobalWeatherRadarModal
        isOpen={isWeatherRadarOpen}
        onClose={() => setIsWeatherRadarOpen(false)}
      />

      {/* Capstone Info Modal */}
      <CapstoneInfoModal
        isOpen={isCapstoneModalOpen}
        onClose={() => setIsCapstoneModalOpen(false)}
        onResetData={handleResetData}
      />

      {/* Legal & Governance Compliance Modal (ISO/IEC 27001 & ISO/IEC 40500) */}
      <LegalComplianceModal
        isOpen={isLegalModalOpen}
        initialTab={legalModalTab}
        onClose={() => setIsLegalModalOpen(false)}
        onOpenCookiePreferences={() => setIsCookiePreferencesOpen(true)}
      />

      {/* Cookie & Telemetry Consent Manager */}
      <CookieConsentBanner
        onOpenLegalModal={(tab) => handleOpenLegalPolicy(tab)}
        forceOpenPreferences={isCookiePreferencesOpen}
        onClosePreferencesModal={() => setIsCookiePreferencesOpen(false)}
      />

      {/* My Account & Traveler Profile Modal */}
      <MyAccountModal
        isOpen={isMyAccountModalOpen}
        onClose={() => setIsMyAccountModalOpen(false)}
        travelerUser={travelerUser}
        userBookings={customerVisibleBookings}
        onUpdateProfile={(updatedProfile) => setTravelerUser(updatedProfile)}
        onUpdateAppSettings={(updatedSettings) => setAppSettings({ ...appSettings, ...updatedSettings })}
        appSettings={appSettings}
        onOpenTracker={handleOpenTracker}
        onSignOut={handlePromptSignOutTraveler}
      />

      {/* Interactive Full-Screen Promotional Advertisement Modal */}
      {appSettings.promo && (
        <ClientPromoModal
          promo={appSettings.promo}
          isOpen={isPromoModalOpen}
          onClose={() => setIsPromoModalOpen(false)}
          onClaimPromo={() => {
            if (appSettings.promo?.discountCode) {
              setActivePromoCode(appSettings.promo.discountCode);
            }
            setIsPromoModalOpen(false);
            setIsBookingModalOpen(true);
          }}
        />
      )}

      {/* Traveler Sign Out Confirmation Modal */}
      <ActionConfirmModal
        isOpen={isTravelerSignOutConfirmOpen}
        onClose={() => setIsTravelerSignOutConfirmOpen(false)}
        onConfirm={handleExecuteSignOutTraveler}
        title="Sign Out of Your Account?"
        message="Are you sure you want to sign out? You will be logged out on this device, while your reservations and saved preferences remain safely linked."
        details={travelerUser ? [
          { label: 'Traveler Name', value: travelerUser.full_name || 'Traveler' },
          { label: 'Registered Email', value: travelerUser.email }
        ] : undefined}
        confirmText="Yes, Sign Out"
        cancelText="Stay Signed In"
        variant="danger"
        warningNote="You can easily sign back in anytime with Google or your email credentials."
      />

      {/* Staff / Operator Sign Out Confirmation Modal */}
      <ActionConfirmModal
        isOpen={isStaffSignOutConfirmOpen}
        onClose={() => setIsStaffSignOutConfirmOpen(false)}
        onConfirm={handleExecuteStaffLogout}
        title="Sign Out of Staff Session?"
        message="You are about to sign out of the administrative operations console and return to the public guest portal."
        details={adminSession ? [
          { label: 'Staff Account', value: adminSession.email },
          { label: 'Assigned Role', value: adminSession.role }
        ] : undefined}
        confirmText="Yes, Sign Out"
        cancelText="Stay in Operator Tower"
        variant="warning"
      />
    </div>
  );
}

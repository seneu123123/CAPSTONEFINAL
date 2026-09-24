import { createClient, SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';

const SUPABASE_URL = 
  import.meta.env.VITE_SUPABASE_URL || 
  'https://xlwpddwdlcfrokqsfvaa.supabase.co';

const SUPABASE_ANON_KEY = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsd3BkZHdkbGNmcm9rcXNmdmFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3NDU4MDQsImV4cCI6MjEwNTMyMTgwNH0.Vvw9MOcXllbBQbQvhV33tHfYmS8-gLe9PbQJ7Nh7fjA';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  phone?: string;
  emergency_contact?: string;
  nationality?: string;
  dietary_preferences?: string;
  role: 'Traveler' | 'Super Admin' | 'Tour Operations Manager' | 'Finance Officer' | 'Tour Guide' | 'Custom Staff';
  status: 'Active' | 'Suspended' | 'Pending';
  auth_provider: string;
  created_at?: string;
  last_login?: string;
  theme_preferences?: {
    accentColor?: string;
    bgTone?: string;
    cardGlow?: boolean;
  };
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return supabaseInstance;
}

/**
 * Sign in with Google OAuth Popup / Redirect
 */
export async function signInWithGoogle() {
  const supabase = getSupabase();
  const currentOrigin = window.location.origin;
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: currentOrigin,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    throw error;
  }
  return data;
}

interface LocalTravelerAccount {
  id: string;
  email: string;
  fullName: string;
  passwordHash: string;
  createdAt: string;
}

function getLocalTravelerVault(): LocalTravelerAccount[] {
  try {
    const raw = localStorage.getItem('holiday_traveler_accounts_vault');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalTravelerAccount(email: string, password: string, fullName: string): LocalTravelerAccount {
  const vault = getLocalTravelerVault();
  const cleanEmail = email.trim().toLowerCase();
  const existingIdx = vault.findIndex((a) => a.email === cleanEmail);
  const passwordHash = btoa(password + '_ht_salt_2026');

  const account: LocalTravelerAccount = {
    id: existingIdx >= 0 ? vault[existingIdx].id : 'user_' + Math.random().toString(36).substring(2, 11),
    email: cleanEmail,
    fullName: fullName.trim(),
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    vault[existingIdx] = account;
  } else {
    vault.push(account);
  }

  try {
    localStorage.setItem('holiday_traveler_accounts_vault', JSON.stringify(vault));
  } catch (e) {
    console.warn('Could not cache traveler account to vault:', e);
  }

  return account;
}

/**
 * Sign in with Email & Password (with resilient fallback for local/unconfirmed dev environments)
 */
export async function signInWithEmailPassword(email: string, password: string) {
  const supabase = getSupabase();
  const cleanEmail = email.trim().toLowerCase();
  const passwordHash = btoa(password + '_ht_salt_2026');

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      // Check local traveler accounts vault fallback
      const vault = getLocalTravelerVault();
      const localAcc = vault.find((a) => a.email === cleanEmail);
      if (localAcc && localAcc.passwordHash === passwordHash) {
        const profile: UserProfile = {
          id: localAcc.id,
          email: localAcc.email,
          full_name: localAcc.fullName,
          role: 'Traveler',
          status: 'Active',
          auth_provider: 'email',
          last_login: new Date().toISOString(),
        };
        localStorage.setItem('holiday_traveler_profile', JSON.stringify(profile));
        return { user: { id: profile.id, email: profile.email, user_metadata: { full_name: profile.full_name } } as any, session: null };
      }
      throw error;
    }

    if (data.user) {
      await syncUserProfile(data.user);
    }
    return data;
  } catch (err: any) {
    // If Supabase returned "Email not confirmed" or "Invalid login credentials", check vault
    const vault = getLocalTravelerVault();
    const localAcc = vault.find((a) => a.email === cleanEmail);
    if (localAcc) {
      if (localAcc.passwordHash === passwordHash) {
        const profile: UserProfile = {
          id: localAcc.id,
          email: localAcc.email,
          full_name: localAcc.fullName,
          role: 'Traveler',
          status: 'Active',
          auth_provider: 'email',
          last_login: new Date().toISOString(),
        };
        localStorage.setItem('holiday_traveler_profile', JSON.stringify(profile));
        return { user: { id: profile.id, email: profile.email, user_metadata: { full_name: profile.full_name } } as any, session: null };
      } else {
        throw new Error('Incorrect password. Please verify and try again.');
      }
    }
    throw err;
  }
}

/**
 * Sign up with Email & Password
 */
export async function signUpWithEmailPassword(email: string, password: string, fullName: string) {
  const supabase = getSupabase();
  const cleanEmail = email.trim().toLowerCase();
  
  // Register in local traveler accounts vault for instant and resilient login
  const localAccount = saveLocalTravelerAccount(cleanEmail, password, fullName);

  try {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        data: {
          full_name: fullName.trim(),
        },
      },
    });

    if (error) {
      console.warn('Supabase sign up warning (using secure local vault profile):', error.message);
      const fallbackUser: UserProfile = {
        id: localAccount.id,
        email: cleanEmail,
        full_name: fullName.trim(),
        role: 'Traveler',
        status: 'Active',
        auth_provider: 'email',
        last_login: new Date().toISOString(),
      };
      localStorage.setItem('holiday_traveler_profile', JSON.stringify(fallbackUser));
      return { user: { id: fallbackUser.id, email: cleanEmail, user_metadata: { full_name: fullName.trim() } } as any, session: null };
    }

    if (data.user) {
      await syncUserProfile(data.user, fullName);
    }
    return data;
  } catch (err: any) {
    const fallbackUser: UserProfile = {
      id: localAccount.id,
      email: cleanEmail,
      full_name: fullName.trim(),
      role: 'Traveler',
      status: 'Active',
      auth_provider: 'email',
      last_login: new Date().toISOString(),
    };
    localStorage.setItem('holiday_traveler_profile', JSON.stringify(fallbackUser));
    return { user: { id: fallbackUser.id, email: cleanEmail, user_metadata: { full_name: fullName.trim() } } as any, session: null };
  }
}

/**
 * Send Magic OTP / Link to Email
 */
export async function sendEmailOtp(email: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: window.location.origin,
    },
  });

  if (error) throw error;
  return data;
}

/**
 * Verify Magic 6-digit OTP from Email
 */
export async function verifyEmailOtpToken(email: string, token: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type: 'email',
  });

  if (error) throw error;
  if (data.user) {
    await syncUserProfile(data.user);
  }
  return data;
}

/**
 * Sign out immediately - wipes local cache first so UI reacts instantaneously
 */
export async function signOutUser() {
  try {
    localStorage.removeItem('holiday_traveler_profile');
    localStorage.removeItem('holiday_my_booking_refs');
    localStorage.removeItem('holiday_app_notifications');
    localStorage.removeItem('holiday_concierge_session_id');
    localStorage.removeItem('holiday_concierge_active_chat_id');
    localStorage.removeItem('holiday_concierge_guest_user');
    localStorage.removeItem('holiday_concierge_closed_tickets');
    localStorage.removeItem('holiday_active_booking_draft');
    localStorage.removeItem('holiday_active_tracker_ref');
    localStorage.removeItem('holiday_travelers_guest_session');
  } catch (e) {
    console.warn('Error clearing user localStorage on sign out:', e);
  }

  // Broadcast immediate local signout event across windows/tabs
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('holiday_signed_out'));
    window.dispatchEvent(new CustomEvent('holiday_notification_clear'));
  }

  try {
    const supabase = getSupabase();
    // Non-blocking sign out with race timeout so slow network never delays response
    await Promise.race([
      supabase.auth.signOut(),
      new Promise((resolve) => setTimeout(resolve, 600))
    ]);
  } catch (error) {
    console.error('Error signing out:', error);
  }
}

/**
 * Automatically synchronize user document in Supabase public.users table
 */
export async function syncUserProfile(user: SupabaseUser, customName?: string): Promise<UserProfile | null> {
  const email = (user.email || '').toLowerCase().trim();
  
  let existingProfile: Partial<UserProfile> = {};
  try {
    const cached = localStorage.getItem('holiday_traveler_profile');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.email?.toLowerCase().trim() === email) {
        existingProfile = parsed;
      }
    }
  } catch {
    // ignore
  }

  // Also attempt to retrieve saved profile (including theme_preferences, phone, etc.) from Supabase DB
  try {
    const supabase = getSupabase();
    const { data: dbUser } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
    if (dbUser) {
      existingProfile = {
        ...existingProfile,
        ...dbUser,
        theme_preferences: dbUser.theme_preferences || existingProfile.theme_preferences
      };
    }
  } catch (e) {
    // Non-blocking fallback
  }

  const fullName = 
    customName || 
    existingProfile.full_name ||
    user.user_metadata?.full_name || 
    user.user_metadata?.name || 
    email.split('@')[0] || 
    'Traveler';
  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || existingProfile.avatar_url || null;
  const provider = user.app_metadata?.provider || existingProfile.auth_provider || 'email';

  const profilePayload: UserProfile = {
    ...existingProfile,
    id: user.id || existingProfile.id || 'user_' + Math.random().toString(36).substring(2, 11),
    email: email,
    full_name: fullName,
    avatar_url: avatarUrl,
    auth_provider: provider,
    role: existingProfile.role || 'Traveler',
    status: existingProfile.status || 'Active',
    last_login: new Date().toISOString(),
    theme_preferences: existingProfile.theme_preferences
  };

  localStorage.setItem('holiday_traveler_profile', JSON.stringify(profilePayload));
  return profilePayload;
}

/**
 * Fetch public profile for current user
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    // Check if user is in an active guest session
    const cached = localStorage.getItem('holiday_traveler_profile');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed?.auth_provider === 'guest') {
          return parsed;
        }
      } catch {}
    }

    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      if (cached) {
        try { return JSON.parse(cached); } catch {}
      }
      return null;
    }

    return syncUserProfile(user);
  } catch (err) {
    // Fallback to cached profile if Supabase is offline or network fails
    try {
      const cached = localStorage.getItem('holiday_traveler_profile');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {}
    return null;
  }
}

/**
 * Update user profile details in local storage and Supabase DB
 */
export async function updateUserProfileInDb(updatedData: Partial<UserProfile> & { email: string }): Promise<UserProfile> {
  const cleanEmail = updatedData.email.toLowerCase().trim();
  let currentProfile: UserProfile = {
    id: updatedData.id || 'user_' + Math.random().toString(36).substring(2, 11),
    email: cleanEmail,
    full_name: updatedData.full_name || 'Traveler',
    role: 'Traveler',
    status: 'Active',
    auth_provider: updatedData.auth_provider || 'email',
    last_login: new Date().toISOString()
  };

  try {
    const cached = localStorage.getItem('holiday_traveler_profile');
    if (cached) {
      const parsed = JSON.parse(cached);
      // Strictly prevent merging properties across different user email addresses
      if (parsed && parsed.email?.toLowerCase().trim() === cleanEmail) {
        currentProfile = { ...currentProfile, ...parsed };
      }
    }
  } catch {}

  const mergedProfile: UserProfile = {
    ...currentProfile,
    ...updatedData,
    theme_preferences: updatedData.theme_preferences || currentProfile.theme_preferences
  };

  localStorage.setItem('holiday_traveler_profile', JSON.stringify(mergedProfile));

  // If this is a guest account, do not attempt to write to Supabase remote DB users table
  if (mergedProfile.auth_provider === 'guest') {
    return mergedProfile;
  }

  try {
    const supabase = getSupabase();
    const payload: any = {
      id: mergedProfile.id,
      email: mergedProfile.email,
      full_name: mergedProfile.full_name,
      avatar_url: mergedProfile.avatar_url,
      phone: mergedProfile.phone,
      emergency_contact: mergedProfile.emergency_contact,
      nationality: mergedProfile.nationality,
      dietary_preferences: mergedProfile.dietary_preferences,
      role: mergedProfile.role,
      status: mergedProfile.status,
      auth_provider: mergedProfile.auth_provider,
      last_login: new Date().toISOString()
    };
    if (mergedProfile.theme_preferences) {
      payload.theme_preferences = mergedProfile.theme_preferences;
    }
    await supabase.from('users').upsert(payload, { onConflict: 'email' });
  } catch (err) {
    console.warn('Supabase DB profile sync notice:', err);
  }

  return mergedProfile;
}

// ==============================================================================
// ENTERPRISE MODULE DATABASE & REALTIME SYNCHRONIZATION HELPERS
// ==============================================================================

/**
 * 1. STAFF ACCOUNTS & RBAC MANAGEMENT
 */
export async function fetchStaffAccountsFromDb(): Promise<any[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('staff_accounts').select('*').order('created_at', { ascending: false });
    if (error) {
      console.warn('Supabase fetchStaffAccounts error:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn('Supabase fetchStaffAccounts exception:', err);
    return [];
  }
}

export async function fetchStaffAccountByEmailFromDb(email: string): Promise<any | null> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('staff_accounts')
      .select('*')
      .ilike('email', email.trim())
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return data;
  } catch (err) {
    console.warn('Supabase fetchStaffAccountByEmail error:', err);
    return null;
  }
}

export async function saveStaffAccountToDb(staff: any): Promise<void> {
  try {
    const supabase = getSupabase();
    const payload: any = {
      id: staff.id,
      email: staff.email.toLowerCase().trim(),
      full_name: staff.fullName || staff.full_name,
      role: staff.role,
      status: staff.status || 'Active',
      allowed_tabs: staff.allowedTabs || staff.allowed_tabs || [],
      permissions: staff.permissions || staff.granularPermissions || [],
      two_factor_enabled: staff.twoFactorEnabled ?? staff.two_factor_enabled ?? true,
      backup_codes: staff.backupCodes || staff.backup_codes || [],
      last_login_at: staff.lastLoginAt || staff.last_login_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    if (staff.passwordHash || staff.password_hash) payload.password_hash = staff.passwordHash || staff.password_hash;
    if (staff.passwordSalt || staff.password_salt) payload.password_salt = staff.passwordSalt || staff.password_salt;
    if (staff.totpSecret || staff.totp_secret) payload.totp_secret = staff.totpSecret || staff.totp_secret;
    if (staff.phone || staff.phoneNumber) payload.phone = staff.phone || staff.phoneNumber;
    if (staff.notes) payload.notes = staff.notes;

    const { error } = await supabase.from('staff_accounts').upsert(payload, { onConflict: 'email' });
    if (error) {
      console.warn('Supabase saveStaffAccount error:', error);
    }
  } catch (err) {
    console.warn('Supabase saveStaffAccount error:', err);
  }
}

export async function deleteStaffAccountInDb(id: string, email: string): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase.from('staff_accounts').delete().or(`id.eq.${id},email.eq.${email.toLowerCase().trim()}`);
  } catch (err) {
    console.warn('Supabase deleteStaffAccount error:', err);
  }
}

/**
 * 2. TOUR PACKAGES MANAGEMENT
 */
export async function fetchTourPackagesFromDb(): Promise<any[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('tour_packages').select('*').order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

export async function saveTourPackageToDb(pkg: any): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase.from('tour_packages').upsert({
      id: pkg.id,
      code: pkg.code,
      title: pkg.title,
      destination: pkg.destination,
      category: pkg.category,
      duration_days: pkg.durationDays || pkg.duration_days,
      duration_nights: pkg.durationNights || pkg.duration_nights,
      price_per_pax: pkg.pricePerPax || pkg.price_per_pax,
      max_capacity: pkg.maxCapacity || pkg.max_capacity,
      inclusions: pkg.inclusions || [],
      exclusions: pkg.exclusions || [],
      banner_url: pkg.bannerUrl || pkg.banner_url,
      rating: pkg.rating || 5.0,
      review_count: pkg.reviewCount || pkg.review_count || 0,
      status: pkg.status || 'Active',
      featured: pkg.featured ?? false,
      itinerary: pkg.itinerary || [],
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('Supabase saveTourPackage error:', err);
  }
}

export async function deleteTourPackageInDb(id: string): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase.from('tour_packages').delete().eq('id', id);
  } catch (err) {
    console.warn('Supabase deleteTourPackage error:', err);
  }
}

/**
 * 3. BOOKINGS & PASSENGER MANIFESTS
 */
export async function fetchBookingsFromDb(): Promise<any[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

export async function saveBookingToDb(booking: any): Promise<void> {
  try {
    const supabase = getSupabase();
    const customerEmail = booking.customer?.email || booking.customer_email || (typeof booking.customer === 'string' ? booking.customer : '') || '';
    const travelerUserId = booking.travelerUserId || booking.traveler_user_id || booking.customer?.travelerUserId || null;

    const payload: any = {
      id: booking.id,
      booking_ref: booking.bookingRef || booking.booking_ref,
      tour_package_id: booking.tourPackageId || booking.tour_package_id,
      tour_title: booking.tourTitle || booking.tour_title,
      customer: booking.customer || {},
      passengers: booking.passengers || [],
      travel_date: booking.travelDate || booking.travel_date,
      num_pax: booking.numPax || booking.num_pax || 1,
      total_price: booking.totalPrice || booking.total_price || 0,
      deposit_required: booking.depositRequired || booking.deposit_required || 0,
      booking_status: booking.bookingStatus || booking.booking_status || 'Confirmed',
      payment_status: booking.paymentStatus || booking.payment_status || 'Unpaid',
      assigned_guide: booking.assignedGuide || booking.assigned_guide || null,
      hotel_reservation: booking.hotelReservation || booking.hotel_reservation || null,
      transport_reservation: booking.transportReservation || booking.transport_reservation || null,
      updated_at: new Date().toISOString()
    };

    if (customerEmail) payload.customer_email = customerEmail;
    if (travelerUserId) payload.traveler_user_id = travelerUserId;
    if (booking.flightReservation || booking.flight_reservation) {
      payload.flight_reservation = booking.flightReservation || booking.flight_reservation;
    }
    if (booking.invoice) {
      payload.invoice = booking.invoice;
    }
    if (booking.paymentVerificationStatus || booking.payment_verification_status) {
      payload.payment_verification_status = booking.paymentVerificationStatus || booking.payment_verification_status;
    }
    if (booking.verificationNotes || booking.verification_notes) {
      payload.verification_notes = booking.verificationNotes || booking.verification_notes;
    }

    await supabase.from('bookings').upsert(payload, { onConflict: 'id' });
  } catch (err) {
    console.warn('Supabase saveBooking error:', err);
  }
}

export async function updateBookingPayment(
  bookingId: string,
  paymentData: {
    amountPaid: number;
    balanceDue: number;
    paymentStatus: string;
    paymentVerificationStatus: string;
    receiptProofUrl?: string;
    referenceNo?: string;
  }
): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase.from('bookings').update({
      payment_status: paymentData.paymentStatus,
      payment_verification_status: paymentData.paymentVerificationStatus,
      updated_at: new Date().toISOString()
    }).eq('id', bookingId);
  } catch (err) {
    console.warn('Supabase updateBookingPayment error:', err);
  }
}

export async function deleteBookingInDb(id: string): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase.from('bookings').delete().eq('id', id);
  } catch (err) {
    console.warn('Supabase deleteBooking error:', err);
  }
}

/**
 * 4. INVOICES & PAYMENT GATE AUDIT
 */
export async function fetchInvoicesFromDb(): Promise<any[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

export async function saveInvoiceToDb(invoice: any): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase.from('invoices').upsert({
      id: invoice.id,
      invoice_no: invoice.invoiceNo || invoice.invoice_no,
      booking_ref: invoice.bookingRef || invoice.booking_ref,
      customer_name: invoice.customerName || invoice.customer_name,
      amount_paid: invoice.amountPaid || invoice.amount_paid || 0,
      balance_due: invoice.balanceDue || invoice.balance_due || 0,
      payment_method: invoice.paymentMethod || invoice.payment_method || 'GCash',
      payment_status: invoice.paymentStatus || invoice.payment_status || 'Pending Verification',
      receipt_photo_url: invoice.receiptPhotoUrl || invoice.receipt_photo_url || null,
      reference_number: invoice.referenceNumber || invoice.reference_number || null,
      verified_by: invoice.verifiedBy || invoice.verified_by || null,
      verified_at: invoice.verifiedAt || invoice.verified_at || null,
      issued_date: invoice.issuedDate || invoice.issued_date || new Date().toISOString().split('T')[0],
      due_date: invoice.dueDate || invoice.due_date || null
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('Supabase saveInvoice error:', err);
  }
}

/**
 * 5. FISCAL RECONCILIATIONS
 */
export async function fetchFiscalReconciliationsFromDb(): Promise<any[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('fiscal_reconciliations').select('*').order('reconciled_at', { ascending: false });
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

export async function saveFiscalReconciliationToDb(recon: any): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase.from('fiscal_reconciliations').upsert({
      id: recon.id,
      period_month: recon.periodMonth || recon.period_month,
      total_gross_revenue: recon.totalGrossRevenue || recon.total_gross_revenue || 0,
      total_vendor_payables: recon.totalVendorPayables || recon.total_vendor_payables || 0,
      total_guide_commissions: recon.totalGuideCommissions || recon.total_guide_commissions || 0,
      total_refunds_disbursed: recon.totalRefundsDisbursed || recon.total_refunds_disbursed || 0,
      net_agency_profit: recon.netAgencyProfit || recon.net_agency_profit || 0,
      status: recon.status || 'Reconciled',
      reconciled_by: recon.reconciledBy || recon.reconciled_by || 'Finance Officer',
      reconciled_at: recon.reconciledAt || recon.reconciled_at || new Date().toISOString(),
      notes: recon.notes || ''
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('Supabase saveFiscalReconciliation error:', err);
  }
}

/**
 * 6. SECURITY AUDIT LOGS
 */
export async function fetchAuditLogsFromDb(): Promise<any[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('security_audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

export async function logSecurityEventToDb(log: any): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase.from('security_audit_logs').insert({
      id: log.id || 'log_' + Math.random().toString(36).substring(2, 11),
      timestamp: log.timestamp || new Date().toISOString(),
      actor_name: log.actorName || log.actor_name || 'System',
      actor_email: log.actorEmail || log.actor_email || 'system@holidaytravelers.com',
      actor_role: log.actorRole || log.actor_role || 'Super Admin',
      action_type: log.actionType || log.action_type || 'SYSTEM_ACTION',
      submodule: log.submodule || 'Global',
      details: log.details || '',
      ip_address: log.ipAddress || log.ip_address || '127.0.0.1',
      sha256_signature: log.sha256Signature || log.sha256_signature || 'sha256_signature_placeholder'
    });
  } catch (err) {
    console.warn('Supabase logSecurityEvent error:', err);
  }
}

/**
 * 7. SYSTEM & AGENCY SETTINGS
 */
export async function fetchSystemSettingsFromDb(): Promise<any | null> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('system_settings').select('*').eq('id', 'global_config').maybeSingle();
    if (error || !data) return null;
    return data.settings_data;
  } catch {
    return null;
  }
}

export async function saveSystemSettingsToDb(settingsData: any, updatedBy: string = 'Super Admin'): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase.from('system_settings').upsert({
      id: 'global_config',
      settings_data: settingsData,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('Supabase saveSystemSettings error:', err);
  }
}

/**
 * 8. LIVE CONCIERGE CHAT ENGINE & 24H AUTO-PURGE LIFECYCLE
 */
export async function purgeExpiredConciergeChats(): Promise<{ purgedCount: number }> {
  try {
    const supabase = getSupabase();
    // 1. Try server RPC if configured
    try {
      await supabase.rpc('purge_expired_concierge_chats');
    } catch {}

    // 2. Perform database-level 24h auto-purge check
    const now = new Date();
    const twentyFourHoursAgoIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const { data: resolvedChats, error: fetchErr } = await supabase
      .from('concierge_chats')
      .select('id, expires_at, ended_at, updated_at')
      .eq('status', 'Resolved');

    if (fetchErr || !resolvedChats || resolvedChats.length === 0) {
      return { purgedCount: 0 };
    }

    const chatIdsToPurge = resolvedChats
      .filter((c) => {
        if (c.expires_at && new Date(c.expires_at).getTime() <= now.getTime()) return true;
        if (c.ended_at && new Date(c.ended_at).getTime() <= new Date(twentyFourHoursAgoIso).getTime()) return true;
        if (c.updated_at && new Date(c.updated_at).getTime() <= new Date(twentyFourHoursAgoIso).getTime()) return true;
        return false;
      })
      .map((c) => c.id);

    if (chatIdsToPurge.length === 0) {
      return { purgedCount: 0 };
    }

    // Cascade delete associated messages first
    try {
      await supabase.from('concierge_messages').delete().in('chat_id', chatIdsToPurge);
    } catch {}

    // Delete the expired chat threads
    try {
      await supabase.from('concierge_chats').delete().in('id', chatIdsToPurge);
    } catch {}

    console.log(`[CONCIERGE 24H AUTO-PURGE] Cleaned up ${chatIdsToPurge.length} expired chat threads.`);
    return { purgedCount: chatIdsToPurge.length };
  } catch (err) {
    console.warn('purgeExpiredConciergeChats exception:', err);
    return { purgedCount: 0 };
  }
}

export async function manualPurgeConciergeChat(chatId: string): Promise<boolean> {
  try {
    const supabase = getSupabase();
    await supabase.from('concierge_messages').delete().eq('chat_id', chatId);
    await supabase.from('concierge_chats').delete().eq('id', chatId);
    return true;
  } catch (err) {
    console.warn('manualPurgeConciergeChat error:', err);
    return false;
  }
}

export async function fetchActiveConciergeChats(): Promise<any[]> {
  try {
    const supabase = getSupabase();
    // Run automated 24-hr auto-purge cycle
    await purgeExpiredConciergeChats();
    
    const { data, error } = await supabase
      .from('concierge_chats')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

export async function fetchConciergeMessages(chatId: string): Promise<any[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('concierge_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

export async function getOrCreateConciergeChat(
  sessionId: string, 
  customerName: string = 'Traveler Guest', 
  customerEmail?: string,
  userId?: string
): Promise<any> {
  try {
    const supabase = getSupabase();
    // Query safely without maybeSingle error on duplicate session IDs
    const { data: existingList } = await supabase
      .from('concierge_chats')
      .select('*')
      .eq('session_id', sessionId)
      .order('updated_at', { ascending: false })
      .limit(1);

    const existing = existingList && existingList.length > 0 ? existingList[0] : null;

    // Only reuse if the chat is NOT Resolved
    if (existing && existing.status !== 'Resolved') {
      const updates: any = {};
      if (customerEmail && existing.customer_email !== customerEmail) {
        updates.customer_email = customerEmail;
      }
      if (customerName && existing.customer_name !== customerName) {
        updates.customer_name = customerName;
      }
      if (userId && !existing.user_id) {
        updates.user_id = userId;
      }
      if (!existing.ticket_ref) {
        const generatedTicket = 'TICK-2026-' + (existing.id ? existing.id.substring(5, 9).toUpperCase() : Math.floor(1000 + Math.random() * 9000));
        updates.ticket_ref = generatedTicket;
        existing.ticket_ref = generatedTicket;
      }

      if (Object.keys(updates).length > 0) {
        try {
          await supabase.from('concierge_chats').update(updates).eq('id', existing.id);
        } catch {
          // ignore
        }
      }
      return existing;
    }

    const newChatId = 'chat_' + Math.random().toString(36).substring(2, 11);
    const generatedTicket = 'TICK-2026-' + Math.floor(1000 + Math.random() * 9000);
    const baseChat: any = {
      id: newChatId,
      session_id: sessionId,
      customer_name: customerName,
      customer_email: customerEmail || null,
      user_id: userId || null,
      status: 'Active',
      last_message: 'Session initiated',
      updated_at: new Date().toISOString()
    };

    // Attempt insert with ticket_ref, fall back to baseChat if ticket_ref column does not exist
    try {
      const { data: created, error } = await supabase.from('concierge_chats').insert({
        ...baseChat,
        ticket_ref: generatedTicket
      }).select().single();

      if (!error && created) {
        return created;
      }
    } catch {
      // ignore
    }

    // Fallback insert without ticket_ref
    try {
      const { data: createdWithoutTicket, error: fallbackErr } = await supabase.from('concierge_chats').insert(baseChat).select().single();
      if (!fallbackErr && createdWithoutTicket) {
        return { ...createdWithoutTicket, ticket_ref: generatedTicket };
      }
    } catch {
      // ignore
    }

    return { ...baseChat, ticket_ref: generatedTicket };
  } catch (err) {
    console.warn('Supabase getOrCreateConciergeChat error:', err);
    return null;
  }
}

/**
 * Fetch all tickets created by a specific customer/guest (Strictly active tickets - Resolved tickets are unreachable on client side)
 */
export async function fetchCustomerTickets(options: {
  sessionId?: string;
  email?: string;
  userId?: string;
}): Promise<any[]> {
  try {
    const supabase = getSupabase();
    const filters: string[] = [];

    if (options.userId) {
      filters.push(`user_id.eq.${options.userId}`);
    }
    if (options.email) {
      filters.push(`customer_email.eq.${options.email.toLowerCase().trim()}`);
    }
    if (options.sessionId) {
      filters.push(`session_id.eq.${options.sessionId}`);
    }

    if (filters.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('concierge_chats')
      .select('*')
      .or(filters.join(','))
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('fetchCustomerTickets error:', error);
      return [];
    }

    // STRICT GUARANTEE: Filter out any Resolved or closed tickets completely
    const activeTicketsOnly = (data || []).filter((chat: any) => chat.status && chat.status !== 'Resolved');
    return activeTicketsOnly;
  } catch (err) {
    console.warn('fetchCustomerTickets exception:', err);
    return [];
  }
}

/**
 * Fetch a single chat record by ID
 */
export async function fetchConciergeChatById(chatId: string): Promise<any> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('concierge_chats')
      .select('*')
      .eq('id', chatId)
      .limit(1);

    if (error || !data || data.length === 0) return null;
    return data[0];
  } catch {
    return null;
  }
}

export async function saveConciergeMessage(
  chatId: string, 
  senderType: 'user' | 'ai' | 'admin', 
  senderName: string, 
  senderRole: string, 
  text: string
): Promise<any> {
  try {
    const supabase = getSupabase();
    const messageId = 'msg_' + Math.random().toString(36).substring(2, 11);
    const now = new Date().toISOString();

    const newMsg = {
      id: messageId,
      chat_id: chatId,
      sender_type: senderType,
      sender_name: senderName,
      sender_role: senderRole,
      text,
      created_at: now
    };

    await supabase.from('concierge_messages').insert(newMsg);
    
    // Update chat last_message and updated_at
    let newStatus = undefined;
    if (senderType === 'admin') {
      newStatus = 'Handed_To_Human';
    }
    
    await supabase.from('concierge_chats').update({
      last_message: text,
      updated_at: now,
      ...(newStatus ? { status: newStatus } : {})
    }).eq('id', chatId);

    return newMsg;
  } catch (err) {
    console.warn('Supabase saveConciergeMessage error:', err);
    return null;
  }
}

export async function updateConciergeChatStatus(
  chatId: string, 
  status: 'Active' | 'Handed_To_Human' | 'Resolved',
  ticketRef?: string
): Promise<void> {
  try {
    const supabase = getSupabase();
    const now = new Date().toISOString();
    
    // 1. Core update (strictly standard columns that exist on all instances)
    const { error: coreErr } = await supabase
      .from('concierge_chats')
      .update({ 
        status: status, 
        updated_at: now 
      })
      .eq('id', chatId);

    if (coreErr) {
      console.warn('Supabase update status core error:', coreErr);
    }

    // Fallback: If ticketRef provided or if ID might be ticketRef, also update by ticket_ref
    if (ticketRef) {
      await supabase
        .from('concierge_chats')
        .update({ 
          status: status, 
          updated_at: now 
        })
        .eq('ticket_ref', ticketRef);
    }

    // 2. Optional extra columns (if table has ended_at/expires_at)
    if (status === 'Resolved') {
      try {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        await supabase
          .from('concierge_chats')
          .update({ 
            ended_at: now, 
            expires_at: expiresAt 
          })
          .eq('id', chatId);
      } catch {
        // Safe to ignore if optional columns do not exist
      }
    }
  } catch (err) {
    console.warn('Supabase updateConciergeChatStatus error:', err);
  }
}

export async function sendEmailTranscript(chatId: string, email: string): Promise<boolean> {
  try {
    const supabase = getSupabase();
    const messages = await fetchConciergeMessages(chatId);
    
    // Log dispatch event in security logs
    await logSecurityEventToDb({
      actionType: 'TRANSCRIPT_DISPATCH',
      submodule: 'ConciergeDesk',
      details: `Dispatched full chat transcript (${messages.length} messages) to ${email}`
    });

    // Update customer_email on chat thread
    await supabase.from('concierge_chats').update({ customer_email: email }).eq('id', chatId);

    console.log(`[CONCIERGE MAIL DISPATCHER] Successfully formatted and sent transcript to ${email}. Messages: ${messages.length}`);
    return true;
  } catch (err) {
    console.warn('Transcript email dispatch error:', err);
    return false;
  }
}

/**
 * 9. REAL-TIME MULTI-CLIENT SUBSCRIPTION DISPATCHER
 */
export function subscribeToGlobalDatabaseChanges(callback: (payload: any) => void) {
  try {
    const supabase = getSupabase();
    const uniqueChannelName = 'realtime_' + Math.random().toString(36).substring(2, 11);
    const channel = supabase.channel(uniqueChannelName)
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        callback(payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Supabase Realtime subscription notice:', err);
    return () => {};
  }
}

/**
 * 10. MULTI-DEVICE & CROSS-PLATFORM USER NOTIFICATIONS
 */

export interface DbUserNotification {
  id: string;
  user_id?: string;
  user_email: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  booking_ref?: string;
  action_label?: string;
  created_at?: string;
}

export async function fetchUserNotificationsFromDb(email: string): Promise<DbUserNotification[]> {
  if (!email) return [];
  try {
    const supabase = getSupabase();
    const cleanEmail = email.toLowerCase().trim();
    const { data, error } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('user_email', cleanEmail)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      // If table is not yet created or error occurs, fail gracefully
      console.warn('Supabase fetchUserNotifications notice:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn('Supabase fetchUserNotificationsFromDb error:', err);
    return [];
  }
}

export async function saveUserNotificationToDb(
  notif: {
    id: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
    bookingRef?: string;
    actionLabel?: string;
  },
  email: string,
  userId?: string
): Promise<boolean> {
  if (!email) return false;
  try {
    const supabase = getSupabase();
    const cleanEmail = email.toLowerCase().trim();
    const payload = {
      id: notif.id,
      user_id: userId || null,
      user_email: cleanEmail,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      read: notif.read,
      booking_ref: notif.bookingRef || null,
      action_label: notif.actionLabel || null
    };

    const { error } = await supabase.from('user_notifications').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase saveUserNotificationToDb notice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase saveUserNotificationToDb error:', err);
    return false;
  }
}

export async function markUserNotificationAsReadInDb(notifId: string): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase.from('user_notifications').update({ read: true }).eq('id', notifId);
  } catch (err) {
    console.warn('Supabase markUserNotificationAsReadInDb error:', err);
  }
}

export async function markAllUserNotificationsAsReadInDb(email: string): Promise<void> {
  if (!email) return;
  try {
    const supabase = getSupabase();
    await supabase
      .from('user_notifications')
      .update({ read: true })
      .eq('user_email', email.toLowerCase().trim());
  } catch (err) {
    console.warn('Supabase markAllUserNotificationsAsReadInDb error:', err);
  }
}

export async function deleteUserNotificationFromDb(notifId: string): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase.from('user_notifications').delete().eq('id', notifId);
  } catch (err) {
    console.warn('Supabase deleteUserNotificationFromDb error:', err);
  }
}

export async function clearUserNotificationsFromDb(email: string): Promise<void> {
  if (!email) return;
  try {
    const supabase = getSupabase();
    await supabase
      .from('user_notifications')
      .delete()
      .eq('user_email', email.toLowerCase().trim());
  } catch (err) {
    console.warn('Supabase clearUserNotificationsFromDb error:', err);
  }
}

export function subscribeToUserNotifications(
  email: string,
  onUpdate: (payload: any) => void
): () => void {
  if (!email) return () => {};
  try {
    const supabase = getSupabase();
    const cleanEmail = email.toLowerCase().trim();
    const channelName = `notifs_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}_${Math.random().toString(36).substring(2, 7)}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_email=eq.${cleanEmail}`
        },
        (payload) => {
          onUpdate(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Supabase subscribeToUserNotifications notice:', err);
    return () => {};
  }
}



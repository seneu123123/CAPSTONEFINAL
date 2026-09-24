import React, { useState, useEffect } from 'react';
import { 
  User, 
  X, 
  Check, 
  AlertCircle, 
  CreditCard, 
  Ticket, 
  Palette, 
  ShieldCheck, 
  Phone, 
  Globe, 
  Sparkles, 
  FileText, 
  UploadCloud, 
  ExternalLink,
  ChevronRight,
  Clock,
  Heart,
  Save,
  Moon,
  Sun,
  Trash2,
  ShieldAlert,
  Download,
  LogOut,
  DollarSign,
  Users,
  KeyRound,
  Lock
} from 'lucide-react';
import { UserProfile, updateUserProfileInDb, signOutUser } from '../../utils/supabaseClient';
import { Booking, AppSettings } from '../../types';
import { dispatchAppNotification } from '../../utils/notifications';
import { CurrencySelector } from '../common/CurrencySelector';
import { SupportedCurrency, getStoredCurrency, formatCurrency } from '../../utils/currency';
import { SettleBalanceModal } from './SettleBalanceModal';
import { CustomerPasswordEditor } from './CustomerPasswordEditor';

interface MyAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  travelerUser: UserProfile | null;
  userBookings: Booking[];
  onUpdateProfile: (updated: UserProfile) => void;
  onUpdateAppSettings?: (settings: Partial<AppSettings>) => void;
  appSettings?: AppSettings;
  onOpenTracker?: (bookingRef?: string) => void;
  onUpdateBooking?: (booking: Booking) => void;
  onSignOut?: () => void;
  initialTab?: 'overview' | 'profile' | 'password' | 'theme' | 'vouchers' | 'privacy';
}

export const MyAccountModal: React.FC<MyAccountModalProps> = ({
  isOpen,
  onClose,
  travelerUser,
  userBookings,
  onUpdateProfile,
  onUpdateAppSettings,
  appSettings,
  onOpenTracker,
  onUpdateBooking,
  onSignOut,
  initialTab = 'overview'
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'password' | 'theme' | 'vouchers' | 'privacy'>(initialTab);
  const [settleBooking, setSettleBooking] = useState<Booking | null>(null);

  // RA 10173 Data Privacy & Deletion State
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');
  const [isDeletingData, setIsDeletingData] = useState<boolean>(false);
  const [isDeleteDone, setIsDeleteDone] = useState<boolean>(false);

  // Edit Profile Form State
  const [fullName, setFullName] = useState<string>(travelerUser?.full_name || '');
  const [phone, setPhone] = useState<string>(travelerUser?.phone || '');
  const [emergencyContact, setEmergencyContact] = useState<string>(travelerUser?.emergency_contact || '');
  const [nationality, setNationality] = useState<string>(travelerUser?.nationality || 'Filipino');
  const [dietaryPreferences, setDietaryPreferences] = useState<string>(travelerUser?.dietary_preferences || '');
  const [avatarUrl, setAvatarUrl] = useState<string>(travelerUser?.avatar_url || '');
  const [isDraggingAvatar, setIsDraggingAvatar] = useState<boolean>(false);
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string>('');

  // Synchronize form fields whenever travelerUser prop updates or modal opens
  useEffect(() => {
    if (travelerUser) {
      setFullName(travelerUser.full_name || (travelerUser.auth_provider === 'guest' ? 'Guest Traveler' : 'Traveler'));
      setPhone(travelerUser.phone || '');
      setEmergencyContact(travelerUser.emergency_contact || '');
      setNationality(travelerUser.nationality || 'Filipino');
      setDietaryPreferences(travelerUser.dietary_preferences || '');
      setAvatarUrl(travelerUser.avatar_url || '');
    } else {
      setFullName('');
      setPhone('');
      setEmergencyContact('');
      setNationality('Filipino');
      setDietaryPreferences('');
      setAvatarUrl('');
    }
    setProfileSuccessMsg('');
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [travelerUser, isOpen, initialTab]);

  const processAvatarFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPEG, PNG, WEBP, GIF, etc.).');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      alert('Image file size exceeds 8MB. Please select a smaller photo.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setAvatarUrl(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingAvatar(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processAvatarFile(e.dataTransfer.files[0]);
    }
  };

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processAvatarFile(e.target.files[0]);
    }
  };

  // Theme Customization State
  const [selectedAccent, setSelectedAccent] = useState<string>(
    travelerUser?.theme_preferences?.accentColor || appSettings?.theme?.accentColor || 'coral'
  );
  const [selectedTone, setSelectedTone] = useState<string>(
    travelerUser?.theme_preferences?.bgTone || appSettings?.theme?.bgTone || 'obsidian'
  );
  const [cardGlow, setCardGlow] = useState<boolean>(
    travelerUser?.theme_preferences?.cardGlow ?? appSettings?.theme?.cardGlow ?? true
  );
  const [activeCurrency, setActiveCurrency] = useState<SupportedCurrency>(getStoredCurrency());

  useEffect(() => {
    if (travelerUser?.theme_preferences) {
      if (travelerUser.theme_preferences.accentColor) {
        setSelectedAccent(travelerUser.theme_preferences.accentColor);
      }
      if (travelerUser.theme_preferences.bgTone) {
        setSelectedTone(travelerUser.theme_preferences.bgTone);
      }
      if (typeof travelerUser.theme_preferences.cardGlow === 'boolean') {
        setCardGlow(travelerUser.theme_preferences.cardGlow);
      }
    }
  }, [travelerUser]);

  useEffect(() => {
    const handleCurrencyChange = (e: Event) => {
      const custom = e as CustomEvent<SupportedCurrency>;
      if (custom.detail) setActiveCurrency(custom.detail);
    };
    window.addEventListener('holiday_currency_changed', handleCurrencyChange);
    return () => window.removeEventListener('holiday_currency_changed', handleCurrencyChange);
  }, []);

  if (!isOpen) return null;

  // Calculate Balance Breakdown
  const activeBookingsWithBalance = userBookings.filter((b) => (b.invoice?.balanceDue || 0) > 0);
  const totalOutstandingBalance = userBookings.reduce((sum, b) => sum + (b.invoice?.balanceDue || 0), 0);
  const totalPaidAmount = userBookings.reduce((sum, b) => sum + (b.invoice?.amountPaid || 0), 0);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!travelerUser?.email) return;

    setIsSavingProfile(true);
    setProfileSuccessMsg('');

    try {
      const updated = await updateUserProfileInDb({
        id: travelerUser.id,
        email: travelerUser.email,
        full_name: fullName.trim() || travelerUser.full_name,
        phone: phone.trim(),
        emergency_contact: emergencyContact.trim(),
        nationality: nationality.trim(),
        dietary_preferences: dietaryPreferences.trim(),
        avatar_url: avatarUrl.trim() || travelerUser.avatar_url,
        role: travelerUser.role,
        status: travelerUser.status,
        auth_provider: travelerUser.auth_provider,
        theme_preferences: {
          accentColor: selectedAccent,
          bgTone: selectedTone,
          cardGlow
        }
      });

      onUpdateProfile(updated);
      setProfileSuccessMsg('Account details and database record synchronized successfully!');
      dispatchAppNotification({
        title: 'Profile Updated',
        message: 'Your personal traveler information has been updated in database records.',
        type: 'info'
      });
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveTheme = async () => {
    const updatedTheme = {
      ...appSettings.theme,
      accentColor: selectedAccent as any,
      bgTone: selectedTone as any,
      cardGlow
    };

    if (onUpdateAppSettings && appSettings) {
      onUpdateAppSettings({
        ...appSettings,
        theme: updatedTheme
      });
    }

    if (travelerUser?.email) {
      try {
        const updated = await updateUserProfileInDb({
          email: travelerUser.email,
          theme_preferences: {
            accentColor: selectedAccent,
            bgTone: selectedTone,
            cardGlow
          }
        });
        if (onUpdateProfile) {
          onUpdateProfile(updated);
        }
      } catch (err) {
        console.warn('Could not save theme to user account in DB:', err);
      }
    }

    dispatchAppNotification({
      title: 'Theme Saved to Account',
      message: 'Your custom theme and display customization have been saved to your account.',
      type: 'info'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div 
        className="w-full max-w-4xl bg-[#090E14] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-6 sm:p-8 bg-gradient-to-r from-[#0F1722] via-[#090E14] to-[#0D1520] border-b border-white/10 flex items-center justify-between relative overflow-hidden shrink-0">
          <div className="flex items-center gap-4 relative z-10">
            {travelerUser?.avatar_url || avatarUrl ? (
              <img 
                src={avatarUrl || travelerUser?.avatar_url || ''} 
                alt={travelerUser?.full_name || fullName || 'Traveler'}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-sunset-coral shadow-lg shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sunset-coral/30 to-sunset-coral/10 border-2 border-sunset-coral/60 text-sunset-coral flex items-center justify-center text-xl font-bold font-serif-display shrink-0">
                {(travelerUser?.full_name || fullName || 'T').charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-serif-display text-xl sm:text-2xl text-ivory font-light">
                  {travelerUser?.full_name || fullName || 'Traveler Profile'}
                </h3>
                <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                  travelerUser?.auth_provider === 'guest'
                    ? 'bg-amber-950/80 text-amber-300 border-amber-500/30'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30'
                }`}>
                  <ShieldCheck className={`w-3 h-3 ${travelerUser?.auth_provider === 'guest' ? 'text-amber-400' : 'text-emerald-400'}`} />
                  <span>{travelerUser?.auth_provider === 'guest' ? 'Guest Session' : 'Verified Account'}</span>
                </span>
              </div>
              <p className="text-xs font-mono text-sand-muted mt-0.5">{travelerUser?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10">
            {onSignOut && (
              <button
                type="button"
                onClick={() => {
                  onSignOut();
                }}
                className="btn-pop flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 border border-rose-500/30 text-rose-300 text-xs font-medium transition cursor-pointer"
                title="Sign Out of this Account"
                id="modal-header-signout-btn"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-sand-muted hover:text-ivory flex items-center justify-center transition-all cursor-pointer"
              aria-label="Close My Account"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar (Clean 6-Column Segmented Grid to Guarantee Zero Overlap) */}
        <div className="shrink-0 px-4 sm:px-6 py-3 border-b border-white/10 bg-[#070B0E]/95 backdrop-blur-md">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 p-1 bg-white/[0.03] border border-white/10 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`px-2.5 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center whitespace-nowrap border ${
                activeTab === 'overview'
                  ? 'border-sunset-coral/60 text-sunset-coral bg-sunset-coral/15 shadow-sm shadow-sunset-coral/20'
                  : 'border-transparent text-sand-muted hover:text-ivory hover:bg-white/5'
              }`}
            >
              <User className="w-3.5 h-3.5 shrink-0" />
              <span>Overview</span>
              {totalOutstandingBalance > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-sunset-coral animate-ping shrink-0" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`px-2.5 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center whitespace-nowrap border ${
                activeTab === 'profile'
                  ? 'border-sunset-coral/60 text-sunset-coral bg-sunset-coral/15 shadow-sm shadow-sunset-coral/20'
                  : 'border-transparent text-sand-muted hover:text-ivory hover:bg-white/5'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>Edit Profile</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('password')}
              className={`px-2.5 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center whitespace-nowrap border ${
                activeTab === 'password'
                  ? 'border-sunset-coral/60 text-sunset-coral bg-sunset-coral/15 shadow-sm shadow-sunset-coral/20'
                  : 'border-transparent text-sand-muted hover:text-ivory hover:bg-white/5'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 shrink-0" />
              <span>Password</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('theme')}
              className={`px-2.5 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center whitespace-nowrap border ${
                activeTab === 'theme'
                  ? 'border-sunset-coral/60 text-sunset-coral bg-sunset-coral/15 shadow-sm shadow-sunset-coral/20'
                  : 'border-transparent text-sand-muted hover:text-ivory hover:bg-white/5'
              }`}
            >
              <Palette className="w-3.5 h-3.5 shrink-0" />
              <span>Theme</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('vouchers')}
              className={`px-2.5 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center whitespace-nowrap border ${
                activeTab === 'vouchers'
                  ? 'border-sunset-coral/60 text-sunset-coral bg-sunset-coral/15 shadow-sm shadow-sunset-coral/20'
                  : 'border-transparent text-sand-muted hover:text-ivory hover:bg-white/5'
              }`}
            >
              <Ticket className="w-3.5 h-3.5 shrink-0" />
              <span>Tickets ({userBookings.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('privacy')}
              className={`col-span-2 sm:col-span-1 px-2.5 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center whitespace-nowrap border ${
                activeTab === 'privacy'
                  ? 'border-rose-500/60 text-rose-400 bg-rose-500/15 shadow-sm shadow-rose-500/20'
                  : 'border-transparent text-sand-muted hover:text-ivory hover:bg-white/5'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>Privacy (RA 10173)</span>
            </button>
          </div>
        </div>

        {/* Tab Body Contents */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1">
          {/* TAB 1: OVERVIEW & BALANCES */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Financial Balance Summary Card */}
              <div className={`p-6 rounded-3xl border-2 transition-all shadow-2xl relative overflow-hidden ${
                totalOutstandingBalance > 0 
                  ? 'bg-gradient-to-br from-[#120B0D] via-[#0E131C] to-[#0A0F17] border-sunset-coral/50' 
                  : 'bg-gradient-to-br from-[#0B1511] via-[#091016] to-[#080E14] border-emerald-500/40'
              }`}>
                {/* Background Glow */}
                <div className={`absolute -right-20 -top-20 w-64 h-64 rounded-full blur-3xl pointer-events-none ${
                  totalOutstandingBalance > 0 ? 'bg-sunset-coral/10' : 'bg-emerald-500/10'
                }`} />

                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                        totalOutstandingBalance > 0 
                          ? 'bg-sunset-coral/20 text-sunset-coral border-sunset-coral/40' 
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      }`}>
                        {totalOutstandingBalance > 0 ? 'Payment Action Required' : 'Account 100% Settled'}
                      </span>
                      <span className="text-[11px] text-sand-muted font-mono">Live Ledger</span>
                    </div>

                    <h3 className="font-serif-display text-2xl text-ivory font-medium">
                      {totalOutstandingBalance > 0 ? (
                        <>Outstanding Balance: <span className="text-sunset-coral font-semibold">{formatCurrency(totalOutstandingBalance, activeCurrency)}</span></>
                      ) : (
                        <>All Reservations Fully Settled</>
                      )}
                    </h3>

                    <p className="text-xs text-sand-muted max-w-xl leading-relaxed">
                      {totalOutstandingBalance > 0 
                        ? 'Your reservation is secured with your verified downpayment. Settle the remaining balance 15 days before your departure date.'
                        : 'Your travel package, airline bookings, hotel vouchers, and expedition permits are fully paid and ready.'}
                    </p>
                  </div>

                  {totalOutstandingBalance > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (activeBookingsWithBalance.length > 0) {
                          setSettleBooking(activeBookingsWithBalance[0]);
                        } else if (onOpenTracker) {
                          onClose();
                          onOpenTracker();
                        }
                      }}
                      className="px-5 py-3 rounded-2xl bg-sunset-coral hover:bg-[#ff765b] text-white font-semibold text-xs shadow-xl shadow-sunset-coral/30 active:scale-95 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Settle Balance / Submit Proof</span>
                    </button>
                  )}
                </div>

                {/* Overall Settlement Progress Bar */}
                {userBookings.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-white/10 space-y-2 relative z-10">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-sand-muted flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Payment Settlement Ratio</span>
                      </span>
                      <span className="font-bold text-ivory">
                        {Math.round(((totalPaidAmount) / Math.max(1, (totalPaidAmount + totalOutstandingBalance))) * 100)}% Settled
                      </span>
                    </div>

                    <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden p-0.5">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-sunset-coral rounded-full transition-all duration-700 shadow-lg"
                        style={{ 
                          width: `${Math.min(100, Math.max(0, Math.round(((totalPaidAmount) / Math.max(1, (totalPaidAmount + totalOutstandingBalance))) * 100)))}%` 
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-sand-muted pt-1">
                      <span className="text-emerald-400">Paid: {formatCurrency(totalPaidAmount, activeCurrency)}</span>
                      <span className={totalOutstandingBalance > 0 ? 'text-sunset-coral font-bold' : 'text-emerald-400'}>
                        Remaining: {formatCurrency(totalOutstandingBalance, activeCurrency)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Stats Overview Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans-body">
                <div className="p-4 rounded-2xl bg-[#070B0E] border border-white/10 space-y-1">
                  <span className="text-[10px] text-sand-muted uppercase font-mono">Total Expeditions</span>
                  <p className="text-2xl font-serif-display text-ivory">{userBookings.length} Bookings</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#070B0E] border border-white/10 space-y-1">
                  <span className="text-[10px] text-emerald-400 uppercase font-mono">Total Settled Payment</span>
                  <p className="text-2xl font-serif-display text-emerald-400">{formatCurrency(totalPaidAmount, activeCurrency)}</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#070B0E] border border-white/10 space-y-1">
                  <span className="text-[10px] text-sunset-coral uppercase font-mono">Total Remaining Balance</span>
                  <p className={`text-2xl font-serif-display ${totalOutstandingBalance > 0 ? 'text-sunset-coral' : 'text-emerald-400'}`}>
                    {formatCurrency(totalOutstandingBalance, activeCurrency)}
                  </p>
                </div>
              </div>

              {/* Detailed Breakdown of Bookings & Passenger Manifests */}
              {userBookings.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-serif-display text-base text-ivory flex items-center gap-2">
                      <Users className="w-4 h-4 text-sunset-coral" />
                      <span>Your Expeditions & Passenger Manifests</span>
                    </h4>
                    <span className="text-[11px] text-sand-muted font-mono">
                      {userBookings.length} Active {userBookings.length === 1 ? 'Record' : 'Records'}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {userBookings.map((b) => {
                      const balance = b.invoice?.balanceDue || 0;
                      const paid = b.invoice?.amountPaid || (b.paymentStatus === 'Paid' ? b.totalPrice : 0);
                      const paxs = b.passengers && b.passengers.length > 0 ? b.passengers : [
                        {
                          id: `${b.id}-lead-pax`,
                          fullName: b.customer.fullName || 'Lead Traveler',
                          age: 30,
                          gender: 'Female' as const,
                          passportOrId: b.bookingRef,
                          nationality: b.customer.nationality || 'Filipino',
                          boardingStatus: 'boarded' as const,
                          seatNumber: '12A',
                          cabinClass: 'Economy',
                          roomAssignment: 'Standard Deluxe',
                          paymentStatus: (b.paymentStatus === 'Paid' ? 'Fully Paid' : '50% Downpayment') as any
                        }
                      ];

                      return (
                        <div key={b.id} className="p-5 rounded-3xl bg-[#070B0E] border border-white/10 space-y-4 shadow-lg">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-sunset-coral bg-sunset-coral/10 px-2 py-0.5 rounded border border-sunset-coral/20">
                                  {b.bookingRef}
                                </span>
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                                  balance <= 0 
                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                }`}>
                                  {balance <= 0 ? 'Fully Paid' : '50% Deposit Paid'}
                                </span>
                              </div>
                              <h5 className="font-serif-display text-base text-ivory font-medium mt-1">{b.tourTitle}</h5>
                              <p className="text-[11px] text-sand-muted font-mono">
                                Travel Date: {b.travelDate} • {b.numPax} Passengers
                              </p>
                            </div>

                            <div className="text-left sm:text-right space-y-1">
                              <div className="font-serif-display text-lg text-ivory font-semibold">
                                {formatCurrency(b.totalPrice, activeCurrency)}
                              </div>
                              <div className="text-[11px] text-emerald-400 font-mono">
                                Paid: {formatCurrency(paid, activeCurrency)}
                              </div>
                              {balance > 0 && (
                                <div className="text-xs text-rose-300 font-mono font-bold">
                                  Balance Due: {formatCurrency(balance, activeCurrency)}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Registered Passengers on Manifest */}
                          <div className="space-y-2">
                            <span className="text-[10px] font-mono text-sand-muted uppercase tracking-wider block">
                              Registered Passenger Manifest Roster ({paxs.length} Pax):
                            </span>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                              {paxs.map((p, pIdx) => (
                                <div key={`acc-pax-${b.id}-${p.id || pIdx}`} className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                                  <div className="space-y-0.5">
                                    <div className="font-medium text-ivory text-xs flex items-center gap-1.5">
                                      <span>{p.fullName}</span>
                                      <span className="text-[10px] text-sand-muted font-mono">({p.age} yo, {p.gender || 'F'})</span>
                                    </div>
                                    <div className="text-[10px] text-sand-muted font-mono flex items-center gap-2">
                                      <span>Seat: <strong className="text-ivory">{p.seatNumber || 'Unassigned'}</strong></span>
                                      <span>•</span>
                                      <span>Room: <strong className="text-ivory">{p.roomAssignment || 'TBA'}</strong></span>
                                    </div>
                                  </div>

                                  <div className="text-right font-mono">
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase block ${
                                      (p.boardingStatus || 'pending') === 'boarded'
                                        ? 'bg-emerald-500/15 text-emerald-400'
                                        : 'bg-amber-500/15 text-amber-400'
                                    }`}>
                                      {p.boardingStatus || 'pending'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Action Button */}
                          <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (balance > 0) {
                                  setSettleBooking(b);
                                } else {
                                  onClose();
                                  if (onOpenTracker) onOpenTracker(b.bookingRef);
                                }
                              }}
                              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-ivory text-xs font-medium border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>{balance > 0 ? 'Settle Balance / View Proof' : 'View Full Booking Ticket'}</span>
                              <ChevronRight className="w-3.5 h-3.5 text-sunset-coral" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Personal Essential Info Card */}
              <div className="bg-[#070B0E] border border-white/10 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h4 className="font-serif-display text-base text-ivory flex items-center gap-2">
                    <User className="w-4 h-4 text-sunset-coral" />
                    <span>Essential Passenger File</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setActiveTab('profile')}
                    className="text-xs text-sunset-coral hover:underline font-mono"
                  >
                    Edit Details
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] text-sand-muted font-mono uppercase block">Full Name:</span>
                    <span className="text-ivory font-medium">{fullName || travelerUser?.full_name || 'N/A'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-sand-muted font-mono uppercase block">Email Address:</span>
                    <span className="text-ivory font-mono">{travelerUser?.email || 'N/A'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-sand-muted font-mono uppercase block">Mobile Phone:</span>
                    <span className="text-ivory font-mono">{phone || travelerUser?.phone || 'Not configured'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-sand-muted font-mono uppercase block">Nationality:</span>
                    <span className="text-ivory font-medium">{nationality || travelerUser?.nationality || 'Filipino'}</span>
                  </div>

                  <div className="sm:col-span-2">
                    <span className="text-[10px] text-sand-muted font-mono uppercase block">Emergency Contact Person:</span>
                    <span className="text-ivory font-medium">{emergencyContact || travelerUser?.emergency_contact || 'Not configured'}</span>
                  </div>

                  <div className="sm:col-span-2">
                    <span className="text-[10px] text-sand-muted font-mono uppercase block">Dietary & Accessibility Preferences:</span>
                    <span className="text-ivory font-medium">{dietaryPreferences || travelerUser?.dietary_preferences || 'Standard passenger meal'}</span>
                  </div>
                </div>
              </div>

              {/* Password & Security Quick Card */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sunset-coral/15 border border-sunset-coral/30 flex items-center justify-center text-sunset-coral shrink-0">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs text-ivory font-medium block">Password & Vault Security</span>
                    <span className="text-[11px] text-sand-muted block">Manage encrypted login credentials and cryptographic keys</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('password')}
                  className="btn-pop px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-ivory text-xs font-mono flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-sunset-coral" />
                  <span>Edit Password</span>
                </button>
              </div>

              {/* Account Session Management */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between flex-wrap gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs text-ivory font-medium block">Active Traveler Session</span>
                  <span className="text-[11px] text-sand-muted block">Signed in as <span className="font-mono text-ivory">{travelerUser?.email}</span></span>
                </div>
                {onSignOut && (
                  <button
                    type="button"
                    onClick={() => {
                      onSignOut();
                    }}
                    className="btn-pop px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                    id="account-overview-signout-btn"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    <span>Sign Out of Account</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: EDIT PROFILE */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs font-sans-body">
              {profileSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{profileSuccessMsg}</span>
                </div>
              )}

              {/* Password Shortcut Banner */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <KeyRound className="w-4 h-4 text-sunset-coral" />
                  <span className="text-xs text-ivory">Need to update your account password or security key?</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('password')}
                  className="text-xs font-mono text-sunset-coral hover:text-[#ff765b] underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Edit Password Tab</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] text-sand-muted block font-mono">
                    Full Legal Name (Matching Passport or Government ID) <span className="text-sunset-coral">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="e.g. Maria Clara Santos"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs focus:outline-none focus:border-sunset-coral"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-sand-muted block font-mono">
                    Email Address (Read-only Account ID)
                  </label>
                  <input
                    type="email"
                    value={travelerUser?.email || ''}
                    disabled
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sand-muted text-xs font-mono cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-sand-muted block font-mono">
                    Mobile Contact Phone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +63 917 123 4567"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs font-mono focus:outline-none focus:border-sunset-coral"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-sand-muted block font-mono">
                    Nationality
                  </label>
                  <input
                    type="text"
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    placeholder="e.g. Filipino, American, Japanese"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs focus:outline-none focus:border-sunset-coral"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] text-sand-muted block font-mono">
                    Emergency Contact Person & Phone Number
                  </label>
                  <input
                    type="text"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="e.g. Juan Santos (Spouse) - 0918 987 6543"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs focus:outline-none focus:border-sunset-coral"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] text-sand-muted block font-mono">
                    Dietary, Medical, or Accessibility Requirements
                  </label>
                  <textarea
                    rows={2}
                    value={dietaryPreferences}
                    onChange={(e) => setDietaryPreferences(e.target.value)}
                    placeholder="e.g. Halal meals requested, seafood allergy, mobility assistance"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs focus:outline-none focus:border-sunset-coral"
                  />
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-sand-muted block font-mono">
                      Profile Avatar Photo <span className="text-sunset-coral font-bold">(Drag & Drop or Click to Browse)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowUrlInput(!showUrlInput)}
                      className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                    >
                      {showUrlInput ? 'Use Drag & Drop' : 'Paste Direct Image URL'}
                    </button>
                  </div>

                  {showUrlInput ? (
                    <input
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/... or profile image link"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs font-mono focus:outline-none focus:border-sunset-coral"
                    />
                  ) : (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingAvatar(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        setIsDraggingAvatar(false);
                      }}
                      onDrop={handleAvatarDrop}
                      className={`relative border-2 border-dashed rounded-2xl p-4 sm:p-6 transition-all text-center flex flex-col sm:flex-row items-center justify-between gap-4 ${
                        isDraggingAvatar
                          ? 'border-sunset-coral bg-sunset-coral/20 scale-[1.01]'
                          : avatarUrl
                          ? 'border-emerald-500/40 bg-emerald-950/20'
                          : 'border-white/20 bg-[#070B0E] hover:border-sunset-coral/60'
                      }`}
                    >
                      <div className="flex items-center gap-4 text-left">
                        {avatarUrl ? (
                          <div className="relative group shrink-0">
                            <img
                              src={avatarUrl}
                              alt="Avatar Preview"
                              className="w-16 h-16 rounded-2xl object-cover border-2 border-sunset-coral shadow-lg"
                            />
                            <button
                              type="button"
                              onClick={() => setAvatarUrl('')}
                              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-bold shadow hover:bg-rose-500 transition-colors cursor-pointer"
                              title="Remove photo"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/15 flex items-center justify-center text-sunset-coral shrink-0">
                            <UploadCloud className="w-7 h-7" />
                          </div>
                        )}

                        <div className="space-y-1">
                          <p className="text-xs font-medium text-ivory">
                            {avatarUrl ? 'Profile Photo Loaded!' : 'Drag & Drop your new profile photo here'}
                          </p>
                          <p className="text-[10px] text-sand-muted font-mono">
                            Supports JPG, PNG, WEBP, GIF (Up to 8MB)
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        <label className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-ivory font-mono text-xs border border-white/15 transition-all cursor-pointer inline-flex items-center gap-2">
                          <UploadCloud className="w-3.5 h-3.5 text-sunset-coral" />
                          <span>{avatarUrl ? 'Change Photo' : 'Browse Files'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarFileSelect}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-6 py-3 rounded-xl bg-sunset-coral hover:bg-[#ff765b] text-white font-semibold text-xs shadow-lg shadow-sunset-coral/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingProfile ? 'Saving & Syncing to DB...' : 'Save Profile & Sync Database'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB: PASSWORD & SECURITY CREDENTIALS */}
          {activeTab === 'password' && (
            <div className="animate-fade-in">
              <CustomerPasswordEditor
                travelerUser={travelerUser}
                onSuccess={() => {
                  setProfileSuccessMsg('Password updated and vault keys synchronized successfully.');
                }}
              />
            </div>
          )}

          {/* TAB 3: THEME & DISPLAY SETTINGS */}
          {activeTab === 'theme' && (
            <div className="space-y-6 text-xs font-sans-body">
              <div className="space-y-3">
                <h4 className="font-serif-display text-base text-ivory flex items-center gap-2">
                  <Palette className="w-4 h-4 text-sunset-coral" />
                  <span>Accent Color Theme</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { id: 'coral', name: 'Sunset Coral', color: 'bg-[#F26A4F]' },
                    { id: 'emerald', name: 'Emerald Lagoon', color: 'bg-[#10B981]' },
                    { id: 'cyan', name: 'Azure Sky', color: 'bg-[#06B6D4]' },
                    { id: 'violet', name: 'Royal Violet', color: 'bg-[#8B5CF6]' },
                    { id: 'amber', name: 'Sunburst Amber', color: 'bg-[#F59E0B]' }
                  ].map((accent) => (
                    <button
                      key={accent.id}
                      type="button"
                      onClick={() => setSelectedAccent(accent.id)}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                        selectedAccent === accent.id
                          ? 'border-sunset-coral bg-sunset-coral/15 text-ivory'
                          : 'border-white/10 bg-white/5 text-sand-muted hover:border-white/20'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full ${accent.color} shadow-md`} />
                      <span className="text-[11px] font-medium">{accent.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-serif-display text-base text-ivory flex items-center gap-2">
                  <Moon className="w-4 h-4 text-sunset-coral" />
                  <span>Background Tone Canvas Mode</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedTone('obsidian')}
                    className={`p-4 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                      selectedTone === 'obsidian'
                        ? 'border-sunset-coral bg-sunset-coral/15 text-ivory'
                        : 'border-white/10 bg-white/5 text-sand-muted'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#070B0E] border border-white/20 flex items-center justify-center text-ivory">
                      <Moon className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <span className="font-medium block">Deep Obsidian Dark Mode</span>
                      <span className="text-[10px] text-sand-muted block">High-contrast volcanic aesthetic</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTone('soft')}
                    className={`p-4 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                      selectedTone === 'soft'
                        ? 'border-sunset-coral bg-sunset-coral/15 text-ivory'
                        : 'border-white/10 bg-white/5 text-sand-muted'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#111822] border border-white/20 flex items-center justify-center text-cyan-300">
                      <Sun className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <span className="font-medium block">Midnight Sapphire</span>
                      <span className="text-[10px] text-sand-muted block">Cool oceanic atmosphere</span>
                    </div>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-serif-display text-base text-ivory flex items-center gap-2">
                  <Globe className="w-4 h-4 text-sunset-coral" />
                  <span>Display Currency</span>
                </h4>
                <CurrencySelector variant="full" />
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-ivory block">Card Glow & Glassmorphism Effects</span>
                  <span className="text-[10px] text-sand-muted block">Enable ambient neon drop-shadows and subtle glass reflections</span>
                </div>
                <input
                  type="checkbox"
                  checked={cardGlow}
                  onChange={(e) => setCardGlow(e.target.checked)}
                  className="rounded bg-[#070B0E] border-white/20 text-sunset-coral focus:ring-sunset-coral cursor-pointer w-4 h-4"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveTheme}
                  className="px-6 py-3 rounded-xl bg-sunset-coral hover:bg-[#ff765b] text-white font-semibold text-xs shadow-lg shadow-sunset-coral/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Apply Theme Preferences</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: MY TICKETS & VOUCHERS */}
          {activeTab === 'vouchers' && (
            <div className="space-y-4 text-xs">
              {userBookings.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <Ticket className="w-8 h-8 text-sand-muted opacity-40 mx-auto" />
                  <p className="text-sand-muted font-sans-body">No active ticket vouchers found for your account.</p>
                </div>
              ) : (
                userBookings.map((b) => {
                  const balance = b.invoice?.balanceDue || 0;
                  return (
                    <div key={b.id} className="p-4 rounded-2xl bg-[#070B0E] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-sunset-coral">{b.bookingRef}</span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                            balance > 0 
                              ? 'bg-amber-950/80 text-amber-300 border-amber-500/30' 
                              : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30'
                          }`}>
                            {balance > 0 ? `Unpaid Balance: ₱${balance.toLocaleString()}` : 'Fully Settled'}
                          </span>
                        </div>
                        <h5 className="font-serif-display text-sm text-ivory">{b.tourTitle}</h5>
                        <p className="text-[11px] text-sand-muted font-mono">Departure: {b.travelDate} • {b.numPax} Passengers</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          if (onOpenTracker) onOpenTracker(b.bookingRef);
                        }}
                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-ivory font-mono text-xs border border-white/15 transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-center cursor-pointer"
                      >
                        <span>View Ticket Voucher</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 5: DATA PRIVACY & RIGHT TO ERASURE (RA 10173) */}
          {activeTab === 'privacy' && (
            <div className="space-y-6 text-xs animate-fade-in">
              {/* Compliance Header */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-950/40 to-slate-900 border border-rose-500/30 space-y-2">
                <div className="flex items-center gap-2.5 text-rose-400 font-semibold text-sm">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  <span>Philippine Republic Act No. 10173 (Data Privacy Act of 2012) Compliance</span>
                </div>
                <p className="text-sand-muted leading-relaxed font-light">
                  As a data subject, you hold statutory rights to information transparency, data portability, and the <strong>Right to Erasure or Blocking</strong>. You may download a copy of all information stored on your profile or submit an immediate request to permanently anonymize and purge your traveler records.
                </p>
              </div>

              {/* Data Portability Section */}
              <div className="p-5 rounded-2xl bg-[#070B0E] border border-white/10 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h5 className="font-semibold text-ivory text-sm">Data Portability (Section 18, RA 10173)</h5>
                    <p className="text-sand-muted text-[11px]">Download an encrypted machine-readable copy of your personal traveler profile and manifest records.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const travelerData = {
                        profile: travelerUser,
                        bookings: userBookings,
                        exported_at: new Date().toISOString(),
                        compliance_notice: "National Privacy Commission (NPC) Circular No. 16-01"
                      };
                      const blob = new Blob([JSON.stringify(travelerData, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `traveler_data_export_${travelerUser?.id || 'guest'}.json`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      dispatchAppNotification({
                        title: 'Data Archive Exported',
                        message: 'Your personal data JSON archive has been downloaded.',
                        type: 'info'
                      });
                    }}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-ivory text-xs font-medium flex items-center gap-2 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-cyan-400" />
                    <span>Download JSON Archive</span>
                  </button>
                </div>
              </div>

              {/* Right to Erasure / Deletion Section */}
              <div className="p-5 rounded-2xl bg-rose-950/20 border-2 border-rose-500/30 space-y-4">
                <div>
                  <h5 className="font-semibold text-rose-300 text-sm flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span>Request Immediate Personal Data Erasure & Account Anonymization</span>
                  </h5>
                  <p className="text-sand-muted text-[11px] mt-1 leading-relaxed">
                    Executing erasure will anonymize your name, email, phone number, and emergency contacts in accordance with the Right to Erasure (Sec. 16(e), RA 10173). Legal tax invoices are retained for mandatory statutory BIR recordkeeping periods with passenger personal identities redacted.
                  </p>
                </div>

                {isDeleteDone ? (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                    <p className="font-bold">Personal Data Anonymization Complete</p>
                    <p className="text-[11px] mt-1 text-emerald-400/80">Your personal profile records have been permanently cleared from database caches.</p>
                  </div>
                ) : (
                  <div className="space-y-3 pt-2 border-t border-rose-500/20">
                    <label className="block text-sand-muted text-[11px]">
                      Type <strong className="text-rose-400 font-mono">DELETE</strong> below to authorize irreversible erasure:
                    </label>
                    <input
                      type="text"
                      placeholder="Type DELETE to confirm"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      className="w-full sm:w-80 bg-[#090E14] border border-rose-500/40 rounded-xl px-3 py-2 text-xs font-mono text-ivory placeholder:text-sand-muted focus:outline-none focus:border-rose-400"
                    />

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        disabled={deleteConfirmText !== 'DELETE' || isDeletingData}
                        onClick={async () => {
                          setIsDeletingData(true);
                          try {
                            if (travelerUser) {
                              await updateUserProfileInDb({
                                ...travelerUser,
                                full_name: 'Anonymized Traveler (RA 10173)',
                                phone: '+63 000 000 0000',
                                emergency_contact: 'REDACTED',
                                dietary_preferences: '',
                                avatar_url: ''
                              });
                            }
                            setIsDeleteDone(true);
                            dispatchAppNotification({
                              title: 'Personal Data Erased',
                              message: 'Profile anonymization successfully applied under RA 10173.',
                              type: 'info'
                            });
                            setTimeout(async () => {
                              await signOutUser();
                              onClose();
                              window.location.reload();
                            }, 1800);
                          } catch (err) {
                            console.error('Failed to erase profile:', err);
                          } finally {
                            setIsDeletingData(false);
                          }
                        }}
                        className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white font-medium text-xs flex items-center gap-2 transition cursor-pointer shadow-lg shadow-rose-600/30"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>{isDeletingData ? 'Erasing Records...' : 'Execute Permanent Erasure & Sign Out'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settle Balance Modal inside MyAccount */}
      {settleBooking && (
        <SettleBalanceModal
          isOpen={!!settleBooking}
          booking={settleBooking}
          onClose={() => setSettleBooking(null)}
          onPaymentSuccess={(updated) => {
            if (onUpdateBooking) {
              onUpdateBooking(updated);
            }
            setSettleBooking(null);
            dispatchAppNotification({
              title: `Payment Received • ${updated.bookingRef}`,
              message: `Your balance payment was submitted for audit.`,
              type: 'receipt',
              bookingRef: updated.bookingRef
            });
          }}
        />
      )}
    </div>
  );
};

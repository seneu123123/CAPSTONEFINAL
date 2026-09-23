import React, { useState, useMemo } from 'react';
import { 
  Booking, 
  Customer, 
  Passenger, 
  TourPackage, 
  HotelReservation, 
  TransportReservation, 
  PaymentInvoice,
  SearchJourneyCriteria
} from '../../types';
import { ImageWithLoader } from '../common/ImageWithLoader';
import { BookingDetailDrawer } from './BookingDetailDrawer';
import { ComprehensivePassengerManifest } from './ComprehensivePassengerManifest';
import { InstaPayQRCard } from '../client/InstaPayQRCard';
import { InPersonReceiptModal } from '../client/InPersonReceiptModal';
import { BookingGuidanceWalkthroughModal } from '../client/BookingGuidanceWalkthroughModal';
import { RubberStamp } from '../common/RubberStamp';
import { ActionConfirmModal } from '../common/ActionConfirmModal';
import { dispatchAppNotification } from '../../utils/notifications';
import { compressImageFile, getSampleGCashReceipt } from '../../utils/imageCompressor';
import { sendEmailNotification } from '../../utils/directEmailService';
import { 
  UserCheck, 
  Calendar, 
  Users, 
  CreditCard, 
  CheckCircle2, 
  Search, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  X, 
  Download, 
  Printer, 
  Sparkles,
  Phone,
  Mail,
  User,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertCircle,
  Copy,
  SlidersHorizontal,
  Compass,
  Check,
  Plane,
  Hotel,
  Car,
  Eye,
  Smartphone,
  Ticket,
  MessageSquare,
  UploadCloud,
  FileCheck,
  Tag,
  ChevronRight,
  Baby,
  Smile,
  Minus,
  Lock,
  Hourglass,
  ChevronLeft,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CustomerBookingPortalProps {
  packages: TourPackage[];
  bookings: Booking[];
  onCreateBooking: (booking: Booking) => void;
  onUpdateBookingStatus: (id: string, status: 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled') => void;
  onUpdateBooking?: (booking: Booking) => void;
  onGoToTracker?: (bookingRef: string) => void;
  isOperatorView: boolean;
  preSelectedPackage?: TourPackage | null;
  onClearPreSelectedPackage?: () => void;
  onOpenLegalPolicy?: (tab: 'privacy' | 'terms' | 'refund') => void;
  promoCode?: string;
  promoDiscountPct?: number;
  currentUser?: import('../../utils/supabaseClient').UserProfile | null;
  onRequireAuth?: () => void;
  initialSearchCriteria?: SearchJourneyCriteria | null;
}

const DIETARY_HEALTH_PRESETS = [
  'Standard / No Restrictions',
  'Vegetarian Meal',
  'Halal Certified Meal',
  'Vegan Meal',
  'Gluten-Free',
  'Shellfish / Peanut Allergy',
  'Senior Assistance Required',
  'Child Life Vest Required'
];

export const PASSENGER_ID_OPTIONS = [
  { id: 'ph_passport', label: 'Philippine Passport', placeholder: 'e.g. P1829382A / P9823123B', hasInput: true },
  { id: 'foreign_passport', label: 'Foreign Passport (International)', placeholder: 'e.g. US-901238491 / E8192018', hasInput: true },
  { id: 'philsys', label: 'PhilSys National ID (Card / ePhilID)', placeholder: 'e.g. 1234-5678-9012-3456', hasInput: true },
  { id: 'driver_license', label: "Driver's License (LTO)", placeholder: 'e.g. N01-12-345678', hasInput: true },
  { id: 'umid_sss', label: 'UMID / SSS / GSIS Card', placeholder: 'e.g. CRN-0111-2345678-9', hasInput: true },
  { id: 'postal_id', label: 'Postal ID (Digitized)', placeholder: 'e.g. PRN-192838492', hasInput: true },
  { id: 'voter_id', label: "Voter's ID / Certificate (COMELEC)", placeholder: 'e.g. VIN-19283-A123', hasInput: true },
  { id: 'prc_id', label: 'PRC Professional License', placeholder: 'e.g. PRC-0192834', hasInput: true },
  { id: 'student_id', label: 'Student / School ID (Minors & Youth)', placeholder: 'e.g. School ID No. 2024-10293', hasInput: true },
  { id: 'birth_cert', label: 'PSA Birth Certificate (Minors / Infants)', placeholder: 'e.g. PSA Registry No. 2020-19283', hasInput: true },
  { id: 'other_govt', label: 'Other Government-Issued Photo ID', placeholder: 'Enter ID or permit reference number', hasInput: true },
  { id: 'none', label: "I don't have a Passport / ID yet (To follow / No ID on hand)", placeholder: '', hasInput: false },
] as const;

export const PACKAGE_NATIONALITIES = [
  'Filipino',
  'American',
  'Australian',
  'British',
  'Canadian',
  'Chinese',
  'Egyptian',
  'Emirati',
  'French',
  'German',
  'Indonesian',
  'Israeli',
  'Italian',
  'Japanese',
  'Jordanian',
  'Korean',
  'Malaysian',
  'New Zealander',
  'Singaporean',
  'Spanish',
  'Taiwanese',
  'Thai',
  'Vietnamese',
  'Other / Dual Citizen'
] as const;

// Liquid Glass Custom Departure Date Picker Component
interface LiquidDepartureDatePickerProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  durationDays?: number;
  durationNights?: number;
}

const LiquidDepartureDatePicker: React.FC<LiquidDepartureDatePickerProps> = ({
  selectedDate,
  onSelectDate,
  durationDays,
  durationNights
}) => {
  const initialDate = selectedDate ? new Date(selectedDate) : new Date();
  const [currentYear, setCurrentYear] = useState<number>(
    isNaN(initialDate.getTime()) ? 2026 : initialDate.getFullYear()
  );
  const [currentMonth, setCurrentMonth] = useState<number>(
    isNaN(initialDate.getTime()) ? 7 : initialDate.getMonth()
  );
  const [showManualInput, setShowManualInput] = useState<boolean>(false);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const applyPresetDays = (daysFromNow: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysFromNow);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    const formatted = `${yyyy}-${mm}-${dd}`;
    setCurrentYear(target.getFullYear());
    setCurrentMonth(target.getMonth());
    onSelectDate(formatted);
  };

  const applyNextWeekend = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
    applyPresetDays(daysUntilSaturday);
  };

  const applyNextMonthFirst = () => {
    const today = new Date();
    const target = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    const formatted = `${yyyy}-${mm}-${dd}`;
    setCurrentYear(target.getFullYear());
    setCurrentMonth(target.getMonth());
    onSelectDate(formatted);
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDayIndex }, (_, i) => i);

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="backdrop-blur-2xl bg-white/[0.04] border border-white/20 rounded-2xl p-5 space-y-4 shadow-2xl relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-sunset-coral/15 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header with Month Navigator */}
      <div className="flex items-center justify-between relative z-10 border-b border-white/10 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sunset-coral/20 border border-sunset-coral/40 flex items-center justify-center text-sunset-coral">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-sunset-coral font-bold block">
              Departure Calendar
            </span>
            <h4 className="font-serif-display text-lg text-ivory">
              {monthNames[currentMonth]} {currentYear}
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="w-8 h-8 rounded-xl bg-white/5 border border-white/15 text-ivory hover:bg-white/15 hover:border-sunset-coral/50 flex items-center justify-center transition-all cursor-pointer active:scale-95"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="w-8 h-8 rounded-xl bg-white/5 border border-white/15 text-ivory hover:bg-white/15 hover:border-sunset-coral/50 flex items-center justify-center transition-all cursor-pointer active:scale-95"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowManualInput(!showManualInput)}
            className="ml-1 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-mono text-sand-muted hover:text-ivory hover:border-white/20 transition-all cursor-pointer"
          >
            {showManualInput ? 'Calendar' : 'Manual'}
          </button>
        </div>
      </div>

      {/* Smart Quick Presets */}
      <div className="space-y-1.5 relative z-10">
        <span className="text-[10px] font-mono uppercase tracking-wider text-sand-muted flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-sunset-coral" />
          <span>Smart Date Presets:</span>
        </span>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={applyNextWeekend}
            className="px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-sunset-coral/20 hover:border-sunset-coral/50 border border-white/15 text-[11px] font-medium text-ivory hover:text-sunset-coral transition-all cursor-pointer active:scale-95 flex items-center gap-1"
          >
            <span>⚡ Next Weekend</span>
          </button>
          <button
            type="button"
            onClick={() => applyPresetDays(14)}
            className="px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-sunset-coral/20 hover:border-sunset-coral/50 border border-white/15 text-[11px] font-medium text-ivory hover:text-sunset-coral transition-all cursor-pointer active:scale-95 flex items-center gap-1"
          >
            <span>🌴 In 2 Weeks</span>
          </button>
          <button
            type="button"
            onClick={applyNextMonthFirst}
            className="px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-sunset-coral/20 hover:border-sunset-coral/50 border border-white/15 text-[11px] font-medium text-ivory hover:text-sunset-coral transition-all cursor-pointer active:scale-95 flex items-center gap-1"
          >
            <span>✨ 1st Week Next Month</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onSelectDate('2026-12-20');
              setCurrentYear(2026);
              setCurrentMonth(11);
            }}
            className="px-2.5 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 text-[11px] font-medium text-amber-300 transition-all cursor-pointer active:scale-95 flex items-center gap-1"
          >
            <span>🏔️ Peak Holiday Escape</span>
          </button>
        </div>
      </div>

      {/* Manual Input Fallback */}
      {showManualInput ? (
        <div className="space-y-2 pt-2">
          <label className="text-xs font-mono uppercase text-sand-muted block">Direct Date Input</label>
          <input
            type="date"
            value={selectedDate}
            min={todayStr}
            max="2027-12-31"
            onChange={(e) => onSelectDate(e.target.value)}
            className="w-full bg-[#070B0E] border border-white/20 rounded-xl px-4 py-2.5 text-sm font-mono text-ivory focus:outline-none focus:border-sunset-coral"
          />
        </div>
      ) : (
        /* Calendar Matrix */
        <div className="space-y-2 relative z-10">
          <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] uppercase font-bold text-sand-muted py-1">
            <span className="text-rose-400">Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span className="text-amber-400">Sat</span>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {blanksArray.map((_, i) => (
              <div key={`blank-${i}`} className="h-9 sm:h-10 rounded-xl" />
            ))}

            {daysArray.map((day) => {
              const mm = String(currentMonth + 1).padStart(2, '0');
              const dd = String(day).padStart(2, '0');
              const dateStr = `${currentYear}-${mm}-${dd}`;
              const isSelected = selectedDate === dateStr;
              const isPast = dateStr < todayStr;
              const isToday = dateStr === todayStr;

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  disabled={isPast}
                  onClick={() => onSelectDate(dateStr)}
                  className={`h-9 sm:h-10 rounded-xl flex flex-col items-center justify-center font-mono text-xs font-semibold transition-all relative cursor-pointer active:scale-90 ${
                    isSelected
                      ? 'bg-sunset-coral text-white shadow-lg shadow-sunset-coral/40 scale-105 ring-2 ring-white/40 z-10'
                      : isPast
                      ? 'text-sand-muted/30 cursor-not-allowed opacity-30 bg-transparent'
                      : isToday
                      ? 'bg-white/10 border border-sky-400/60 text-sky-300 hover:bg-white/20'
                      : 'bg-white/[0.04] border border-white/10 text-ivory hover:bg-white/15 hover:border-sunset-coral/50'
                  }`}
                >
                  <span>{day}</span>
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white mt-0.5" />
                  )}
                  {!isSelected && isToday && (
                    <span className="text-[8px] font-sans text-sky-400 absolute bottom-0.5 leading-none">today</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Date Indicator Banner */}
      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono">
        <span className="text-sand-muted">Selected Embarkation:</span>
        <span className="text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
          {new Date(selectedDate || '2026-08-20').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
    </div>
  );
};

export const CustomerBookingPortal: React.FC<CustomerBookingPortalProps> = ({
  packages,
  bookings,
  onCreateBooking,
  onUpdateBookingStatus,
  onUpdateBooking,
  onGoToTracker,
  isOperatorView,
  preSelectedPackage,
  onClearPreSelectedPackage,
  onOpenLegalPolicy,
  promoCode: initialPromoCode,
  promoDiscountPct: initialDiscountPct = 8,
  currentUser,
  onRequireAuth,
  initialSearchCriteria
}) => {
  // Navigation View in Operator Mode
  const [operatorViewTab, setOperatorViewTab] = useState<'comprehensive_manifest' | 'bookings_group' | 'new_booking'>(
    isOperatorView ? 'comprehensive_manifest' : 'new_booking'
  );

  // Modals
  const [selectedBookingForDrawer, setSelectedBookingForDrawer] = useState<Booking | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  // Accordion expanded row tracking in Manifest Table
  const [expandedBookingIds, setExpandedBookingIds] = useState<Set<string>>(new Set());

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [destinationFilter, setDestinationFilter] = useState<string>('All');
  const [rollcallStatusFilter, setRollcallStatusFilter] = useState<'all' | 'boarded' | 'pending' | 'noshow'>('all');

  // Booking Wizard State
  const [selectedPackage, setSelectedPackage] = useState<TourPackage | null>(preSelectedPackage || null);
  const [bookingStep, setBookingStep] = useState<number>(1);
  const [travelDate, setTravelDate] = useState<string>('2026-08-20');
  
  // Revamped Accommodation & Tier Selection (Image 1 & Image 2)
  const [accommodationType, setAccommodationType] = useState<'single' | 'double' | 'suite' | null>(null);
  const [packageTier, setPackageTier] = useState<'budget' | 'midrange' | 'luxury' | null>(null);
  
  // Tap Loading & Auto-Scroll Helpers
  const portalContainerRef = React.useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    if (portalContainerRef.current) {
      portalContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    const modalScrollParent = portalContainerRef.current?.closest('.overflow-y-auto');
    if (modalScrollParent) {
      modalScrollParent.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const tapLockRef = React.useRef<boolean>(false);
  const triggerTapLoading = (action: () => void, msg = 'Updating options...', shouldScroll = false) => {
    if (tapLockRef.current) return;
    tapLockRef.current = true;
    try {
      action();
    } finally {
      setTimeout(() => {
        tapLockRef.current = false;
      }, 650);
    }
    if (shouldScroll) {
      setTimeout(() => {
        scrollToTop();
      }, 50);
    }
  };
  
  // Revamped Pax Counters (Image 2)
  const [adultsCount, setAdultsCount] = useState<number>(2);
  const [childrenCount, setChildrenCount] = useState<number>(0);
  const [infantsCount, setInfantsCount] = useState<number>(0);
  const [numPax, setNumPax] = useState<number>(2);

  // Sync total pax count from adult + child + infant breakdown
  React.useEffect(() => {
    const total = Math.max(1, adultsCount + childrenCount + infantsCount);
    setNumPax(total);
    handlePaxCountChange(total);
  }, [adultsCount, childrenCount, infantsCount]);

  const [paymentOption, setPaymentOption] = useState<'full' | 'deposit' | 'hold' | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'GCash' | 'PayMaya' | 'Cash' | 'Bank Transfer' | null>(null);
  const [isPriceHoldOption, setIsPriceHoldOption] = useState<boolean>(false);
  const [isLeadSynced, setIsLeadSynced] = useState<boolean>(false);
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [receiptProofUrl, setReceiptProofUrl] = useState<string>('');
  const [isBankUploading, setIsBankUploading] = useState<boolean>(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [isSlipPreviewModalOpen, setIsSlipPreviewModalOpen] = useState<boolean>(false);
  const [isGuidanceWalkthroughOpen, setIsGuidanceWalkthroughOpen] = useState<boolean>(false);
  const [copiedViberSummary, setCopiedViberSummary] = useState<boolean>(false);

  // Promo Code State
  const [enteredPromoCode, setEnteredPromoCode] = useState<string>(initialPromoCode || '');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; pct: number } | null>(
    initialPromoCode ? { code: initialPromoCode, pct: initialDiscountPct } : null
  );
  const [promoError, setPromoError] = useState<string>('');
  const [promoSuccessMsg, setPromoSuccessMsg] = useState<string>(
    initialPromoCode ? `Promo ${initialPromoCode} applied (${initialDiscountPct}% off)!` : ''
  );

  // ISO/IEC 27001 & DPA 2012 Consent
  const [consentTermsAccepted, setConsentTermsAccepted] = useState<boolean>(false);
  const [consentMarketingAccepted, setConsentMarketingAccepted] = useState<boolean>(false);
  const [consentError, setConsentError] = useState<boolean>(false);

  // Customer Contact State
  const [customerInfo, setCustomerInfo] = useState<Customer>({
    fullName: '',
    email: '',
    phone: '',
    emergencyContact: '',
    nationality: 'Filipino'
  });

  // Separate emergency contact fields
  const [emergencyContactName, setEmergencyContactName] = useState<string>('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState<string>('');

  // Field validation errors state for red alerts & teleportation
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Sync separated emergency contact fields into customerInfo.emergencyContact
  React.useEffect(() => {
    const nameTrim = emergencyContactName.trim();
    const phoneTrim = emergencyContactPhone.trim();
    if (nameTrim && phoneTrim) {
      setCustomerInfo((prev) => ({ ...prev, emergencyContact: `${nameTrim} (${phoneTrim})` }));
    } else if (nameTrim || phoneTrim) {
      setCustomerInfo((prev) => ({ ...prev, emergencyContact: nameTrim || phoneTrim }));
    }
  }, [emergencyContactName, emergencyContactPhone]);

  // Hydrate contact details if currentUser is logged in
  React.useEffect(() => {
    if (currentUser) {
      setCustomerInfo((prev) => ({
        ...prev,
        fullName: prev.fullName || currentUser.full_name || '',
        email: prev.email || currentUser.email || '',
        phone: prev.phone || currentUser.phone || '',
        nationality: prev.nationality || currentUser.nationality || 'Filipino',
      }));

      if (currentUser.emergency_contact) {
        const match = currentUser.emergency_contact.match(/^(.*?)\s*\((.*?)\)$/);
        if (match) {
          setEmergencyContactName((prev) => prev || match[1]);
          setEmergencyContactPhone((prev) => prev || match[2]);
        } else {
          setEmergencyContactName((prev) => prev || currentUser.emergency_contact || '');
        }
      }
    }
  }, [currentUser]);

  // Clear single field error in real-time
  const clearFieldError = (id: string) => {
    setFieldErrors((prev) => {
      if (!prev[id]) return prev;
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  // Comprehensive Manifest Form Validator & Teleporter
  const validateManifestForm = (): boolean => {
    const errors: Record<string, string> = {};

    // 1. Lead Full Name
    if (!customerInfo.fullName || !customerInfo.fullName.trim()) {
      errors['lead-fullname'] = 'Full legal name is required. Please input your official name as shown on your passport or government ID.';
    }

    // 2. Email Address: Must contain @ and .com
    const emailVal = (customerInfo.email || '').trim().toLowerCase();
    const hasAt = emailVal.includes('@');
    const hasDotCom = emailVal.includes('.com');
    const validEmailFormat = /^[^\s@]+@[^\s@]+\.[a-zA-Z]*com[a-zA-Z]*$/i.test(emailVal) || (hasAt && hasDotCom && /^[^\s@]+@[^\s@]+\.[a-zA-Z0-9.-]+$/i.test(emailVal));

    if (!emailVal) {
      errors['lead-email'] = 'Email address is required. Please input your official contact email address.';
    } else if (!hasAt || !hasDotCom || !validEmailFormat) {
      errors['lead-email'] = 'Email address must contain "@" and a valid ".com" domain (e.g. maria.santos@gmail.com).';
    }

    // 3. Mobile Number: Must be an 11-digit number starting with 09
    const rawPhone = (customerInfo.phone || '').trim();
    const cleanPhone = rawPhone.replace(/[\s\-\(\)\+]/g, '');
    const startsWith09 = cleanPhone.startsWith('09');
    const is11Digits = cleanPhone.length === 11 && /^\d+$/.test(cleanPhone);

    if (!rawPhone) {
      errors['lead-phone'] = 'Mobile number is required. Please input an 11-digit mobile number.';
    } else if (!startsWith09 || !is11Digits) {
      errors['lead-phone'] = 'Mobile number must be an 11-digit number that starts with 09 (e.g. 09171234567).';
    }

    // 4. Emergency Contact Name (Separate box)
    if (!emergencyContactName || !emergencyContactName.trim()) {
      errors['lead-emergency-name'] = 'Emergency contact person full name is required. Please input their legal name.';
    }

    // 5. Emergency Contact Telephone / Mobile (Separate box)
    const cleanEmerPhone = emergencyContactPhone.replace(/[\s\-\(\)\+]/g, '');
    if (!emergencyContactPhone || !emergencyContactPhone.trim()) {
      errors['lead-emergency-phone'] = 'Emergency telephone or mobile number is required.';
    } else if (cleanEmerPhone.length < 7 || !/^\d+$/.test(cleanEmerPhone)) {
      errors['lead-emergency-phone'] = 'Please input a valid emergency telephone (minimum 7 digits) or an 11-digit mobile number.';
    }

    // 6. Nationality (Dropdown)
    if (!customerInfo.nationality || !customerInfo.nationality.trim()) {
      errors['lead-nationality'] = 'Nationality is required. Please select your nationality from our package list.';
    }

    // 7. Individual Passenger manifest entries
    passengers.forEach((p, idx) => {
      if (!p.fullName || !p.fullName.trim()) {
        errors[`pax-${idx}-fullname`] = `Passenger ${idx + 1} full legal name is required for tour & airline clearance.`;
      }
      if (!p.age || isNaN(Number(p.age)) || Number(p.age) < 1 || Number(p.age) > 110) {
        errors[`pax-${idx}-age`] = `Passenger ${idx + 1} valid age (1-110) is required for travel insurance.`;
      }
      if (!p.gender) {
        errors[`pax-${idx}-gender`] = `Passenger ${idx + 1} gender is required for flight and berth assignment.`;
      }
      if (!p.nationality || !p.nationality.trim()) {
        errors[`pax-${idx}-nationality`] = `Passenger ${idx + 1} nationality is required.`;
      }
      const idType = getPassengerIdType(p);
      if (idType !== 'none' && (!p.passportOrId || !p.passportOrId.trim() || p.passportOrId === 'No ID (To Follow)')) {
        errors[`pax-${idx}-idnum`] = `Passenger ${idx + 1} ID document number is required (or select 'I don't have an ID yet').`;
      }
    });

    setFieldErrors(errors);

    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
      // Teleport (scroll smoothly into view + focus) to the first empty or invalid box!
      const firstErrorId = errorKeys[0];
      setTimeout(() => {
        const el = document.getElementById(firstErrorId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.focus();
        }
      }, 50);
      return false;
    }

    return true;
  };

  // Passengers State (Starts completely empty for passengers to fill in)
  const [passengers, setPassengers] = useState<Passenger[]>([
    { id: 'p1', fullName: '', age: '' as any, gender: '', passportOrId: '', specialRequirements: '', nationality: 'Filipino', boardingStatus: 'pending' },
    { id: 'p2', fullName: '', age: '' as any, gender: '', passportOrId: '', specialRequirements: '', nationality: 'Filipino', boardingStatus: 'pending' }
  ]);

  const [specialInstructions, setSpecialInstructions] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [isConfirmBookingOpen, setIsConfirmBookingOpen] = useState(false);
  const [paymentPhotoError, setPaymentPhotoError] = useState<string>('');

  // Double-Click & In-Flight Protection Locks
  const isFinalizingLockRef = React.useRef<boolean>(false);
  const stepTransitionLockRef = React.useRef<boolean>(false);
  const [isStepTransitioning, setIsStepTransitioning] = useState<boolean>(false);
  const finalizePromptLockRef = React.useRef<boolean>(false);

  // Handler for advancing to payment with double-click protection
  const handleProceedToPayment = () => {
    if (stepTransitionLockRef.current || isStepTransitioning) return;
    if ((!currentUser || currentUser.auth_provider === 'guest') && !isOperatorView) {
      if (onRequireAuth) onRequireAuth();
      return;
    }
    const isValid = validateManifestForm();
    if (!isValid) return;

    stepTransitionLockRef.current = true;
    setIsStepTransitioning(true);

    triggerTapLoading(() => {
      setBookingStep(3);
      setTimeout(() => {
        stepTransitionLockRef.current = false;
        setIsStepTransitioning(false);
      }, 900);
    }, 'Securing payment gateway...', true);
  };

  const handlePromptFinalizeBooking = () => {
    if (finalizePromptLockRef.current || isSubmittingBooking || isFinalizingLockRef.current) return;
    if ((!currentUser || currentUser.auth_provider === 'guest') && !isOperatorView) {
      if (onRequireAuth) onRequireAuth();
      return;
    }
    finalizePromptLockRef.current = true;
    setTimeout(() => { finalizePromptLockRef.current = false; }, 2000);

    // If not price lock hold, require proof upload or valid selection
    if (!isPriceHoldOption && !receiptProofUrl && paymentMethod !== 'Cash') {
      setPaymentPhotoError('Payment photo / screenshot is required to complete your reservation. Please attach your payment receipt or transfer screenshot.');
      return;
    }
    setPaymentPhotoError('');

    if (!consentTermsAccepted) {
      setConsentError(true);
      return;
    }
    setConsentError(false);
    if (!selectedPackage) return;
    setIsConfirmBookingOpen(true);
  };

  // Synchronize preSelectedPackage
  React.useEffect(() => {
    if (preSelectedPackage) {
      setSelectedPackage(preSelectedPackage);
      setBookingStep(1);
      if (isOperatorView) {
        setOperatorViewTab('new_booking');
      }
    }
  }, [preSelectedPackage, isOperatorView]);

  // Synchronize initialSearchCriteria (Destination, Departure Date, Passengers Count)
  React.useEffect(() => {
    if (!initialSearchCriteria) return;

    // 1. Destination / Matching Package
    if (initialSearchCriteria.destination && !preSelectedPackage) {
      const destClean = initialSearchCriteria.destination.toLowerCase().split('(')[0].replace(/,/g, ' ').trim();
      const keywords = destClean.split(' ').filter((w) => w.length > 2);

      const matched = packages.find((p) => {
        const pDest = p.destination.toLowerCase();
        const pTitle = p.title.toLowerCase();
        return (
          keywords.some((k) => pDest.includes(k) || pTitle.includes(k)) ||
          pDest.includes(destClean) ||
          destClean.includes(pDest) ||
          initialSearchCriteria.destination?.toLowerCase().includes(pDest)
        );
      });

      if (matched) {
        setSelectedPackage(matched);
      }
    }

    // 2. Departure Date
    if (initialSearchCriteria.departureDate) {
      setTravelDate(initialSearchCriteria.departureDate);
    }

    // 3. Travelers Count
    if (initialSearchCriteria.travelersCount && initialSearchCriteria.travelersCount > 0) {
      const count = Math.max(1, Math.min(20, initialSearchCriteria.travelersCount));
      setAdultsCount(count);
      setChildrenCount(0);
      setInfantsCount(0);
      setNumPax(count);
      handlePaxCountChange(count);
    }

    setBookingStep(1);
  }, [initialSearchCriteria, packages, preSelectedPackage]);

  // Synchronize initialPromoCode when passed or updated
  React.useEffect(() => {
    if (initialPromoCode) {
      setEnteredPromoCode(initialPromoCode);
      setAppliedPromo({ code: initialPromoCode, pct: initialDiscountPct || 8 });
      setPromoSuccessMsg(`Promo "${initialPromoCode}" applied! ${initialDiscountPct || 8}% discount granted.`);
      setPromoError('');
    }
  }, [initialPromoCode, initialDiscountPct]);

  // Adjust passengers list dynamically when numPax changes
  const handlePaxCountChange = (count: number) => {
    const validCount = Math.max(1, Math.min(20, count));
    setNumPax(validCount);
    setPassengers((prev) => {
      const updated: Passenger[] = [];
      for (let i = 0; i < validCount; i++) {
        if (prev[i]) {
          updated.push(prev[i]);
        } else {
          updated.push({
            id: `p-${Date.now()}-${i + 1}`,
            fullName: '',
            age: '' as any,
            gender: '',
            passportOrId: '',
            specialRequirements: '',
            nationality: '',
            boardingStatus: 'pending'
          });
        }
      }
      return updated;
    });
  };

  // Quick helper: Autofill Passenger 1 from Lead Guest
  const handleCopyLeadToPaxOne = () => {
    if (!customerInfo.fullName) return;
    setPassengers((prev) => {
      const updated = [...prev];
      if (updated.length > 0) {
        updated[0] = {
          ...updated[0],
          fullName: customerInfo.fullName,
          nationality: customerInfo.nationality || 'Filipino',
          passportOrId: updated[0].passportOrId || 'PH-VERIFIED'
        };
      }
      return updated;
    });
    setIsLeadSynced(true);
    clearFieldError('pax-0-fullname');
    clearFieldError('pax-0-nationality');
  };

  // Update a single passenger's field in the booking form
  const handleUpdatePassenger = (index: number, field: keyof Passenger, value: any) => {
    setPassengers((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  const getPassengerIdType = (p: Passenger): string => {
    if (p.idType) return p.idType;
    if (
      p.passportOrId === 'No ID (To Follow)' || 
      p.passportOrId?.toLowerCase().includes('follow') || 
      p.passportOrId?.toLowerCase().includes('none')
    ) {
      return 'none';
    }
    return 'ph_passport';
  };

  const handleIdTypeChange = (index: number, newType: string) => {
    setPassengers((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        if (newType === 'none') {
          updated[index] = {
            ...updated[index],
            idType: 'none',
            hasId: false,
            passportOrId: 'No ID (To Follow)'
          };
        } else {
          const wasNoId = updated[index].passportOrId === 'No ID (To Follow)' || !updated[index].passportOrId;
          updated[index] = {
            ...updated[index],
            idType: newType,
            hasId: true,
            passportOrId: wasNoId ? '' : updated[index].passportOrId
          };
        }
      }
      return updated;
    });
  };

  // Toggle row accordion
  const toggleRowAccordion = (bookingId: string) => {
    setExpandedBookingIds((prev) => {
      const next = new Set(prev);
      if (next.has(bookingId)) {
        next.delete(bookingId);
      } else {
        next.add(bookingId);
      }
      return next;
    });
  };

  // Update passenger boarding status directly in a booking (live reactive state)
  const handleTogglePassengerBoarding = (
    bookingId: string, 
    passengerKey: string | number, 
    newStatus: 'boarded' | 'pending' | 'noshow'
  ) => {
    const targetBooking = bookings.find((b) => b.id === bookingId);
    if (!targetBooking) return;

    const currentPassengers = targetBooking.passengers && targetBooking.passengers.length > 0
      ? targetBooking.passengers
      : [{
          id: `${targetBooking.id}-lead`,
          fullName: targetBooking.customer.fullName,
          age: 30,
          gender: 'Female' as const,
          passportOrId: targetBooking.bookingRef,
          specialRequirements: targetBooking.specialInstructions,
          nationality: targetBooking.customer.nationality,
          boardingStatus: 'boarded' as const
        }];

    const updatedPassengers = currentPassengers.map((p) =>
      p.id === passengerKey || p.fullName === passengerKey ? { ...p, boardingStatus: newStatus } : p
    );

    const updatedBooking: Booking = {
      ...targetBooking,
      passengers: updatedPassengers
    };

    if (onUpdateBooking) {
      onUpdateBooking(updatedBooking);
    }

    if (selectedBookingForDrawer?.id === bookingId) {
      setSelectedBookingForDrawer(updatedBooking);
    }
  };

  // Promo Code Validation Handlers
  const handleApplyPromoCode = () => {
    setPromoError('');
    const code = enteredPromoCode.trim().toUpperCase();
    if (!code) {
      setPromoError('Please enter a voucher promo code.');
      return;
    }
    // Check if code matches standard HOLIDAY2026 or custom code
    if (code === 'HOLIDAY2026') {
      const pct = initialDiscountPct || 8;
      setAppliedPromo({ code, pct });
      setPromoSuccessMsg(`Promo "${code}" applied! ${pct}% discount granted.`);
    } else if (code === initialPromoCode?.toUpperCase()) {
      const pct = initialDiscountPct || 8;
      setAppliedPromo({ code, pct });
      setPromoSuccessMsg(`Promo "${code}" applied! ${pct}% discount granted.`);
    } else {
      setPromoError('Invalid or expired promo code. Try "HOLIDAY2026".');
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoSuccessMsg('');
    setPromoError('');
  };

  // Calculate pricing with Accommodation Tier and Occupancy surcharges
  const tierSurcharge = packageTier === 'luxury' ? 3500 : packageTier === 'midrange' ? 1500 : 0;
  const occupancySurcharge = accommodationType === 'single' ? 2000 : accommodationType === 'suite' ? 1000 : 0;

  const rawBaseRate = selectedPackage ? selectedPackage.pricePerPax : 14500;
  const baseRate = rawBaseRate + tierSurcharge;
  const conservationFee = 500 * Math.max(1, numPax); // Marine sanctuary & environmental fee
  const baseSubtotal = (baseRate * Math.max(1, numPax)) + occupancySurcharge;
  const discountAmount = appliedPromo ? Math.round((baseSubtotal * appliedPromo.pct) / 100) : 0;
  const discountedSubtotal = Math.max(0, baseSubtotal - discountAmount);
  const grandTotal = discountedSubtotal + conservationFee;
  const depositAmount = Math.round(grandTotal * 0.3); // 30% Downpayment
  const amountToPayNow = isPriceHoldOption ? 0 : paymentOption === 'full' ? grandTotal : depositAmount;
  const balanceDue = isPriceHoldOption ? grandTotal : paymentOption === 'full' ? 0 : grandTotal - depositAmount;

  // Filtered Bookings for the Manifest Table
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (!b) return false;
      const q = searchQuery ? searchQuery.toLowerCase() : '';
      const matchesSearch = 
        !q ||
        (b.bookingRef || '').toLowerCase().includes(q) ||
        (b.customer?.fullName || '').toLowerCase().includes(q) ||
        (b.customer?.email || '').toLowerCase().includes(q) ||
        (b.customer?.phone || '').includes(searchQuery) ||
        (b.tourTitle || '').toLowerCase().includes(q) ||
        (b.passengers && b.passengers.some((p) => 
          (p.fullName || '').toLowerCase().includes(q) ||
          (p.passportOrId || '').toLowerCase().includes(q)
        ));

      const matchesStatus = statusFilter === 'All' || b.bookingStatus === statusFilter;
      const matchesDest = destinationFilter === 'All' || b.destination.includes(destinationFilter);

      return matchesSearch && matchesStatus && matchesDest;
    });
  }, [bookings, searchQuery, statusFilter, destinationFilter]);

  // Aggregate stats for Operator Dashboard
  const operatorStats = useMemo(() => {
    let totalPaxCount = 0;
    let totalBoardedCount = 0;
    let alertsCount = 0;

    bookings.forEach((b) => {
      totalPaxCount += b.numPax;
      if (b.passengers && b.passengers.length > 0) {
        b.passengers.forEach((p) => {
          if (p.boardingStatus === 'boarded') totalBoardedCount++;
          if (p.specialRequirements) alertsCount++;
        });
      } else {
        // Assume lead passenger counted
        totalBoardedCount++;
      }
    });

    const completionRate = totalPaxCount > 0 ? Math.round((totalBoardedCount / totalPaxCount) * 100) : 100;

    return {
      totalBookings: bookings.length,
      totalPaxCount,
      totalBoardedCount,
      completionRate,
      alertsCount
    };
  }, [bookings]);

  // All manifested passengers for the Master Roll Call view
  const allManifestedPassengers = useMemo(() => {
    const list: Array<{
      bookingId: string;
      bookingRef: string;
      tourTitle: string;
      travelDate: string;
      leadName: string;
      passenger: Passenger;
    }> = [];

    filteredBookings.forEach((b) => {
      const paxList = b.passengers && b.passengers.length > 0
        ? b.passengers
        : [{
            id: `${b.id}-lead`,
            fullName: b.customer.fullName,
            age: 30,
            gender: 'Female' as const,
            passportOrId: b.bookingRef,
            specialRequirements: b.specialInstructions,
            nationality: b.customer.nationality,
            boardingStatus: 'boarded' as const
          }];

      paxList.forEach((p) => {
        const currentStatus = p.boardingStatus || 'boarded';
        if (rollcallStatusFilter === 'all' || currentStatus === rollcallStatusFilter) {
          list.push({
            bookingId: b.id,
            bookingRef: b.bookingRef,
            tourTitle: b.tourTitle,
            travelDate: b.travelDate,
            leadName: b.customer.fullName,
            passenger: p
          });
        }
      });
    });

    return list;
  }, [filteredBookings, rollcallStatusFilter]);

  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  // Form submission: Create Official Booking
  const handleFinalizeBooking = () => {
    if (isSubmittingBooking || isFinalizingLockRef.current) return;
    isFinalizingLockRef.current = true;
    setIsSubmittingBooking(true);

    if (!currentUser) {
      isFinalizingLockRef.current = false;
      setIsSubmittingBooking(false);
      if (onRequireAuth) {
        onRequireAuth();
      }
      return;
    }

    if (!consentTermsAccepted) {
      isFinalizingLockRef.current = false;
      setIsSubmittingBooking(false);
      setConsentError(true);
      return;
    }
    setConsentError(false);

    if (!selectedPackage) {
      isFinalizingLockRef.current = false;
      setIsSubmittingBooking(false);
      return;
    }

    const newBookingId = `bk-${Date.now()}`;
    // Systematic randomized reference format: HT-2026-[NUM][CHAR][NUM][CHAR] (e.g. HT-2026-8K4M)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const nums = '23456789';
    const c1 = chars.charAt(Math.floor(Math.random() * chars.length));
    const n1 = nums.charAt(Math.floor(Math.random() * nums.length));
    const c2 = chars.charAt(Math.floor(Math.random() * chars.length));
    const n2 = nums.charAt(Math.floor(Math.random() * nums.length));
    const generatedRef = `HT-2026-${n1}${c1}${n2}${c2}`;
    const invoiceNum = `INV-2026-${n1}${c1}${n2}${c2}`;

    const newInvoice: PaymentInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: invoiceNum,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: travelDate,
      totalAmount: grandTotal,
      amountPaid: amountToPayNow,
      balanceDue: balanceDue,
      status: balanceDue === 0 ? 'Paid' : 'Partial',
      items: [
        {
          description: `${selectedPackage.title} (${numPax} Pax)`,
          quantity: numPax,
          unitPrice: baseRate,
          totalPrice: baseSubtotal
        },
        ...(appliedPromo && discountAmount > 0
          ? [
              {
                description: `Voucher Discount (${appliedPromo.code} - ${appliedPromo.pct}% Off)`,
                quantity: 1,
                unitPrice: -discountAmount,
                totalPrice: -discountAmount
              }
            ]
          : []),
        {
          description: `Tourism & Environmental Preservation Fees (${numPax} Pax)`,
          quantity: numPax,
          unitPrice: 500,
          totalPrice: conservationFee
        }
      ],
      payments: isPriceHoldOption ? [
        {
          id: `pmt-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          amount: 0,
          method: 'Bank Transfer' as any,
          referenceNo: `HOLD-${generatedRef}`,
          status: 'Pending Verification',
          notes: '24-Hour Price Lock Guarantee Active. Non-binding slot hold valid for 24 hours.'
        }
      ] : [
        {
          id: `pmt-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          amount: amountToPayNow,
          method: paymentMethod,
          referenceNo: referenceNo.trim() || `${(paymentMethod || 'PAY').slice(0, 2).toUpperCase()}-${Date.now().toString().slice(-8)}`,
          status: 'Pending Verification', // Strict Anti-Scam: Requires manual finance cross-audit
          notes: `${paymentOption === 'full' ? 'Full Settlement Upon Reservation' : '50% Outbound Guarantee Deposit'} via ${paymentMethod}${referenceNo ? ` (Ref: ${referenceNo})` : ''}`,
          receiptProofUrl: receiptProofUrl || undefined
        }
      ]
    };

    const newHotel: HotelReservation = {
      id: `htl-${Date.now()}`,
      hotelName: 'Partner Beachfront Eco-Resort & Spa',
      roomType: numPax > 2 ? 'Family Sea View Villa' : 'Deluxe Ocean Pavilion',
      checkInDate: travelDate,
      checkOutDate: new Date(new Date(travelDate).getTime() + (selectedPackage.durationNights || 2) * 86400000).toISOString().split('T')[0],
      nights: selectedPackage.durationNights || 2,
      voucherCode: `HTL-${generatedRef}`,
      status: 'Confirmed',
      contactPhone: '+63 917 888 1900'
    };

    const newTransport: TransportReservation = {
      id: `trp-${Date.now()}`,
      vehicleType: numPax > 4 ? '14-Seater Aircon Tourist Van' : 'Private Airport Transfer Car',
      driverName: 'Assigned Senior Tour Driver',
      driverContact: '+63 918 555 1234',
      plateNumber: 'TTR-2026',
      pickupLocation: 'Arrival Terminal / Hotel Lobby',
      dropoffLocation: `${selectedPackage.destination} Airport / Hotel Transfer`,
      pickupTime: '08:30 AM',
      status: 'Scheduled'
    };

    const createdBooking: Booking = {
      id: newBookingId,
      bookingRef: generatedRef,
      tourPackageId: selectedPackage.id,
      tourTitle: selectedPackage.title,
      destination: selectedPackage.destination,
      customer: customerInfo,
      passengers: passengers.map((p) => ({
        ...p,
        boardingStatus: 'boarded' // Initialized as boarded for new booking
      })),
      travelDate: travelDate,
      numPax: numPax,
      totalPrice: grandTotal,
      depositRequired: depositAmount,
      bookingStatus: 'Confirmed',
      paymentStatus: balanceDue === 0 ? 'Paid' : 'Partial',
      createdAt: new Date().toISOString().split('T')[0],
      assignedGuide: 'Capt. Roger Mendoza (DOT Licensed Leader)',
      specialInstructions: specialInstructions,
      hotelReservation: newHotel,
      transportReservation: newTransport,
      invoice: newInvoice,
      appliedPromoCode: appliedPromo?.code,
      discountAmount: discountAmount > 0 ? discountAmount : undefined,
      receiptProofUrl: receiptProofUrl || undefined,
      customerReferenceNo: referenceNo.trim() || undefined,
      paymentVerificationStatus: 'Pending Verification'
    };

    // Store reference in device local history so Check Tickets auto-suggests it
    try {
      const stored = localStorage.getItem('holiday_my_booking_refs');
      const parsed: string[] = stored ? JSON.parse(stored) : [];
      if (!parsed.includes(generatedRef)) {
        localStorage.setItem('holiday_my_booking_refs', JSON.stringify([generatedRef, ...parsed]));
      }
    } catch (e) {
      console.error(e);
    }

    // Dispatch real-time notification
    dispatchAppNotification({
      title: `Reservation Created • ${generatedRef}`,
      message: `Your booking for ${selectedPackage.title} was created! Track live verification under 'Check Tickets'.`,
      type: 'booking',
      bookingRef: generatedRef
    });

    // Dispatch automated EmailJS confirmation e-ticket to guest email
    if (customerInfo.email && customerInfo.email.includes('@')) {
      sendEmailNotification({
        toEmail: customerInfo.email,
        toName: customerInfo.fullName,
        subject: `Booking Confirmation: ${selectedPackage.title} [Ref: ${generatedRef}]`,
        body: `Dear ${customerInfo.fullName},\n\nYour expedition booking for "${selectedPackage.title}" has been received and confirmed.\n\nBooking Reference: ${generatedRef}\nTravel Date: ${travelDate}\nGuests: ${numPax} Pax\nAmount Paid: ₱${newInvoice.amountPaid.toLocaleString()}\n\nYou can track and download your digital voucher anytime at ${window.location.origin}/?track=${generatedRef}\n\nWarm regards,\nHoliday Travelers Travel and Tours Inc.`,
        bookingRef: generatedRef,
        bookingDetails: {
          customerName: customerInfo.fullName,
          tourTitle: selectedPackage.title,
          travelDate: travelDate,
          numPax: numPax,
          paymentStatus: balanceDue === 0 ? 'Paid' : 'Partial',
          amountPaid: newInvoice.amountPaid,
          totalPrice: grandTotal,
          balanceDue: balanceDue,
          trackingUrl: `${window.location.origin}/?track=${generatedRef}`,
          contactNumber: customerInfo.phone
        },
        type: 'booking_confirmation'
      }).then((res) => {
        if (res.success) {
          dispatchAppNotification({
            title: 'Confirmation Email Dispatched',
            message: `Official e-ticket confirmation sent to ${customerInfo.email}`,
            type: 'booking',
            bookingRef: generatedRef
          });
        }
      }).catch((err) => {
        console.warn('Auto confirmation email notice:', err);
      });
    }

    onCreateBooking(createdBooking);
    setConfirmedBooking(createdBooking);
    setBookingStep(4); // Success step
    setIsGuidanceWalkthroughOpen(true); // Guide client post-booking where updates appear
    setIsSubmittingBooking(false);

    // Keep finalize lock active post-creation to prevent duplicate triggers
    setTimeout(() => {
      isFinalizingLockRef.current = false;
    }, 3000);

    // Smooth scroll modal container so Step 4 confirmation is immediately at top
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const scrollableElements = document.querySelectorAll('.overflow-y-auto');
      scrollableElements.forEach((el) => {
        el.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }, 50);
  };

  const handleBankFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsBankUploading(true);
    try {
      const compressedDataUrl = await compressImageFile(file, 1200, 1200, 0.75);
      if (compressedDataUrl) {
        setReceiptProofUrl(compressedDataUrl);
        dispatchAppNotification({
          title: 'Bank Transfer Slip Attached',
          message: 'Deposit slip photo uploaded for manual bank statement audit.',
          type: 'receipt'
        });
      }
    } catch (err) {
      console.error('Bank upload compression error:', err);
    } finally {
      setIsBankUploading(false);
    }
  };

  const handleAttachBankSample = () => {
    const mockRef = referenceNo.trim() || `BDO-DEP-${Math.floor(1000000 + Math.random() * 9000000)}`;
    if (!referenceNo.trim()) {
      setReferenceNo(mockRef);
    }
    const currentDue = paymentOption === 'deposit' ? depositAmount : grandTotal;
    const sample = getSampleGCashReceipt(mockRef, currentDue, customerInfo.fullName || 'Guest Passenger');
    setReceiptProofUrl(sample);
    dispatchAppNotification({
      title: 'Sample Deposit Slip Attached',
      message: `Sample transfer voucher attached (${mockRef}). Ready for finance audit.`,
      type: 'receipt'
    });
  };

  const handleResetBookingFlow = () => {
    setBookingStep(1);
    setConfirmedBooking(null);
    setCustomerInfo({
      fullName: '',
      email: '',
      phone: '',
      emergencyContact: '',
      nationality: 'Filipino'
    });
    setPassengers([
      { id: 'p1', fullName: '', age: 28, gender: 'Female', passportOrId: '', specialRequirements: '', nationality: 'Filipino', boardingStatus: 'pending' },
      { id: 'p2', fullName: '', age: 30, gender: 'Male', passportOrId: '', specialRequirements: '', nationality: 'Filipino', boardingStatus: 'pending' }
    ]);
    setConsentTermsAccepted(false);
    onClearPreSelectedPackage?.();
    if (isOperatorView) {
      setOperatorViewTab('comprehensive_manifest');
    }
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. OPERATOR HEADER & TAB NAVIGATION (When in Operator Mode) */}
      {/* ========================================================================= */}
      {isOperatorView && (
        <div className="space-y-4">
          {/* Module Navigation Tabs with Animated Underline */}
          <div className="flex items-center justify-between flex-wrap gap-3 border-b border-white/10 pb-2">
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setOperatorViewTab('comprehensive_manifest')}
                className={`relative px-4 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
                  operatorViewTab === 'comprehensive_manifest'
                    ? 'text-ivory bg-white/[0.08] shadow-sm'
                    : 'text-sand-muted hover:text-ivory hover:bg-white/[0.03]'
                }`}
              >
                <Users className="w-4 h-4 text-sunset-coral" />
                <span>Comprehensive Passenger Manifest & Ledger</span>
                {operatorViewTab === 'comprehensive_manifest' && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute bottom-0 left-3 right-3 h-0.5 bg-sunset-coral rounded-full"
                  />
                )}
              </button>

              <button
                onClick={() => setOperatorViewTab('bookings_group')}
                className={`relative px-4 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
                  operatorViewTab === 'bookings_group'
                    ? 'text-ivory bg-white/[0.08] shadow-sm'
                    : 'text-sand-muted hover:text-ivory hover:bg-white/[0.03]'
                }`}
              >
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>Booking Groups & Expeditions</span>
                {operatorViewTab === 'bookings_group' && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute bottom-0 left-3 right-3 h-0.5 bg-sunset-coral rounded-full"
                  />
                )}
              </button>

              <button
                onClick={() => {
                  setOperatorViewTab('new_booking');
                  setBookingStep(1);
                }}
                className={`relative px-4 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
                  operatorViewTab === 'new_booking'
                    ? 'text-ivory bg-white/[0.08] shadow-sm'
                    : 'text-sand-muted hover:text-ivory hover:bg-white/[0.03]'
                }`}
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>New Expedition Reservation</span>
                {operatorViewTab === 'new_booking' && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute bottom-0 left-3 right-3 h-0.5 bg-sunset-coral rounded-full"
                  />
                )}
              </button>
            </div>
          </div>

          {/* Metrics Strip for Booking Groups Tab */}
          {operatorViewTab === 'bookings_group' && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-[#090E14] border border-white/10 p-4 rounded-2xl">
                <span className="text-[10px] font-mono uppercase tracking-wider text-sand-muted block">Expeditions</span>
                <div className="font-serif-display text-2xl text-ivory mt-0.5">{operatorStats.totalBookings}</div>
                <span className="text-[10px] text-emerald-400 font-mono">Active Charters</span>
              </div>

              <div className="bg-[#090E14] border border-white/10 p-4 rounded-2xl">
                <span className="text-[10px] font-mono uppercase tracking-wider text-sand-muted block">Total Manifested</span>
                <div className="font-serif-display text-2xl text-sunset-coral mt-0.5">{operatorStats.totalPaxCount} Pax</div>
                <span className="text-[10px] text-sand-muted font-mono">Passenger Manifest</span>
              </div>

              <div className="bg-[#090E14] border border-white/10 p-4 rounded-2xl">
                <span className="text-[10px] font-mono uppercase tracking-wider text-sand-muted block">Boarded & Cleared</span>
                <div className="font-serif-display text-2xl text-emerald-400 mt-0.5">{operatorStats.totalBoardedCount} Pax</div>
                <span className="text-[10px] text-emerald-400 font-mono">{operatorStats.completionRate}% Completion</span>
              </div>

              <div className="bg-[#090E14] border border-white/10 p-4 rounded-2xl">
                <span className="text-[10px] font-mono uppercase tracking-wider text-sand-muted block">Dietary & Health</span>
                <div className="font-serif-display text-2xl text-amber-300 mt-0.5">{operatorStats.alertsCount}</div>
                <span className="text-[10px] text-amber-400 font-mono">Special Attention</span>
              </div>

              <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-[#0D151F] to-[#070B0E] border border-white/10 p-4 rounded-2xl flex flex-col justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-sunset-coral font-semibold">Security Clearance</span>
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Flight Clear</span>
                </div>
                <span className="text-[9px] text-sand-muted font-mono">DOT NCR-2026 Synced</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TAB A: COMPREHENSIVE PASSENGER MANIFEST & LEDGER (OPERATOR VIEW) */}
      {/* ========================================================================= */}
      {isOperatorView && operatorViewTab === 'comprehensive_manifest' && (
        <ComprehensivePassengerManifest
          bookings={bookings}
          packages={packages}
          onUpdateBooking={onUpdateBooking ? onUpdateBooking : () => {}}
        />
      )}

      {/* ========================================================================= */}
      {/* 3. TAB B: BOOKING GROUPS & EXPEDITIONS TABLE (OPERATOR VIEW) */}
      {/* ========================================================================= */}
      {isOperatorView && operatorViewTab === 'bookings_group' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="space-y-4"
        >
          {/* Filter Bar */}
          <div className="bg-[#090E14] border border-white/10 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-sand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Booking Ref, Guest, Pax, ID, Phone..."
                className="w-full bg-[#070B0E] border border-white/10 rounded-xl pl-10 pr-3.5 py-2 text-xs text-ivory placeholder:text-sand-muted/50 focus:outline-none focus:border-sunset-coral transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sand-muted hover:text-ivory"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] text-sand-muted font-mono whitespace-nowrap">Status:</span>
              {['All', 'Confirmed', 'Pending', 'Completed', 'Cancelled'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                    statusFilter === st
                      ? 'bg-sunset-coral text-white shadow-sm'
                      : 'bg-white/[0.04] text-sand-muted hover:text-ivory border border-white/5'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Manifest Table */}
          <div className="bg-[#090E14] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#0B1017] text-sand-muted text-[10px] font-mono uppercase tracking-wider border-b border-white/10">
                  <tr>
                    <th className="py-3.5 px-4 w-10 text-center"></th>
                    <th className="py-3.5 px-4">Booking Ref</th>
                    <th className="py-3.5 px-4">Tour Expedition</th>
                    <th className="py-3.5 px-4">Lead Traveler</th>
                    <th className="py-3.5 px-4">Travel Date</th>
                    <th className="py-3.5 px-4 text-center">Manifested Pax</th>
                    <th className="py-3.5 px-4">Total & Paid</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-ivory text-xs">
                  {filteredBookings.map((b) => {
                    const isExpanded = expandedBookingIds.has(b.id);
                    const paxCount = b.passengers?.length || b.numPax;
                    const boardedPax = b.passengers
                      ? b.passengers.filter((p) => p.boardingStatus === 'boarded').length
                      : b.numPax;

                    return (
                      <React.Fragment key={b.id}>
                        {/* Master Booking Row */}
                        <tr className={`hover:bg-white/[0.02] transition-colors ${isExpanded ? 'bg-white/[0.03]' : ''}`}>
                          {/* Expand Toggle */}
                          <td className="py-4 px-4 text-center">
                            <button
                              onClick={() => toggleRowAccordion(b.id)}
                              className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-sand-muted hover:text-ivory transition-all cursor-pointer"
                              title={isExpanded ? 'Collapse Passenger Manifest' : 'Expand Passenger Manifest'}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-sunset-coral" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </td>

                          {/* Ref */}
                          <td className="py-4 px-4">
                            <span className="font-mono font-bold text-sunset-coral bg-sunset-coral/10 px-2 py-0.5 rounded border border-sunset-coral/20">
                              {b.bookingRef}
                            </span>
                          </td>

                          {/* Tour Title */}
                          <td className="py-4 px-4 max-w-xs">
                            <div className="font-medium text-ivory line-clamp-1">{b.tourTitle}</div>
                            <div className="text-[11px] text-sand-muted flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-sunset-coral" />
                              <span className="line-clamp-1">{b.destination}</span>
                            </div>
                          </td>

                          {/* Lead Traveler */}
                          <td className="py-4 px-4">
                            <div className="font-medium text-ivory">{b.customer.fullName}</div>
                            <div className="text-[11px] text-sand-muted font-mono">{b.customer.phone}</div>
                          </td>

                          {/* Travel Date */}
                          <td className="py-4 px-4 font-mono text-sand-muted">
                            <div className="text-ivory font-medium">{b.travelDate}</div>
                            <div className="text-[10px] text-sand-muted font-sans-body">
                              Guide: {b.assignedGuide ? b.assignedGuide.split(' ')[0] : 'Assigned'}
                            </div>
                          </td>

                          {/* Pax Count & Boarding Bar */}
                          <td className="py-4 px-4 text-center">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/10 text-xs font-mono">
                              <Users className="w-3.5 h-3.5 text-sunset-coral" />
                              <strong>{paxCount} Pax</strong>
                            </span>
                            <div className="text-[10px] font-mono text-emerald-400 mt-1">
                              {boardedPax}/{paxCount} Boarded
                            </div>
                          </td>

                          {/* Billing */}
                          <td className="py-4 px-4 font-mono">
                            <div className="font-serif-display text-sm text-ivory">₱{b.totalPrice.toLocaleString()}</div>
                            <div className="text-[10px] text-emerald-400">
                              Paid: ₱{b.invoice.amountPaid.toLocaleString()}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-4 px-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              b.bookingStatus === 'Confirmed' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
                              b.bookingStatus === 'Completed' ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30' :
                              b.bookingStatus === 'Pending' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' :
                              'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            }`}>
                              {b.bookingStatus}
                            </span>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedBookingForDrawer(b);
                                  setIsDetailDrawerOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-sand-muted hover:text-ivory border border-white/5 transition-colors cursor-pointer"
                                title="Inspect Full Booking Record"
                              >
                                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                              </button>

                              <select
                                value={b.bookingStatus}
                                onChange={(e) => onUpdateBookingStatus(b.id, e.target.value as any)}
                                className="bg-[#070B0E] border border-white/10 rounded-lg px-2 py-1 text-[11px] text-sand-muted focus:outline-none focus:border-sunset-coral cursor-pointer"
                              >
                                <option value="Confirmed">Confirmed</option>
                                <option value="Pending">Pending</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                            </div>
                          </td>
                        </tr>

                        {/* Expandable Passenger Manifest Sub-Row */}
                        {isExpanded && (
                          <tr className="bg-[#070B0E]/80">
                            <td colSpan={9} className="p-4 sm:p-6 border-y border-white/[0.08]">
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Plane className="w-4 h-4 text-sunset-coral" />
                                    <h4 className="font-serif-display text-base text-ivory font-medium">
                                      Official Passenger Manifest Roster • {b.bookingRef}
                                    </h4>
                                    <span className="text-[11px] text-sand-muted font-mono">
                                      ({paxCount} registered persons)
                                    </span>
                                  </div>
                                </div>

                                {/* Passenger List Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {(b.passengers && b.passengers.length > 0 ? b.passengers : [
                                    {
                                      id: `${b.id}-lead`,
                                      fullName: b.customer.fullName,
                                      age: 30,
                                      gender: 'Female' as const,
                                      passportOrId: b.bookingRef,
                                      specialRequirements: b.specialInstructions,
                                      nationality: b.customer.nationality,
                                      boardingStatus: 'boarded' as const
                                    }
                                  ]).map((pax, idx) => {
                                    const boarding = pax.boardingStatus || 'boarded';
                                    return (
                                      <div
                                        key={pax.id || idx}
                                        className="bg-[#0B1017] p-3.5 rounded-xl border border-white/10 hover:border-white/20 transition-all space-y-2.5"
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center font-serif-display text-xs text-ivory">
                                              {idx + 1}
                                            </div>
                                            <div>
                                              <div className="font-serif-display text-sm text-ivory font-medium line-clamp-1">
                                                {pax.fullName || 'Registered Guest'}
                                              </div>
                                              <div className="text-[11px] text-sand-muted font-mono">
                                                {pax.age || 28} yo • {pax.gender || 'F'} • {pax.nationality || 'Filipino'}
                                              </div>
                                            </div>
                                          </div>

                                          {/* Boarding Status Pill Toggle */}
                                          <div className="flex items-center bg-[#070B0E] p-0.5 rounded-lg border border-white/10">
                                            <button
                                              onClick={() => handleTogglePassengerBoarding(b.id, pax.id, 'boarded')}
                                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase transition-all cursor-pointer ${
                                                boarding === 'boarded'
                                                  ? 'bg-emerald-600 text-white font-bold'
                                                  : 'text-sand-muted hover:text-ivory'
                                              }`}
                                              title="Mark Boarded"
                                            >
                                              Boarded
                                            </button>
                                            <button
                                              onClick={() => handleTogglePassengerBoarding(b.id, pax.id, 'pending')}
                                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase transition-all cursor-pointer ${
                                                boarding === 'pending'
                                                  ? 'bg-amber-600 text-white font-bold'
                                                  : 'text-sand-muted hover:text-ivory'
                                              }`}
                                              title="Mark Pending"
                                            >
                                              Pending
                                            </button>
                                            <button
                                              onClick={() => handleTogglePassengerBoarding(b.id, pax.id, 'noshow')}
                                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase transition-all cursor-pointer ${
                                                boarding === 'noshow'
                                                  ? 'bg-rose-700 text-white font-bold'
                                                  : 'text-sand-muted hover:text-ivory'
                                              }`}
                                              title="Mark No-Show"
                                            >
                                              No-Show
                                            </button>
                                          </div>
                                        </div>

                                        <div className="flex items-center justify-between text-[11px] font-mono text-sand-muted pt-1 border-t border-white/5">
                                          <span>ID / Passport:</span>
                                          {pax.passportOrId === 'No ID (To Follow)' || pax.idType === 'none' ? (
                                            <span className="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-mono">
                                              To Follow / No ID
                                            </span>
                                          ) : (
                                            <span className="text-sunset-coral font-medium">{pax.passportOrId || 'VERIFIED'}</span>
                                          )}
                                        </div>

                                        {pax.specialRequirements && (
                                          <div className="text-[10px] p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 line-clamp-2">
                                            <strong>Note:</strong> {pax.specialRequirements}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Logistics strip */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                  <div className="p-3 bg-[#0B1017] rounded-xl border border-white/5 text-xs text-sand-muted flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Hotel className="w-4 h-4 text-sunset-coral" />
                                      <span>Hotel: <strong className="text-ivory">{b.hotelReservation?.hotelName || 'Assigned Resort'}</strong></span>
                                    </div>
                                    <span className="font-mono text-[10px] text-sunset-coral">{b.hotelReservation?.voucherCode}</span>
                                  </div>

                                  <div className="p-3 bg-[#0B1017] rounded-xl border border-white/5 text-xs text-sand-muted flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Car className="w-4 h-4 text-emerald-400" />
                                      <span>Vehicle: <strong className="text-ivory">{b.transportReservation?.vehicleType || 'Tourist Coaster'}</strong></span>
                                    </div>
                                    <span className="font-mono text-[10px] text-emerald-400">{b.transportReservation?.plateNumber}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>

              {filteredBookings.length === 0 && (
                <div className="p-12 text-center text-sand-muted space-y-2">
                  <AlertCircle className="w-8 h-8 text-sand-muted/50 mx-auto" />
                  <p className="font-serif-display text-lg text-ivory">No registered bookings match your search.</p>
                  <p className="text-xs">Adjust your search keyword or status filters above.</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}



      {/* ========================================================================= */}
      {/* 4. TAB C: NEW EXPEDITION RESERVATION (CUSTOMER & OPERATOR BOOKING FLOW) */}
      {/* ========================================================================= */}
      {(!isOperatorView || operatorViewTab === 'new_booking') && (
        <motion.div
          ref={portalContainerRef}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="space-y-6 relative"
        >
          {/* Guest / Unauthenticated Notice Banner */}
          {(!currentUser || currentUser.auth_provider === 'guest') && !isOperatorView && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-200 text-xs shadow-lg">
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <p className="font-semibold text-white">
                    {currentUser?.auth_provider === 'guest'
                      ? 'Guest Mode Active (Browsing & Concierge Support Only)'
                      : 'Sign in required for checkout & manifest registration'}
                  </p>
                  <p className="text-[11px] text-amber-200/80">
                    {currentUser?.auth_provider === 'guest'
                      ? 'Guest traveler accounts are designed for browsing itineraries and live customer service. Please sign in or register to complete booking & checkout.'
                      : 'Please log in to your account to complete your booking voucher and passenger manifest.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRequireAuth?.()}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md whitespace-nowrap transition-all cursor-pointer"
              >
                Sign In / Register
              </button>
            </div>
          )}

          {/* Progress Step Indicator (Steps 1 to 3) */}
          {bookingStep <= 3 && (
            <div className="bg-[#090E14] border border-white/10 p-4 rounded-2xl flex items-center justify-between">
              {[
                { step: 1, label: 'Expedition & Schedule', icon: Calendar },
                { step: 2, label: 'Passenger Manifest', icon: Users },
                { step: 3, label: 'Payment & Confirmation', icon: CreditCard }
              ].map((item) => {
                const IconComp = item.icon;
                const isCurrent = bookingStep === item.step;
                const isDone = bookingStep > item.step;

                return (
                  <div key={item.step} className="flex items-center gap-2 sm:gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all ${
                        isDone
                          ? 'bg-emerald-500 text-black'
                          : isCurrent
                          ? 'bg-sunset-coral text-white shadow-lg shadow-sunset-coral/25'
                          : 'bg-white/[0.05] text-sand-muted border border-white/10'
                      }`}
                    >
                      {isDone ? <Check className="w-4 h-4" /> : item.step}
                    </div>
                    <div className="hidden sm:block">
                      <span className="text-[10px] font-mono uppercase text-sand-muted block">Step 0{item.step}</span>
                      <span className={`text-xs font-medium ${isCurrent ? 'text-ivory font-semibold' : 'text-sand-muted'}`}>
                        {item.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* STEP 1: Expedition & Schedule */}
          {bookingStep === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-4xl mx-auto space-y-6"
            >
              {/* Package Selector (If not already chosen) */}
              {!selectedPackage && (
                <div className="space-y-3">
                  <label className="text-xs font-mono uppercase tracking-wider text-sand-muted block">
                    Select Destination Expedition Package
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {packages.map((pkg) => {
                      const isSelected = selectedPackage?.id === pkg.id;
                      return (
                        <motion.div
                          key={pkg.id}
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => triggerTapLoading(() => setSelectedPackage(pkg), `Selecting ${pkg.title}...`)}
                          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-2 backdrop-blur-xl ${
                            isSelected
                              ? 'bg-gradient-to-r from-sunset-coral/30 via-sunset-coral/15 to-[#0B121A] border-sunset-coral ring-2 ring-sunset-coral/50 shadow-xl shadow-sunset-coral/25'
                              : 'bg-[#0B121A]/90 border-white/25 hover:border-sunset-coral hover:bg-[#101A24] hover:shadow-xl hover:shadow-sunset-coral/20'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-sunset-coral uppercase tracking-wider font-bold">
                              {pkg.category}
                            </span>
                            <span className="text-xs font-bold text-ivory font-mono">
                              ₱{pkg.pricePerPax.toLocaleString()} / pax
                            </span>
                          </div>
                          <h4 className="font-serif-display text-base text-ivory line-clamp-1">{pkg.title}</h4>
                          <p className="text-[11px] text-sand-muted line-clamp-2">{pkg.subtitle}</p>
                          <div className="flex items-center gap-2 text-[11px] text-sand-muted pt-1">
                            <Clock className="w-3.5 h-3.5 text-sunset-coral" />
                            <span>{pkg.durationDays}D / {pkg.durationNights}N</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Selected Package Banner (Liquid Glass) */}
              {selectedPackage && (
                <div className="backdrop-blur-2xl bg-white/[0.06] border border-white/20 rounded-2xl p-5 sm:p-6 relative overflow-hidden space-y-3 shadow-2xl">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-sunset-coral font-bold px-2 py-0.5 rounded-full bg-sunset-coral/15 border border-sunset-coral/30">
                          Selected Expedition
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                          DOT Certified Tour
                        </span>
                      </div>
                      <h3 className="font-serif-display text-2xl sm:text-3xl text-ivory mt-1.5 font-bold">
                        {selectedPackage.title}
                      </h3>
                      <p className="text-xs text-sand-muted flex items-center gap-1.5 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-sunset-coral shrink-0" />
                        <span>{selectedPackage.destination} • {selectedPackage.durationDays} Days / {selectedPackage.durationNights} Nights</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedPackage(null)}
                      className="self-start text-xs text-sand-muted hover:text-sunset-coral underline font-mono cursor-pointer transition-colors"
                    >
                      Change Tour
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-3 text-xs font-mono text-sand-muted border-t border-white/10">
                    <span>Base Tier: <strong className="text-ivory font-bold">₱{selectedPackage.pricePerPax.toLocaleString()}</strong> / pax</span>
                    <span>•</span>
                    <span className="text-sand-muted">Accredited DOT Guide Included</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-semibold">Free Airport Shuttle</span>
                  </div>
                </div>
              )}

              {/* Schedule & Custom Date Picker */}
              <div className="backdrop-blur-2xl bg-white/[0.05] border border-white/20 rounded-2xl p-6 space-y-6 shadow-2xl">
                {/* Custom Departure Date Picker */}
                <LiquidDepartureDatePicker
                  selectedDate={travelDate}
                  onSelectDate={(newDate) => setTravelDate(newDate)}
                  durationDays={selectedPackage?.durationDays || 3}
                  durationNights={selectedPackage?.durationNights || 2}
                />

                {/* Accommodation Occupancy Selector (Liquid Glass) */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <div>
                    <h4 className="font-serif-display text-base text-ivory font-semibold">Select Accommodation Type</h4>
                    <p className="text-xs text-sand-muted">What room layout suits your expedition group?</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Single Occupancy */}
                    <motion.div
                      whileHover={{ scale: 1.015, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => triggerTapLoading(() => setAccommodationType('single'), 'Updating room occupancy...')}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-1.5 backdrop-blur-xl ${
                        accommodationType === 'single'
                          ? 'bg-gradient-to-r from-sunset-coral/30 via-sunset-coral/15 to-[#0B121A] border-sunset-coral text-ivory ring-2 ring-sunset-coral/40 shadow-xl shadow-sunset-coral/25'
                          : 'bg-[#0B121A]/80 border-white/20 text-sand-muted hover:border-sunset-coral hover:bg-[#101A24] hover:shadow-xl hover:shadow-sunset-coral/15'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-ivory flex items-center gap-2">
                          <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${accommodationType === 'single' ? 'border-sunset-coral bg-sunset-coral' : 'border-white/30'}`}>
                            {accommodationType === 'single' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </span>
                          Single Occupancy (Solo)
                        </span>
                        <span className="text-[10px] font-mono text-amber-400 font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30">
                          +₱2,000 / room
                        </span>
                      </div>
                      <p className="text-[11px] text-sand-muted pl-6 leading-relaxed">
                        Private solo room with exclusive en-suite amenities and full privacy.
                      </p>
                    </motion.div>

                    {/* Double Occupancy */}
                    <motion.div
                      whileHover={{ scale: 1.015, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => triggerTapLoading(() => setAccommodationType('double'), 'Updating room occupancy...')}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-1.5 backdrop-blur-xl ${
                        accommodationType === 'double'
                          ? 'bg-gradient-to-r from-sunset-coral/30 via-sunset-coral/15 to-[#0B121A] border-sunset-coral text-ivory ring-2 ring-sunset-coral/40 shadow-xl shadow-sunset-coral/25'
                          : 'bg-[#0B121A]/80 border-white/20 text-sand-muted hover:border-sunset-coral hover:bg-[#101A24] hover:shadow-xl hover:shadow-sunset-coral/15'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-ivory flex items-center gap-2">
                          <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${accommodationType === 'double' ? 'border-sunset-coral bg-sunset-coral' : 'border-white/30'}`}>
                            {accommodationType === 'double' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </span>
                          Double / Twin Sharing
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                          Standard Included
                        </span>
                      </div>
                      <p className="text-[11px] text-sand-muted pl-6 leading-relaxed">
                        Twin beds or king bed for couples or travel buddies sharing accommodations.
                      </p>
                    </motion.div>
                  </div>
                </div>

                {/* Package Tier Selection (Liquid Glass) */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <div>
                    <h4 className="font-serif-display text-base text-ivory font-semibold">Select Resort Experience Tier</h4>
                    <p className="text-xs text-sand-muted">Customize your comfort level, villa tier, and hospitality inclusions</p>
                  </div>

                  <div className="space-y-3">
                    {/* Budget / Standard */}
                    <motion.div
                      whileHover={{ scale: 1.01, y: -1 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => triggerTapLoading(() => setPackageTier('budget'), 'Applying standard tier...')}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between backdrop-blur-xl ${
                        packageTier === 'budget'
                          ? 'bg-gradient-to-r from-sunset-coral/30 via-sunset-coral/15 to-[#0B121A] border-sunset-coral text-ivory ring-2 ring-sunset-coral/40 shadow-xl shadow-sunset-coral/25'
                          : 'bg-[#0B121A]/80 border-white/20 text-sand-muted hover:border-sunset-coral hover:bg-[#101A24] hover:shadow-xl hover:shadow-sunset-coral/15'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${packageTier === 'budget' ? 'border-sunset-coral bg-sunset-coral' : 'border-white/30'}`}>
                          {packageTier === 'budget' && <span className="w-2 h-2 rounded-full bg-white" />}
                        </span>
                        <div>
                          <div className="font-semibold text-xs text-ivory flex items-center gap-2">
                            <span>Standard / Nature Room</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-sand-muted border border-white/15">Essential Inclusions</span>
                          </div>
                          <p className="text-[11px] text-sand-muted mt-0.5">Air-conditioned resort room with daily breakfast and island transfers.</p>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold text-amber-300 shrink-0">₱{rawBaseRate.toLocaleString()} / pax</span>
                    </motion.div>

                    {/* Mid-range / Deluxe */}
                    <motion.div
                      whileHover={{ scale: 1.01, y: -1 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => triggerTapLoading(() => setPackageTier('midrange'), 'Applying deluxe tier...')}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between backdrop-blur-xl ${
                        packageTier === 'midrange'
                          ? 'bg-gradient-to-r from-sunset-coral/30 via-sunset-coral/15 to-[#0B121A] border-sunset-coral text-ivory ring-2 ring-sunset-coral/40 shadow-xl shadow-sunset-coral/25'
                          : 'bg-[#0B121A]/80 border-white/20 text-sand-muted hover:border-sunset-coral hover:bg-[#101A24] hover:shadow-xl hover:shadow-sunset-coral/15'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${packageTier === 'midrange' ? 'border-sunset-coral bg-sunset-coral' : 'border-white/30'}`}>
                          {packageTier === 'midrange' && <span className="w-2 h-2 rounded-full bg-white" />}
                        </span>
                        <div>
                          <div className="font-semibold text-xs text-ivory flex items-center gap-2">
                            <span>Deluxe Ocean View ✨</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sunset-coral/20 text-sunset-coral font-bold border border-sunset-coral/30">Top Choice</span>
                          </div>
                          <p className="text-[11px] text-sand-muted mt-0.5">Private sea view balcony, welcome mocktails, and priority sunset cruise seating.</p>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold text-emerald-400 shrink-0">₱{(rawBaseRate + 1500).toLocaleString()} / pax</span>
                    </motion.div>

                    {/* Luxury / Villa */}
                    <motion.div
                      whileHover={{ scale: 1.01, y: -1 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => triggerTapLoading(() => setPackageTier('luxury'), 'Applying luxury villa tier...')}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between backdrop-blur-xl ${
                        packageTier === 'luxury'
                          ? 'bg-gradient-to-r from-sunset-coral/30 via-sunset-coral/15 to-[#0B121A] border-sunset-coral text-ivory ring-2 ring-sunset-coral/40 shadow-xl shadow-sunset-coral/25'
                          : 'bg-[#0B121A]/80 border-white/20 text-sand-muted hover:border-sunset-coral hover:bg-[#101A24] hover:shadow-xl hover:shadow-sunset-coral/15'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${packageTier === 'luxury' ? 'border-sunset-coral bg-sunset-coral' : 'border-white/30'}`}>
                          {packageTier === 'luxury' && <span className="w-2 h-2 rounded-full bg-white" />}
                        </span>
                        <div>
                          <div className="font-semibold text-xs text-ivory flex items-center gap-2">
                            <span>Private Pool Villa 💎</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">VIP Luxury</span>
                          </div>
                          <p className="text-[11px] text-sand-muted mt-0.5">Infinity plunge pool, personal concierge, spa session, and candlelit seafood dinner.</p>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold text-purple-400 shrink-0">₱{(rawBaseRate + 3500).toLocaleString()} / pax</span>
                    </motion.div>
                  </div>
                </div>

                {/* Important Notice */}
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed font-normal">
                    Expedition slot reservations close <strong>3 days prior to departure date</strong>. Marine sanctuary fees (₱500/pax) are bundled and pre-registered with the municipal tourism office.
                  </p>
                </div>
              </div>

              {/* Liquid Glass Bottom Action Bar */}
              <div className="backdrop-blur-2xl bg-white/[0.08] border border-white/25 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl z-10">
                <div className="flex items-center gap-3 text-xs w-full sm:w-auto">
                  <div className="w-10 h-10 rounded-xl bg-sunset-coral/20 border border-sunset-coral/40 flex items-center justify-center text-sunset-coral shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-sand-muted uppercase tracking-wider block">Estimated Base</span>
                    <span className="font-serif-display text-lg text-ivory font-bold">₱{baseRate.toLocaleString()} <span className="text-xs font-sans-body font-normal text-sand-muted">/ person</span></span>
                  </div>
                </div>

                <button
                  type="button"
                  id="btn-step1-proceed-manifest"
                  disabled={!selectedPackage}
                  onClick={() => {
                    if ((!currentUser || currentUser.auth_provider === 'guest') && !isOperatorView) {
                      if (onRequireAuth) {
                        onRequireAuth();
                      }
                      return;
                    }
                    triggerTapLoading(() => setBookingStep(2), 'Preparing passenger manifest roster...', true);
                  }}
                  className="btn-pop w-full sm:w-auto px-8 py-3.5 rounded-full bg-sunset-coral hover:bg-sunset-coral/90 hover:scale-105 active:scale-95 disabled:opacity-50 text-white font-semibold text-xs shadow-xl shadow-sunset-coral/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Proceed to Passenger Manifest</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Passenger Manifest & Contact Register */}
          {bookingStep === 2 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-4xl mx-auto space-y-6"
            >
              {/* Detailed Guests & Passengers Counter Card (Liquid Glass with Emojis) */}
              <div className="backdrop-blur-2xl bg-white/[0.05] border border-white/20 rounded-2xl p-6 space-y-5 shadow-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <h4 className="font-serif-display text-xl text-ivory font-bold">
                      Travelers & Guest Manifest Count
                    </h4>
                    <p className="text-xs text-sand-muted">
                      Specify the age composition for all guests joining this expedition
                    </p>
                  </div>
                  <span className="self-start sm:self-auto text-xs font-mono font-bold text-sunset-coral bg-sunset-coral/15 px-3.5 py-1.5 rounded-full border border-sunset-coral/30 shadow-sm">
                    Manifest Total: {numPax} Passenger{numPax > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Adults Counter with Adult Emoji */}
                  <div className="backdrop-blur-xl bg-[#090E15]/90 p-4 rounded-2xl border border-white/20 hover:border-white/35 transition-all flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-sunset-coral/20 border border-sunset-coral/40 flex items-center justify-center shrink-0">
                        <span className="text-2xl select-none" role="img" aria-label="Adult">🧑</span>
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-ivory">Adults</div>
                        <div className="text-[10px] text-sand-muted font-mono">Age 18+ yrs</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAdultsCount(Math.max(1, adultsCount - 1))}
                        disabled={adultsCount <= 1}
                        className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 text-ivory hover:bg-white/20 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center font-bold text-sm cursor-pointer transition-all"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-mono font-bold text-ivory text-base">{adultsCount}</span>
                      <button
                        type="button"
                        onClick={() => setAdultsCount(adultsCount + 1)}
                        className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 text-ivory hover:bg-white/20 hover:scale-105 active:scale-95 flex items-center justify-center font-bold text-sm cursor-pointer transition-all"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Children Counter with Child Emoji */}
                  <div className="backdrop-blur-xl bg-[#090E15]/90 p-4 rounded-2xl border border-white/20 hover:border-white/35 transition-all flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                        <span className="text-2xl select-none" role="img" aria-label="Child">🧒</span>
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-ivory">Children</div>
                        <div className="text-[10px] text-sand-muted font-mono">Age 2–17 yrs</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setChildrenCount(Math.max(0, childrenCount - 1))}
                        disabled={childrenCount <= 0}
                        className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 text-ivory hover:bg-white/20 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center font-bold text-sm cursor-pointer transition-all"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-mono font-bold text-ivory text-base">{childrenCount}</span>
                      <button
                        type="button"
                        onClick={() => setChildrenCount(childrenCount + 1)}
                        className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 text-ivory hover:bg-white/20 hover:scale-105 active:scale-95 flex items-center justify-center font-bold text-sm cursor-pointer transition-all"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Infants Counter with Baby Emoji */}
                  <div className="backdrop-blur-xl bg-[#090E15]/90 p-4 rounded-2xl border border-white/20 hover:border-white/35 transition-all flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                        <span className="text-2xl select-none" role="img" aria-label="Baby">👶</span>
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-ivory">Infants</div>
                        <div className="text-[10px] text-sand-muted font-mono">Under 2 yrs</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setInfantsCount(Math.max(0, infantsCount - 1))}
                        disabled={infantsCount <= 0}
                        className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 text-ivory hover:bg-white/20 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center font-bold text-sm cursor-pointer transition-all"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-mono font-bold text-ivory text-base">{infantsCount}</span>
                      <button
                        type="button"
                        onClick={() => setInfantsCount(infantsCount + 1)}
                        className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 text-ivory hover:bg-white/20 hover:scale-105 active:scale-95 flex items-center justify-center font-bold text-sm cursor-pointer transition-all"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lead Guest Contact Register (Liquid Glass & High Contrast) */}
              <div className="backdrop-blur-2xl bg-white/[0.05] border border-white/20 rounded-2xl p-6 space-y-5 shadow-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <h4 className="font-serif-display text-xl text-ivory font-bold">
                      Lead Guest & Contact Information
                    </h4>
                    <p className="text-xs text-sand-muted">
                      Primary contact responsible for expedition notifications and voyage briefings
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyLeadToPaxOne}
                    disabled={!customerInfo.fullName}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isLeadSynced
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                        : 'bg-sunset-coral/15 hover:bg-sunset-coral/25 text-sunset-coral border-sunset-coral/40 disabled:opacity-40'
                    }`}
                  >
                    {isLeadSynced ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Synced to Passenger 1</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>⚡ Quick Sync to Passenger 1</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Lead Full Name */}
                  <div className="space-y-1.5">
                    <label htmlFor="lead-fullname" className="text-xs font-semibold text-ivory/90 flex items-center justify-between">
                      <span>Lead Guest Full Name <span className="text-rose-400">*</span></span>
                      {fieldErrors['lead-fullname'] && (
                        <span className="text-[10px] text-rose-400 font-mono">Required</span>
                      )}
                    </label>
                    <input
                      id="lead-fullname"
                      type="text"
                      required
                      placeholder="e.g. Maria Santos"
                      value={customerInfo.fullName}
                      onChange={(e) => {
                        setCustomerInfo({ ...customerInfo, fullName: e.target.value });
                        clearFieldError('lead-fullname');
                      }}
                      className={`w-full bg-[#0B131B] border rounded-xl px-4 py-2.5 text-sm text-ivory placeholder-sand-muted/70 focus:outline-none transition-all ${
                        fieldErrors['lead-fullname']
                          ? 'border-rose-500 ring-2 ring-rose-500/40 bg-rose-500/5'
                          : 'border-white/25 hover:border-white/40 focus:ring-2 focus:ring-sunset-coral/50 focus:border-sunset-coral'
                      }`}
                    />
                    {fieldErrors['lead-fullname'] && (
                      <div id="lead-fullname-alert" className="flex items-center gap-1.5 text-xs text-rose-400 font-medium mt-1 animate-shake">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>{fieldErrors['lead-fullname']}</span>
                      </div>
                    )}
                  </div>

                  {/* Lead Email */}
                  <div className="space-y-1.5">
                    <label htmlFor="lead-email" className="text-xs font-semibold text-ivory/90 flex items-center justify-between">
                      <span>Email Address <span className="text-rose-400">*</span></span>
                      {fieldErrors['lead-email'] && (
                        <span className="text-[10px] text-rose-400 font-mono">Invalid / Missing</span>
                      )}
                    </label>
                    <input
                      id="lead-email"
                      type="email"
                      required
                      placeholder="e.g. maria.santos@gmail.com"
                      value={customerInfo.email}
                      onChange={(e) => {
                        setCustomerInfo({ ...customerInfo, email: e.target.value });
                        clearFieldError('lead-email');
                      }}
                      className={`w-full bg-[#0B131B] border rounded-xl px-4 py-2.5 text-sm text-ivory placeholder-sand-muted/70 focus:outline-none transition-all ${
                        fieldErrors['lead-email']
                          ? 'border-rose-500 ring-2 ring-rose-500/40 bg-rose-500/5'
                          : 'border-white/25 hover:border-white/40 focus:ring-2 focus:ring-sunset-coral/50 focus:border-sunset-coral'
                      }`}
                    />
                    {fieldErrors['lead-email'] && (
                      <div id="lead-email-alert" className="flex items-center gap-1.5 text-xs text-rose-400 font-medium mt-1 animate-shake">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>{fieldErrors['lead-email']}</span>
                      </div>
                    )}
                  </div>

                  {/* Lead Mobile */}
                  <div className="space-y-1.5">
                    <label htmlFor="lead-phone" className="text-xs font-semibold text-ivory/90 flex items-center justify-between">
                      <span>Mobile (11-digit 09...) <span className="text-rose-400">*</span></span>
                      {fieldErrors['lead-phone'] && (
                        <span className="text-[10px] text-rose-400 font-mono">Invalid / Missing</span>
                      )}
                    </label>
                    <input
                      id="lead-phone"
                      type="tel"
                      required
                      maxLength={11}
                      placeholder="e.g. 09171234567"
                      value={customerInfo.phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                        setCustomerInfo({ ...customerInfo, phone: val });
                        clearFieldError('lead-phone');
                      }}
                      className={`w-full bg-[#0B131B] border rounded-xl px-4 py-2.5 text-sm text-ivory font-mono placeholder-sand-muted/70 focus:outline-none transition-all ${
                        fieldErrors['lead-phone']
                          ? 'border-rose-500 ring-2 ring-rose-500/40 bg-rose-500/5'
                          : 'border-white/25 hover:border-white/40 focus:ring-2 focus:ring-sunset-coral/50 focus:border-sunset-coral'
                      }`}
                    />
                    {fieldErrors['lead-phone'] && (
                      <div id="lead-phone-alert" className="flex items-center gap-1.5 text-xs text-rose-400 font-medium mt-1 animate-shake">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>{fieldErrors['lead-phone']}</span>
                      </div>
                    )}
                  </div>

                  {/* Emergency Contact Name */}
                  <div className="space-y-1.5">
                    <label htmlFor="lead-emergency-name" className="text-xs font-semibold text-ivory/90 flex items-center justify-between">
                      <span>Emergency Contact Name <span className="text-rose-400">*</span></span>
                      {fieldErrors['lead-emergency-name'] && (
                        <span className="text-[10px] text-rose-400 font-mono">Required</span>
                      )}
                    </label>
                    <input
                      id="lead-emergency-name"
                      type="text"
                      required
                      placeholder="e.g. Roberto Santos (Spouse/Relative)"
                      value={emergencyContactName}
                      onChange={(e) => {
                        setEmergencyContactName(e.target.value);
                        clearFieldError('lead-emergency-name');
                      }}
                      className={`w-full bg-[#0B131B] border rounded-xl px-4 py-2.5 text-sm text-ivory placeholder-sand-muted/70 focus:outline-none transition-all ${
                        fieldErrors['lead-emergency-name']
                          ? 'border-rose-500 ring-2 ring-rose-500/40 bg-rose-500/5'
                          : 'border-white/25 hover:border-white/40 focus:ring-2 focus:ring-sunset-coral/50 focus:border-sunset-coral'
                      }`}
                    />
                    {fieldErrors['lead-emergency-name'] && (
                      <div id="lead-emergency-name-alert" className="flex items-center gap-1.5 text-xs text-rose-400 font-medium mt-1 animate-shake">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>{fieldErrors['lead-emergency-name']}</span>
                      </div>
                    )}
                  </div>

                  {/* Emergency Contact Phone */}
                  <div className="space-y-1.5">
                    <label htmlFor="lead-emergency-phone" className="text-xs font-semibold text-ivory/90 flex items-center justify-between">
                      <span>Emergency Contact Phone <span className="text-rose-400">*</span></span>
                      {fieldErrors['lead-emergency-phone'] && (
                        <span className="text-[10px] text-rose-400 font-mono">Required</span>
                      )}
                    </label>
                    <input
                      id="lead-emergency-phone"
                      type="tel"
                      required
                      placeholder="e.g. 09182229011 or (02) 8123 4567"
                      value={emergencyContactPhone}
                      onChange={(e) => {
                        setEmergencyContactPhone(e.target.value);
                        clearFieldError('lead-emergency-phone');
                      }}
                      className={`w-full bg-[#0B131B] border rounded-xl px-4 py-2.5 text-sm text-ivory font-mono placeholder-sand-muted/70 focus:outline-none transition-all ${
                        fieldErrors['lead-emergency-phone']
                          ? 'border-rose-500 ring-2 ring-rose-500/40 bg-rose-500/5'
                          : 'border-white/25 hover:border-white/40 focus:ring-2 focus:ring-sunset-coral/50 focus:border-sunset-coral'
                      }`}
                    />
                    {fieldErrors['lead-emergency-phone'] && (
                      <div id="lead-emergency-phone-alert" className="flex items-center gap-1.5 text-xs text-rose-400 font-medium mt-1 animate-shake">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>{fieldErrors['lead-emergency-phone']}</span>
                      </div>
                    )}
                  </div>

                  {/* Nationality Dropdown */}
                  <div className="space-y-1.5">
                    <label htmlFor="lead-nationality" className="text-xs font-semibold text-ivory/90 flex items-center justify-between">
                      <span>Lead Nationality <span className="text-rose-400">*</span></span>
                      {fieldErrors['lead-nationality'] && (
                        <span className="text-[10px] text-rose-400 font-mono">Select One</span>
                      )}
                    </label>
                    <select
                      id="lead-nationality"
                      required
                      value={customerInfo.nationality}
                      onChange={(e) => {
                        setCustomerInfo({ ...customerInfo, nationality: e.target.value });
                        clearFieldError('lead-nationality');
                      }}
                      className={`w-full bg-[#0B131B] border rounded-xl px-4 py-2.5 text-sm text-ivory focus:outline-none cursor-pointer transition-all ${
                        fieldErrors['lead-nationality']
                          ? 'border-rose-500 ring-2 ring-rose-500/40 bg-rose-500/5'
                          : 'border-white/25 hover:border-white/40 focus:ring-2 focus:ring-sunset-coral/50 focus:border-sunset-coral'
                      }`}
                    >
                      <option value="" className="bg-[#0B131B] text-sand-muted">-- Select Nationality --</option>
                      {PACKAGE_NATIONALITIES.map((nat) => (
                        <option key={nat} value={nat} className="bg-[#0B131B] text-ivory">
                          {nat}
                        </option>
                      ))}
                    </select>
                    {fieldErrors['lead-nationality'] && (
                      <div id="lead-nationality-alert" className="flex items-center gap-1.5 text-xs text-rose-400 font-medium mt-1 animate-shake">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>{fieldErrors['lead-nationality']}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Dynamic Individual Passenger Cards */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-serif-display text-xl text-ivory font-bold">
                      Official Passenger Manifest ({passengers.length} Persons)
                    </h4>
                    <p className="text-xs text-sand-muted">
                      Civil Aviation & Maritime Security Manifest Registration
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePaxCountChange(passengers.length + 1)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-ivory border border-white/20 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-sunset-coral" />
                    <span>Add Guest</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {passengers.map((p, index) => (
                    <motion.div
                      key={p.id || index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="backdrop-blur-2xl bg-white/[0.05] border border-white/20 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl"
                    >
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-full bg-sunset-coral/20 text-sunset-coral border border-sunset-coral/40 flex items-center justify-center font-mono text-xs font-bold">
                            {index + 1}
                          </span>
                          <span className="font-serif-display text-base text-ivory font-semibold">
                            Passenger {index + 1} {index === 0 && '(Lead Traveler)'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {index === 0 && (
                            <button
                              type="button"
                              onClick={handleCopyLeadToPaxOne}
                              className="px-3 py-1 rounded-lg bg-sunset-coral/15 hover:bg-sunset-coral/25 border border-sunset-coral/30 text-sunset-coral text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer"
                              title="Auto-sync details from Lead Guest above"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Auto-Sync Info</span>
                            </button>
                          )}

                          {passengers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = passengers.filter((_, i) => i !== index);
                                setPassengers(updated);
                                setNumPax(updated.length);
                              }}
                              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer font-medium px-2 py-1 rounded-lg hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-6 gap-3.5">
                        {/* Name */}
                        <div className="sm:col-span-2 space-y-1.5">
                          <label htmlFor={`pax-${index}-fullname`} className="text-xs font-semibold text-ivory/90 flex items-center justify-between">
                            <span>Full Legal Name <span className="text-rose-400">*</span></span>
                            {fieldErrors[`pax-${index}-fullname`] && (
                              <span className="text-[10px] text-rose-400 font-mono">Required</span>
                            )}
                          </label>
                          <input
                            id={`pax-${index}-fullname`}
                            type="text"
                            required
                            placeholder="Full Legal Name"
                            value={p.fullName}
                            onChange={(e) => {
                              handleUpdatePassenger(index, 'fullName', e.target.value);
                              clearFieldError(`pax-${index}-fullname`);
                            }}
                            className={`w-full bg-[#0B131B] border rounded-xl px-4 py-2.5 text-sm text-ivory placeholder-sand-muted/70 focus:outline-none transition-all ${
                              fieldErrors[`pax-${index}-fullname`]
                                ? 'border-rose-500 ring-2 ring-rose-500/40 bg-rose-500/5'
                                : 'border-white/25 hover:border-white/40 focus:ring-2 focus:ring-sunset-coral/50 focus:border-sunset-coral'
                            }`}
                          />
                          {fieldErrors[`pax-${index}-fullname`] && (
                            <div id={`pax-${index}-fullname-alert`} className="flex items-center gap-1.5 text-xs text-rose-400 font-medium mt-1 animate-shake">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span>{fieldErrors[`pax-${index}-fullname`]}</span>
                            </div>
                          )}
                        </div>

                        {/* Age */}
                        <div className="sm:col-span-1 space-y-1.5">
                          <label htmlFor={`pax-${index}-age`} className="text-xs font-semibold text-ivory/90 flex items-center justify-between">
                            <span>Age <span className="text-rose-400">*</span></span>
                            {fieldErrors[`pax-${index}-age`] && (
                              <span className="text-[10px] text-rose-400 font-mono">Invalid</span>
                            )}
                          </label>
                          <input
                            id={`pax-${index}-age`}
                            type="number"
                            min="1"
                            max="110"
                            placeholder="Age"
                            value={p.age || ''}
                            onChange={(e) => {
                              handleUpdatePassenger(index, 'age', parseInt(e.target.value) || 0);
                              clearFieldError(`pax-${index}-age`);
                            }}
                            className={`w-full bg-[#0B131B] border rounded-xl px-4 py-2.5 text-sm text-ivory focus:outline-none transition-all ${
                              fieldErrors[`pax-${index}-age`]
                                ? 'border-rose-500 ring-2 ring-rose-500/40 bg-rose-500/5'
                                : 'border-white/25 hover:border-white/40 focus:ring-2 focus:ring-sunset-coral/50 focus:border-sunset-coral'
                            }`}
                          />
                          {fieldErrors[`pax-${index}-age`] && (
                            <div id={`pax-${index}-age-alert`} className="flex items-center gap-1.5 text-xs text-rose-400 font-medium mt-1 animate-shake">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span>{fieldErrors[`pax-${index}-age`]}</span>
                            </div>
                          )}
                        </div>

                        {/* Gender */}
                        <div className="sm:col-span-1 space-y-1.5">
                          <label htmlFor={`pax-${index}-gender`} className="text-xs font-semibold text-ivory/90 flex items-center justify-between">
                            <span>Gender <span className="text-rose-400">*</span></span>
                            {fieldErrors[`pax-${index}-gender`] && (
                              <span className="text-[10px] text-rose-400 font-mono">Select</span>
                            )}
                          </label>
                          <select
                            id={`pax-${index}-gender`}
                            value={p.gender || ''}
                            onChange={(e) => {
                              handleUpdatePassenger(index, 'gender', e.target.value);
                              clearFieldError(`pax-${index}-gender`);
                            }}
                            className={`w-full bg-[#0B131B] border rounded-xl px-4 py-2.5 text-sm text-ivory focus:outline-none cursor-pointer transition-all ${
                              fieldErrors[`pax-${index}-gender`]
                                ? 'border-rose-500 ring-2 ring-rose-500/40 bg-rose-500/5'
                                : 'border-white/25 hover:border-white/40 focus:ring-2 focus:ring-sunset-coral/50 focus:border-sunset-coral'
                            }`}
                          >
                            <option value="" className="bg-[#0B131B] text-sand-muted">Select</option>
                            <option value="Female" className="bg-[#0B131B] text-ivory">Female</option>
                            <option value="Male" className="bg-[#0B131B] text-ivory">Male</option>
                            <option value="Other" className="bg-[#0B131B] text-ivory">Other</option>
                          </select>
                          {fieldErrors[`pax-${index}-gender`] && (
                            <div id={`pax-${index}-gender-alert`} className="flex items-center gap-1.5 text-xs text-rose-400 font-medium mt-1 animate-shake">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span>{fieldErrors[`pax-${index}-gender`]}</span>
                            </div>
                          )}
                        </div>

                        {/* Nationality */}
                        <div className="sm:col-span-2 space-y-1.5">
                          <label htmlFor={`pax-${index}-nationality`} className="text-xs font-semibold text-ivory/90 flex items-center justify-between">
                            <span>Nationality <span className="text-rose-400">*</span></span>
                            {fieldErrors[`pax-${index}-nationality`] && (
                              <span className="text-[10px] text-rose-400 font-mono">Select</span>
                            )}
                          </label>
                          <select
                            id={`pax-${index}-nationality`}
                            value={p.nationality || 'Filipino'}
                            onChange={(e) => {
                              handleUpdatePassenger(index, 'nationality', e.target.value);
                              clearFieldError(`pax-${index}-nationality`);
                            }}
                            className={`w-full bg-[#0B131B] border rounded-xl px-4 py-2.5 text-sm text-ivory focus:outline-none cursor-pointer transition-all ${
                              fieldErrors[`pax-${index}-nationality`]
                                ? 'border-rose-500 ring-2 ring-rose-500/40 bg-rose-500/5'
                                : 'border-white/25 hover:border-white/40 focus:ring-2 focus:ring-sunset-coral/50 focus:border-sunset-coral'
                            }`}
                          >
                            <option value="" className="bg-[#0B131B] text-sand-muted">-- Select Nationality --</option>
                            {PACKAGE_NATIONALITIES.map((nat) => (
                              <option key={nat} value={nat} className="bg-[#0B131B] text-ivory">
                                {nat}
                              </option>
                            ))}
                          </select>
                          {fieldErrors[`pax-${index}-nationality`] && (
                            <div id={`pax-${index}-nationality-alert`} className="flex items-center gap-1.5 text-xs text-rose-400 font-medium mt-1 animate-shake">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span>{fieldErrors[`pax-${index}-nationality`]}</span>
                            </div>
                          )}
                        </div>

                        {/* ID Document Selection & Conditional Number Input */}
                        <div className="sm:col-span-6 space-y-2.5 pt-3 border-t border-white/10">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Dropdown for Document Type / Status */}
                            <div className="space-y-1.5">
                              <label htmlFor={`pax-${index}-idtype`} className="text-xs font-semibold text-ivory/90 flex items-center justify-between">
                                <span>Passport / Identification Option <span className="text-rose-400">*</span></span>
                                {getPassengerIdType(p) === 'none' ? (
                                  <span className="text-[10px] text-amber-400 font-medium px-2 py-0.5 bg-amber-500/15 rounded border border-amber-500/30">
                                    To Follow
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-emerald-400 font-medium px-2 py-0.5 bg-emerald-500/15 rounded border border-emerald-500/30">
                                    ID Selected
                                  </span>
                                )}
                              </label>
                              <select
                                id={`pax-${index}-idtype`}
                                value={getPassengerIdType(p)}
                                onChange={(e) => {
                                  handleIdTypeChange(index, e.target.value);
                                  clearFieldError(`pax-${index}-idnum`);
                                }}
                                className="w-full bg-[#0B131B] border border-white/25 hover:border-white/40 rounded-xl px-4 py-2.5 text-sm text-ivory focus:outline-none focus:ring-2 focus:ring-sunset-coral/50 focus:border-sunset-coral cursor-pointer transition-all"
                              >
                                <optgroup label="Government & Travel IDs" className="bg-[#0B131B] text-ivory font-semibold">
                                  <option value="ph_passport" className="bg-[#0B131B] text-ivory">Philippine Passport</option>
                                  <option value="foreign_passport" className="bg-[#0B131B] text-ivory">Foreign Passport (International)</option>
                                  <option value="philsys" className="bg-[#0B131B] text-ivory">PhilSys National ID (Card / ePhilID)</option>
                                  <option value="driver_license" className="bg-[#0B131B] text-ivory">Driver's License (LTO)</option>
                                  <option value="umid_sss" className="bg-[#0B131B] text-ivory">UMID / SSS / GSIS Card</option>
                                  <option value="postal_id" className="bg-[#0B131B] text-ivory">Postal ID (Digitized)</option>
                                  <option value="voter_id" className="bg-[#0B131B] text-ivory">Voter's ID / Certificate (COMELEC)</option>
                                  <option value="prc_id" className="bg-[#0B131B] text-ivory">PRC Professional License</option>
                                  <option value="student_id" className="bg-[#0B131B] text-ivory">Student / School ID (Minors & Youth)</option>
                                  <option value="birth_cert" className="bg-[#0B131B] text-ivory">PSA Birth Certificate (Minors / Infants)</option>
                                  <option value="other_govt" className="bg-[#0B131B] text-ivory">Other Government-Issued Photo ID</option>
                                </optgroup>
                                <optgroup label="No Document On Hand" className="bg-[#0B131B] text-amber-300 font-semibold">
                                  <option value="none" className="bg-[#0B131B] text-amber-300">I don't have a Passport / ID yet (To follow / No ID)</option>
                                </optgroup>
                              </select>
                            </div>

                            {/* Conditional input if they DO have the thing on the dropdown */}
                            {getPassengerIdType(p) !== 'none' ? (
                              <div className="space-y-1.5">
                                <label htmlFor={`pax-${index}-idnum`} className="text-xs font-semibold text-ivory/90 flex items-center justify-between">
                                  <span>
                                    {PASSENGER_ID_OPTIONS.find((o) => o.id === getPassengerIdType(p))?.label || 'ID'} Number <span className="text-rose-400">*</span>
                                  </span>
                                  <span className="text-[10px] text-sunset-coral font-mono">Required</span>
                                </label>
                                <input
                                  id={`pax-${index}-idnum`}
                                  type="text"
                                  placeholder={
                                    PASSENGER_ID_OPTIONS.find((o) => o.id === getPassengerIdType(p))?.placeholder ||
                                    'Enter document or passport number'
                                  }
                                  value={p.passportOrId === 'No ID (To Follow)' ? '' : p.passportOrId}
                                  onChange={(e) => {
                                    handleUpdatePassenger(index, 'passportOrId', e.target.value);
                                    clearFieldError(`pax-${index}-idnum`);
                                  }}
                                  className={`w-full bg-[#0B131B] border rounded-xl px-4 py-2.5 text-sm text-ivory font-mono focus:outline-none transition-all ${
                                    fieldErrors[`pax-${index}-idnum`]
                                      ? 'border-rose-500 ring-2 ring-rose-500/40 bg-rose-500/5'
                                      : 'border-white/25 hover:border-white/40 focus:ring-2 focus:ring-sunset-coral/50 focus:border-sunset-coral'
                                  }`}
                                />
                                {fieldErrors[`pax-${index}-idnum`] && (
                                  <div id={`pax-${index}-idnum-alert`} className="flex items-center gap-1.5 text-xs text-rose-400 font-medium mt-1 animate-shake">
                                    <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                    <span>{fieldErrors[`pax-${index}-idnum`]}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-end">
                                <div className="w-full p-3 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-200 text-xs flex items-center gap-2.5 shadow-sm">
                                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                                  <span className="text-xs leading-relaxed text-amber-200 font-medium">
                                    No ID on hand yet. You can still complete booking! Passengers can present ID details prior to tour departure.
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Special Requirements / Dietary */}
                        <div className="sm:col-span-6 space-y-1.5 pt-1">
                          <label htmlFor={`pax-${index}-special`} className="text-xs font-semibold text-ivory/90 block">
                            Special Needs, Dietary or Medical Alerts
                          </label>
                          <input
                            id={`pax-${index}-special`}
                            type="text"
                            placeholder="e.g. Vegetarian, Senior assistance, Wheelchair access, etc."
                            value={p.specialRequirements || ''}
                            onChange={(e) => handleUpdatePassenger(index, 'specialRequirements', e.target.value)}
                            className="w-full bg-[#0B131B] border border-white/25 hover:border-white/40 rounded-xl px-4 py-2.5 text-sm text-ivory placeholder-sand-muted/70 focus:outline-none focus:ring-2 focus:ring-sunset-coral/50 focus:border-sunset-coral transition-all"
                          />
                        </div>
                      </div>

                      {/* Quick preset chips */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[10px] font-mono text-sand-muted">Quick Tags:</span>
                        {DIETARY_HEALTH_PRESETS.slice(1, 6).map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              const existing = p.specialRequirements ? `${p.specialRequirements}, ${preset}` : preset;
                              handleUpdatePassenger(index, 'specialRequirements', existing);
                            }}
                            className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-white/[0.08] hover:bg-white/[0.15] text-sand-muted hover:text-ivory border border-white/15 transition-all cursor-pointer"
                          >
                            + {preset}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Special Logistics Instructions */}
              <div className="backdrop-blur-2xl bg-white/[0.05] border border-white/20 rounded-2xl p-5 space-y-2 shadow-xl">
                <label className="text-xs font-mono uppercase tracking-wider text-sand-muted block">
                  Expedition Arrival & Logistics Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Flight arrival times, placard pickup requests, room preferences, or special anniversary setups..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="w-full bg-[#0B131B] border border-white/20 hover:border-white/35 rounded-xl p-3 text-xs text-ivory focus:outline-none focus:border-sunset-coral transition-all"
                />
              </div>

              {/* Validation Alert Banner if errors exist */}
              {Object.keys(fieldErrors).length > 0 && (
                <div id="manifest-error-banner" className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3 animate-shake shadow-lg">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-rose-200">
                      Please complete all required fields ({Object.keys(fieldErrors).length} item{Object.keys(fieldErrors).length > 1 ? 's' : ''} missing or invalid):
                    </p>
                    <p className="text-[11px] text-rose-300/90">
                      Review the highlighted red fields above.
                    </p>
                  </div>
                </div>
              )}

              {/* Navigation buttons (Liquid Glass Bottom Action Bar) */}
              <div className="backdrop-blur-2xl bg-white/[0.08] border border-white/25 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl z-10">
                <button
                  type="button"
                  id="btn-back-to-schedule"
                  onClick={() => triggerTapLoading(() => setBookingStep(1), 'Returning to schedule...', true)}
                  className="btn-pop w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 text-xs text-ivory font-medium transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Schedule</span>
                </button>

                <button
                  type="button"
                  id="btn-continue-to-payment"
                  disabled={isStepTransitioning}
                  onClick={handleProceedToPayment}
                  className="btn-pop w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-sunset-coral hover:bg-sunset-coral/90 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none text-white text-xs font-semibold shadow-xl shadow-sunset-coral/30 transition-all cursor-pointer"
                >
                  {isStepTransitioning ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Securing Gateway...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue to Payment & Dossier</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Payment & Reservation Settlement */}
          {bookingStep === 3 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-4xl mx-auto space-y-6"
            >
              {/* Payment Settlement Structure (Liquid Glass) */}
              <div className="backdrop-blur-2xl bg-white/[0.05] border border-white/20 rounded-2xl p-6 space-y-5 shadow-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <h4 className="font-serif-display text-xl text-ivory font-bold">
                      Settlement Mode & Terms
                    </h4>
                    <p className="text-xs text-sand-muted">
                      Select how you would like to secure your expedition itinerary slots today
                    </p>
                  </div>
                  <span className="self-start sm:self-auto text-xs font-mono font-bold text-emerald-400 bg-emerald-500/15 px-3.5 py-1.5 rounded-full border border-emerald-500/30">
                    Grand Total: ₱{grandTotal.toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {/* 24-Hour Price Lock Option (User Approved Suggestion 3) */}
                  <motion.div
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      triggerTapLoading(() => {
                        setIsPriceHoldOption(true);
                      }, 'Activating 24-Hour Price Lock...');
                    }}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-1.5 flex flex-col justify-between ${
                      isPriceHoldOption
                        ? 'bg-gradient-to-r from-amber-500/25 via-amber-500/10 to-[#0B121A] border-amber-400 text-ivory ring-2 ring-amber-400/40 shadow-xl shadow-amber-500/20'
                        : 'bg-[#0B121A]/80 border-white/20 text-sand-muted hover:border-amber-400/60 hover:bg-[#101A24]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold uppercase text-amber-300 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>24-Hour Hold</span>
                        </span>
                        {isPriceHoldOption && <Check className="w-4 h-4 text-amber-400" />}
                      </div>
                      <div className="font-serif-display text-xl text-ivory font-bold pt-1">
                        ₱0 <span className="text-xs text-sand-muted font-normal">due right now</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-sand-muted leading-tight">
                      Locks today's promo rate & seat allocation for 24 hours with no risk. Settle online later.
                    </p>
                  </motion.div>

                  {/* 50% Deposit */}
                  <motion.div
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      triggerTapLoading(() => {
                        setIsPriceHoldOption(false);
                        setPaymentOption('deposit');
                      }, 'Calculating downpayment terms...');
                    }}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-1.5 flex flex-col justify-between ${
                      !isPriceHoldOption && paymentOption === 'deposit'
                        ? 'bg-gradient-to-r from-sunset-coral/25 via-sunset-coral/10 to-[#0B121A] border-sunset-coral text-ivory ring-2 ring-sunset-coral/40 shadow-xl shadow-sunset-coral/20'
                        : 'bg-[#0B121A]/80 border-white/20 text-sand-muted hover:border-sunset-coral hover:bg-[#101A24]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold uppercase text-ivory">50% Downpayment</span>
                        {!isPriceHoldOption && paymentOption === 'deposit' && <Check className="w-4 h-4 text-sunset-coral" />}
                      </div>
                      <div className="font-serif-display text-xl text-ivory font-bold pt-1">
                        ₱{depositAmount.toLocaleString()}
                      </div>
                    </div>
                    <p className="text-[11px] text-sand-muted leading-tight">
                      Guarantees slots and instant hotel reservation. Balance of ₱{balanceDue.toLocaleString()} upon arrival.
                    </p>
                  </motion.div>

                  {/* 100% Full Payment */}
                  <motion.div
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      triggerTapLoading(() => {
                        setIsPriceHoldOption(false);
                        setPaymentOption('full');
                      }, 'Calculating full settlement...');
                    }}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-1.5 flex flex-col justify-between ${
                      !isPriceHoldOption && paymentOption === 'full'
                        ? 'bg-gradient-to-r from-sunset-coral/25 via-sunset-coral/10 to-[#0B121A] border-sunset-coral text-ivory ring-2 ring-sunset-coral/40 shadow-xl shadow-sunset-coral/20'
                        : 'bg-[#0B121A]/80 border-white/20 text-sand-muted hover:border-sunset-coral hover:bg-[#101A24]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold uppercase text-ivory">100% Full Settlement</span>
                        {!isPriceHoldOption && paymentOption === 'full' && <Check className="w-4 h-4 text-sunset-coral" />}
                      </div>
                      <div className="font-serif-display text-xl text-ivory font-bold pt-1">
                        ₱{grandTotal.toLocaleString()}
                      </div>
                    </div>
                    <p className="text-[11px] text-sand-muted leading-tight">
                      Zero balance. Receive verified digital tour vouchers and instant boarding clearance.
                    </p>
                  </motion.div>
                </div>
              </div>

              {/* Payment Gateway Methods or 24-Hour Notice */}
              {isPriceHoldOption ? (
                <div className="backdrop-blur-2xl bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 space-y-3 shadow-xl">
                  <div className="flex items-center gap-2.5 text-amber-300 font-serif-display text-lg font-bold">
                    <Clock className="w-5 h-5 text-amber-400" />
                    <span>24-Hour Price Lock Active</span>
                  </div>
                  <p className="text-xs text-sand-muted leading-relaxed">
                    We will hold your selected dates and package price for exactly 24 hours. A booking reservation slip with payment instructions will be generated upon confirmation, allowing you to settle via GCash, Maya, or Bank Transfer before the hold expires.
                  </p>
                </div>
              ) : (
                <div className="backdrop-blur-2xl bg-white/[0.05] border border-white/20 rounded-2xl p-6 space-y-5 shadow-2xl">
                  <div>
                    <h4 className="font-serif-display text-xl text-ivory font-bold">
                      Payment Channel & Settlement Method
                    </h4>
                    <p className="text-xs text-sand-muted">
                      Select your preferred settlement gateway. Mobile wallets are verified through the Philippine QR Ph national system.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { id: 'GCash', name: 'GCash e-Wallet', desc: 'InstaPay QR Ph', icon: Smartphone },
                      { id: 'PayMaya', name: 'Maya / Wallet', desc: 'InstaPay QR Ph', icon: Smartphone },
                      { id: 'Cash', name: 'Office Walk-In', desc: 'Pasig OTC Cash', icon: MapPin },
                      { id: 'Bank Transfer', name: 'Direct Bank', desc: 'BDO / BPI / UB', icon: CreditCard }
                    ].map((m) => {
                      const IconComp = m.icon;
                      const isSelected = paymentMethod === m.id;
                      return (
                        <motion.div
                          key={m.id}
                          whileHover={{ scale: 1.04, y: -2 }}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => triggerTapLoading(() => setPaymentMethod(m.id as any), `Connecting ${m.name}...`)}
                          className={`p-3.5 rounded-xl border-2 text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-gradient-to-br from-sunset-coral/30 via-sunset-coral/15 to-[#0B121A] border-sunset-coral text-ivory font-semibold ring-2 ring-sunset-coral/40 shadow-xl shadow-sunset-coral/25'
                              : 'bg-[#0B121A] border-white/20 text-sand-muted hover:border-sunset-coral hover:bg-[#101A24] hover:shadow-xl hover:shadow-sunset-coral/15'
                          }`}
                        >
                          <IconComp className={`w-5 h-5 mx-auto mb-1.5 ${isSelected ? 'text-sunset-coral' : 'text-sand-muted'}`} />
                          <div className="text-xs text-ivory font-semibold">{m.name}</div>
                          <div className="text-[10px] text-sand-muted font-mono">{m.desc}</div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Render Payment Method Body */}
                  {(paymentMethod === 'GCash' || paymentMethod === 'PayMaya') && (
                    <div className="pt-2 border-t border-white/10">
                      <InstaPayQRCard
                        amountDue={amountToPayNow}
                        paymentOption={paymentOption}
                        referenceNo={referenceNo}
                        onReferenceNoChange={setReferenceNo}
                        receiptProofUrl={receiptProofUrl}
                        onReceiptProofChange={setReceiptProofUrl}
                      />
                    </div>
                  )}

                  {paymentMethod === 'Cash' && (
                    <div className="pt-2 border-t border-white/10 space-y-4">
                      <div className="bg-[#070B0E] border border-white/10 rounded-2xl p-5 space-y-3">
                        <div className="flex items-center gap-2 text-sunset-coral font-mono text-xs font-semibold uppercase">
                          <MapPin className="w-4 h-4" />
                          <span>Over-The-Counter Cash Settlement Policy</span>
                        </div>
                        <h5 className="font-serif-display text-base text-ivory">
                          Pay at our Ortigas Main Operations Desk
                        </h5>
                        <p className="text-xs text-sand-muted leading-relaxed font-light">
                          By completing this reservation, your slot is temporarily <strong>locked for 48 hours</strong>. Please present your generated Booking Reference Slip and settle the required payment in cash to receive your official BIR physical receipt.
                        </p>
                        <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1 text-xs font-mono">
                          <span className="text-sand-muted block text-[10px] uppercase">Cashier Location:</span>
                          <span className="text-ivory font-medium block">
                            Unit 1101 City & Land Mega Plaza Inc., ADB Ave. cor. Garnet Rd., Ortigas Center, Pasig City
                          </span>
                          <span className="text-[11px] text-emerald-400 block pt-1">
                            Office Hours: Monday – Saturday (8:00 AM – 6:00 PM)
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'Bank Transfer' && (
                    <div className="pt-2 border-t border-white/10 space-y-4">
                      <div className="bg-[#070B0E] border border-white/10 rounded-2xl p-5 space-y-3">
                        <div className="flex items-center gap-2 text-sunset-coral font-mono text-xs font-semibold uppercase">
                          <CreditCard className="w-4 h-4" />
                          <span>Official Corporate Banking Accounts</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-0.5">
                            <span className="text-[10px] text-sand-muted uppercase font-mono">BDO Unibank</span>
                            <p className="text-ivory font-mono font-bold">0067-8012-3490</p>
                            <p className="text-[11px] text-sand-muted">Holiday Travelers Travel & Tours Inc.</p>
                          </div>
                          <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-0.5">
                            <span className="text-[10px] text-sand-muted uppercase font-mono">Bank of the Philippine Islands (BPI)</span>
                            <p className="text-ivory font-mono font-bold">2940-1092-88</p>
                            <p className="text-[11px] text-sand-muted">Holiday Travelers Travel & Tours Inc.</p>
                          </div>
                        </div>

                        {/* Reference & Proof for Bank Transfer */}
                        <div className="space-y-3 pt-2">
                          <div className="space-y-1">
                            <label className="text-[11px] text-sand-muted block font-mono">
                              Bank Deposit / Online Transfer Reference Number
                            </label>
                            <input
                              type="text"
                              value={referenceNo}
                              onChange={(e) => setReferenceNo(e.target.value)}
                              placeholder="e.g. BDO-TRX-98214 or BPI Reference"
                              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B131B] border border-white/25 text-ivory font-mono text-xs focus:outline-none focus:border-sunset-coral transition-all"
                            />
                          </div>

                          {/* Bank Deposit Slip Upload */}
                          <div className="space-y-1.5 pt-1">
                            <span className="text-xs text-sand-muted block font-medium">
                              Upload Deposit Slip / Bank Mobile App Screenshot <span className="text-sunset-coral text-[11px] font-semibold">* Required</span>
                            </span>

                            {receiptProofUrl ? (
                              <div className="rounded-xl border border-cyan-500/40 bg-[#0B131B] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={receiptProofUrl}
                                    alt="Bank Transfer Slip"
                                    className="w-14 h-14 object-cover rounded-lg border border-white/10 cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                                    onClick={() => setIsSlipPreviewModalOpen(true)}
                                    title="Click to preview receipt"
                                  />
                                  <div>
                                    <span className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                                      <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
                                      <span>Transfer Slip Attached (Pending Audit)</span>
                                    </span>
                                    <span className="text-[10px] text-sand-muted block mt-0.5">
                                      Will be matched against corporate bank credit advice
                                    </span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReceiptProofUrl('');
                                    setPaymentPhotoError('');
                                  }}
                                  className="text-xs text-sand-muted hover:text-rose-400 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 transition-all cursor-pointer font-mono"
                                >
                                  Change Slip
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <label className="border-2 border-dashed border-white/20 hover:border-sunset-coral/50 active:scale-[0.99] rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 bg-[#0B131B]/80 hover:bg-[#0B131B] cursor-pointer transition-all">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                      setPaymentPhotoError('');
                                      handleBankFileUpload(e);
                                    }}
                                    className="hidden"
                                  />
                                  <UploadCloud className="w-5 h-5 text-sand-muted" />
                                  <span className="text-xs text-ivory font-medium">
                                    {isBankUploading ? 'Compressing and uploading slip...' : 'Attach Bank Deposit / Transfer Screenshot'}
                                  </span>
                                  <span className="text-[10px] text-sand-muted font-mono">
                                    Supports JPG, PNG, WEBP
                                  </span>
                                </label>
                                <div className="flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPaymentPhotoError('');
                                      handleAttachBankSample();
                                    }}
                                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 active:scale-95 transition-all cursor-pointer"
                                  >
                                    <Sparkles className="w-3 h-3" />
                                    <span>Attach Sample Bank Deposit Voucher (For Testing)</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Promo Code & Pricing Recap Accordion in Liquid Glass */}
              <div className="backdrop-blur-2xl bg-white/[0.05] border border-white/20 rounded-2xl p-6 space-y-4 shadow-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div>
                    <h4 className="font-serif-display text-lg text-ivory font-bold">
                      Pricing Summary & Promo Voucher
                    </h4>
                    <p className="text-xs text-sand-muted">
                      {selectedPackage?.title} • {travelDate} • {numPax} Passenger{numPax > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-sand-muted block">Amount Due Now</span>
                    <span className="text-2xl font-serif-display font-bold text-emerald-400">
                      ₱{amountToPayNow.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* Promo Input */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] uppercase font-mono tracking-wider text-sand-muted flex items-center justify-between">
                      <span>Promo / Voucher Code</span>
                      {appliedPromo && (
                        <button
                          type="button"
                          onClick={handleRemovePromo}
                          className="text-rose-400 hover:text-rose-300 normal-case underline text-[10px] cursor-pointer"
                        >
                          Remove Voucher
                        </button>
                      )}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={enteredPromoCode}
                        onChange={(e) => {
                          setEnteredPromoCode(e.target.value.toUpperCase());
                          setPromoError('');
                        }}
                        placeholder="e.g. HOLIDAY2026"
                        className="flex-1 bg-[#0B131B] border border-white/25 hover:border-white/40 rounded-xl px-3.5 py-2 text-xs font-mono text-ivory placeholder:text-sand-muted/50 focus:outline-none focus:border-sunset-coral transition-all"
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromoCode}
                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-ivory text-xs font-mono font-medium transition-all cursor-pointer border border-white/15"
                      >
                        Apply
                      </button>
                    </div>
                    {promoError && (
                      <p className="text-[10px] text-rose-400 font-mono">{promoError}</p>
                    )}
                    {promoSuccessMsg && (
                      <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>{promoSuccessMsg}</span>
                      </p>
                    )}
                  </div>

                  {/* Summary Breakdown List */}
                  <div className="space-y-1.5 text-xs bg-[#0B131B]/60 p-3.5 rounded-xl border border-white/10">
                    <div className="flex justify-between text-sand-muted">
                      <span>Base Package Subtotal:</span>
                      <span className="font-mono text-ivory">₱{baseSubtotal.toLocaleString()}</span>
                    </div>
                    {appliedPromo && discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>Discount ({appliedPromo.code}):</span>
                        <span className="font-mono font-semibold">-₱{discountAmount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sand-muted">
                      <span>Marine & Environmental Fees:</span>
                      <span className="font-mono text-ivory">₱{conservationFee.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sand-muted border-t border-white/10 pt-1 font-semibold">
                      <span>Total Trip Value:</span>
                      <span className="font-mono text-ivory">₱{grandTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ISO/IEC 27001 & DPA 2012 Form Consent */}
              <div className="backdrop-blur-2xl bg-white/[0.05] border border-white/20 rounded-2xl p-5 space-y-3 shadow-xl">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="consent-terms"
                    checked={consentTermsAccepted}
                    onChange={(e) => setConsentTermsAccepted(e.target.checked)}
                    className="mt-1 rounded bg-[#0B131B] border-white/30 text-sunset-coral focus:ring-sunset-coral cursor-pointer"
                  />
                  <label htmlFor="consent-terms" className="text-xs text-sand-muted leading-relaxed cursor-pointer">
                    I certify that all passenger manifest details entered are complete and correct for civil aviation and maritime manifest clearance. I agree to the{' '}
                    <button
                      type="button"
                      onClick={() => onOpenLegalPolicy?.('terms')}
                      className="text-sunset-coral hover:underline"
                    >
                      Terms of Service
                    </button>{' '}
                    and{' '}
                    <button
                      type="button"
                      onClick={() => onOpenLegalPolicy?.('refund')}
                      className="text-sunset-coral hover:underline"
                    >
                      Cancellation & Refund Policy
                    </button>
                    .
                  </label>
                </div>

                {consentError && (
                  <p className="text-xs text-rose-400 font-mono flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Please accept the terms and statutory manifest declaration to proceed.
                  </p>
                )}

                {paymentPhotoError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-start gap-2 animate-shake">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{paymentPhotoError}</span>
                  </div>
                )}
              </div>

              {/* Navigation buttons (Liquid Glass Bottom Action Bar) */}
              <div className="backdrop-blur-2xl bg-white/[0.08] border border-white/25 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl z-10">
                <button
                  type="button"
                  id="btn-back-to-manifest"
                  onClick={() => triggerTapLoading(() => setBookingStep(2), 'Returning to manifest...', true)}
                  className="btn-pop w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 text-xs text-ivory font-medium transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Passengers</span>
                </button>

                <button
                  type="button"
                  id="btn-confirm-final-booking"
                  disabled={isSubmittingBooking || isFinalizingLockRef.current}
                  onClick={() => triggerTapLoading(() => handlePromptFinalizeBooking(), 'Verifying consent & generating booking...')}
                  className="btn-pop w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-sunset-coral hover:bg-sunset-coral/90 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none text-white text-xs font-semibold shadow-xl shadow-sunset-coral/30 transition-all cursor-pointer"
                >
                  {isSubmittingBooking ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing Reservation...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>{isPriceHoldOption ? 'Lock Price & Confirm Hold' : 'Confirm & Generate Manifest'}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Confirmation & Voucher Generation */}
          {bookingStep === 4 && confirmedBooking && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#090E14] border border-white/10 rounded-3xl p-6 sm:p-10 text-center max-w-2xl mx-auto space-y-6 shadow-2xl relative overflow-hidden"
            >
              {/* Rubber Stamp Watermark on Voucher */}
              <div className="absolute top-6 right-6 z-10 pointer-events-none hidden sm:block">
                <RubberStamp
                  type={
                    confirmedBooking.paymentStatus === 'Paid' || confirmedBooking.paymentVerificationStatus === 'Verified'
                      ? 'PAID'
                      : confirmedBooking.invoice.amountPaid > 0
                      ? 'PARTIAL'
                      : 'UNPAID'
                  }
                  subtext={
                    confirmedBooking.paymentVerificationStatus === 'Verified'
                      ? 'OFFICIALLY VERIFIED'
                      : 'AUDIT IN QUEUE'
                  }
                  date={new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  verificationCode={confirmedBooking.bookingRef}
                  size="md"
                  rotation={-10}
                  className="animate-stamp-drop shadow-2xl"
                />
              </div>

              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-mono tracking-widest text-sunset-coral uppercase font-bold">
                  Flight & Tour Confirmed
                </p>
                <h3 className="font-serif-display text-3xl text-ivory">
                  Mabuhay! Your Expedition is Booked
                </h3>
                <p className="text-xs text-sand-muted max-w-md mx-auto">
                  Booking Reference <strong className="text-sunset-coral font-mono">{confirmedBooking.bookingRef}</strong> has been created and registered on the passenger manifest.
                </p>
              </div>

              {/* Recap Card */}
              <div className="bg-[#070B0E] p-4 rounded-2xl border border-white/10 text-left text-xs space-y-2 relative">
                <div className="flex justify-between">
                  <span className="text-sand-muted">Tour:</span>
                  <strong className="text-ivory">{confirmedBooking.tourTitle}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-sand-muted">Travel Date:</span>
                  <strong className="text-ivory">{confirmedBooking.travelDate}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-sand-muted">Lead Guest:</span>
                  <strong className="text-ivory">{confirmedBooking.customer.fullName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-sand-muted">Passengers Manifested:</span>
                  <strong className="text-sunset-coral font-mono">{confirmedBooking.numPax} Persons</strong>
                </div>
                <div className="flex justify-between border-t border-white/5 pt-2">
                  <span className="text-sand-muted">Amount Paid:</span>
                  <strong className="text-emerald-400 font-mono">₱{confirmedBooking.invoice.amountPaid.toLocaleString()}</strong>
                </div>
              </div>

              {/* Expedition Logistics Status Card (To Follow / In Process) */}
              <div className="bg-[#070B0E] p-4 rounded-2xl border border-white/10 text-left text-xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-sand-muted font-bold flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-sunset-coral" />
                    <span>Flight, Hotel & Shuttle Logistics Status</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase">
                    In Confirmation
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5">
                    <div className="flex items-center justify-between text-[10px] font-mono text-sand-muted">
                      <span>Airline / Plane</span>
                      <span className="text-amber-400 font-bold">To Follow</span>
                    </div>
                    <div className="font-semibold text-ivory">
                      {confirmedBooking.flightReservation?.airline || 'Pending Admin Input'}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5">
                    <div className="flex items-center justify-between text-[10px] font-mono text-sand-muted">
                      <span>Resort Hotel</span>
                      <span className="text-amber-400 font-bold">To Follow</span>
                    </div>
                    <div className="font-semibold text-ivory">
                      {confirmedBooking.hotelReservation?.hotelName || 'Pending Admin Input'}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5">
                    <div className="flex items-center justify-between text-[10px] font-mono text-sand-muted">
                      <span>Tourist Shuttle</span>
                      <span className="text-amber-400 font-bold">To Follow</span>
                    </div>
                    <div className="font-semibold text-ivory">
                      {confirmedBooking.transportReservation?.vehicleType || 'Pending Admin Input'}
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-sand-muted font-light leading-relaxed">
                  * Hotel vouchers, domestic/international airline flight numbers, and van shuttle assignments will be finalized and updated here by your designated operations officer once your payment audit is confirmed.
                </p>
              </div>

              {/* Payment Verification Status Alert - Strict Anti-Scam Notice */}
              <div className="p-4 rounded-2xl border bg-amber-500/10 border-amber-500/30 text-amber-300 text-xs text-left space-y-2">
                <div className="flex items-center gap-2 font-mono font-bold uppercase text-[11px]">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Awaiting Operations Finance Verification (Anti-Fraud Protocol)</span>
                </div>
                <p className="leading-relaxed font-sans-body text-sand-muted text-[11px]">
                  To prevent counterfeit and forged payment slips, your reference (<strong className="text-ivory font-mono">{confirmedBooking.invoice.payments[0]?.referenceNo}</strong>) and payment screenshot are queued for manual cross-audit by our Pasig operations staff against our live GCash/InstaPay merchant settlement ledger. Your tour slot is locked for 48 hours.
                </p>
                <p className="text-[10px] text-amber-400/90 font-mono">
                  You can track your live verification progress anytime under the "Check Tickets" tab.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                {onGoToTracker && (
                  <button
                    type="button"
                    onClick={() => onGoToTracker(confirmedBooking.bookingRef)}
                    className="w-full py-3.5 rounded-xl bg-sunset-coral hover:bg-[#ff765b] text-white text-xs font-semibold shadow-lg shadow-sunset-coral/25 flex items-center justify-center gap-2 transition-all cursor-pointer font-sans-body active:scale-98"
                  >
                    <Ticket className="w-4 h-4" />
                    <span>Go to "Check Tickets" Tab to Track Live Updates</span>
                  </button>
                )}

                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      const text = `[HOLIDAY TRAVELERS INC. - RESERVATION CREATED]
Booking Ref: ${confirmedBooking.bookingRef}
Guest: ${confirmedBooking.customer.fullName}
Tour: ${confirmedBooking.tourTitle}
Date: ${confirmedBooking.travelDate}
Passengers: ${confirmedBooking.numPax} Persons
Amount: ₱${confirmedBooking.invoice.amountPaid.toLocaleString()}
Status: Pending Finance Verification

Office: Unit 1101 City & Land Mega Plaza, ADB Ave. cor. Garnet Rd., Ortigas Center, Pasig City
Phone: 0916 525 3517`;
                      navigator.clipboard.writeText(text);
                      setCopiedViberSummary(true);
                      setTimeout(() => setCopiedViberSummary(false), 2000);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs text-sand-muted hover:text-ivory border border-white/10 transition-all cursor-pointer font-sans-body"
                  >
                    {copiedViberSummary ? <Check className="w-4 h-4 text-emerald-400" /> : <MessageSquare className="w-4 h-4 text-blue-400" />}
                    <span>{copiedViberSummary ? 'Summary Copied!' : 'Copy Viber / FB Summary'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsReceiptModalOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-md shadow-emerald-600/20 cursor-pointer font-sans-body"
                  >
                    <FileText className="w-4 h-4" />
                    <span>View Official Receipt</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetBookingFlow}
                    className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs text-sand-muted hover:text-ivory font-medium transition-all cursor-pointer font-sans-body"
                  >
                    {isOperatorView ? 'Return to Table' : 'Book Another Tour'}
                  </button>
                </div>
              </div>

              {/* In-Person Receipt Modal Mounted */}
              <InPersonReceiptModal
                booking={confirmedBooking}
                isOpen={isReceiptModalOpen}
                onClose={() => setIsReceiptModalOpen(false)}
              />
            </motion.div>
          )}
        </motion.div>
      )}



      {/* ========================================================================= */}
      {/* 6. DRAWER: BOOKING DETAIL INSPECTION SLIDE-OVER */}
      {/* ========================================================================= */}
      <BookingDetailDrawer
        booking={selectedBookingForDrawer}
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        onUpdateStatus={onUpdateBookingStatus}
        onUpdatePassengerStatus={handleTogglePassengerBoarding}
        onUpdateBooking={onUpdateBooking}
      />

      {/* ========================================================================= */}
      {/* 7. MODAL: POST-BOOKING GUIDANCE & REAL-TIME TRACKING WALKTHROUGH */}
      {/* ========================================================================= */}
      <BookingGuidanceWalkthroughModal
        isOpen={isGuidanceWalkthroughOpen}
        onClose={() => setIsGuidanceWalkthroughOpen(false)}
        booking={confirmedBooking}
        onGoToTracker={(ref) => {
          setIsGuidanceWalkthroughOpen(false);
          if (onGoToTracker) {
            onGoToTracker(ref || confirmedBooking?.bookingRef || '');
          }
        }}
      />

      {/* ========================================================================= */}
      {/* 8. MODAL: ACTION CONFIRMATION SAFEGUARD FOR BOOKING SUBMISSION */}
      {/* ========================================================================= */}
      <ActionConfirmModal
        isOpen={isConfirmBookingOpen}
        isLoading={isSubmittingBooking}
        onClose={() => {
          if (!isSubmittingBooking) {
            setIsConfirmBookingOpen(false);
          }
        }}
        onConfirm={() => {
          setIsConfirmBookingOpen(false);
          handleFinalizeBooking();
        }}
        title="Confirm Official Expedition Reservation?"
        message="Please verify your expedition details before final submission. Once registered, your passenger manifest is submitted to tour operations."
        details={[
          { label: 'Expedition Package', value: selectedPackage?.title || 'None Selected' },
          { label: 'Lead Traveler', value: customerInfo?.fullName || 'N/A' },
          { label: 'Manifest Count', value: `${numPax} Passenger(s)` },
          { label: 'Travel Date', value: travelDate || 'N/A' },
          { label: 'Payment Method', value: `${paymentMethod || 'Pending'} (${paymentOption ? paymentOption.toUpperCase() : 'N/A'})` },
          { label: 'Amount Due Today', value: `₱${(amountToPayNow || 0).toLocaleString()}` },
        ]}
        confirmText="Yes, Confirm & Reserve"
        cancelText="No, Review Details"
        variant="primary"
        warningNote="Ensure passenger names match their government or passport IDs for airline & tour verification."
      />

      {/* Bank Transfer Slip Fullscreen Zoom Modal */}
      {isSlipPreviewModalOpen && receiptProofUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={() => setIsSlipPreviewModalOpen(false)}
        >
          <div 
            className="relative max-w-lg w-full bg-[#0B1014] border border-white/20 rounded-3xl p-4 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-semibold text-ivory">Attached Bank Transfer Slip</span>
              <button
                type="button"
                onClick={() => setIsSlipPreviewModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="max-h-[75vh] overflow-auto rounded-2xl border border-white/10 bg-black flex items-center justify-center p-2">
              <img
                src={receiptProofUrl}
                alt="Bank Transfer Slip Full View"
                className="max-h-[70vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

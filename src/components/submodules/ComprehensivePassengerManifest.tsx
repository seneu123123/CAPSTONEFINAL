import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  CreditCard, 
  Printer, 
  Download, 
  Plane, 
  Building2, 
  Car, 
  ShieldCheck, 
  FileText, 
  DollarSign, 
  X, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Phone, 
  Mail, 
  Calendar, 
  User, 
  MapPin, 
  Sparkles,
  Luggage,
  BedDouble,
  HeartPulse,
  Eye,
  RefreshCw,
  Receipt,
  LayoutGrid,
  List
} from 'lucide-react';
import { Booking, Passenger, TourPackage } from '../../types';
import { saveBookingToDb } from '../../utils/supabaseClient';
import { dispatchAppNotification } from '../../utils/notifications';
import { formatCurrency, getStoredCurrency, SupportedCurrency } from '../../utils/currency';

interface ComprehensivePassengerManifestProps {
  bookings: Booking[];
  packages?: TourPackage[];
  onUpdateBooking: (updated: Booking) => void;
  onRefreshFromCloud?: () => void;
}

export const ComprehensivePassengerManifest: React.FC<ComprehensivePassengerManifestProps> = ({
  bookings,
  packages = [],
  onUpdateBooking,
  onRefreshFromCloud
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTourFilter, setSelectedTourFilter] = useState('ALL');
  const [selectedBoardingFilter, setSelectedBoardingFilter] = useState<'ALL' | 'boarded' | 'pending' | 'noshow'>('ALL');
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState<'ALL' | 'Fully Paid' | '50% Downpayment' | 'Partial' | 'Pending' | 'Refunded'>('ALL');
  const [manifestViewMode, setManifestViewMode] = useState<'table' | 'cards'>('table');
  
  // Passenger Form Modal (Add / Edit)
  const [isPassengerModalOpen, setIsPassengerModalOpen] = useState(false);
  const [editingPassenger, setEditingPassenger] = useState<{
    bookingId: string;
    passenger: Passenger;
    isNew: boolean;
  } | null>(null);

  // Quick Payment Update Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<{
    booking: Booking;
    passenger?: Passenger;
  } | null>(null);

  // Print Preview Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printBookingRef, setPrintBookingRef] = useState<string>('ALL');

  // Active currency
  const [currency] = useState<SupportedCurrency>(getStoredCurrency());

  // Flattened Passengers list with Booking references
  const allPassengerEntries = useMemo(() => {
    const list: Array<{
      booking: Booking;
      passenger: Passenger;
      index: number;
    }> = [];

    bookings.forEach((b) => {
      const paxs = b.passengers && b.passengers.length > 0 
        ? b.passengers 
        : [
            {
              id: `${b.id}-lead-pax`,
              fullName: b.customer.fullName || 'Lead Traveler',
              age: 30,
              gender: 'Female' as const,
              passportOrId: b.bookingRef,
              nationality: b.customer.nationality || 'Filipino',
              boardingStatus: 'boarded' as const,
              specialRequirements: b.specialInstructions,
              paidAmount: b.invoice?.amountPaid || (b.paymentStatus === 'Paid' ? b.totalPrice : b.depositRequired),
              balanceDue: b.invoice?.balanceDue || (b.paymentStatus === 'Paid' ? 0 : b.totalPrice - b.depositRequired),
              paymentStatus: (b.paymentStatus === 'Paid' ? 'Fully Paid' : (b.invoice?.amountPaid || 0) > 0 ? '50% Downpayment' : 'Pending') as any,
              contactNumber: b.customer.phone,
              seatNumber: '12A',
              cabinClass: 'Economy',
              roomAssignment: 'Deluxe Room 204'
            }
          ];

      paxs.forEach((p, idx) => {
        list.push({
          booking: b,
          passenger: p,
          index: idx
        });
      });
    });

    return list;
  }, [bookings]);

  // Filtered List
  const filteredEntries = useMemo(() => {
    return allPassengerEntries.filter(({ booking, passenger }) => {
      // Tour filter
      if (selectedTourFilter !== 'ALL' && booking.tourPackageId !== selectedTourFilter && booking.tourTitle !== selectedTourFilter) {
        return false;
      }

      // Boarding filter
      const bStatus = passenger.boardingStatus || 'pending';
      if (selectedBoardingFilter !== 'ALL' && bStatus !== selectedBoardingFilter) {
        return false;
      }

      // Payment filter
      const pStatus = passenger.paymentStatus || (booking.paymentStatus === 'Paid' ? 'Fully Paid' : 'Pending');
      if (selectedPaymentFilter !== 'ALL' && pStatus !== selectedPaymentFilter) {
        return false;
      }

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = passenger.fullName.toLowerCase().includes(q);
        const matchRef = booking.bookingRef.toLowerCase().includes(q);
        const matchPassport = (passenger.passportOrId || '').toLowerCase().includes(q);
        const matchContact = (passenger.contactNumber || booking.customer.phone || '').toLowerCase().includes(q);
        const matchTour = booking.tourTitle.toLowerCase().includes(q);
        const matchEmail = (booking.customer.email || '').toLowerCase().includes(q);
        const matchSeat = (passenger.seatNumber || '').toLowerCase().includes(q);
        const matchRoom = (passenger.roomAssignment || '').toLowerCase().includes(q);

        return matchName || matchRef || matchPassport || matchContact || matchTour || matchEmail || matchSeat || matchRoom;
      }

      return true;
    });
  }, [allPassengerEntries, selectedTourFilter, selectedBoardingFilter, selectedPaymentFilter, searchQuery]);

  // Overall Manifest Stats
  const manifestStats = useMemo(() => {
    const totalPax = allPassengerEntries.length;
    const boardedPax = allPassengerEntries.filter(e => (e.passenger.boardingStatus || 'pending') === 'boarded').length;
    const pendingPax = allPassengerEntries.filter(e => (e.passenger.boardingStatus || 'pending') === 'pending').length;
    const noShowPax = allPassengerEntries.filter(e => (e.passenger.boardingStatus || 'pending') === 'noshow').length;
    const fullyPaidPax = allPassengerEntries.filter(e => (e.passenger.paymentStatus || (e.booking.paymentStatus === 'Paid' ? 'Fully Paid' : 'Pending')) === 'Fully Paid').length;
    const totalCollected = bookings.reduce((sum, b) => sum + (b.invoice?.amountPaid || (b.paymentStatus === 'Paid' ? b.totalPrice : 0)), 0);
    const totalOutstanding = bookings.reduce((sum, b) => sum + (b.invoice?.balanceDue || (b.paymentStatus === 'Paid' ? 0 : b.totalPrice)), 0);

    return {
      totalPax,
      boardedPax,
      pendingPax,
      noShowPax,
      fullyPaidPax,
      totalCollected,
      totalOutstanding
    };
  }, [allPassengerEntries, bookings]);

  // Handle Quick Boarding Status Toggle
  const handleToggleBoarding = async (booking: Booking, passengerId: string, newStatus: 'boarded' | 'pending' | 'noshow') => {
    const updatedPassengers = (booking.passengers && booking.passengers.length > 0 ? booking.passengers : [
      {
        id: `${booking.id}-lead-pax`,
        fullName: booking.customer.fullName,
        age: 30,
        gender: 'Female' as const,
        passportOrId: booking.bookingRef,
        nationality: booking.customer.nationality || 'Filipino',
        boardingStatus: 'boarded' as const
      }
    ]).map(p => p.id === passengerId ? { ...p, boardingStatus: newStatus } : p);

    const updatedBooking: Booking = {
      ...booking,
      passengers: updatedPassengers
    };

    onUpdateBooking(updatedBooking);
    await saveBookingToDb(updatedBooking);

    dispatchAppNotification({
      title: 'Passenger Boarding Updated',
      message: `Passenger marked as ${newStatus.toUpperCase()} on Booking ${booking.bookingRef}.`,
      type: 'logistics',
      bookingRef: booking.bookingRef
    }, booking.customer?.email);
  };

  // Open Edit/Add Passenger Modal
  const handleOpenAddPassenger = (bookingId?: string) => {
    const targetBooking = bookingId 
      ? bookings.find(b => b.id === bookingId) 
      : bookings[0];

    if (!targetBooking) {
      alert('No active bookings available to add passengers.');
      return;
    }

    const newPax: Passenger = {
      id: `pax-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      fullName: '',
      age: 28,
      gender: 'Male',
      passportOrId: '',
      nationality: 'Filipino',
      boardingStatus: 'pending',
      specialRequirements: '',
      dietaryPreference: 'Standard Meal',
      birthDate: '1996-01-01',
      passportExpiry: '2030-01-01',
      contactNumber: targetBooking.customer.phone || '',
      emergencyContactName: targetBooking.customer.emergencyContact || '',
      emergencyContactPhone: targetBooking.customer.phone || '',
      seatNumber: `${Math.floor(Math.random() * 25) + 1}A`,
      cabinClass: 'Economy',
      roomAssignment: 'Standard Deluxe',
      baggageAllowance: '20kg Check-in + 7kg Carry-on',
      pickupDropoffLocation: 'Terminal 3 / Hotel Shuttle',
      individualPrice: Math.round(targetBooking.totalPrice / (targetBooking.numPax || 1)),
      paidAmount: targetBooking.paymentStatus === 'Paid' ? Math.round(targetBooking.totalPrice / (targetBooking.numPax || 1)) : 0,
      balanceDue: targetBooking.paymentStatus === 'Paid' ? 0 : Math.round(targetBooking.totalPrice / (targetBooking.numPax || 1)),
      paymentStatus: targetBooking.paymentStatus === 'Paid' ? 'Fully Paid' : 'Pending',
      officialReceiptNo: '',
      paymentReferenceNo: '',
      paymentMethod: 'GCash',
      paymentDate: new Date().toISOString().split('T')[0],
      eTicketNumber: `ET-${Math.floor(10000000 + Math.random() * 90000000)}`,
      notes: ''
    };

    setEditingPassenger({
      bookingId: targetBooking.id,
      passenger: newPax,
      isNew: true
    });
    setIsPassengerModalOpen(true);
  };

  const handleOpenEditPassenger = (booking: Booking, passenger: Passenger) => {
    setEditingPassenger({
      bookingId: booking.id,
      passenger: { ...passenger },
      isNew: false
    });
    setIsPassengerModalOpen(true);
  };

  // Save Passenger (Add/Edit)
  const handleSavePassenger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPassenger) return;

    const { bookingId, passenger, isNew } = editingPassenger;
    const targetBooking = bookings.find(b => b.id === bookingId);
    if (!targetBooking) return;

    let updatedPassengers: Passenger[];
    const currentPassengers = targetBooking.passengers && targetBooking.passengers.length > 0 
      ? [...targetBooking.passengers] 
      : [];

    if (isNew) {
      updatedPassengers = [...currentPassengers, passenger];
    } else {
      updatedPassengers = currentPassengers.map(p => p.id === passenger.id ? passenger : p);
    }

    // Auto calculate booking total price and pax count if needed
    const newNumPax = updatedPassengers.length;
    const updatedBooking: Booking = {
      ...targetBooking,
      numPax: newNumPax,
      passengers: updatedPassengers
    };

    onUpdateBooking(updatedBooking);
    await saveBookingToDb(updatedBooking);

    setIsPassengerModalOpen(false);
    setEditingPassenger(null);

    // Cross-platform real-time customer notification with direct ticket redirect
    const seatDesc = passenger.seatNumber ? `Seat ${passenger.seatNumber}` : 'Seat Assigned';
    const roomDesc = passenger.roomAssignment ? `Room: ${passenger.roomAssignment}` : 'Room TBA';
    const shuttleDesc = passenger.pickupDropoffLocation ? `Shuttle: ${passenger.pickupDropoffLocation}` : 'Shuttle TBA';

    dispatchAppNotification({
      title: isNew ? '✈️ Passenger Added & Logistics Assigned' : '✈️ Manifest & Logistics Updated',
      message: `${passenger.fullName || 'Passenger'} manifest updated: ${seatDesc} • ${roomDesc} • ${shuttleDesc} (Ref #${targetBooking.bookingRef}).`,
      type: 'logistics',
      bookingRef: targetBooking.bookingRef,
      actionLabel: 'View Ticket'
    }, targetBooking.customer?.email);
  };

  // Synchronize all plane seats, hotel rooms & transport shuttles across all booking manifests
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handleSyncAllLogisticsToManifest = async () => {
    let syncedCount = 0;
    for (const b of bookings) {
      let bookingChanged = false;
      const currentPassengers = b.passengers && b.passengers.length > 0 ? [...b.passengers] : [];
      if (currentPassengers.length === 0) continue;

      const updatedPassengers = currentPassengers.map((p, idx) => {
        let seat = p.seatNumber;
        let cabin = p.cabinClass;
        let room = p.roomAssignment;
        let shuttle = p.pickupDropoffLocation;

        if (!seat && b.flightReservation) {
          seat = `${12 + idx}A`;
          cabin = b.flightReservation.cabinClass || 'Economy';
          bookingChanged = true;
        }
        if (!room && b.hotelReservation) {
          room = `${b.hotelReservation.hotelName} (${b.hotelReservation.roomType})`;
          bookingChanged = true;
        }
        if (!shuttle && b.transportReservation) {
          shuttle = `${b.transportReservation.pickupLocation} ➔ ${b.transportReservation.dropoffLocation} (${b.transportReservation.vehicleType} • Plate: ${b.transportReservation.plateNumber})`;
          bookingChanged = true;
        }

        return {
          ...p,
          seatNumber: seat,
          cabinClass: cabin,
          roomAssignment: room,
          pickupDropoffLocation: shuttle
        };
      });

      if (bookingChanged) {
        syncedCount++;
        const updatedBooking: Booking = {
          ...b,
          passengers: updatedPassengers
        };
        onUpdateBooking(updatedBooking);
        await saveBookingToDb(updatedBooking);

        dispatchAppNotification({
          title: '✈️ Travel Logistics & Manifest Synced',
          message: `All plane seats, hotel rooms, and shuttle transfers have been synchronized for Booking Ref #${b.bookingRef}.`,
          type: 'logistics',
          bookingRef: b.bookingRef,
          actionLabel: 'View Ticket'
        }, b.customer?.email);
      }
    }

    setSyncFeedback(`Successfully synchronized flight seats, hotel rooms & shuttle logistics across ${syncedCount} booking manifests!`);
    setTimeout(() => setSyncFeedback(null), 5000);
  };

  // Remove Passenger
  const handleRemovePassenger = async (booking: Booking, passengerId: string) => {
    if (!confirm('Are you sure you want to remove this passenger from the manifest?')) return;

    const updatedPassengers = (booking.passengers || []).filter(p => p.id !== passengerId);
    const updatedBooking: Booking = {
      ...booking,
      numPax: Math.max(1, updatedPassengers.length),
      passengers: updatedPassengers
    };

    onUpdateBooking(updatedBooking);
    await saveBookingToDb(updatedBooking);

    dispatchAppNotification({
      title: 'Passenger Removed',
      message: `Passenger removed from Booking #${booking.bookingRef} manifest.`,
      type: 'logistics',
      bookingRef: booking.bookingRef
    }, booking.customer?.email);
  };

  // Open Quick Payment Update Modal
  const handleOpenPaymentModal = (booking: Booking, passenger?: Passenger) => {
    setPaymentTarget({ booking, passenger });
    setIsPaymentModalOpen(true);
  };

  // Save Manual Payment Update
  const handleSavePaymentUpdate = async (paymentData: {
    paidAmount: number;
    balanceDue: number;
    paymentStatus: 'Fully Paid' | '50% Downpayment' | 'Partial' | 'Pending' | 'Refunded';
    officialReceiptNo: string;
    paymentReferenceNo: string;
    paymentMethod: string;
    paymentDate: string;
    adminNotes: string;
  }) => {
    if (!paymentTarget) return;
    const { booking, passenger } = paymentTarget;

    let updatedBooking: Booking;

    if (passenger) {
      // Update individual passenger payment & booking invoice
      const updatedPassengers = (booking.passengers || []).map(p => {
        if (p.id === passenger.id) {
          return {
            ...p,
            paidAmount: paymentData.paidAmount,
            balanceDue: paymentData.balanceDue,
            paymentStatus: paymentData.paymentStatus,
            officialReceiptNo: paymentData.officialReceiptNo,
            paymentReferenceNo: paymentData.paymentReferenceNo,
            paymentMethod: paymentData.paymentMethod,
            paymentDate: paymentData.paymentDate,
            notes: paymentData.adminNotes
          };
        }
        return p;
      });

      // Sum all passenger payments
      const totalPaxPaid = updatedPassengers.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
      const isFullyPaid = paymentData.paymentStatus === 'Fully Paid' || totalPaxPaid >= booking.totalPrice;

      updatedBooking = {
        ...booking,
        passengers: updatedPassengers,
        paymentStatus: isFullyPaid ? 'Paid' : totalPaxPaid > 0 ? 'Partial' : 'Unpaid',
        invoice: {
          ...booking.invoice,
          amountPaid: totalPaxPaid,
          balanceDue: Math.max(0, booking.totalPrice - totalPaxPaid),
          status: isFullyPaid ? 'Paid' : totalPaxPaid > 0 ? 'Partial' : 'Unpaid',
          payments: [
            ...(booking.invoice?.payments || []),
            {
              id: `pay-${Date.now()}`,
              date: paymentData.paymentDate || new Date().toISOString(),
              amount: paymentData.paidAmount,
              method: (paymentData.paymentMethod as any) || 'GCash',
              referenceNo: paymentData.paymentReferenceNo || paymentData.officialReceiptNo || `REF-${Date.now().toString().slice(-6)}`,
              status: 'Verified',
              auditNote: `Manual Admin Payment Record by Tour Operations. OR #${paymentData.officialReceiptNo || 'N/A'}. ${paymentData.adminNotes}`,
              verifiedBy: 'Tour Operations Admin',
              verifiedAt: new Date().toISOString()
            }
          ]
        }
      };
    } else {
      // Update booking-level payment
      const isFullyPaid = paymentData.paymentStatus === 'Fully Paid' || paymentData.balanceDue <= 0;
      updatedBooking = {
        ...booking,
        paymentStatus: isFullyPaid ? 'Paid' : paymentData.paidAmount > 0 ? 'Partial' : 'Unpaid',
        invoice: {
          ...booking.invoice,
          amountPaid: paymentData.paidAmount,
          balanceDue: paymentData.balanceDue,
          status: isFullyPaid ? 'Paid' : paymentData.paidAmount > 0 ? 'Partial' : 'Unpaid',
          payments: [
            ...(booking.invoice?.payments || []),
            {
              id: `pay-${Date.now()}`,
              date: paymentData.paymentDate || new Date().toISOString(),
              amount: paymentData.paidAmount,
              method: (paymentData.paymentMethod as any) || 'GCash',
              referenceNo: paymentData.paymentReferenceNo || paymentData.officialReceiptNo || `REF-${Date.now().toString().slice(-6)}`,
              status: 'Verified',
              auditNote: `Manual Admin Payment: ${paymentData.adminNotes}. OR #${paymentData.officialReceiptNo || 'N/A'}`,
              verifiedBy: 'Tour Operations Admin',
              verifiedAt: new Date().toISOString()
            }
          ]
        }
      };
    }

    onUpdateBooking(updatedBooking);
    await saveBookingToDb(updatedBooking);

    setIsPaymentModalOpen(false);
    setPaymentTarget(null);

    // Cross-platform real-time notification
    dispatchAppNotification({
      title: 'Payment & Balance Updated',
      message: `Payment of ${formatCurrency(paymentData.paidAmount, currency)} recorded for Booking ${booking.bookingRef}. Status: ${paymentData.paymentStatus}.`,
      type: 'payment_verified',
      bookingRef: booking.bookingRef
    }, booking.customer?.email);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Booking Ref',
      'Tour Package',
      'Travel Date',
      'Passenger Name',
      'Age',
      'Gender',
      'Nationality',
      'Passport / ID No',
      'Contact Phone',
      'Emergency Contact',
      'Flight Seat',
      'Cabin Class',
      'Airline & Flight No',
      'Hotel Resort Name',
      'Hotel Room',
      'Transport Shuttle Vehicle',
      'Shuttle Plate & Driver',
      'Pickup & Dropoff Location',
      'Baggage Allowance',
      'Dietary Preference',
      'Medical Notes',
      'Boarding Status',
      'Individual Price',
      'Paid Amount',
      'Balance Due',
      'Payment Status',
      'Official Receipt No',
      'Payment Ref No',
      'E-Ticket No'
    ];

    const rows = filteredEntries.map(({ booking, passenger }) => [
      booking.bookingRef,
      `"${booking.tourTitle.replace(/"/g, '""')}"`,
      booking.travelDate,
      `"${passenger.fullName.replace(/"/g, '""')}"`,
      passenger.age,
      passenger.gender || '',
      passenger.nationality || 'Filipino',
      passenger.passportOrId || '',
      passenger.contactNumber || booking.customer.phone || '',
      `"${(passenger.emergencyContactName ? `${passenger.emergencyContactName} (${passenger.emergencyContactPhone || ''})` : booking.customer.emergencyContact || '').replace(/"/g, '""')}"`,
      passenger.seatNumber || (booking.flightReservation ? 'Assigned' : 'Unassigned'),
      passenger.cabinClass || booking.flightReservation?.cabinClass || 'Economy',
      `"${(booking.flightReservation ? `${booking.flightReservation.airline} (${booking.flightReservation.flightNumber})` : 'TBA').replace(/"/g, '""')}"`,
      `"${(booking.hotelReservation ? booking.hotelReservation.hotelName : 'Partner Resort').replace(/"/g, '""')}"`,
      `"${(passenger.roomAssignment || booking.hotelReservation?.roomType || 'Room TBA').replace(/"/g, '""')}"`,
      `"${(booking.transportReservation ? booking.transportReservation.vehicleType : 'Tourist Shuttle').replace(/"/g, '""')}"`,
      `"${(booking.transportReservation ? `Plate: ${booking.transportReservation.plateNumber} (Driver: ${booking.transportReservation.driverName})` : 'TBA').replace(/"/g, '""')}"`,
      `"${(passenger.pickupDropoffLocation || booking.transportReservation?.pickupLocation || 'Airport Bay').replace(/"/g, '""')}"`,
      passenger.baggageAllowance || '20kg',
      passenger.dietaryPreference || 'Standard',
      `"${(passenger.medicalNotes || passenger.specialRequirements || '').replace(/"/g, '""')}"`,
      passenger.boardingStatus || 'pending',
      passenger.individualPrice || Math.round(booking.totalPrice / (booking.numPax || 1)),
      passenger.paidAmount || (booking.paymentStatus === 'Paid' ? Math.round(booking.totalPrice / (booking.numPax || 1)) : 0),
      passenger.balanceDue || 0,
      passenger.paymentStatus || (booking.paymentStatus === 'Paid' ? 'Fully Paid' : 'Pending'),
      passenger.officialReceiptNo || '',
      passenger.paymentReferenceNo || '',
      passenger.eTicketNumber || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Holiday_Travelers_Passenger_Manifest_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Synchronization Feedback Notice */}
      {syncFeedback && (
        <div className="p-4 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-200 text-xs flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-cyan-400 shrink-0" />
            <span className="font-medium">{syncFeedback}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setSyncFeedback(null)} 
            className="text-cyan-400 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header & Metric Cards */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-gradient-to-r from-[#0C131D] via-[#090E14] to-[#0D1520] p-6 rounded-3xl border border-white/10 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-sunset-coral/15 text-sunset-coral text-[11px] font-mono font-bold border border-sunset-coral/30">
              CAAP & DOT Security Roster
            </span>
            <span className="text-xs text-sand-muted font-mono">Real-Time Cloud Synced</span>
          </div>
          <h2 className="font-serif-display text-2xl text-ivory font-medium">
            Comprehensive Passenger Manifest & Ledger
          </h2>
          <p className="text-xs text-sand-muted leading-relaxed max-w-2xl">
            Centralized operations engine for manual passenger enrollment, identity & document verification, flight seat assignments, room allocations, manual payment collection, and official receipt issuing.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onRefreshFromCloud && (
            <button
              onClick={onRefreshFromCloud}
              className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-sand-muted hover:text-ivory border border-white/10 transition-colors cursor-pointer"
              title="Sync Latest Database Changes"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleSyncAllLogisticsToManifest}
            className="px-3.5 py-2.5 rounded-xl bg-cyan-950/50 hover:bg-cyan-900/70 text-cyan-200 text-xs font-medium border border-cyan-800/50 shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            title="Synchronize plane seats, hotel rooms, and shuttle transfers with passenger manifest"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Sync Logistics to Manifest</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-ivory text-xs font-medium border border-white/10 transition-all flex items-center gap-2 cursor-pointer"
            title="Download CSV Manifest"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => {
              setPrintBookingRef('ALL');
              setIsPrintModalOpen(true);
            }}
            className="px-3.5 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-ivory text-xs font-medium border border-white/10 transition-all flex items-center gap-2 cursor-pointer"
            title="Print Official Certified Manifest"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Print Manifest</span>
          </button>

          <button
            onClick={() => handleOpenAddPassenger()}
            className="px-4 py-2.5 rounded-xl bg-sunset-coral hover:bg-[#ff765b] text-white text-xs font-semibold shadow-lg shadow-sunset-coral/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Manually Add Passenger</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
        <div className="p-4 rounded-2xl bg-[#090E14] border border-white/10 space-y-1">
          <span className="text-[10px] font-mono text-sand-muted uppercase block">Total Manifest Pax</span>
          <p className="text-xl font-serif-display text-ivory font-semibold">{manifestStats.totalPax} Travelers</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#090E14] border border-white/10 space-y-1">
          <span className="text-[10px] font-mono text-emerald-400 uppercase block">Boarded on Tour</span>
          <p className="text-xl font-serif-display text-emerald-300 font-semibold">{manifestStats.boardedPax} / {manifestStats.totalPax}</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#090E14] border border-white/10 space-y-1">
          <span className="text-[10px] font-mono text-cyan-400 uppercase block">Fully Settled Pax</span>
          <p className="text-xl font-serif-display text-cyan-300 font-semibold">{manifestStats.fullyPaidPax} Pax</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#090E14] border border-white/10 space-y-1">
          <span className="text-[10px] font-mono text-emerald-400 uppercase block">Total Collected</span>
          <p className="text-xl font-serif-display text-emerald-400 font-semibold">{formatCurrency(manifestStats.totalCollected, currency)}</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#090E14] border border-white/10 space-y-1">
          <span className="text-[10px] font-mono text-sunset-coral uppercase block">Balance Outstanding</span>
          <p className="text-xl font-serif-display text-sunset-coral font-semibold">{formatCurrency(manifestStats.totalOutstanding, currency)}</p>
        </div>
      </div>

      {/* Search, Quick Filter Pills & Comprehensive Filters */}
      <div className="bg-[#090E14] border border-white/10 p-4 rounded-3xl space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-sand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Name, Passport ID, Ref, Phone, Seat..."
              className="w-full bg-[#070B0E] border border-white/10 rounded-xl pl-10 pr-8 py-2 text-xs text-ivory placeholder:text-sand-muted/50 focus:outline-none focus:border-sunset-coral transition-colors"
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

          {/* View Switcher & Dropdown Filters */}
          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-between md:justify-end">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-[#070B0E] p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setManifestViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  manifestViewMode === 'table'
                    ? 'bg-sunset-coral text-white shadow-sm'
                    : 'text-sand-muted hover:text-ivory'
                }`}
                title="Matrix Table Roster View"
              >
                <List className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
              <button
                onClick={() => setManifestViewMode('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  manifestViewMode === 'cards'
                    ? 'bg-sunset-coral text-white shadow-sm'
                    : 'text-sand-muted hover:text-ivory'
                }`}
                title="Interactive Passenger Cards View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
            </div>

            {/* Tour Package Filter */}
            <select
              value={selectedTourFilter}
              onChange={(e) => setSelectedTourFilter(e.target.value)}
              className="bg-[#070B0E] border border-white/10 rounded-xl px-3 py-2 text-xs text-ivory focus:outline-none focus:border-sunset-coral cursor-pointer max-w-[200px]"
            >
              <option value="ALL">All Expeditions & Packages</option>
              {packages.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>

            {/* Boarding Status */}
            <select
              value={selectedBoardingFilter}
              onChange={(e) => setSelectedBoardingFilter(e.target.value as any)}
              className="bg-[#070B0E] border border-white/10 rounded-xl px-3 py-2 text-xs text-ivory focus:outline-none focus:border-sunset-coral cursor-pointer"
            >
              <option value="ALL">All Boarding Statuses</option>
              <option value="boarded">Boarded</option>
              <option value="pending">Pending Boarding</option>
              <option value="noshow">No Show</option>
            </select>

            {/* Payment Status */}
            <select
              value={selectedPaymentFilter}
              onChange={(e) => setSelectedPaymentFilter(e.target.value as any)}
              className="bg-[#070B0E] border border-white/10 rounded-xl px-3 py-2 text-xs text-ivory focus:outline-none focus:border-sunset-coral cursor-pointer"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="Fully Paid">Fully Paid</option>
              <option value="50% Downpayment">50% Downpayment</option>
              <option value="Partial">Partial Payment</option>
              <option value="Pending">Pending Payment</option>
              <option value="Refunded">Refunded</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-white/[0.04]">
          <span className="text-[10px] font-mono text-sand-muted uppercase mr-1">Quick Filters:</span>
          <button
            onClick={() => {
              setSelectedBoardingFilter('ALL');
              setSelectedPaymentFilter('ALL');
            }}
            className={`px-2.5 py-1 rounded-full text-[11px] font-mono transition-colors cursor-pointer ${
              selectedBoardingFilter === 'ALL' && selectedPaymentFilter === 'ALL'
                ? 'bg-white/15 text-ivory font-semibold'
                : 'bg-white/[0.04] text-sand-muted hover:text-ivory'
            }`}
          >
            All Travelers ({allPassengerEntries.length})
          </button>
          <button
            onClick={() => setSelectedBoardingFilter('boarded')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-mono transition-colors cursor-pointer ${
              selectedBoardingFilter === 'boarded'
                ? 'bg-emerald-500/25 text-emerald-300 font-semibold border border-emerald-500/40'
                : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            Boarded ({manifestStats.boardedPax})
          </button>
          <button
            onClick={() => setSelectedBoardingFilter('pending')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-mono transition-colors cursor-pointer ${
              selectedBoardingFilter === 'pending'
                ? 'bg-amber-500/25 text-amber-300 font-semibold border border-amber-500/40'
                : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
            }`}
          >
            Pending Boarding ({manifestStats.pendingPax})
          </button>
          <button
            onClick={() => setSelectedPaymentFilter('Fully Paid')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-mono transition-colors cursor-pointer ${
              selectedPaymentFilter === 'Fully Paid'
                ? 'bg-cyan-500/25 text-cyan-300 font-semibold border border-cyan-500/40'
                : 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'
            }`}
          >
            Fully Settled ({manifestStats.fullyPaidPax})
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW A: MATRIX TABLE ROSTER VIEW (OPTIMIZED & SCROLLABLE WITH STICKY HEADER) */}
      {/* ========================================================================= */}
      {manifestViewMode === 'table' && (
        <div className="bg-[#090E14] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
          {/* Scroll Hint Banner */}
          <div className="px-4 py-2 bg-[#06090D] border-b border-white/[0.06] flex items-center justify-between text-[11px] text-sand-muted">
            <span className="flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Showing {filteredEntries.length} manifested travelers • Scroll table horizontally or switch to Card View
            </span>
            <span className="text-[10px] font-mono text-sand-muted/70 hidden sm:inline">
              ← Drag or scroll to view all operations columns →
            </span>
          </div>

          <div className="overflow-x-auto max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-20 bg-[#0B1017] text-sand-muted text-[10px] font-mono uppercase tracking-wider border-b border-white/10 shadow-md">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center bg-[#0B1017]">#</th>
                  <th className="py-3.5 px-4 bg-[#0B1017] min-w-[200px]">Passenger Details</th>
                  <th className="py-3.5 px-4 bg-[#0B1017] min-w-[190px]">Booking & Expedition</th>
                  <th className="py-3.5 px-4 bg-[#0B1017] min-w-[150px]">Identification & Docs</th>
                  <th className="py-3.5 px-4 bg-[#0B1017] min-w-[280px]">Flight Seat, Hotel & Shuttle Logistics</th>
                  <th className="py-3.5 px-4 bg-[#0B1017] min-w-[160px]">Emergency & Health</th>
                  <th className="py-3.5 px-4 bg-[#0B1017] min-w-[180px]">Manual Payment & Balance</th>
                  <th className="py-3.5 px-4 bg-[#0B1017] text-center min-w-[170px]">Boarding Status</th>
                  <th className="py-3.5 px-4 bg-[#0B1017] text-right min-w-[140px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-ivory text-xs">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-sand-muted text-xs space-y-2">
                      <Users className="w-8 h-8 mx-auto opacity-30 text-sand-muted" />
                      <p className="font-medium text-ivory">No passengers found matching filter criteria.</p>
                      <p className="text-[11px]">Click "Manually Add Passenger" above to register a traveler directly.</p>
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map(({ booking, passenger, index }) => {
                    const boarding = passenger.boardingStatus || 'pending';
                    const paxPaymentStatus = passenger.paymentStatus || (booking.paymentStatus === 'Paid' ? 'Fully Paid' : 'Pending');
                    const paid = passenger.paidAmount ?? (booking.paymentStatus === 'Paid' ? Math.round(booking.totalPrice / (booking.numPax || 1)) : 0);
                    const price = passenger.individualPrice ?? Math.round(booking.totalPrice / (booking.numPax || 1));
                    const balance = Math.max(0, price - paid);

                    return (
                      <tr key={`manifest-row-${booking.id}-${passenger.id || index}`} className="hover:bg-white/[0.02] transition-colors">
                        {/* Index */}
                        <td className="py-4 px-4 text-center font-mono text-sand-muted">
                          {index + 1}
                        </td>

                        {/* Passenger Name & Demographics */}
                        <td className="py-4 px-4 min-w-[200px]">
                          <div className="font-serif-display text-sm font-medium text-ivory">
                            {passenger.fullName || 'Unregistered Guest'}
                          </div>
                          <div className="text-[11px] text-sand-muted font-mono flex items-center gap-1.5 mt-0.5">
                            <span>{passenger.age || 28} yo</span>
                            <span>•</span>
                            <span>{passenger.gender || 'F'}</span>
                            <span>•</span>
                            <span className="text-cyan-400">{passenger.nationality || 'Filipino'}</span>
                          </div>
                          {passenger.contactNumber && (
                            <div className="text-[10px] text-sand-muted flex items-center gap-1 mt-0.5 font-mono">
                              <Phone className="w-2.5 h-2.5 text-sunset-coral" />
                              <span>{passenger.contactNumber}</span>
                            </div>
                          )}
                        </td>

                        {/* Booking & Tour */}
                        <td className="py-4 px-4 min-w-[190px]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-sunset-coral bg-sunset-coral/10 px-1.5 py-0.5 rounded border border-sunset-coral/20 text-[11px]">
                              {booking.bookingRef}
                            </span>
                          </div>
                          <div className="font-medium text-ivory line-clamp-1 mt-1 text-[11px]">
                            {booking.tourTitle}
                          </div>
                          <div className="text-[10px] text-sand-muted font-mono flex items-center gap-1 mt-0.5">
                            <Calendar className="w-2.5 h-2.5 text-sand-muted" />
                            <span>{booking.travelDate}</span>
                          </div>
                        </td>

                        {/* Identification */}
                        <td className="py-4 px-4 min-w-[150px]">
                          <div className="font-mono text-xs text-ivory font-semibold">
                            {passenger.passportOrId || 'ID Not Provided'}
                          </div>
                          <div className="text-[10px] text-sand-muted font-mono mt-0.5">
                            Exp: {passenger.passportExpiry || '2030-12-31'}
                          </div>
                          {passenger.eTicketNumber && (
                            <div className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/20 inline-block mt-1">
                              ETix: {passenger.eTicketNumber}
                            </div>
                          )}
                        </td>

                        {/* Logistics: Plane Seat, Hotel Room & Transport Shuttle */}
                        <td className="py-4 px-4 min-w-[280px]">
                          {/* 1. Plane Seat & Airline */}
                          <div className="flex items-center gap-1.5 text-xs text-ivory">
                            <Plane className="w-3.5 h-3.5 text-sunset-coral shrink-0" />
                            <span className="font-mono font-bold text-sunset-coral">
                              {passenger.seatNumber ? `Seat ${passenger.seatNumber}` : (booking.flightReservation ? 'Seat Assigned' : 'Seat TBA')}
                            </span>
                            <span className="text-[10px] text-sand-muted font-mono">
                              ({passenger.cabinClass || booking.flightReservation?.cabinClass || 'Economy'})
                            </span>
                            {booking.flightReservation && (
                              <span className="text-[9px] font-mono text-sand-muted bg-white/5 border border-white/10 px-1.5 py-0.2 rounded truncate">
                                {booking.flightReservation.airline} {booking.flightReservation.flightNumber ? `(${booking.flightReservation.flightNumber})` : ''}
                              </span>
                            )}
                          </div>

                          {/* 2. Hotel Room & Resort */}
                          <div className="text-[11px] text-ivory flex items-center gap-1.5 mt-1">
                            <BedDouble className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span className="font-medium text-cyan-300 truncate">
                              {passenger.roomAssignment || (booking.hotelReservation ? `${booking.hotelReservation.roomType} (Assigned)` : 'Room TBA')}
                            </span>
                            {booking.hotelReservation?.hotelName && (
                              <span className="text-[10px] text-sand-muted truncate">
                                • {booking.hotelReservation.hotelName}
                              </span>
                            )}
                          </div>

                          {/* 3. Transport Shuttle & Meeting Point */}
                          <div className="text-[11px] text-ivory flex items-center gap-1.5 mt-1">
                            <Car className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                            <span className="text-teal-300 font-mono text-[10px] truncate">
                              {booking.transportReservation?.vehicleType || 'Shuttle'}
                              {booking.transportReservation?.plateNumber ? ` (${booking.transportReservation.plateNumber})` : ''}
                            </span>
                            <span className="text-[10px] text-sand-muted truncate">
                              • {passenger.pickupDropoffLocation || booking.transportReservation?.pickupLocation || 'Airport Bay'}
                            </span>
                          </div>

                          {/* Baggage Allowance */}
                          <div className="text-[9px] text-sand-muted flex items-center gap-1 mt-1 font-mono">
                            <Luggage className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                            <span>Baggage: {passenger.baggageAllowance || '20kg Check-in + 7kg Carry-on'}</span>
                          </div>
                        </td>

                        {/* Emergency & Dietary */}
                        <td className="py-4 px-4 min-w-[160px]">
                          <div className="text-[11px] text-ivory font-medium line-clamp-1">
                            {passenger.emergencyContactName || booking.customer.emergencyContact || 'Not Set'}
                          </div>
                          {passenger.emergencyContactPhone && (
                            <div className="text-[10px] text-sand-muted font-mono">
                              {passenger.emergencyContactPhone}
                            </div>
                          )}
                          <div className="text-[10px] text-sand-muted mt-1 bg-white/[0.03] px-1.5 py-0.5 rounded inline-block">
                            Meal: {passenger.dietaryPreference || 'Standard'}
                          </div>
                        </td>

                        {/* Manual Payment & Balance */}
                        <td className="py-4 px-4 min-w-[180px]">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-serif-display font-medium text-ivory">
                              {formatCurrency(price, currency)}
                            </span>
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full font-bold uppercase ${
                              paxPaymentStatus === 'Fully Paid' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                              paxPaymentStatus === '50% Downpayment' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' :
                              paxPaymentStatus === 'Partial' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                              'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            }`}>
                              {paxPaymentStatus}
                            </span>
                          </div>

                          <div className="text-[11px] text-emerald-400 font-mono mt-0.5">
                            Paid: {formatCurrency(paid, currency)}
                          </div>
                          {balance > 0 && (
                            <div className="text-[10px] text-sunset-coral font-mono font-semibold">
                              Balance Due: {formatCurrency(balance, currency)}
                            </div>
                          )}
                          {passenger.officialReceiptNo && (
                            <div className="text-[9px] text-sand-muted font-mono flex items-center gap-1 mt-0.5">
                              <Receipt className="w-2.5 h-2.5 text-cyan-400" />
                              <span>OR: {passenger.officialReceiptNo}</span>
                            </div>
                          )}
                        </td>

                        {/* Boarding Toggle */}
                        <td className="py-4 px-4 text-center min-w-[170px]">
                          <div className="inline-flex items-center bg-[#070B0E] p-0.5 rounded-lg border border-white/10">
                            <button
                              onClick={() => handleToggleBoarding(booking, passenger.id, 'boarded')}
                              className={`px-2 py-1 rounded text-[10px] font-mono uppercase transition-all cursor-pointer ${
                                boarding === 'boarded'
                                  ? 'bg-emerald-600 text-white font-bold shadow'
                                  : 'text-sand-muted hover:text-ivory'
                              }`}
                              title="Mark Boarded"
                            >
                              Boarded
                            </button>
                            <button
                              onClick={() => handleToggleBoarding(booking, passenger.id, 'pending')}
                              className={`px-2 py-1 rounded text-[10px] font-mono uppercase transition-all cursor-pointer ${
                                boarding === 'pending'
                                  ? 'bg-amber-600 text-white font-bold shadow'
                                  : 'text-sand-muted hover:text-ivory'
                              }`}
                              title="Mark Pending"
                            >
                              Pending
                            </button>
                            <button
                              onClick={() => handleToggleBoarding(booking, passenger.id, 'noshow')}
                              className={`px-2 py-1 rounded text-[10px] font-mono uppercase transition-all cursor-pointer ${
                                boarding === 'noshow'
                                  ? 'bg-rose-600 text-white font-bold shadow'
                                  : 'text-sand-muted hover:text-ivory'
                              }`}
                              title="Mark No Show"
                            >
                              No Show
                            </button>
                          </div>
                        </td>

                        {/* Action Buttons */}
                        <td className="py-4 px-4 text-right min-w-[140px]">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Quick Payment Button */}
                            <button
                              onClick={() => handleOpenPaymentModal(booking, passenger)}
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer"
                              title="Manual Payment Input & Update"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Details */}
                            <button
                              onClick={() => handleOpenEditPassenger(booking, passenger)}
                              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-sand-muted hover:text-ivory border border-white/10 transition-all cursor-pointer"
                              title="Edit Full Passenger Information"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Print Single Manifest */}
                            <button
                              onClick={() => {
                                setPrintBookingRef(booking.bookingRef);
                                setIsPrintModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-sand-muted hover:text-ivory border border-white/10 transition-all cursor-pointer"
                              title="Print Boarding Pass / Passenger Manifest"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleRemovePassenger(booking, passenger.id)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all cursor-pointer"
                              title="Remove Passenger from Manifest"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW B: INTERACTIVE PASSENGER CARDS VIEW (CLEAN, SPACIOUS, 100% VISIBLE) */}
      {/* ========================================================================= */}
      {manifestViewMode === 'cards' && (
        <div className="space-y-4">
          {filteredEntries.length === 0 ? (
            <div className="bg-[#090E14] border border-white/10 rounded-3xl p-12 text-center text-sand-muted space-y-2">
              <Users className="w-8 h-8 mx-auto opacity-30 text-sand-muted" />
              <p className="font-medium text-ivory">No passengers found matching filter criteria.</p>
              <p className="text-[11px]">Click "Manually Add Passenger" above to register a traveler directly.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredEntries.map(({ booking, passenger, index }) => {
                const boarding = passenger.boardingStatus || 'pending';
                const paxPaymentStatus = passenger.paymentStatus || (booking.paymentStatus === 'Paid' ? 'Fully Paid' : 'Pending');
                const paid = passenger.paidAmount ?? (booking.paymentStatus === 'Paid' ? Math.round(booking.totalPrice / (booking.numPax || 1)) : 0);
                const price = passenger.individualPrice ?? Math.round(booking.totalPrice / (booking.numPax || 1));
                const balance = Math.max(0, price - paid);

                return (
                  <motion.div
                    key={`manifest-card-${booking.id}-${passenger.id || index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#090E14] border border-white/10 rounded-3xl p-5 space-y-4 hover:border-white/20 transition-all shadow-lg flex flex-col justify-between"
                  >
                    {/* Header: Passenger Name & Reference */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-2xl bg-sunset-coral/10 border border-sunset-coral/20 flex items-center justify-center text-sunset-coral font-serif-display font-semibold text-sm shrink-0">
                            {(passenger.fullName || 'G').charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-serif-display text-base text-ivory font-medium line-clamp-1">
                              {passenger.fullName || 'Unregistered Guest'}
                            </h3>
                            <div className="text-[11px] text-sand-muted font-mono flex items-center gap-1.5">
                              <span>{passenger.age || 28} yo</span>
                              <span>•</span>
                              <span>{passenger.gender || 'F'}</span>
                              <span>•</span>
                              <span className="text-cyan-400">{passenger.nationality || 'Filipino'}</span>
                            </div>
                          </div>
                        </div>

                        <span className="font-mono font-bold text-[11px] text-sunset-coral bg-sunset-coral/10 px-2 py-0.5 rounded-lg border border-sunset-coral/20 shrink-0">
                          {booking.bookingRef}
                        </span>
                      </div>

                      {/* Expedition Title */}
                      <div className="text-xs text-ivory/90 font-medium bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.05]">
                        <div className="line-clamp-1">{booking.tourTitle}</div>
                        <div className="text-[10px] text-sand-muted font-mono flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3 text-sand-muted" />
                          <span>Date: {booking.travelDate}</span>
                        </div>
                      </div>
                    </div>

                    {/* Operational Details Grid */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#070B0E] p-3 rounded-2xl border border-white/[0.06]">
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono uppercase text-sand-muted block">Identity & ID</span>
                        <div className="font-mono font-semibold text-ivory line-clamp-1">
                          {passenger.passportOrId || 'N/A'}
                        </div>
                        {passenger.eTicketNumber && (
                          <div className="text-[9px] font-mono text-emerald-400">
                            ETix: {passenger.eTicketNumber}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] font-mono uppercase text-sand-muted block">Plane Seat & Flight</span>
                        <div className="flex items-center gap-1 text-sunset-coral font-mono font-bold text-xs">
                          <Plane className="w-3 h-3 text-sunset-coral shrink-0" />
                          <span>{passenger.seatNumber ? `Seat ${passenger.seatNumber}` : 'Seat Assigned'}</span>
                          <span className="text-[10px] text-sand-muted font-normal">({passenger.cabinClass || 'Economy'})</span>
                        </div>
                        {booking.flightReservation && (
                          <div className="text-[10px] text-sand-muted line-clamp-1 font-mono">
                            {booking.flightReservation.airline} {booking.flightReservation.flightNumber}
                          </div>
                        )}
                      </div>

                      <div className="col-span-2 space-y-1 pt-2 border-t border-white/[0.04]">
                        <span className="text-[9px] font-mono uppercase text-sand-muted block">Hotel Resort & Room Allocation</span>
                        <div className="flex items-center gap-1.5 text-xs text-cyan-300">
                          <BedDouble className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="font-medium line-clamp-1">
                            {passenger.roomAssignment || (booking.hotelReservation ? `${booking.hotelReservation.roomType} (Assigned)` : 'Room TBA')}
                          </span>
                        </div>
                        {booking.hotelReservation?.hotelName && (
                          <div className="text-[10px] text-sand-muted line-clamp-1 pl-5">
                            {booking.hotelReservation.hotelName}
                          </div>
                        )}
                      </div>

                      <div className="col-span-2 space-y-1 pt-2 border-t border-white/[0.04]">
                        <span className="text-[9px] font-mono uppercase text-sand-muted block">Transport Shuttle & Meeting Bay</span>
                        <div className="flex items-center gap-1.5 text-xs text-teal-300">
                          <Car className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                          <span className="font-mono text-[11px] line-clamp-1">
                            {booking.transportReservation?.vehicleType || 'Shuttle'}
                            {booking.transportReservation?.plateNumber ? ` (${booking.transportReservation.plateNumber})` : ''}
                          </span>
                        </div>
                        <div className="text-[10px] text-sand-muted line-clamp-1 pl-5">
                          Pickup: {passenger.pickupDropoffLocation || booking.transportReservation?.pickupLocation || 'Arrival Bay'}
                        </div>
                      </div>

                      <div className="space-y-1 pt-2 border-t border-white/[0.04]">
                        <span className="text-[9px] font-mono uppercase text-sand-muted block">Emergency Contact</span>
                        <div className="text-ivory line-clamp-1">
                          {passenger.emergencyContactName || 'None'}
                        </div>
                        {passenger.emergencyContactPhone && (
                          <div className="text-[10px] text-sand-muted font-mono">
                            {passenger.emergencyContactPhone}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 pt-2 border-t border-white/[0.04]">
                        <span className="text-[9px] font-mono uppercase text-sand-muted block">Meal & Health</span>
                        <div className="text-sand-muted text-[10px]">
                          Diet: <span className="text-ivory">{passenger.dietaryPreference || 'Standard'}</span>
                        </div>
                        <div className="text-[10px] text-sand-muted">
                          Baggage: <span className="text-ivory">{passenger.baggageAllowance || '20kg'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Financial Ledger Section */}
                    <div className="bg-gradient-to-br from-[#0B121A] to-[#070B0E] p-3 rounded-2xl border border-white/10 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase text-sand-muted">Individual Fare</span>
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                          paxPaymentStatus === 'Fully Paid' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                          paxPaymentStatus === '50% Downpayment' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' :
                          paxPaymentStatus === 'Partial' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                          'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}>
                          {paxPaymentStatus}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between">
                        <span className="font-serif-display text-base font-semibold text-ivory">
                          {formatCurrency(price, currency)}
                        </span>
                        <div className="text-right">
                          <span className="text-[11px] font-mono text-emerald-400 block">
                            Paid: {formatCurrency(paid, currency)}
                          </span>
                          {balance > 0 && (
                            <span className="text-[10px] font-mono text-sunset-coral font-bold block">
                              Balance: {formatCurrency(balance, currency)}
                            </span>
                          )}
                        </div>
                      </div>

                      {passenger.officialReceiptNo && (
                        <div className="text-[9px] text-cyan-400 font-mono pt-1 border-t border-white/[0.04]">
                          Official Receipt No: {passenger.officialReceiptNo}
                        </div>
                      )}
                    </div>

                    {/* Boarding Status & Action Controls */}
                    <div className="pt-2 border-t border-white/10 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono uppercase text-sand-muted">Boarding:</span>
                        <div className="inline-flex items-center bg-[#070B0E] p-0.5 rounded-lg border border-white/10">
                          <button
                            onClick={() => handleToggleBoarding(booking, passenger.id, 'boarded')}
                            className={`px-2 py-1 rounded text-[10px] font-mono uppercase transition-all cursor-pointer ${
                              boarding === 'boarded'
                                ? 'bg-emerald-600 text-white font-bold shadow'
                                : 'text-sand-muted hover:text-ivory'
                            }`}
                          >
                            Boarded
                          </button>
                          <button
                            onClick={() => handleToggleBoarding(booking, passenger.id, 'pending')}
                            className={`px-2 py-1 rounded text-[10px] font-mono uppercase transition-all cursor-pointer ${
                              boarding === 'pending'
                                ? 'bg-amber-600 text-white font-bold shadow'
                                : 'text-sand-muted hover:text-ivory'
                            }`}
                          >
                            Pending
                          </button>
                          <button
                            onClick={() => handleToggleBoarding(booking, passenger.id, 'noshow')}
                            className={`px-2 py-1 rounded text-[10px] font-mono uppercase transition-all cursor-pointer ${
                              boarding === 'noshow'
                                ? 'bg-rose-600 text-white font-bold shadow'
                                : 'text-sand-muted hover:text-ivory'
                            }`}
                          >
                            No Show
                          </button>
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="grid grid-cols-4 gap-1.5">
                        <button
                          onClick={() => handleOpenPaymentModal(booking, passenger)}
                          className="py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium flex items-center justify-center gap-1 transition-all cursor-pointer"
                          title="Manual Payment Input"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span className="text-[10px]">Pay</span>
                        </button>

                        <button
                          onClick={() => handleOpenEditPassenger(booking, passenger)}
                          className="py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-sand-muted hover:text-ivory border border-white/10 text-xs font-medium flex items-center justify-center gap-1 transition-all cursor-pointer"
                          title="Edit Details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span className="text-[10px]">Edit</span>
                        </button>

                        <button
                          onClick={() => {
                            setPrintBookingRef(booking.bookingRef);
                            setIsPrintModalOpen(true);
                          }}
                          className="py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-sand-muted hover:text-ivory border border-white/10 text-xs font-medium flex items-center justify-center gap-1 transition-all cursor-pointer"
                          title="Print Pass"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span className="text-[10px]">Print</span>
                        </button>

                        <button
                          onClick={() => handleRemovePassenger(booking, passenger.id)}
                          className="py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-medium flex items-center justify-center gap-1 transition-all cursor-pointer"
                          title="Remove Passenger"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="text-[10px]">Del</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. PASSENGER ADD / EDIT COMPREHENSIVE MODAL */}
      {/* ========================================================================= */}
      {isPassengerModalOpen && editingPassenger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-3xl bg-[#090E14] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-[#0F1722] via-[#090E14] to-[#0D1520] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sunset-coral/15 border border-sunset-coral/30 flex items-center justify-center text-sunset-coral">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif-display text-xl text-ivory font-medium">
                    {editingPassenger.isNew ? 'Manual Passenger Manifest Enrollment' : 'Edit Passenger Profile & Logistics'}
                  </h3>
                  <p className="text-xs text-sand-muted font-mono">
                    Civil Aviation & Tour Operator Mandatory Fields
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPassengerModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-sand-muted hover:text-ivory flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSavePassenger} className="p-6 space-y-6 overflow-y-auto flex-1 text-xs font-sans-body">
              {/* Section 1: Personal & Legal Identification */}
              <div className="space-y-3">
                <h4 className="font-serif-display text-sm text-ivory flex items-center gap-2 border-b border-white/10 pb-2">
                  <User className="w-4 h-4 text-sunset-coral" />
                  <span>1. Identity & Statutory Documentation</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] text-sand-muted font-mono block">
                      Full Legal Name (as on Passport / Gov ID) <span className="text-sunset-coral">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editingPassenger.passenger.fullName}
                      onChange={(e) => setEditingPassenger({
                        ...editingPassenger,
                        passenger: { ...editingPassenger.passenger, fullName: e.target.value }
                      })}
                      placeholder="e.g. Juan De La Cruz Jr."
                      className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs focus:outline-none focus:border-sunset-coral"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-sand-muted font-mono block">
                      Target Booking Reference <span className="text-sunset-coral">*</span>
                    </label>
                    <select
                      value={editingPassenger.bookingId}
                      onChange={(e) => setEditingPassenger({
                        ...editingPassenger,
                        bookingId: e.target.value
                      })}
                      className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs font-mono focus:outline-none focus:border-sunset-coral cursor-pointer"
                    >
                      {bookings.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.bookingRef} • {b.customer.fullName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-sand-muted font-mono block">Age</label>
                    <input
                      type="number"
                      min={0}
                      max={120}
                      value={editingPassenger.passenger.age}
                      onChange={(e) => setEditingPassenger({
                        ...editingPassenger,
                        passenger: { ...editingPassenger.passenger, age: parseInt(e.target.value) || 0 }
                      })}
                      className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs focus:outline-none focus:border-sunset-coral"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-sand-muted font-mono block">Gender</label>
                    <select
                      value={editingPassenger.passenger.gender || 'Male'}
                      onChange={(e) => setEditingPassenger({
                        ...editingPassenger,
                        passenger: { ...editingPassenger.passenger, gender: e.target.value as any }
                      })}
                      className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs focus:outline-none focus:border-sunset-coral cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-sand-muted font-mono block">Nationality</label>
                    <input
                      type="text"
                      value={editingPassenger.passenger.nationality || 'Filipino'}
                      onChange={(e) => setEditingPassenger({
                        ...editingPassenger,
                        passenger: { ...editingPassenger.passenger, nationality: e.target.value }
                      })}
                      className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs focus:outline-none focus:border-sunset-coral"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-sand-muted font-mono block">Passport / Gov ID No.</label>
                    <input
                      type="text"
                      value={editingPassenger.passenger.passportOrId || ''}
                      onChange={(e) => setEditingPassenger({
                        ...editingPassenger,
                        passenger: { ...editingPassenger.passenger, passportOrId: e.target.value }
                      })}
                      placeholder="e.g. P12345678B"
                      className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs font-mono focus:outline-none focus:border-sunset-coral"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-sand-muted font-mono block">Passport / ID Expiry</label>
                    <input
                      type="date"
                      value={editingPassenger.passenger.passportExpiry || ''}
                      onChange={(e) => setEditingPassenger({
                        ...editingPassenger,
                        passenger: { ...editingPassenger.passenger, passportExpiry: e.target.value }
                      })}
                      className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs font-mono focus:outline-none focus:border-sunset-coral"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-sand-muted font-mono block">Passenger Mobile Phone</label>
                    <input
                      type="text"
                      value={editingPassenger.passenger.contactNumber || ''}
                      onChange={(e) => setEditingPassenger({
                        ...editingPassenger,
                        passenger: { ...editingPassenger.passenger, contactNumber: e.target.value }
                      })}
                      placeholder="e.g. +63 917 123 4567"
                      className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs font-mono focus:outline-none focus:border-sunset-coral"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Flights, Logistics & Seating */}
              <div className="space-y-3">
                <h4 className="font-serif-display text-sm text-ivory flex items-center gap-2 border-b border-white/10 pb-2">
                  <Plane className="w-4 h-4 text-cyan-400" />
                  <span>2. Flight Logistics, Hotel Room & Seating</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-sand-muted font-mono block">Assigned Flight Seat</label>
                    <input
                      type="text"
                      value={editingPassenger.passenger.seatNumber || ''}
                      onChange={(e) => setEditingPassenger({
                        ...editingPassenger,
                        passenger: { ...editingPassenger.passenger, seatNumber: e.target.value }
                      })}
                      placeholder="e.g. 14F (Window)"
                      className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs font-mono focus:outline-none focus:border-sunset-coral"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-sand-muted font-mono block">Cabin Class</label>
                    <select
                      value={editingPassenger.passenger.cabinClass || 'Economy'}
                      onChange={(e) => setEditingPassenger({
                        ...editingPassenger,
                        passenger: { ...editingPassenger.passenger, cabinClass: e.target.value }
                      })}
                      className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs focus:outline-none focus:border-sunset-coral cursor-pointer"
                    >
                      <option value="Economy">Economy Class</option>
                      <option value="Premium Economy">Premium Economy</option>
                      <option value="Business">Business Class</option>
                      <option value="First Class">First Class / VIP Suite</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-sand-muted font-mono block">Hotel Room Allocation</label>
                    <input
                      type="text"
                      value={editingPassenger.passenger.roomAssignment || ''}
                      onChange={(e) => setEditingPassenger({
                        ...editingPassenger,
                        passenger: { ...editingPassenger.passenger, roomAssignment: e.target.value }
                      })}
                      placeholder="e.g. Deluxe Oceanview Suite 302"
                      className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs focus:outline-none focus:border-sunset-coral"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-sand-muted font-mono block">Baggage Allowance</label>
                    <input
                      type="text"
                      value={editingPassenger.passenger.baggageAllowance || '20kg Check-in + 7kg Hand-carry'}
                      onChange={(e) => setEditingPassenger({
                        ...editingPassenger,
                        passenger: { ...editingPassenger.passenger, baggageAllowance: e.target.value }
                      })}
                      className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs font-mono focus:outline-none focus:border-sunset-coral"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-sand-muted font-mono block">E-Ticket / Boarding Code</label>
                    <input
                      type="text"
                      value={editingPassenger.passenger.eTicketNumber || ''}
                      onChange={(e) => setEditingPassenger({
                        ...editingPassenger,
                        passenger: { ...editingPassenger.passenger, eTicketNumber: e.target.value }
                      })}
                      placeholder="e.g. ET-88912401"
                      className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs font-mono focus:outline-none focus:border-sunset-coral"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-sand-muted font-mono block">Shuttle Pickup / Meeting Point</label>
                    <input
                      type="text"
                      value={editingPassenger.passenger.pickupDropoffLocation || ''}
                      onChange={(e) => setEditingPassenger({
                        ...editingPassenger,
                        passenger: { ...editingPassenger.passenger, pickupDropoffLocation: e.target.value }
                      })}
                      placeholder="e.g. NAIA Terminal 3 Arrival Bay 4"
                      className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs focus:outline-none focus:border-sunset-coral"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Health, Dietary & Emergency Contact */}
              <div className="space-y-3">
                <h4 className="font-serif-display text-sm text-ivory flex items-center gap-2 border-b border-white/10 pb-2">
                  <HeartPulse className="w-4 h-4 text-rose-400" />
                  <span>3. Health, Dietary & Emergency Contacts</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-sand-muted font-mono block">Emergency Contact Name & Relationship</label>
                    <input
                      type="text"
                      value={editingPassenger.passenger.emergencyContactName || ''}
                      onChange={(e) => setEditingPassenger({
                        ...editingPassenger,
                        passenger: { ...editingPassenger.passenger, emergencyContactName: e.target.value }
                      })}
                      placeholder="e.g. Maria Santos (Spouse)"
                      className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs focus:outline-none focus:border-sunset-coral"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-sand-muted font-mono block">Emergency Contact Phone Number</label>
                    <input
                      type="text"
                      value={editingPassenger.passenger.emergencyContactPhone || ''}
                      onChange={(e) => setEditingPassenger({
                        ...editingPassenger,
                        passenger: { ...editingPassenger.passenger, emergencyContactPhone: e.target.value }
                      })}
                      placeholder="e.g. +63 918 765 4321"
                      className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs font-mono focus:outline-none focus:border-sunset-coral"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-sand-muted font-mono block">Dietary Preferences / Restrictions</label>
                    <input
                      type="text"
                      value={editingPassenger.passenger.dietaryPreference || 'Standard Meal'}
                      onChange={(e) => setEditingPassenger({
                        ...editingPassenger,
                        passenger: { ...editingPassenger.passenger, dietaryPreference: e.target.value }
                      })}
                      placeholder="e.g. Halal, Vegan, No Seafood, Low Sodium"
                      className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs focus:outline-none focus:border-sunset-coral"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-sand-muted font-mono block">Medical Conditions / Special Needs</label>
                    <input
                      type="text"
                      value={editingPassenger.passenger.medicalNotes || ''}
                      onChange={(e) => setEditingPassenger({
                        ...editingPassenger,
                        passenger: { ...editingPassenger.passenger, medicalNotes: e.target.value }
                      })}
                      placeholder="e.g. Wheelchair assistance required, Asthma"
                      className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs focus:outline-none focus:border-sunset-coral"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Manual Payment & Fiscal Entry */}
              <div className="space-y-3 bg-[#070B0E] p-4 rounded-2xl border border-white/10">
                <h4 className="font-serif-display text-sm text-ivory flex items-center gap-2 border-b border-white/10 pb-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>4. Passenger Fiscal & Manual Payment Entry</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-sand-muted font-mono block">Total Individual Price (₱)</label>
                    <input
                      type="number"
                      min={0}
                      value={editingPassenger.passenger.individualPrice || 0}
                      onChange={(e) => {
                        const price = parseFloat(e.target.value) || 0;
                        const paid = editingPassenger.passenger.paidAmount || 0;
                        const bal = Math.max(0, price - paid);
                        setEditingPassenger({
                          ...editingPassenger,
                          passenger: {
                            ...editingPassenger.passenger,
                            individualPrice: price,
                            balanceDue: bal,
                            paymentStatus: bal === 0 ? 'Fully Paid' : paid > 0 ? '50% Downpayment' : 'Pending'
                          }
                        });
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-[#0B1015] border border-white/15 text-ivory text-xs font-mono focus:outline-none focus:border-sunset-coral"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-sand-muted font-mono block">Amount Paid So Far (₱)</label>
                    <input
                      type="number"
                      min={0}
                      value={editingPassenger.passenger.paidAmount || 0}
                      onChange={(e) => {
                        const paid = parseFloat(e.target.value) || 0;
                        const price = editingPassenger.passenger.individualPrice || 0;
                        const bal = Math.max(0, price - paid);
                        setEditingPassenger({
                          ...editingPassenger,
                          passenger: {
                            ...editingPassenger.passenger,
                            paidAmount: paid,
                            balanceDue: bal,
                            paymentStatus: bal === 0 ? 'Fully Paid' : paid > 0 ? '50% Downpayment' : 'Pending'
                          }
                        });
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-[#0B1015] border border-white/15 text-emerald-400 text-xs font-mono focus:outline-none focus:border-sunset-coral"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-sand-muted font-mono block">Payment Status</label>
                    <select
                      value={editingPassenger.passenger.paymentStatus || 'Pending'}
                      onChange={(e) => setEditingPassenger({
                        ...editingPassenger,
                        passenger: { ...editingPassenger.passenger, paymentStatus: e.target.value as any }
                      })}
                      className="w-full px-3 py-2 rounded-xl bg-[#0B1015] border border-white/15 text-ivory text-xs focus:outline-none focus:border-sunset-coral cursor-pointer"
                    >
                      <option value="Fully Paid">Fully Paid</option>
                      <option value="50% Downpayment">50% Downpayment</option>
                      <option value="Partial">Partial Payment</option>
                      <option value="Pending">Pending</option>
                      <option value="Refunded">Refunded</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-sand-muted font-mono block">Official Receipt (OR) Number</label>
                    <input
                      type="text"
                      value={editingPassenger.passenger.officialReceiptNo || ''}
                      onChange={(e) => setEditingPassenger({
                        ...editingPassenger,
                        passenger: { ...editingPassenger.passenger, officialReceiptNo: e.target.value }
                      })}
                      placeholder="e.g. OR-2026-9042"
                      className="w-full px-3 py-2 rounded-xl bg-[#0B1015] border border-white/15 text-ivory text-xs font-mono focus:outline-none focus:border-sunset-coral"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-sand-muted font-mono block">Bank / GCash Reference No.</label>
                    <input
                      type="text"
                      value={editingPassenger.passenger.paymentReferenceNo || ''}
                      onChange={(e) => setEditingPassenger({
                        ...editingPassenger,
                        passenger: { ...editingPassenger.passenger, paymentReferenceNo: e.target.value }
                      })}
                      placeholder="e.g. GC-994821038"
                      className="w-full px-3 py-2 rounded-xl bg-[#0B1015] border border-white/15 text-ivory text-xs font-mono focus:outline-none focus:border-sunset-coral"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-sand-muted font-mono block">Payment Method Used</label>
                    <select
                      value={editingPassenger.passenger.paymentMethod || 'GCash'}
                      onChange={(e) => setEditingPassenger({
                        ...editingPassenger,
                        passenger: { ...editingPassenger.passenger, paymentMethod: e.target.value }
                      })}
                      className="w-full px-3 py-2 rounded-xl bg-[#0B1015] border border-white/15 text-ivory text-xs focus:outline-none focus:border-sunset-coral cursor-pointer"
                    >
                      <option value="GCash">GCash InstaPay</option>
                      <option value="PayMaya">PayMaya / Maya QR</option>
                      <option value="Bank Transfer">BDO / Bank Wire</option>
                      <option value="Cash">In-Person Cash</option>
                      <option value="Credit Card">Credit / Debit Card</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsPassengerModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sand-muted hover:text-ivory transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-sunset-coral hover:bg-[#ff765b] text-white font-semibold text-xs shadow-lg shadow-sunset-coral/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingPassenger.isNew ? 'Enroll Passenger to Manifest' : 'Save Manifest Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. QUICK MANUAL PAYMENT UPDATE MODAL */}
      {/* ========================================================================= */}
      {isPaymentModalOpen && paymentTarget && (
        <PaymentUpdateDialog
          target={paymentTarget}
          currency={currency}
          onClose={() => setIsPaymentModalOpen(false)}
          onSave={handleSavePaymentUpdate}
        />
      )}

      {/* ========================================================================= */}
      {/* 3. CERTIFIED MANIFEST PRINT PREVIEW MODAL */}
      {/* ========================================================================= */}
      {isPrintModalOpen && (
        <PrintManifestDialog
          bookings={bookings}
          selectedBookingRef={printBookingRef}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}
    </div>
  );
};

/* ========================================================================= */
/* SUB-COMPONENT: QUICK PAYMENT UPDATE MODAL */
/* ========================================================================= */
interface PaymentUpdateDialogProps {
  target: {
    booking: Booking;
    passenger?: Passenger;
  };
  currency: SupportedCurrency;
  onClose: () => void;
  onSave: (data: {
    paidAmount: number;
    balanceDue: number;
    paymentStatus: 'Fully Paid' | '50% Downpayment' | 'Partial' | 'Pending' | 'Refunded';
    officialReceiptNo: string;
    paymentReferenceNo: string;
    paymentMethod: string;
    paymentDate: string;
    adminNotes: string;
  }) => void;
}

const PaymentUpdateDialog: React.FC<PaymentUpdateDialogProps> = ({
  target,
  currency,
  onClose,
  onSave
}) => {
  const { booking, passenger } = target;

  const initialTotal = passenger
    ? passenger.individualPrice || Math.round(booking.totalPrice / (booking.numPax || 1))
    : booking.totalPrice;

  const initialPaid = passenger
    ? passenger.paidAmount || (booking.paymentStatus === 'Paid' ? initialTotal : 0)
    : booking.invoice?.amountPaid || (booking.paymentStatus === 'Paid' ? initialTotal : 0);

  const [paidAmount, setPaidAmount] = useState<number>(initialPaid);
  const [balanceDue, setBalanceDue] = useState<number>(Math.max(0, initialTotal - initialPaid));
  const [paymentStatus, setPaymentStatus] = useState<'Fully Paid' | '50% Downpayment' | 'Partial' | 'Pending' | 'Refunded'>(
    initialPaid >= initialTotal ? 'Fully Paid' : initialPaid > 0 ? '50% Downpayment' : 'Pending'
  );
  const [officialReceiptNo, setOfficialReceiptNo] = useState<string>(
    passenger?.officialReceiptNo || `OR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [paymentReferenceNo, setPaymentReferenceNo] = useState<string>(
    passenger?.paymentReferenceNo || `REF-${Math.floor(100000 + Math.random() * 900000)}`
  );
  const [paymentMethod, setPaymentMethod] = useState<string>(passenger?.paymentMethod || 'GCash');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [adminNotes, setAdminNotes] = useState<string>('Payment verified & official receipt issued by Admin Operations.');

  const handlePaidChange = (newPaid: number) => {
    setPaidAmount(newPaid);
    const newBal = Math.max(0, initialTotal - newPaid);
    setBalanceDue(newBal);

    if (newBal === 0) {
      setPaymentStatus('Fully Paid');
    } else if (newPaid >= initialTotal * 0.5) {
      setPaymentStatus('50% Downpayment');
    } else if (newPaid > 0) {
      setPaymentStatus('Partial');
    } else {
      setPaymentStatus('Pending');
    }
  };

  const handleQuickDownpayment50 = () => {
    const half = Math.round(initialTotal * 0.5);
    handlePaidChange(half);
  };

  const handleQuickFullyPaid = () => {
    handlePaidChange(initialTotal);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      paidAmount,
      balanceDue,
      paymentStatus,
      officialReceiptNo,
      paymentReferenceNo,
      paymentMethod,
      paymentDate,
      adminNotes
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="w-full max-w-lg bg-[#090E14] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto">
        <div className="p-6 bg-gradient-to-r from-[#0F1722] via-[#090E14] to-[#0D1520] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif-display text-lg text-ivory font-medium">
                {passenger ? `Manual Payment: ${passenger.fullName}` : `Manual Booking Payment: ${booking.bookingRef}`}
              </h3>
              <p className="text-xs text-sand-muted font-mono">
                Booking #{booking.bookingRef} • Total: {formatCurrency(initialTotal, currency)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-sand-muted hover:text-ivory flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-sans-body">
          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-sand-muted font-mono">Quick Set:</span>
            <button
              type="button"
              onClick={handleQuickDownpayment50}
              className="px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 font-mono text-[11px] transition-colors cursor-pointer"
            >
              50% Downpayment (₱{Math.round(initialTotal * 0.5).toLocaleString()})
            </button>
            <button
              type="button"
              onClick={handleQuickFullyPaid}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] transition-colors cursor-pointer"
            >
              100% Fully Paid (₱{initialTotal.toLocaleString()})
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] text-sand-muted font-mono block">
                Amount Collected (₱) <span className="text-sunset-coral">*</span>
              </label>
              <input
                type="number"
                min={0}
                required
                value={paidAmount}
                onChange={(e) => handlePaidChange(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-emerald-400 text-sm font-mono font-bold focus:outline-none focus:border-sunset-coral"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-sand-muted font-mono block">
                Remaining Balance (₱)
              </label>
              <input
                type="number"
                disabled
                value={balanceDue}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-rose-300 text-sm font-mono font-bold cursor-not-allowed"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-sand-muted font-mono block">Payment Status</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs focus:outline-none focus:border-sunset-coral cursor-pointer"
              >
                <option value="Fully Paid">Fully Paid</option>
                <option value="50% Downpayment">50% Downpayment</option>
                <option value="Partial">Partial Payment</option>
                <option value="Pending">Pending</option>
                <option value="Refunded">Refunded</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-sand-muted font-mono block">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs focus:outline-none focus:border-sunset-coral cursor-pointer"
              >
                <option value="GCash">GCash InstaPay</option>
                <option value="PayMaya">PayMaya / Maya QR</option>
                <option value="Bank Transfer">BDO / Bank Transfer</option>
                <option value="Cash">Cash in Office</option>
                <option value="Credit Card">Credit / Debit Card</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-sand-muted font-mono block">Official Receipt (OR) Number</label>
              <input
                type="text"
                value={officialReceiptNo}
                onChange={(e) => setOfficialReceiptNo(e.target.value)}
                placeholder="e.g. OR-2026-8812"
                className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs font-mono focus:outline-none focus:border-sunset-coral"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-sand-muted font-mono block">Transaction / Ref Number</label>
              <input
                type="text"
                value={paymentReferenceNo}
                onChange={(e) => setPaymentReferenceNo(e.target.value)}
                placeholder="e.g. REF-10928374"
                className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs font-mono focus:outline-none focus:border-sunset-coral"
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-[11px] text-sand-muted font-mono block">Payment Date</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs font-mono focus:outline-none focus:border-sunset-coral"
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-[11px] text-sand-muted font-mono block">Admin Audit Notes</label>
              <textarea
                rows={2}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs focus:outline-none focus:border-sunset-coral"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sand-muted hover:text-ivory transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/30 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save & Issue Official Receipt</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ========================================================================= */
/* SUB-COMPONENT: CERTIFIED PRINT MANIFEST DIALOG */
/* ========================================================================= */
interface PrintManifestDialogProps {
  bookings: Booking[];
  selectedBookingRef: string;
  onClose: () => void;
}

const PrintManifestDialog: React.FC<PrintManifestDialogProps> = ({
  bookings,
  selectedBookingRef,
  onClose
}) => {
  const [activeRef, setActiveRef] = useState(selectedBookingRef);

  const targetBookings = useMemo(() => {
    if (activeRef === 'ALL') return bookings;
    return bookings.filter(b => b.bookingRef === activeRef);
  }, [bookings, activeRef]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="w-full max-w-4xl bg-[#090E14] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
        <div className="p-4 bg-[#0B1017] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Printer className="w-5 h-5 text-sunset-coral" />
            <span className="font-serif-display text-base text-ivory">
              Official Passenger Manifest Roster (Print Ready)
            </span>
            <select
              value={activeRef}
              onChange={(e) => setActiveRef(e.target.value)}
              className="bg-[#070B0E] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-ivory font-mono focus:outline-none"
            >
              <option value="ALL">All Expeditions & Bookings</option>
              {bookings.map(b => (
                <option key={b.id} value={b.bookingRef}>{b.bookingRef} • {b.tourTitle}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl bg-sunset-coral hover:bg-[#ff765b] text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Document</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-sand-muted hover:text-ivory cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div className="p-8 overflow-y-auto bg-slate-100 text-slate-900 font-sans-body space-y-6 text-xs print:p-0 print:bg-white print:text-black">
          {targetBookings.map((b) => {
            const paxs = b.passengers && b.passengers.length > 0 ? b.passengers : [
              {
                id: `${b.id}-lead`,
                fullName: b.customer.fullName,
                age: 30,
                gender: 'Female' as const,
                passportOrId: b.bookingRef,
                nationality: b.customer.nationality || 'Filipino',
                boardingStatus: 'boarded' as const,
                seatNumber: '12A',
                roomAssignment: 'Deluxe Oceanview',
                paymentStatus: (b.paymentStatus === 'Paid' ? 'Fully Paid' : '50% Downpayment') as any,
                paidAmount: b.invoice?.amountPaid || b.depositRequired
              }
            ];

            return (
              <div key={b.id} className="p-6 bg-white border border-slate-300 rounded-xl shadow-sm space-y-4 page-break-inside-avoid">
                {/* Header Banner */}
                <div className="flex items-start justify-between border-b-2 border-slate-800 pb-3">
                  <div>
                    <h1 className="text-xl font-bold uppercase tracking-wider text-slate-900 font-serif-display">
                      Holiday Travelers Travel & Tours Inc.
                    </h1>
                    <p className="text-[11px] text-slate-600 font-mono">
                      Department of Tourism (DOT) Accredited • CAAP Certified Aviation Passenger Manifest
                    </p>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <span className="font-bold text-sm bg-slate-900 text-white px-2 py-0.5 rounded">
                      {b.bookingRef}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1">Generated: {new Date().toLocaleString()}</p>
                  </div>
                </div>

                {/* Expedition Details Grid */}
                <div className="grid grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">Tour Expedition:</span>
                    <strong className="text-slate-800">{b.tourTitle}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">Travel Date:</span>
                    <strong className="text-slate-800 font-mono">{b.travelDate}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">Lead Contact:</span>
                    <strong className="text-slate-800">{b.customer.fullName} ({b.customer.phone})</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">Manifest Count:</span>
                    <strong className="text-slate-800 font-mono">{paxs.length} Registered Persons</strong>
                  </div>
                </div>

                {/* Passenger Table */}
                <table className="w-full text-left text-xs border-collapse border border-slate-300">
                  <thead className="bg-slate-200 text-slate-800 font-mono text-[10px] uppercase">
                    <tr>
                      <th className="border border-slate-300 p-2 text-center w-8">#</th>
                      <th className="border border-slate-300 p-2">Full Legal Name</th>
                      <th className="border border-slate-300 p-2">Age / Sex / Nat</th>
                      <th className="border border-slate-300 p-2">Passport / ID No.</th>
                      <th className="border border-slate-300 p-2">Seat / Flight</th>
                      <th className="border border-slate-300 p-2">Hotel Room</th>
                      <th className="border border-slate-300 p-2">Shuttle / Pickup</th>
                      <th className="border border-slate-300 p-2">Payment Status</th>
                      <th className="border border-slate-300 p-2 text-center">Boarding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paxs.map((p, idx) => (
                      <tr key={`print-pax-${b.id}-${p.id || idx}`} className="hover:bg-slate-50">
                        <td className="border border-slate-300 p-2 text-center font-mono">{idx + 1}</td>
                        <td className="border border-slate-300 p-2 font-bold">{p.fullName}</td>
                        <td className="border border-slate-300 p-2 font-mono">{p.age} / {p.gender || 'F'} / {p.nationality || 'PH'}</td>
                        <td className="border border-slate-300 p-2 font-mono">{p.passportOrId || 'N/A'}</td>
                        <td className="border border-slate-300 p-2 font-mono">
                          {p.seatNumber ? `Seat ${p.seatNumber}` : 'Assigned'} ({p.cabinClass || 'Economy'})
                          {b.flightReservation?.flightNumber ? ` • ${b.flightReservation.airline} ${b.flightReservation.flightNumber}` : ''}
                        </td>
                        <td className="border border-slate-300 p-2">
                          {p.roomAssignment || 'Standard Room'}
                          {b.hotelReservation?.hotelName ? ` • ${b.hotelReservation.hotelName}` : ''}
                        </td>
                        <td className="border border-slate-300 p-2 text-[10px]">
                          {p.pickupDropoffLocation || b.transportReservation?.pickupLocation || 'Airport Bay'}
                          {b.transportReservation?.vehicleType ? ` (${b.transportReservation.vehicleType})` : ''}
                        </td>
                        <td className="border border-slate-300 p-2 font-mono font-semibold text-emerald-800">
                          {p.paymentStatus || 'Fully Paid'} (₱{(p.paidAmount || 0).toLocaleString()})
                        </td>
                        <td className="border border-slate-300 p-2 text-center font-mono font-bold uppercase">
                          {p.boardingStatus || 'boarded'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Footer Declaration */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-300 text-[10px] text-slate-500 font-mono">
                  <p>Certified accurate and compliant under Section 6.4 of DOT Tour Operations Protocol.</p>
                  <p>Verified by Operations Desk: ____________________</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

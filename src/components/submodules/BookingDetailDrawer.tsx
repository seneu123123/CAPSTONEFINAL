import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Booking, Passenger, BookingStatus, PaymentInvoice } from '../../types';
import { RubberStamp } from '../common/RubberStamp';
import { ActionConfirmModal } from '../common/ActionConfirmModal';
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  Users, 
  CreditCard, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Plane,
  Hotel, 
  Car, 
  FileText, 
  HeartPulse, 
  Sparkles,
  Printer,
  Plus,
  Edit2,
  Trash2,
  Save,
  DollarSign,
  Check,
  AlertCircle
} from 'lucide-react';

interface BookingDetailDrawerProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenManifest?: () => void;
  onUpdateStatus?: (bookingId: string, status: BookingStatus) => void;
  onUpdateBooking?: (updatedBooking: Booking) => void;
  onUpdatePassengerStatus?: (bookingId: string, passengerIndex: number, status: 'boarded' | 'pending' | 'noshow') => void;
}

export const BookingDetailDrawer: React.FC<BookingDetailDrawerProps> = ({
  booking,
  isOpen,
  onClose,
  onOpenManifest,
  onUpdateStatus,
  onUpdateBooking,
  onUpdatePassengerStatus,
}) => {
  const [statusConfirmTarget, setStatusConfirmTarget] = useState<BookingStatus | null>(null);

  // Manual Passenger Modal State
  const [isPassengerModalOpen, setIsPassengerModalOpen] = useState(false);
  const [editingPaxIndex, setEditingPaxIndex] = useState<number | null>(null);
  const [paxFormData, setPaxFormData] = useState<Partial<Passenger>>({
    fullName: '',
    age: 30,
    gender: 'Female',
    nationality: 'Filipino',
    passportOrId: '',
    passportExpiry: '',
    seatNumber: '',
    cabinClass: 'Economy',
    roomAssignment: 'Standard Deluxe',
    emergencyContactName: '',
    emergencyContactPhone: '',
    dietaryPreference: '',
    medicalNotes: '',
    specialRequirements: '',
    boardingStatus: 'pending',
    paymentStatus: 'Fully Paid'
  });

  // Manual Payment Update Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmountInput, setPaymentAmountInput] = useState<number>(0);
  const [paymentMethodInput, setPaymentMethodInput] = useState<string>('GCash');
  const [orNumberInput, setOrNumberInput] = useState<string>('');
  const [paymentNotesInput, setPaymentNotesInput] = useState<string>('');
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState<string>('');

  if (!isOpen || !booking) return null;

  const passengers: Passenger[] = booking.passengers && booking.passengers.length > 0 
    ? booking.passengers 
    : [
        {
          id: `${booking.id}-pax-0`,
          fullName: booking.customer.fullName,
          age: 32,
          gender: 'Female' as const,
          nationality: booking.customer.nationality || 'Filipino',
          passportOrId: booking.bookingRef,
          specialRequirements: booking.specialInstructions || 'Standard Pax',
          boardingStatus: 'pending' as const,
        }
      ];

  const handleOpenAddPassenger = () => {
    setEditingPaxIndex(null);
    setPaxFormData({
      id: `${booking.id}-pax-${Date.now()}`,
      fullName: '',
      age: 28,
      gender: 'Female',
      nationality: 'Filipino',
      passportOrId: '',
      passportExpiry: '',
      seatNumber: `${passengers.length + 1}A`,
      cabinClass: 'Economy',
      roomAssignment: 'Deluxe Suite',
      emergencyContactName: booking.customer.fullName,
      emergencyContactPhone: booking.customer.phone,
      dietaryPreference: '',
      medicalNotes: '',
      specialRequirements: '',
      boardingStatus: 'pending',
      paymentStatus: 'Fully Paid'
    });
    setIsPassengerModalOpen(true);
  };

  const handleOpenEditPassenger = (index: number) => {
    setEditingPaxIndex(index);
    setPaxFormData({ ...passengers[index] });
    setIsPassengerModalOpen(true);
  };

  const handleSavePassenger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateBooking) return;
    if (!paxFormData.fullName?.trim()) return;

    const updatedPaxList = [...passengers];
    const newPax: Passenger = {
      id: paxFormData.id || `${booking.id}-pax-${Date.now()}`,
      fullName: paxFormData.fullName.trim(),
      age: Number(paxFormData.age) || 30,
      gender: (paxFormData.gender as 'Male' | 'Female' | 'Other') || 'Female',
      nationality: paxFormData.nationality || 'Filipino',
      passportOrId: paxFormData.passportOrId || 'N/A',
      passportExpiry: paxFormData.passportExpiry,
      seatNumber: paxFormData.seatNumber,
      cabinClass: paxFormData.cabinClass,
      roomAssignment: paxFormData.roomAssignment,
      emergencyContactName: paxFormData.emergencyContactName,
      emergencyContactPhone: paxFormData.emergencyContactPhone,
      dietaryPreference: paxFormData.dietaryPreference,
      medicalNotes: paxFormData.medicalNotes,
      specialRequirements: paxFormData.specialRequirements,
      boardingStatus: paxFormData.boardingStatus || 'pending',
      paymentStatus: paxFormData.paymentStatus || 'Fully Paid'
    };

    if (editingPaxIndex !== null && editingPaxIndex >= 0) {
      updatedPaxList[editingPaxIndex] = newPax;
    } else {
      updatedPaxList.push(newPax);
    }

    onUpdateBooking({
      ...booking,
      numPax: updatedPaxList.length,
      passengers: updatedPaxList
    });

    setIsPassengerModalOpen(false);
  };

  const handleDeletePassenger = (index: number) => {
    if (!onUpdateBooking) return;
    if (passengers.length <= 1) {
      alert('A booking must maintain at least 1 lead passenger.');
      return;
    }
    const updated = passengers.filter((_, i) => i !== index);
    onUpdateBooking({
      ...booking,
      numPax: updated.length,
      passengers: updated
    });
  };

  const handleOpenPaymentModal = () => {
    const currentPaid = booking.invoice?.amountPaid || (booking.bookingStatus.toLowerCase() === 'confirmed' ? booking.totalPrice : 0);
    const balance = Math.max(0, booking.totalPrice - currentPaid);
    setPaymentAmountInput(balance > 0 ? balance : booking.totalPrice);
    setPaymentMethodInput('GCash');
    setOrNumberInput(`OR-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`);
    setPaymentNotesInput('Admin manual verification and payment ledger update');
    setPaymentSuccessMsg('');
    setIsPaymentModalOpen(true);
  };

  const handleSavePaymentUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateBooking) return;

    const currentPaid = booking.invoice?.amountPaid || 0;
    const additionalAmount = Number(paymentAmountInput) || 0;
    const newTotalPaid = Math.min(booking.totalPrice, currentPaid + additionalAmount);
    const newBalanceDue = Math.max(0, booking.totalPrice - newTotalPaid);
    const isNowFullyPaid = newBalanceDue === 0;

    const updatedInvoice: PaymentInvoice = {
      id: booking.invoice?.id || `INV-${booking.bookingRef}`,
      invoiceNumber: booking.invoice?.invoiceNumber || `INV-${booking.bookingRef}`,
      issueDate: booking.invoice?.issueDate || new Date().toISOString().split('T')[0],
      dueDate: booking.invoice?.dueDate || booking.travelDate,
      totalAmount: booking.totalPrice,
      amountPaid: newTotalPaid,
      balanceDue: newBalanceDue,
      status: isNowFullyPaid ? 'Paid' : 'Partial',
      items: booking.invoice?.items || [
        {
          description: `${booking.tourTitle} (x${booking.numPax || 1} Pax)`,
          quantity: booking.numPax || 1,
          unitPrice: Math.round(booking.totalPrice / (booking.numPax || 1)),
          totalPrice: booking.totalPrice
        }
      ],
      payments: [
        ...(booking.invoice?.payments || []),
        {
          id: `PAY-${Date.now()}`,
          date: new Date().toISOString(),
          amount: additionalAmount,
          method: paymentMethodInput as any,
          referenceNo: orNumberInput || `REF-${Date.now().toString().slice(-6)}`,
          status: 'Verified',
          auditNote: paymentNotesInput || 'Recorded directly by Admin'
        }
      ]
    };

    const updatedBooking: Booking = {
      ...booking,
      paymentStatus: isNowFullyPaid ? 'Paid' : 'Partial',
      bookingStatus: isNowFullyPaid ? 'Confirmed' : booking.bookingStatus,
      invoice: updatedInvoice
    };

    onUpdateBooking(updatedBooking);
    setPaymentSuccessMsg(`Payment of ₱${additionalAmount.toLocaleString()} recorded successfully! Total paid: ₱${newTotalPaid.toLocaleString()}`);
    setTimeout(() => {
      setIsPaymentModalOpen(false);
      setPaymentSuccessMsg('');
    }, 1200);
  };

  const handlePassengerStatusChange = (paxIndex: number, newStatus: 'boarded' | 'pending' | 'noshow') => {
    if (!onUpdateBooking) return;
    const currentPassengers = [...passengers];
    if (currentPassengers[paxIndex]) {
      currentPassengers[paxIndex] = {
        ...currentPassengers[paxIndex],
        boardingStatus: newStatus,
      };

      onUpdateBooking({
        ...booking,
        passengers: currentPassengers,
      });
    }
  };

  const handleExecuteStatusUpdate = () => {
    if (!statusConfirmTarget || !onUpdateStatus) return;
    onUpdateStatus(booking.id, statusConfirmTarget);
    setStatusConfirmTarget(null);
  };

  const boardedCount = passengers.filter(p => p.boardingStatus === 'boarded').length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        />

        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-screen max-w-2xl bg-[#0B1015] border-l border-white/10 shadow-2xl flex flex-col"
          >
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-white/10 bg-[#070B0E] flex items-center justify-between shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">
                    {booking.bookingRef}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                    booking.bookingStatus.toLowerCase() === 'confirmed'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : booking.bookingStatus.toLowerCase() === 'completed'
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : booking.bookingStatus.toLowerCase() === 'cancelled'
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {booking.bookingStatus}
                  </span>
                </div>
                <h2 className="font-serif-display text-xl text-ivory font-medium">
                  {booking.tourTitle}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {onOpenManifest && (
                  <button
                    onClick={onOpenManifest}
                    className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-sand-muted hover:text-ivory transition-colors cursor-pointer"
                    title="Print Aviation & Tour Manifest"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-sand-muted hover:text-ivory transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Quick Status Control Bar */}
              {onUpdateStatus && (
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                  <span className="text-xs font-medium text-sand-muted uppercase tracking-wider block">
                    Booking Operational Status
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {(['pending', 'confirmed', 'completed', 'cancelled'] as BookingStatus[]).map((st) => (
                      <button
                        key={st}
                        onClick={() => setStatusConfirmTarget(st)}
                        className={`btn-pop py-2 px-3 rounded-xl text-xs font-semibold capitalize border transition-all cursor-pointer active:scale-95 ${
                          booking.bookingStatus.toLowerCase() === st.toLowerCase()
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md font-bold'
                            : 'bg-white/[0.03] text-sand-muted border-white/10 hover:bg-white/[0.06] hover:text-ivory'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Lead Customer Card */}
              <div className="p-5 rounded-2xl bg-[#0F161E] border border-white/10 space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-ivory">Lead Traveler Contact</h4>
                      <p className="text-[11px] text-sand-muted font-light">Primary party organizer</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-cyan-400 font-medium">
                    {passengers.length} PAX ({boardedCount} Boarded)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-sand-muted block text-[11px]">Customer Full Name</span>
                    <span className="font-semibold text-ivory text-sm">{booking.customer.fullName}</span>
                  </div>
                  <div>
                    <span className="text-sand-muted block text-[11px]">Nationality</span>
                    <span className="font-medium text-ivory">{booking.customer.nationality || 'Filipino'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-sand-muted" />
                    <span className="text-sand-light">{booking.customer.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-sand-muted" />
                    <a href={`tel:${booking.customer.phone}`} className="text-cyan-400 hover:underline">
                      {booking.customer.phone}
                    </a>
                  </div>
                </div>

                {booking.specialInstructions && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
                    <strong className="block text-[11px] uppercase tracking-wider text-amber-200 mb-0.5">
                      Special Notes / Dietary / Medical Requests:
                    </strong>
                    {booking.specialInstructions}
                  </div>
                )}
              </div>

              {/* Passenger Manifest Breakdown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-ivory flex items-center gap-2">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span>Boarding Manifest Roster ({passengers.length} Pax)</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleOpenAddPassenger}
                    className="px-3 py-1.5 rounded-xl bg-sunset-coral/20 hover:bg-sunset-coral/30 border border-sunset-coral/40 text-sunset-coral text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Passenger</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {passengers.map((p, idx) => {
                    const st = p.boardingStatus || 'pending';
                    return (
                      <div
                        key={p.id || idx}
                        className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-lg bg-white/[0.06] text-sand-light font-mono text-xs font-semibold flex items-center justify-center border border-white/10">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-semibold text-ivory text-sm flex items-center gap-2">
                              {p.fullName}
                              {p.specialRequirements && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  {p.specialRequirements}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenEditPassenger(idx)}
                                className="p-1 text-sand-muted hover:text-cyan-400 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                                title="Edit passenger information"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="text-xs text-sand-muted font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span>{p.gender || 'Adult'} • {p.age ? `${p.age} yo` : 'Pax'}</span>
                              <span>• ID:</span>
                              {p.passportOrId === 'No ID (To Follow)' || p.passportOrId?.toLowerCase().includes('follow') ? (
                                <span className="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded text-[10px]">
                                  To Follow / None
                                </span>
                              ) : (
                                <span className="text-ivory">{p.passportOrId || 'VERIFIED'}</span>
                              )}
                              <span>• {p.nationality || 'Filipino'}</span>
                              {p.seatNumber && <span>• Seat: <strong className="text-ivory">{p.seatNumber}</strong></span>}
                            </div>
                          </div>
                        </div>

                        {/* Status Toggle Buttons & Delete */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center p-1 bg-[#070B0E] border border-white/10 rounded-xl gap-1">
                            <button
                              onClick={() => handlePassengerStatusChange(idx, 'boarded')}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                                st === 'boarded'
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'text-sand-muted hover:text-ivory hover:bg-white/[0.05]'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Boarded</span>
                            </button>
                            <button
                              onClick={() => handlePassengerStatusChange(idx, 'pending')}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                                st === 'pending'
                                  ? 'bg-amber-600 text-white shadow-sm'
                                  : 'text-sand-muted hover:text-ivory hover:bg-white/[0.05]'
                              }`}
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span>Pending</span>
                            </button>
                            <button
                              onClick={() => handlePassengerStatusChange(idx, 'noshow')}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                                st === 'noshow'
                                  ? 'bg-rose-700 text-white shadow-sm'
                                  : 'text-sand-muted hover:text-ivory hover:bg-white/[0.05]'
                              }`}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>No-Show</span>
                            </button>
                          </div>

                          {passengers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeletePassenger(idx)}
                              className="p-2 rounded-xl text-sand-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Delete passenger from manifest"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Logistics: Flight, Hotel & Transport */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-ivory flex items-center gap-1.5">
                      <Plane className="w-3.5 h-3.5 text-sky-400" />
                      Airline Flight
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      booking.flightReservation?.status === 'Confirmed' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {booking.flightReservation?.status || 'In Process'}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-ivory">
                    {booking.flightReservation?.airline || 'To Follow / In Process'}
                  </div>
                  <div className="text-[11px] text-sand-muted font-mono">
                    Flight: {booking.flightReservation?.flightNumber || 'TBA'}
                  </div>
                  <div className="text-[10px] text-sand-muted font-mono">
                    PNR: {booking.flightReservation?.pnrCode || 'In Process'}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-ivory flex items-center gap-1.5">
                      <Hotel className="w-3.5 h-3.5 text-cyan-400" />
                      Hotel Resort
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      booking.hotelReservation?.status === 'Confirmed'
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {booking.hotelReservation?.status || 'In Process'}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-ivory">
                    {booking.hotelReservation?.hotelName || 'To Follow / In Process'}
                  </div>
                  <div className="text-[11px] text-sand-muted">
                    Room: {booking.hotelReservation?.roomType || 'Standard Deluxe (TBA)'}
                  </div>
                  <div className="text-[10px] text-sand-muted font-mono">
                    Voucher: {booking.hotelReservation?.voucherCode || 'HTL-TO-FOLLOW'}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-ivory flex items-center gap-1.5">
                      <Car className="w-3.5 h-3.5 text-emerald-400" />
                      Shuttle Transfer
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      booking.transportReservation?.status === 'Dispatched' || booking.transportReservation?.status === 'Scheduled'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {booking.transportReservation?.status || 'In Process'}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-ivory">
                    {booking.transportReservation?.vehicleType || 'To Follow / In Process'}
                  </div>
                  <div className="text-[11px] text-sand-muted">
                    Driver: {booking.transportReservation?.driverName || 'Designated Driver (TBA)'}
                  </div>
                  <div className="text-[10px] text-sand-muted font-mono">
                    Plate: {booking.transportReservation?.plateNumber || 'TBA'}
                  </div>
                </div>
              </div>

              {/* Field Tour Guide Allocation & Confirmation Control */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-sunset-coral" />
                    <h4 className="text-sm font-semibold text-ivory">Assigned Field Tour Guide</h4>
                  </div>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1 ${
                    (booking.assignedGuide || '').includes('Confirmed') || (booking.assignedGuide || '').includes('DOT')
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {(booking.assignedGuide || '').includes('Confirmed') ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Confirmed Guide</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3" />
                        <span>Awaiting Confirmation / Assignment</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#070B0E] p-3 rounded-xl border border-white/5">
                  <div className="space-y-0.5">
                    <div className="text-xs font-medium text-ivory">
                      {booking.assignedGuide || 'Unassigned (Pending Allocation)'}
                    </div>
                    <div className="text-[11px] text-sand-muted">
                      Official License: DOT Accredited Expedition Leader
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                    {/* Quick Guide Selector */}
                    <select
                      value={booking.assignedGuide || ''}
                      onChange={(e) => {
                        if (onUpdateBooking) {
                          onUpdateBooking({
                            ...booking,
                            assignedGuide: e.target.value
                          });
                        }
                      }}
                      className="bg-[#0B1017] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-sand-light focus:outline-none focus:border-sunset-coral cursor-pointer"
                    >
                      <option value="Michael Baynosa (+63 920 456 7890) [Confirmed Field Leader]">Michael Baynosa (+63 920 456 7890) [Michael Baynosa]</option>
                      <option value="Michael Baynosa (+63 920 456 7890) [Pending Confirmation]">Michael Baynosa (+63 920 456 7890) [Pending]</option>
                      <option value="Capt. Roger Mendoza (+63 920 111 8899) [Confirmed]">Capt. Roger Mendoza (+63 920 111 8899)</option>
                      <option value="Danica Reyes (+63 917 334 1122) [Confirmed]">Danica Reyes (+63 917 334 1122)</option>
                      <option value="Unassigned (Pending Super Admin Assignment)">Unassigned (Pending Admin Allocation)</option>
                    </select>

                    {/* 1-Click Accept / Confirm Button */}
                    {!(booking.assignedGuide || '').includes('Confirmed') && (
                      <button
                        type="button"
                        onClick={() => {
                          if (onUpdateBooking) {
                            onUpdateBooking({
                              ...booking,
                              assignedGuide: 'Michael Baynosa (+63 920 456 7890) [Confirmed Field Leader]'
                            });
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 shrink-0 shadow-sm transition-all cursor-pointer"
                        title="Confirm & Accept Assignment as Michael Baynosa"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Confirm as Michael Baynosa</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Financial & Invoice Overview */}
              <div className="p-5 rounded-2xl bg-[#070B0E] border border-white/10 space-y-3 relative overflow-hidden">
                {/* Physical Official Rubber Stamp */}
                <div className="absolute top-3 right-3 sm:right-6 pointer-events-none z-10 scale-75 sm:scale-90 origin-top-right">
                  <RubberStamp
                    type={
                      booking.bookingStatus.toLowerCase() === 'cancelled'
                        ? 'CANCELLED'
                        : (booking.paymentStatus === 'Paid' || (booking.bookingStatus.toLowerCase() === 'confirmed' && (booking.invoice?.balanceDue ?? 0) === 0))
                        ? 'PAID'
                        : (booking.invoice?.amountPaid ?? 0) > 0
                        ? 'PARTIAL'
                        : 'UNPAID'
                    }
                    subtext={
                      booking.bookingStatus.toLowerCase() === 'cancelled'
                        ? 'EXPEDITION VOIDED'
                        : (booking.paymentStatus === 'Paid' || (booking.bookingStatus.toLowerCase() === 'confirmed' && (booking.invoice?.balanceDue ?? 0) === 0))
                        ? 'SETTLED IN FULL'
                        : (booking.invoice?.amountPaid ?? 0) > 0
                        ? 'DEPOSIT CONFIRMED'
                        : 'PAYMENT REQUIRED'
                    }
                    date={booking.travelDate}
                    verificationCode={booking.bookingRef}
                    size="sm"
                    rotation={-7}
                    className="shadow-xl"
                  />
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-semibold text-ivory flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-cyan-400" />
                    Financial & Invoice Summary
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                      booking.paymentStatus === 'Paid'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {booking.paymentStatus || 'Pending Payment'}
                    </span>
                    <button
                      type="button"
                      onClick={handleOpenPaymentModal}
                      className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Record Payment</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-2 border-t border-white/[0.06] text-xs">
                  <div>
                    <span className="text-sand-muted block text-[11px]">Total Price</span>
                    <span className="font-bold text-ivory text-base">₱{booking.totalPrice.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-sand-muted block text-[11px]">Paid to Date</span>
                    <span className="font-bold text-emerald-400 text-base">
                      ₱{(booking.invoice?.amountPaid || (booking.bookingStatus.toLowerCase() === 'confirmed' ? booking.totalPrice : 0)).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-sand-muted block text-[11px]">Balance Due</span>
                    <span className="font-bold text-amber-400 text-base">
                      ₱{Math.max(0, booking.totalPrice - (booking.invoice?.amountPaid || (booking.bookingStatus.toLowerCase() === 'confirmed' ? booking.totalPrice : 0))).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-5 border-t border-white/10 bg-[#070B0E] flex items-center justify-between shrink-0">
              <span className="text-xs text-sand-muted font-mono">
                Booking Created: {new Date(booking.createdAt).toLocaleDateString()}
              </span>
              <button
                onClick={onClose}
                className="btn-pop px-5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] active:scale-95 text-xs font-semibold text-ivory border border-white/10 transition-colors cursor-pointer"
              >
                Close Drawer
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* MODAL 1: ADD / EDIT PASSENGER */}
      <AnimatePresence>
        {isPassengerModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#090E14] border border-white/15 rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sunset-coral/20 border border-sunset-coral/40 flex items-center justify-center text-sunset-coral">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-serif-display text-base text-ivory">
                      {editingPaxIndex !== null ? 'Edit Passenger Record' : 'Enroll Passenger onto Manifest'}
                    </h4>
                    <p className="text-[11px] text-sand-muted font-mono">Booking Ref: {booking.bookingRef}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPassengerModalOpen(false)}
                  className="p-1.5 rounded-xl text-sand-muted hover:text-ivory hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSavePassenger} className="space-y-4 text-xs font-sans-body">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] text-sand-muted block font-mono">
                      Full Legal Name (Passport / Govt ID) <span className="text-sunset-coral">*</span>
                    </label>
                    <input
                      type="text"
                      value={paxFormData.fullName || ''}
                      onChange={(e) => setPaxFormData({ ...paxFormData, fullName: e.target.value })}
                      required
                      placeholder="e.g. Juan De La Cruz"
                      className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs focus:outline-none focus:border-sunset-coral"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-sand-muted block font-mono">Age</label>
                    <input
                      type="number"
                      min={0}
                      max={120}
                      value={paxFormData.age || 30}
                      onChange={(e) => setPaxFormData({ ...paxFormData, age: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs focus:outline-none focus:border-sunset-coral"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-sand-muted block font-mono">Gender</label>
                    <select
                      value={paxFormData.gender || 'Female'}
                      onChange={(e) => setPaxFormData({ ...paxFormData, gender: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs focus:outline-none focus:border-sunset-coral"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-sand-muted block font-mono">Passport / Government ID No.</label>
                    <input
                      type="text"
                      value={paxFormData.passportOrId || ''}
                      onChange={(e) => setPaxFormData({ ...paxFormData, passportOrId: e.target.value })}
                      placeholder="e.g. P1234567A / UMID / DL"
                      className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs focus:outline-none focus:border-sunset-coral"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-sand-muted block font-mono">Nationality</label>
                    <input
                      type="text"
                      value={paxFormData.nationality || 'Filipino'}
                      onChange={(e) => setPaxFormData({ ...paxFormData, nationality: e.target.value })}
                      placeholder="e.g. Filipino, US, Japanese"
                      className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs focus:outline-none focus:border-sunset-coral"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-sand-muted block font-mono">Flight Seat Number</label>
                    <input
                      type="text"
                      value={paxFormData.seatNumber || ''}
                      onChange={(e) => setPaxFormData({ ...paxFormData, seatNumber: e.target.value })}
                      placeholder="e.g. 14A, 14B"
                      className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs focus:outline-none focus:border-sunset-coral"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-sand-muted block font-mono">Hotel Room Assignment</label>
                    <input
                      type="text"
                      value={paxFormData.roomAssignment || ''}
                      onChange={(e) => setPaxFormData({ ...paxFormData, roomAssignment: e.target.value })}
                      placeholder="e.g. Room 302 Deluxe"
                      className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs focus:outline-none focus:border-sunset-coral"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-sand-muted block font-mono">Emergency Contact Name</label>
                    <input
                      type="text"
                      value={paxFormData.emergencyContactName || ''}
                      onChange={(e) => setPaxFormData({ ...paxFormData, emergencyContactName: e.target.value })}
                      placeholder="e.g. Maria Santos (Spouse)"
                      className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs focus:outline-none focus:border-sunset-coral"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-sand-muted block font-mono">Emergency Contact Phone</label>
                    <input
                      type="text"
                      value={paxFormData.emergencyContactPhone || ''}
                      onChange={(e) => setPaxFormData({ ...paxFormData, emergencyContactPhone: e.target.value })}
                      placeholder="e.g. +63 917 123 4567"
                      className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs focus:outline-none focus:border-sunset-coral"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] text-sand-muted block font-mono">Dietary / Medical / Accessibility Notes</label>
                    <textarea
                      rows={2}
                      value={paxFormData.dietaryPreference || paxFormData.medicalNotes || ''}
                      onChange={(e) => setPaxFormData({ ...paxFormData, dietaryPreference: e.target.value, medicalNotes: e.target.value })}
                      placeholder="e.g. Vegetarian meal request, asthma inhaler carried, wheelchair assist"
                      className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs focus:outline-none focus:border-sunset-coral"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPassengerModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sand-muted text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-sunset-coral hover:bg-[#ff765b] text-white font-semibold text-xs shadow-lg shadow-sunset-coral/30 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Passenger & Sync Real-Time</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: RECORD / UPDATE MANUAL PAYMENT */}
      <AnimatePresence>
        {isPaymentModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#090E14] border border-white/15 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-serif-display text-base text-ivory">Record Official Payment</h4>
                    <p className="text-[11px] text-sand-muted font-mono">Booking Ref: {booking.bookingRef}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="p-1.5 rounded-xl text-sand-muted hover:text-ivory hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {paymentSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{paymentSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleSavePaymentUpdate} className="space-y-4 text-xs font-sans-body">
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-sand-muted font-mono text-[10px] uppercase block">Total Package:</span>
                    <span className="text-ivory font-serif-display font-medium text-sm">₱{booking.totalPrice.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-sand-muted font-mono text-[10px] uppercase block">Currently Settled:</span>
                    <span className="text-emerald-400 font-mono font-bold">
                      ₱{(booking.invoice?.amountPaid || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-sand-muted block font-mono">
                    Payment Amount to Record (PHP) <span className="text-sunset-coral">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={booking.totalPrice}
                    value={paymentAmountInput}
                    onChange={(e) => setPaymentAmountInput(Number(e.target.value))}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B0E] border border-white/15 text-ivory font-mono text-sm focus:outline-none focus:border-sunset-coral"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-sand-muted block font-mono">Payment Channel / Method</label>
                    <select
                      value={paymentMethodInput}
                      onChange={(e) => setPaymentMethodInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs focus:outline-none focus:border-sunset-coral"
                    >
                      <option value="GCash">GCash Instant QR</option>
                      <option value="Maya">Maya Wallet</option>
                      <option value="BDO Bank Transfer">BDO Unibank Deposit</option>
                      <option value="BPI Bank Transfer">BPI Bank Transfer</option>
                      <option value="Cash (OTC)">Cash (Over-the-Counter)</option>
                      <option value="Credit / Debit Card">Credit / Debit Card</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-sand-muted block font-mono">Official Receipt (OR) / Ref No.</label>
                    <input
                      type="text"
                      value={orNumberInput}
                      onChange={(e) => setOrNumberInput(e.target.value)}
                      placeholder="e.g. OR-2026-998877"
                      className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-ivory font-mono text-xs focus:outline-none focus:border-sunset-coral"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-sand-muted block font-mono">Cashier & Verification Notes</label>
                  <input
                    type="text"
                    value={paymentNotesInput}
                    onChange={(e) => setPaymentNotesInput(e.target.value)}
                    placeholder="e.g. Verified by Admin Desk via GCash reference code"
                    className="w-full px-3 py-2 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs focus:outline-none focus:border-sunset-coral"
                  />
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sand-muted text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply Payment & Sync to Supabase</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Booking Status Change Safeguard Modal */}
      <ActionConfirmModal
        isOpen={statusConfirmTarget !== null}
        onClose={() => setStatusConfirmTarget(null)}
        onConfirm={handleExecuteStatusUpdate}
        title={`Change Booking Status to ${statusConfirmTarget ? statusConfirmTarget.toUpperCase() : ''}?`}
        message={`Are you sure you want to transition booking ${booking.bookingRef} from "${booking.bookingStatus.toUpperCase()}" to "${statusConfirmTarget ? statusConfirmTarget.toUpperCase() : ''}"?`}
        details={[
          { label: 'Booking Ref', value: booking.bookingRef },
          { label: 'Lead Guest', value: booking.customer.fullName },
          { label: 'Expedition', value: booking.tourTitle },
          { label: 'Departure Date', value: booking.travelDate },
          { label: 'Target Status', value: statusConfirmTarget?.toUpperCase() || '' },
        ]}
        confirmText={`Yes, Set as ${statusConfirmTarget?.toUpperCase() || ''}`}
        cancelText="Cancel Status Change"
        variant={statusConfirmTarget === 'cancelled' ? 'danger' : 'warning'}
        warningNote={statusConfirmTarget === 'cancelled' ? 'WARNING: Marking as Cancelled will release airline flight seats, hotel room blocks, shuttle transfer reservations, and require refund review.' : undefined}
      />
    </AnimatePresence>
  );
};

import React, { useState } from 'react';
import { 
  X, 
  CreditCard, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  QrCode, 
  Building2, 
  Smartphone, 
  ShieldCheck, 
  Clock,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Booking } from '../../types';
import { SupportedCurrency, formatCurrency, getStoredCurrency } from '../../utils/currency';
import { updateBookingPayment, saveBookingToDb } from '../../utils/supabaseClient';

interface SettleBalanceModalProps {
  booking: Booking;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess?: (updatedBooking: Booking) => void;
}

export const SettleBalanceModal: React.FC<SettleBalanceModalProps> = ({
  booking,
  isOpen,
  onClose,
  onPaymentSuccess
}) => {
  const [activeCurrency] = useState<SupportedCurrency>(getStoredCurrency());
  const balanceDue = booking.invoice?.balanceDue ?? Math.max(0, booking.totalPrice - (booking.invoice?.amountPaid || 0));
  
  const [paymentType, setPaymentType] = useState<'full' | 'custom'>('full');
  const [customAmount, setCustomAmount] = useState<number>(balanceDue);
  const [selectedMethod, setSelectedMethod] = useState<'GCash' | 'Maya' | 'Bank Transfer'>('GCash');
  const [referenceNo, setReferenceNo] = useState('');
  const [receiptImage, setReceiptImage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const amountToPay = paymentType === 'full' ? balanceDue : Math.min(balanceDue, Math.max(100, customAmount));

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('Image file size must be less than 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptImage(reader.result as string);
      setErrorMsg('');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!referenceNo.trim()) {
      setErrorMsg('Please provide the transaction reference number from your bank or e-wallet.');
      return;
    }

    if (!receiptImage) {
      setErrorMsg('Please upload a screenshot or photo of your transfer confirmation slip.');
      return;
    }

    setIsSubmitting(true);

    try {
      const newPaymentId = `pmt-settle-${Date.now()}`;
      const newPayment = {
        id: newPaymentId,
        date: new Date().toISOString().split('T')[0],
        amount: amountToPay,
        method: selectedMethod as any,
        referenceNo: referenceNo.trim(),
        status: 'Pending Verification' as const,
        notes: `Balance Settlement via ${selectedMethod} (Ref: ${referenceNo.trim()})`,
        receiptProofUrl: receiptImage
      };

      const previousPaid = booking.invoice?.amountPaid || 0;
      const newPaid = previousPaid + amountToPay;
      const newBalance = Math.max(0, booking.totalPrice - newPaid);

      const existingPayments = booking.invoice?.payments || [];
      const updatedPayments = [...existingPayments, newPayment];

      const updatedBooking: Booking = {
        ...booking,
        paymentStatus: newBalance === 0 ? 'Paid' : 'Partial',
        paymentVerificationStatus: 'Pending Verification',
        receiptProofUrl: receiptImage,
        customerReferenceNo: referenceNo.trim(),
        invoice: {
          ...booking.invoice,
          amountPaid: newPaid,
          balanceDue: newBalance,
          status: newBalance === 0 ? 'Paid' : 'Partial',
          payments: updatedPayments
        }
      };

      // Persist to Supabase and LocalStorage
      await saveBookingToDb(updatedBooking);
      await updateBookingPayment(updatedBooking.id, {
        amountPaid: newPaid,
        balanceDue: newBalance,
        paymentStatus: updatedBooking.paymentStatus,
        paymentVerificationStatus: 'Pending Verification',
        receiptProofUrl: receiptImage,
        referenceNo: referenceNo.trim()
      });

      // Update local storage backup
      try {
        const stored = localStorage.getItem('holiday_offline_bookings');
        if (stored) {
          const parsed: Booking[] = JSON.parse(stored);
          const idx = parsed.findIndex((b) => b.id === booking.id || b.bookingRef === booking.bookingRef);
          if (idx !== -1) {
            parsed[idx] = updatedBooking;
            localStorage.setItem('holiday_offline_bookings', JSON.stringify(parsed));
          }
        }
      } catch (err) {
        console.warn('Local storage update fallback:', err);
      }

      setIsSuccess(true);
      if (onPaymentSuccess) {
        onPaymentSuccess(updatedBooking);
      }
    } catch (err: any) {
      console.error('Error submitting balance settlement:', err);
      setErrorMsg(err.message || 'Failed to submit payment. Please verify your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200 cursor-pointer"
      onClick={onClose}
    >
      <div 
        className="bg-[#0B1015] border border-white/15 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative text-left cursor-default max-h-[92vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sunset-coral/10 border border-sunset-coral/20 text-sunset-coral text-xs font-semibold uppercase tracking-wider mb-2 font-mono">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Official Balance Settlement</span>
            </div>
            <h3 className="font-serif-display text-2xl sm:text-3xl text-ivory">
              Settle Outstanding Balance
            </h3>
            <p className="text-xs text-sand-muted font-sans-body mt-1">
              Booking Ref: <strong className="text-sunset-coral font-mono">{booking.bookingRef}</strong> • {booking.tourTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-sand-muted hover:text-ivory flex items-center justify-center transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSuccess ? (
          /* SUCCESS STATE */
          <div className="text-center py-8 space-y-5 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h4 className="font-serif-display text-2xl text-ivory">
                Payment Proof Submitted!
              </h4>
              <p className="text-xs text-sand-muted max-w-md mx-auto leading-relaxed font-sans-body">
                Your payment slip of <strong className="text-emerald-400">{formatCurrency(amountToPay, activeCurrency)}</strong> with reference <strong className="text-ivory font-mono">{referenceNo}</strong> has been logged into our settlement queue.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#070B0E] border border-white/10 max-w-md mx-auto text-left space-y-2 font-mono text-xs">
              <div className="flex justify-between text-sand-muted">
                <span>Reference:</span>
                <span className="text-ivory font-bold">{booking.bookingRef}</span>
              </div>
              <div className="flex justify-between text-sand-muted">
                <span>Remitted Channel:</span>
                <span className="text-ivory">{selectedMethod}</span>
              </div>
              <div className="flex justify-between text-sand-muted">
                <span>Audit Status:</span>
                <span className="text-amber-300 flex items-center gap-1 font-sans-body">
                  <Clock className="w-3 h-3" />
                  Queued for Finance Cross-Check
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-full bg-sunset-coral hover:bg-[#ff765b] text-white text-xs font-semibold uppercase tracking-wider shadow-lg shadow-sunset-coral/30 cursor-pointer"
              >
                Done & Return to Ticket
              </button>
            </div>
          </div>
        ) : (
          /* SETTLEMENT FORM */
          <form onSubmit={handleSubmitSettlement} className="space-y-6">
            {/* Financial Overview Card */}
            <div className="p-4 rounded-2xl bg-[#070B0E] border border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5">
                <span className="text-[10px] uppercase font-mono tracking-wider text-sand-muted block mb-1">
                  Total Tour Price
                </span>
                <span className="text-sm sm:text-base font-serif-display font-semibold text-ivory">
                  {formatCurrency(booking.totalPrice, activeCurrency)}
                </span>
              </div>

              <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5">
                <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 block mb-1">
                  Already Settled
                </span>
                <span className="text-sm sm:text-base font-serif-display font-semibold text-emerald-400">
                  {formatCurrency(booking.invoice?.amountPaid || 0, activeCurrency)}
                </span>
              </div>

              <div className="p-3 bg-sunset-coral/10 rounded-xl border border-sunset-coral/30">
                <span className="text-[10px] uppercase font-mono tracking-wider text-sunset-coral font-bold block mb-1">
                  Outstanding Balance
                </span>
                <span className="text-base sm:text-lg font-serif-display font-bold text-sunset-coral">
                  {formatCurrency(balanceDue, activeCurrency)}
                </span>
              </div>
            </div>

            {/* Payment Amount Choice */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-ivory flex items-center justify-between">
                <span>Select Settlement Amount:</span>
                <span className="text-[11px] text-sand-muted font-normal">Base currency: PHP</span>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentType('full')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    paymentType === 'full'
                      ? 'border-sunset-coral bg-sunset-coral/10 text-ivory shadow-lg shadow-sunset-coral/15'
                      : 'border-white/10 bg-[#070B0E] text-sand-muted hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold font-sans-body">Full Remaining Balance</span>
                    <Sparkles className="w-3.5 h-3.5 text-sunset-coral" />
                  </div>
                  <div className="text-sm sm:text-base font-serif-display font-bold text-ivory mt-1">
                    {formatCurrency(balanceDue, activeCurrency)}
                  </div>
                  <span className="text-[10px] text-emerald-400 block mt-0.5">Clears account completely</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentType('custom');
                    setCustomAmount(Math.round(balanceDue / 2));
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    paymentType === 'custom'
                      ? 'border-sunset-coral bg-sunset-coral/10 text-ivory shadow-lg shadow-sunset-coral/15'
                      : 'border-white/10 bg-[#070B0E] text-sand-muted hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold font-sans-body">Partial Downpayment</span>
                    <CreditCard className="w-3.5 h-3.5 text-sand-muted" />
                  </div>
                  <div className="text-sm sm:text-base font-serif-display font-bold text-ivory mt-1">
                    Custom Amount
                  </div>
                  <span className="text-[10px] text-sand-muted block mt-0.5">Pay in installments</span>
                </button>
              </div>

              {paymentType === 'custom' && (
                <div className="pt-2 animate-in fade-in duration-200">
                  <label className="text-[11px] text-sand-muted mb-1 block">
                    Enter amount to settle now (PHP):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sunset-coral font-bold text-sm">₱</span>
                    <input
                      type="number"
                      min={500}
                      max={balanceDue}
                      value={customAmount}
                      onChange={(e) => setCustomAmount(Number(e.target.value))}
                      className="w-full bg-[#070B0E] border border-white/15 rounded-xl pl-8 pr-4 py-2 text-ivory text-sm font-mono focus:outline-none focus:border-sunset-coral"
                    />
                  </div>
                  <p className="text-[10px] text-sand-muted mt-1">
                    Equivalent: {formatCurrency(customAmount, activeCurrency)} • Remaining after payment: {formatCurrency(Math.max(0, balanceDue - customAmount), activeCurrency)}
                  </p>
                </div>
              )}
            </div>

            {/* Payment Rail Tabs */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-ivory">
                Select Payment Channel:
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMethod('GCash')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    selectedMethod === 'GCash'
                      ? 'border-blue-500 bg-blue-500/20 text-blue-300 shadow-md shadow-blue-500/10'
                      : 'border-white/10 bg-[#070B0E] text-sand-muted hover:border-white/20'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>GCash</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod('Maya')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    selectedMethod === 'Maya'
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-md shadow-emerald-500/10'
                      : 'border-white/10 bg-[#070B0E] text-sand-muted hover:border-white/20'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Maya</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod('Bank Transfer')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    selectedMethod === 'Bank Transfer'
                      ? 'border-sunset-coral bg-sunset-coral/20 text-sunset-coral shadow-md shadow-sunset-coral/10'
                      : 'border-white/10 bg-[#070B0E] text-sand-muted hover:border-white/20'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Bank (BDO/BPI)</span>
                </button>
              </div>

              {/* Account Details Display */}
              <div className="p-4 rounded-2xl bg-[#070B0E] border border-white/10 space-y-3 font-sans-body">
                {selectedMethod === 'GCash' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold font-mono">
                          GC
                        </div>
                        <div>
                          <div className="text-xs font-bold text-ivory">Holiday Travelers Tours - GCash Official</div>
                          <div className="text-[11px] text-sand-muted">Scan QR or send to registered merchant account</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono bg-blue-500/15 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">
                        QR Ph Verified
                      </span>
                    </div>

                    <div className="p-3 bg-white/[0.03] rounded-xl border border-white/5 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-sand-muted block font-mono">GCash Merchant Mobile Number</span>
                        <span className="text-sm font-mono font-bold text-ivory">0917 888 1900</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy('09178881900', 'gcash')}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-sand-muted hover:text-ivory flex items-center gap-1.5 border border-white/10 cursor-pointer"
                      >
                        {copiedField === 'gcash' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedField === 'gcash' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {selectedMethod === 'Maya' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold font-mono">
                          MY
                        </div>
                        <div>
                          <div className="text-xs font-bold text-ivory">Holiday Travelers Travel - Maya Business</div>
                          <div className="text-[11px] text-sand-muted">InstaPay / Maya wallet settlement</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        Business Tier
                      </span>
                    </div>

                    <div className="p-3 bg-white/[0.03] rounded-xl border border-white/5 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-sand-muted block font-mono">Maya Business Account</span>
                        <span className="text-sm font-mono font-bold text-ivory">0998 555 2040</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy('09985552040', 'maya')}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-sand-muted hover:text-ivory flex items-center gap-1.5 border border-white/10 cursor-pointer"
                      >
                        {copiedField === 'maya' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedField === 'maya' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {selectedMethod === 'Bank Transfer' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-sunset-coral/20 text-sunset-coral flex items-center justify-center text-xs font-bold font-mono">
                          BDO
                        </div>
                        <div>
                          <div className="text-xs font-bold text-ivory">Banco de Oro (BDO) Corporate Account</div>
                          <div className="text-[11px] text-sand-muted">Holiday Travelers Travel and Tours Inc.</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono bg-white/10 text-ivory px-2 py-0.5 rounded-full">
                        Checking
                      </span>
                    </div>

                    <div className="p-3 bg-white/[0.03] rounded-xl border border-white/5 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-sand-muted block font-mono">Account Number (Pasig Branch)</span>
                        <span className="text-sm font-mono font-bold text-ivory">0065-2801-4412</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy('006528014412', 'bdo')}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-sand-muted hover:text-ivory flex items-center gap-1.5 border border-white/10 cursor-pointer"
                      >
                        {copiedField === 'bdo' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedField === 'bdo' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Reference Number & Slip Attachment */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-ivory block mb-1.5">
                  Transaction Reference Number <span className="text-sunset-coral">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  placeholder="e.g. 1002948192, BDO-889104, or Maya Ref#"
                  className="w-full bg-[#070B0E] border border-white/15 rounded-xl px-4 py-2.5 text-ivory text-xs font-mono placeholder-sand-muted/50 focus:outline-none focus:border-sunset-coral"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ivory block mb-1.5">
                  Proof of Payment / Screenshot <span className="text-sunset-coral">*</span>
                </label>

                {receiptImage ? (
                  <div className="p-3 bg-[#070B0E] rounded-2xl border border-emerald-500/40 text-center space-y-2">
                    <img
                      src={receiptImage}
                      alt="Payment Receipt Preview"
                      className="max-h-48 mx-auto object-contain rounded-xl border border-white/10"
                    />
                    <button
                      type="button"
                      onClick={() => setReceiptImage('')}
                      className="text-xs text-rose-400 hover:text-rose-300 font-mono underline cursor-pointer"
                    >
                      Remove & Upload Different Photo
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-white/15 hover:border-sunset-coral/50 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 bg-[#070B0E] cursor-pointer transition-all">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <UploadCloud className="w-7 h-7 text-sunset-coral" />
                    <span className="text-xs text-ivory font-medium">
                      Upload Deposit Slip or Transfer Screenshot
                    </span>
                    <span className="text-[10px] text-sand-muted font-mono">
                      PNG, JPG, or WEBP (Max 8MB)
                    </span>
                  </label>
                )}
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Anti-Scam Assurance Note */}
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-2.5 text-xs text-sand-muted">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                Transactions are cross-audited against live merchant statements. Once confirmed by our Finance Officer, your travel ticket voucher will be updated to <strong className="text-emerald-400">PAID</strong> status.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-full text-xs text-sand-muted hover:text-ivory font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-pop px-6 py-2.5 rounded-full bg-sunset-coral hover:bg-[#ff765b] disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider shadow-lg shadow-sunset-coral/30 flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying Transfer...</span>
                  </>
                ) : (
                  <>
                    <span>Submit {formatCurrency(amountToPay, activeCurrency)}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

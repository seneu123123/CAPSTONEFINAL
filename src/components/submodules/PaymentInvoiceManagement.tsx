import React, { useState } from 'react';
import { Booking, PaymentInvoice, PaymentRecord } from '../../types';
import { 
  CreditCard, 
  Search, 
  Printer, 
  CheckCircle2, 
  Clock, 
  X, 
  FileText, 
  DollarSign, 
  Plus, 
  ShieldCheck, 
  QrCode,
  Building2,
  Send,
  Compass,
  ArrowUpRight,
  ShieldAlert,
  AlertCircle
} from 'lucide-react';
import { RubberStamp } from '../common/RubberStamp';
import { ActionConfirmModal } from '../common/ActionConfirmModal';
import { dispatchAppNotification } from '../../utils/notifications';

interface PaymentInvoiceManagementProps {
  bookings: Booking[];
  onAddPaymentRecord: (bookingId: string, payment: PaymentRecord) => void;
  isOperatorView: boolean;
  onGoToPaymentGateAudit?: () => void;
  onUpdateBooking?: (booking: Booking) => void;
}

export const PaymentInvoiceManagement: React.FC<PaymentInvoiceManagementProps> = ({
  bookings,
  onAddPaymentRecord,
  isOperatorView,
  onGoToPaymentGateAudit,
  onUpdateBooking
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewingInvoiceBooking, setViewingInvoiceBooking] = useState<Booking | null>(null);

  // New Payment Modal
  const [recordingBooking, setRecordingBooking] = useState<Booking | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'GCash' | 'PayMaya' | 'Credit Card' | 'Bank Transfer' | 'Cash'>('GCash');
  const [referenceNo, setReferenceNo] = useState('');
  const [isConfirmPaymentOpen, setIsConfirmPaymentOpen] = useState(false);

  // Helper function: Strictly determine audit & payment status
  const getBookingAuditState = (b: Booking) => {
    const pmtStatus = b.paymentVerificationStatus || b.invoice.payments[0]?.status || (b.invoice.amountPaid > 0 ? 'Pending Verification' : 'Unpaid');
    const isVerified = pmtStatus === 'Verified' || (b.verifiedBy && pmtStatus !== 'Flagged / Needs Re-upload');
    const isPendingAudit = pmtStatus === 'Pending Verification' || (b.invoice.payments.some(p => p.status === 'Pending Verification') && !isVerified);
    const isFlagged = pmtStatus === 'Flagged / Needs Re-upload' || pmtStatus === 'Rejected';

    let displayStatus: 'Paid' | 'Pending Audit' | 'Partial' | 'Partial (Pending Audit)' | 'Flagged' | 'Unpaid';

    if (b.invoice.balanceDue === 0 && isVerified) {
      displayStatus = 'Paid';
    } else if (b.invoice.balanceDue === 0 && !isVerified) {
      displayStatus = 'Pending Audit';
    } else if (b.invoice.amountPaid > 0 && isVerified) {
      displayStatus = 'Partial';
    } else if (b.invoice.amountPaid > 0 && !isVerified) {
      displayStatus = 'Partial (Pending Audit)';
    } else if (isFlagged) {
      displayStatus = 'Flagged';
    } else {
      displayStatus = 'Unpaid';
    }

    return {
      pmtStatus,
      isVerified,
      isPendingAudit,
      isFlagged,
      displayStatus
    };
  };

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.bookingRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.customer.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const { displayStatus } = getBookingAuditState(b);

    if (statusFilter === 'All') return matchesSearch;
    if (statusFilter === 'Paid (Verified)') return matchesSearch && displayStatus === 'Paid';
    if (statusFilter === 'Pending Audit') return matchesSearch && (displayStatus === 'Pending Audit' || displayStatus === 'Partial (Pending Audit)');
    if (statusFilter === 'Flagged') return matchesSearch && displayStatus === 'Flagged';
    if (statusFilter === 'Unpaid') return matchesSearch && (displayStatus === 'Unpaid' || displayStatus === 'Partial');

    return matchesSearch;
  });

  // Accurate audited figures
  const totalVerifiedRevenue = bookings.reduce((sum, b) => {
    const { isVerified } = getBookingAuditState(b);
    return sum + (isVerified ? b.invoice.amountPaid : 0);
  }, 0);

  const totalPendingAuditRevenue = bookings.reduce((sum, b) => {
    const { isPendingAudit } = getBookingAuditState(b);
    return sum + (isPendingAudit ? b.invoice.amountPaid : 0);
  }, 0);

  const pendingAuditCount = bookings.filter((b) => getBookingAuditState(b).isPendingAudit).length;

  const handleOpenPaymentModal = (b: Booking) => {
    setRecordingBooking(b);
    setPaymentAmount(b.invoice.balanceDue);
    setReferenceNo(`PAY-${Math.floor(100000 + Math.random() * 900000)}`);
  };

  const handlePromptRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordingBooking || paymentAmount <= 0) return;
    setIsConfirmPaymentOpen(true);
  };

  const handleExecuteRecordPayment = () => {
    if (!recordingBooking || paymentAmount <= 0) return;

    const newPayment: PaymentRecord = {
      id: `pmt-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      amount: paymentAmount,
      method: paymentMethod,
      referenceNo: referenceNo || `REF-${Date.now()}`,
      status: 'Verified',
      verifiedBy: 'Finance Operations',
      verifiedAt: new Date().toISOString(),
      notes: 'Direct payment verified & posted by Finance Operations'
    };

    onAddPaymentRecord(recordingBooking.id, newPayment);

    // If fully paid by this record, also mark booking as verified
    if (recordingBooking.invoice.balanceDue - paymentAmount <= 0 && onUpdateBooking) {
      onUpdateBooking({
        ...recordingBooking,
        paymentStatus: 'Paid',
        paymentVerificationStatus: 'Verified',
        verifiedBy: 'Finance Operations',
        verifiedAt: new Date().toISOString(),
        verificationNotes: 'Payment verified and posted via Invoice Management.'
      });
    }

    dispatchAppNotification({
      title: 'Payment Verified & Posted',
      message: `Recorded & verified ₱${paymentAmount.toLocaleString()} via ${paymentMethod} for ${recordingBooking.bookingRef}`,
      type: 'payment_verified',
      bookingRef: recordingBooking.bookingRef,
      actionLabel: 'View Receipt'
    }, recordingBooking.customer?.email);

    setIsConfirmPaymentOpen(false);
    setRecordingBooking(null);
  };

  return (
    <div className="space-y-8">
      {/* Submodule Header */}
      <div className="bg-[#0B1014] border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sunset-coral text-xs font-sans-body tracking-[0.25em] uppercase font-medium">
              <CreditCard className="w-4 h-4" />
              <span>Billing, Invoicing & Payments</span>
            </div>
            <h1 className="font-serif-display text-3xl sm:text-4xl font-light text-ivory tracking-wide">
              Billing, Invoicing & Payment Processing
            </h1>
            <p className="text-xs sm:text-sm text-sand-muted max-w-2xl font-light leading-relaxed">
              Generate official BIR-compliant travel invoices, verify GCash, Maya, and BDO/BPI bank transfers, and reconcile payment balances.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="bg-[#070B0E] p-3.5 px-5 rounded-xl border border-white/[0.06]">
              <span className="text-[10px] uppercase tracking-wider text-sand-muted block">Audited Revenue</span>
              <span className="font-serif-display text-2xl text-emerald-400">₱{totalVerifiedRevenue.toLocaleString()}</span>
            </div>
            {totalPendingAuditRevenue > 0 && (
              <div className="bg-amber-950/40 p-3.5 px-5 rounded-xl border border-amber-500/30">
                <span className="text-[10px] uppercase tracking-wider text-amber-300 block flex items-center gap-1">
                  <Clock className="w-3 h-3 animate-pulse" />
                  Awaiting Gate Audit
                </span>
                <span className="font-serif-display text-2xl text-amber-300">₱{totalPendingAuditRevenue.toLocaleString()}</span>
                <span className="text-[10px] text-amber-200/70 block mt-0.5">{pendingAuditCount} invoice{pendingAuditCount === 1 ? '' : 's'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Filter and Search */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 pt-6 border-t border-white/[0.08] items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-sand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search invoice number, booking ref, guest..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#070B0E] border border-white/[0.08] rounded-full pl-10 pr-4 py-2 text-xs text-ivory placeholder-sand-muted/50 focus:outline-none focus:border-sunset-coral"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {['All', 'Paid (Verified)', 'Pending Audit', 'Flagged', 'Unpaid'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-sans-body tracking-wider transition ${
                  statusFilter === st
                    ? 'bg-sunset-coral text-white font-medium'
                    : 'bg-white/[0.04] text-sand-muted hover:text-ivory'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Invoice Cards Table */}
      <div className="bg-[#0B1014] border border-white/[0.06] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#070B0E] border-b border-white/[0.06] text-sand-muted uppercase font-sans-body tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-6">Invoice & Booking Ref</th>
                <th className="py-3.5 px-6">Lead Guest</th>
                <th className="py-3.5 px-6">Tour Package</th>
                <th className="py-3.5 px-6">Total Amount</th>
                <th className="py-3.5 px-6">Paid / Balance</th>
                <th className="py-3.5 px-6">Payment Gate Audit</th>
                <th className="py-3.5 px-6">Invoice Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-sand-muted">
              {filteredBookings.map((b) => {
                const inv = b.invoice;
                const { isVerified, isPendingAudit, isFlagged, displayStatus } = getBookingAuditState(b);

                return (
                  <tr key={b.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-4 px-6 font-mono text-ivory">
                      <div className="font-bold text-sunset-coral">{inv.invoiceNumber}</div>
                      <div className="text-[11px] text-sand-muted font-normal">{b.bookingRef}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-ivory font-medium">{b.customer.fullName}</div>
                      <div className="text-[11px] text-sand-muted font-light">{b.customer.phone}</div>
                    </td>
                    <td className="py-4 px-6 text-ivory font-light">
                      <div className="max-w-[200px] truncate">{b.tourTitle}</div>
                      <div className="text-[11px] text-sand-muted font-mono">{b.travelDate}</div>
                    </td>
                    <td className="py-4 px-6 font-serif-display text-base text-ivory">
                      ₱{inv.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 font-mono">
                      <div className={isVerified ? 'text-emerald-400 font-medium' : 'text-amber-300'}>
                        ₱{inv.amountPaid.toLocaleString()}
                        {!isVerified && inv.amountPaid > 0 && (
                          <span className="text-[10px] block text-amber-400/80 font-sans font-normal">(Unverified)</span>
                        )}
                      </div>
                      {inv.balanceDue > 0 && (
                        <div className="text-amber-400 text-[11px]">Due: ₱{inv.balanceDue.toLocaleString()}</div>
                      )}
                    </td>

                    {/* PAYMENT GATE AUDIT COLUMN */}
                    <td className="py-4 px-6">
                      {isVerified ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                            Audit Verified
                          </span>
                          <span className="text-[10px] text-sand-muted/70 block font-mono">
                            By: {b.verifiedBy || 'Finance'}
                          </span>
                        </div>
                      ) : isPendingAudit ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 bg-amber-950/80 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            <Clock className="w-3 h-3 text-amber-400 animate-pulse shrink-0" />
                            Pending Audit
                          </span>
                          {onGoToPaymentGateAudit && (
                            <button
                              onClick={onGoToPaymentGateAudit}
                              className="text-[10px] text-sunset-coral hover:underline flex items-center gap-0.5 cursor-pointer font-medium"
                            >
                              Go to Audit Gate →
                            </button>
                          )}
                        </div>
                      ) : isFlagged ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 bg-red-950/80 text-red-300 border border-red-500/30 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            <ShieldAlert className="w-3 h-3 text-red-400 shrink-0" />
                            Audit Flagged
                          </span>
                          <span className="text-[10px] text-red-300/80 block max-w-[150px] truncate">
                            {b.verificationNotes || 'Re-upload required'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-sand-muted/50 italic">No proof uploaded</span>
                      )}
                    </td>

                    {/* INVOICE STATUS COLUMN */}
                    <td className="py-4 px-6">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          displayStatus === 'Paid'
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                            : displayStatus === 'Pending Audit' || displayStatus === 'Partial (Pending Audit)'
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                            : displayStatus === 'Flagged'
                            ? 'bg-red-950/80 text-red-300 border border-red-500/30'
                            : 'bg-white/[0.04] text-sand-muted border border-white/10'
                        }`}
                      >
                        {displayStatus === 'Paid'
                          ? 'PAID (VERIFIED)'
                          : displayStatus === 'Pending Audit'
                          ? 'PENDING AUDIT'
                          : displayStatus === 'Partial'
                          ? 'PARTIAL (VERIFIED)'
                          : displayStatus === 'Partial (Pending Audit)'
                          ? 'PARTIAL (PENDING AUDIT)'
                          : displayStatus === 'Flagged'
                          ? 'AUDIT FLAGGED'
                          : 'UNPAID'}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => setViewingInvoiceBooking(b)}
                        className="btn-pop px-3.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 text-ivory border border-white/10 transition text-[11px] cursor-pointer"
                      >
                        View Voucher
                      </button>
                      {isOperatorView && inv.balanceDue > 0 && (
                        <button
                          onClick={() => handleOpenPaymentModal(b)}
                          className="btn-pop btn-shimmer-wrap px-3.5 py-1.5 rounded-full bg-sunset-coral hover:bg-[#D95339] active:scale-95 text-white text-[11px] font-medium transition cursor-pointer shadow-md shadow-sunset-coral/20"
                        >
                          + Record Payment
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {recordingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0B1014] border border-white/10 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <span className="text-xs font-sans-body uppercase tracking-wider text-sunset-coral">
                  {recordingBooking.invoice.invoiceNumber}
                </span>
                <h3 className="font-serif-display text-2xl text-ivory">Record Payment Transaction</h3>
              </div>
              <button
                onClick={() => setRecordingBooking(null)}
                className="p-1.5 rounded-full text-sand-muted hover:text-ivory cursor-pointer active:scale-90 transition-transform"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePromptRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs uppercase text-sand-muted mb-1 font-sans-body">Payment Amount (₱)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={recordingBooking.invoice.balanceDue}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full bg-[#070B0E] border border-white/[0.08] rounded-xl px-4 py-2 text-sunset-coral font-mono text-lg font-bold focus:outline-none focus:border-sunset-coral"
                />
              </div>

              <div>
                <label className="block text-xs uppercase text-sand-muted mb-1 font-sans-body">Payment Gateway / Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-[#070B0E] border border-white/[0.08] rounded-xl px-4 py-2 text-xs text-ivory focus:outline-none focus:border-sunset-coral"
                >
                  <option value="GCash">GCash E-Wallet</option>
                  <option value="PayMaya">Maya E-Wallet</option>
                  <option value="Bank Transfer">BDO / BPI Bank Transfer</option>
                  <option value="Credit Card">Credit / Debit Card</option>
                  <option value="Cash">Cash in Office</option>
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase text-sand-muted mb-1 font-sans-body">Transaction / Reference No.</label>
                <input
                  type="text"
                  required
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  className="w-full bg-[#070B0E] border border-white/[0.08] rounded-xl px-4 py-2 text-xs text-ivory font-mono focus:outline-none focus:border-sunset-coral"
                />
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRecordingBooking(null)}
                  className="btn-pop px-4 py-2 rounded-full text-xs text-sand-muted hover:text-ivory active:scale-95 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-pop btn-shimmer-wrap px-5 py-2 rounded-full text-xs font-medium bg-sunset-coral hover:bg-[#D95339] active:scale-95 text-white shadow-lg shadow-sunset-coral/20 cursor-pointer transition-all"
                >
                  Verify & Post Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Invoice Modal */}
      {viewingInvoiceBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0B1014] border border-white/10 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
            {/* Dynamic Stamp on Voucher */}
            <div className="absolute top-4 right-4 sm:top-6 sm:right-14 z-10 pointer-events-none block scale-75 sm:scale-100 origin-top-right">
              <RubberStamp
                type={
                  viewingInvoiceBooking.invoice.balanceDue === 0
                    ? 'PAID'
                    : viewingInvoiceBooking.invoice.amountPaid > 0
                    ? 'PARTIAL'
                    : 'UNPAID'
                }
                subtext={
                  viewingInvoiceBooking.invoice.balanceDue === 0
                    ? 'SETTLED IN FULL'
                    : `BAL: ₱${viewingInvoiceBooking.invoice.balanceDue.toLocaleString()}`
                }
                date={viewingInvoiceBooking.invoice.issueDate}
                verificationCode={viewingInvoiceBooking.invoice.invoiceNumber}
                size="md"
                rotation={-8}
                className="animate-stamp-drop shadow-2xl"
              />
            </div>

            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div>
                <span className="text-xs font-sans-body uppercase tracking-wider text-sunset-coral">
                  Official Travel Statement
                </span>
                <h3 className="font-serif-display text-2xl text-ivory">
                  {viewingInvoiceBooking.invoice.invoiceNumber}
                </h3>
              </div>
              <button
                onClick={() => setViewingInvoiceBooking(null)}
                className="p-1.5 rounded-full text-sand-muted hover:text-ivory cursor-pointer active:scale-90 transition-transform"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-light text-sand-muted">
              <div className="bg-[#070B0E] p-4 rounded-2xl border border-white/[0.04] space-y-2">
                <div className="flex justify-between">
                  <span>Guest:</span>
                  <span className="text-ivory font-normal">{viewingInvoiceBooking.customer.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tour Expedition:</span>
                  <span className="text-ivory font-normal">{viewingInvoiceBooking.tourTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Amount:</span>
                  <span className="font-serif-display text-base text-ivory">₱{viewingInvoiceBooking.invoice.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paid:</span>
                  <span className="text-emerald-400 font-mono">₱{viewingInvoiceBooking.invoice.amountPaid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-white/[0.04] pt-2">
                  <span>Remaining Balance:</span>
                  <span className="text-amber-400 font-mono font-bold">₱{viewingInvoiceBooking.invoice.balanceDue.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-sans-body uppercase tracking-wider text-ivory block mb-2 font-medium">
                  Payment History Log
                </span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {viewingInvoiceBooking.invoice.payments.map((p) => (
                    <div key={p.id} className="flex justify-between p-2.5 rounded-xl bg-[#070B0E] text-[11px] border border-white/[0.03]">
                      <span>{p.date} · {p.method}</span>
                      <span className="text-emerald-400 font-mono">₱{p.amount.toLocaleString()} ({p.referenceNo})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.08] flex justify-end">
              <button
                onClick={() => setViewingInvoiceBooking(null)}
                className="btn-pop px-5 py-2 bg-white/[0.06] hover:bg-white/[0.1] active:scale-95 text-ivory rounded-full text-xs cursor-pointer transition-all"
              >
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Safeguard for Payment Entry */}
      <ActionConfirmModal
        isOpen={isConfirmPaymentOpen}
        onClose={() => setIsConfirmPaymentOpen(false)}
        onConfirm={handleExecuteRecordPayment}
        title="Confirm Payment Transaction Record?"
        message="This will record the payment in the official ledger and credit the guest's expedition invoice."
        details={[
          { label: 'Booking Ref', value: recordingBooking?.bookingRef || '' },
          { label: 'Guest Name', value: recordingBooking?.customer.fullName || '' },
          { label: 'Payment Method', value: paymentMethod },
          { label: 'Reference No.', value: referenceNo },
          { label: 'Amount to Post', value: `₱${paymentAmount.toLocaleString()}` },
          { label: 'New Remaining Balance', value: `₱${Math.max(0, (recordingBooking?.invoice.balanceDue || 0) - paymentAmount).toLocaleString()}` },
        ]}
        confirmText="Yes, Post Payment"
        cancelText="No, Adjust Amount"
        variant="success"
      />
    </div>
  );
};

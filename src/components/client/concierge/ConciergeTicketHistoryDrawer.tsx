import React from 'react';
import { 
  X, 
  Ticket, 
  Clock, 
  MessageSquare, 
  Download, 
  UserCheck, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ArrowRight,
  LogIn,
  ShieldCheck,
  Calendar,
  Sparkles,
  LogOut
} from 'lucide-react';
import { UserProfile, fetchConciergeMessages } from '../../../utils/supabaseClient';
import { 
  formatTranscriptText, 
  downloadTranscriptFile 
} from '../../../utils/emailService';

interface ConciergeTicketHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: any[];
  activeTicketId: string | null;
  onSelectTicket: (ticket: any) => void;
  onCloseTicket?: (ticket: any) => void;
  onRefresh: () => void;
  isLoading: boolean;
  travelerUser?: UserProfile | null;
  guestUser?: { name: string; email?: string } | null;
  onOpenAuth?: () => void;
}

export const ConciergeTicketHistoryDrawer: React.FC<ConciergeTicketHistoryDrawerProps> = ({
  isOpen,
  onClose,
  tickets,
  activeTicketId,
  onSelectTicket,
  onCloseTicket,
  onRefresh,
  isLoading,
  travelerUser,
  guestUser,
  onOpenAuth
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end animate-fade-in text-ivory">
      <div className="bg-[#070B0E] border-l border-white/15 w-full max-w-md h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-[#0B1014] border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sunset-coral/20 border border-sunset-coral/40 flex items-center justify-center text-sunset-coral">
              <Ticket className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ivory flex items-center gap-2">
                <span>Active Support Tickets</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/10 text-sand">
                  {tickets.filter(t => t.status !== 'Resolved').length}
                </span>
              </h3>
              <p className="text-[11px] text-sand-muted">
                {travelerUser 
                  ? `Linked to ${travelerUser.email}` 
                  : guestUser?.email 
                  ? `Guest: ${guestUser.email}` 
                  : 'Current active tickets'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh tickets"
              className="p-2 text-sand-muted hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-sand-muted hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* User Identity Banner */}
        {!travelerUser && (
          <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="text-[11px]">Viewing guest session tickets.</span>
            </div>
            {onOpenAuth && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="text-[11px] font-semibold text-sunset-coral hover:underline flex items-center gap-1"
              >
                <span>Log In</span>
                <LogIn className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Ticket List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-sand-muted space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-sunset-coral" />
              <p className="text-xs">Loading active tickets...</p>
            </div>
          ) : tickets.filter(t => t.status !== 'Resolved').length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-sand-muted space-y-3 px-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-sand-muted">
                <Ticket className="w-6 h-6 opacity-40" />
              </div>
              <div>
                <p className="text-xs font-medium text-ivory">No active tickets open</p>
                <p className="text-[11px] text-sand-muted mt-1 leading-relaxed">
                  When you request a Live Staff Agent, your active conversations will appear here. Closed tickets are detached from your device and permanently purged after 24 hours.
                </p>
              </div>
            </div>
          ) : (
            tickets.filter(t => t.status !== 'Resolved').map((t) => {
              const isSelected = activeTicketId === t.id;
              const isLive = t.status === 'Handed_To_Human';
              const ticketNumber = t.ticket_ref || ('TICK-2026-' + (t.id ? t.id.substring(5, 9).toUpperCase() : ''));

              return (
                <div
                  key={t.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-sunset-coral/10 border-sunset-coral/50 shadow-md shadow-sunset-coral/10'
                      : 'bg-[#0B1014] hover:bg-white/[0.04] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-ivory">
                        #{ticketNumber}
                      </span>
                      {isSelected && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase bg-sunset-coral/20 text-sunset-coral border border-sunset-coral/30">
                          Active Chat
                        </span>
                      )}
                    </div>

                    <div>
                      {isLive ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                          Staff Live
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          Active
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-sand-muted line-clamp-2 mb-3">
                    {t.last_message || 'Inquiry initiated with operations desk'}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-sand-muted border-t border-white/[0.06] pt-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {t.created_at ? new Date(t.created_at).toLocaleDateString() : 'Recent'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          const msgs = await fetchConciergeMessages(t.id);
                          const formatted = formatTranscriptText({
                            ticketRef: t.ticket_ref || 'TICK-2026',
                            customerName: travelerUser?.full_name || guestUser?.name || 'Traveler',
                            customerEmail: travelerUser?.email || guestUser?.email,
                            status: t.status || 'Active',
                            createdAt: t.created_at,
                            messages: (msgs || []).map((m: any) => ({
                              sender: m.sender_type || m.sender || 'user',
                              senderName: m.sender_name || m.senderName,
                              senderRole: m.sender_role || m.senderRole,
                              text: m.text,
                              timestamp: m.created_at || m.timestamp
                            }))
                          });
                          downloadTranscriptFile(`holiday-travelers-transcript-${t.ticket_ref || 'ticket'}.txt`, formatted);
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-sand-muted hover:text-emerald-300 border border-white/5 hover:border-emerald-500/30 transition-all"
                        title="Download Conversation Transcript (.txt)"
                      >
                        <Download className="w-3 h-3 text-emerald-400" />
                      </button>

                      {onCloseTicket && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCloseTicket(t);
                          }}
                          className="px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[11px] font-medium transition-all flex items-center gap-1"
                          title="Close ticket and detach from device"
                        >
                          <LogOut className="w-3 h-3 text-rose-400" />
                          <span>Close</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          onSelectTicket(t);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-sunset-coral hover:text-white text-sand text-[11px] font-medium transition-all flex items-center gap-1"
                      >
                        <span>Open</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Policy Notice */}
        <div className="p-3 bg-[#0B1014] border-t border-white/10 text-[10px] text-sand-muted flex items-start gap-2 shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="leading-tight">
            <strong>Privacy & Auto-Purge:</strong> Concluded tickets are immediately detached from client devices and automatically purged from cloud records in 24 hours.
          </p>
        </div>
      </div>
    </div>
  );
};

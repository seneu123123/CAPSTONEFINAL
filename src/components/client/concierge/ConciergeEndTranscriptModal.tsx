import React, { useState } from 'react';
import { 
  Download, 
  Mail, 
  CheckCircle2, 
  X, 
  FileText, 
  Timer, 
  Send, 
  Loader2,
  Copy,
  Share2,
  ExternalLink,
  ShieldCheck,
  Check
} from 'lucide-react';
import { 
  dispatchTranscriptEmail, 
  downloadTranscriptFile,
  openGmailWebDraft,
  openDefaultMailClient,
  copyTranscriptToClipboard,
  shareTranscriptNative
} from '../../../utils/emailService';

interface ConciergeEndTranscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketRef: string;
  customerName: string;
  customerEmail?: string;
  transcriptText: string;
  onRestartChat: () => void;
}

export const ConciergeEndTranscriptModal: React.FC<ConciergeEndTranscriptModalProps> = ({
  isOpen,
  onClose,
  ticketRef,
  customerName,
  customerEmail,
  transcriptText,
  onRestartChat
}) => {
  const [emailInput, setEmailInput] = useState(customerEmail || '');
  const [isSending, setIsSending] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  if (!isOpen) return null;

  const handleDownload = () => {
    const filename = `HolidayTravelers_${ticketRef || 'Transcript'}_${Date.now()}.txt`;
    downloadTranscriptFile(filename, transcriptText);
    setHasDownloaded(true);
    setStatusNotice({
      type: 'success',
      msg: 'Transcript saved to your device as a text document.'
    });
  };

  const handleCopyClipboard = async () => {
    const success = await copyTranscriptToClipboard(transcriptText);
    if (success) {
      setHasCopied(true);
      setStatusNotice({
        type: 'success',
        msg: 'Full transcript copied to clipboard! You can paste it in WhatsApp, Viber, Notes, or Email.'
      });
      setTimeout(() => setHasCopied(false), 3000);
    }
  };

  const handleOpenGmail = () => {
    openGmailWebDraft({
      toEmail: emailInput.trim(),
      customerName: customerName || 'Traveler Guest',
      ticketRef: ticketRef || 'TICK-2026',
      transcriptText: transcriptText
    });
    setStatusNotice({
      type: 'success',
      msg: 'Opened pre-filled Gmail compose draft with your complete transcript!'
    });
  };

  const handleOpenMailApp = () => {
    openDefaultMailClient({
      toEmail: emailInput.trim(),
      customerName: customerName || 'Traveler Guest',
      ticketRef: ticketRef || 'TICK-2026',
      transcriptText: transcriptText
    });
    setStatusNotice({
      type: 'success',
      msg: 'Launched your device mail client with the transcript pre-filled.'
    });
  };

  const handleNativeShare = async () => {
    const shared = await shareTranscriptNative({
      toEmail: emailInput.trim(),
      customerName: customerName || 'Traveler Guest',
      ticketRef: ticketRef || 'TICK-2026',
      transcriptText: transcriptText
    });
    if (shared) {
      setStatusNotice({
        type: 'success',
        msg: 'Transcript shared successfully.'
      });
    }
  };

  const handleSendEmail = async () => {
    if (!emailInput.trim()) return;
    setIsSending(true);
    setStatusNotice(null);

    const result = await dispatchTranscriptEmail({
      toEmail: emailInput.trim(),
      customerName: customerName || 'Traveler Guest',
      ticketRef: ticketRef || 'TICK-2026',
      transcriptText: transcriptText
    });

    setIsSending(false);
    if (result.success) {
      setStatusNotice({
        type: 'success',
        msg: result.message
      });
    } else {
      setStatusNotice({
        type: 'error',
        msg: 'Email dispatch could not be completed. You can use Open in Gmail or Copy below.'
      });
    }
  };

  const handleExitAndReset = () => {
    onClose();
    onRestartChat();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in text-ivory">
      <div className="bg-[#0B1014] border border-white/15 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-ivory">Ticket Closed</h3>
              <p className="text-xs text-sand-muted">Support Ticket #{ticketRef || 'TICK-2026'}</p>
            </div>
          </div>
          <button
            onClick={handleExitAndReset}
            className="p-1.5 text-sand-muted hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            title="Close modal and reset concierge"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 24-Hour Notice & Client-Side Unreachability */}
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 text-amber-300 font-semibold text-xs">
            <Timer className="w-4 h-4 text-amber-400" />
            <span>Closed Ticket Policy & 24-Hour Auto-Purge</span>
          </div>
          <p className="text-sand text-[11px] leading-relaxed">
            This ticket is now closed and <strong>unreachable on your device</strong>. You can download or email your transcript below. All ticket records on our server will be <strong>automatically purged 24 hours after closing</strong>.
          </p>
        </div>

        {/* Section 1: Email Transcript Options (With Zero-Limit Alternatives) */}
        <div className="p-4 rounded-2xl bg-[#070B0E] border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-ivory">Email Transcript (No Limits)</span>
            </div>
            <span className="text-[10px] text-sand-muted bg-white/5 px-2 py-0.5 rounded font-mono">
              Free & Instant
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-sand-muted">Target Email Address:</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="name@example.com"
                className="flex-1 bg-[#0B1014] border border-white/15 rounded-xl px-3 py-2 text-xs text-ivory focus:outline-none focus:border-amber-400 placeholder:text-white/20"
              />
              <button
                type="button"
                onClick={handleSendEmail}
                disabled={isSending || !emailInput.trim()}
                title="Send via Cloud Dispatcher"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                {isSending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Auto-Send</span>
              </button>
            </div>
          </div>

          {/* 1-Click Zero Quota Email Shortcuts */}
          <div className="pt-1 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleOpenGmail}
              className="flex-1 min-w-[130px] py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 hover:border-amber-400/40 text-xs text-ivory flex items-center justify-center gap-1.5 transition-all group"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>Open in Gmail</span>
            </button>

            <button
              type="button"
              onClick={handleOpenMailApp}
              className="flex-1 min-w-[130px] py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 hover:border-amber-400/40 text-xs text-ivory flex items-center justify-center gap-1.5 transition-all group"
            >
              <Mail className="w-3.5 h-3.5 text-sand-muted group-hover:text-amber-400 transition-colors" />
              <span>Device Mail App</span>
            </button>
          </div>
          <p className="text-[10px] text-white/40 italic">
            * Opening in Gmail or Device Mail App drafts directly in your email client with 0 quota limits.
          </p>
        </div>

        {/* Section 2: Instant Save & Copy Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Action A: Copy Transcript */}
          <button
            type="button"
            onClick={handleCopyClipboard}
            className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 active:scale-[0.98] ${
              hasCopied 
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' 
                : 'bg-[#070B0E] hover:bg-white/[0.04] border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {hasCopied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4 text-sunset-coral" />
                )}
                <span className="text-xs font-semibold text-ivory">
                  {hasCopied ? 'Copied!' : 'Copy to Clipboard'}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-sand-muted leading-tight">
              Copy full conversation to paste in WhatsApp, Viber, or Notes.
            </p>
          </button>

          {/* Action B: Download File */}
          <button
            type="button"
            onClick={handleDownload}
            className="p-3.5 rounded-2xl bg-[#070B0E] hover:bg-white/[0.04] border border-white/10 hover:border-white/20 text-left transition-all flex flex-col justify-between gap-2 active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-sunset-coral" />
                <span className="text-xs font-semibold text-ivory">Download .txt File</span>
              </div>
              {hasDownloaded && (
                <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-medium">
                  Saved
                </span>
              )}
            </div>
            <p className="text-[11px] text-sand-muted leading-tight">
              Save a permanent timestamped text file to your device storage.
            </p>
          </button>

          {/* Action C: Native Mobile Share (if available) */}
          {canNativeShare && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="sm:col-span-2 p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-xs text-sand flex items-center justify-center gap-2 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Share Transcript via Mobile Apps (WhatsApp, Messenger, etc.)</span>
            </button>
          )}
        </div>

        {/* Feedback Alert */}
        {statusNotice && (
          <div className={`p-3 rounded-xl text-xs flex items-center gap-2 animate-fade-in ${
            statusNotice.type === 'success' 
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300' 
              : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="leading-snug">{statusNotice.msg}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <button
            type="button"
            onClick={() => {
              onClose();
              onRestartChat();
            }}
            className="text-xs text-sand-muted hover:text-white transition-colors underline decoration-dotted"
          >
            Start New AI Conversation
          </button>
          <button
            type="button"
            onClick={handleExitAndReset}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-ivory font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

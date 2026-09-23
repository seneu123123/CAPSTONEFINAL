import React, { useState } from 'react';
import { 
  UserCheck, 
  User, 
  LogIn, 
  X, 
  ShieldCheck, 
  Mail, 
  ArrowRight, 
  Headphones, 
  Sparkles,
  UserPlus
} from 'lucide-react';
import { UserProfile } from '../../../utils/supabaseClient';

interface ConciergeLiveAgentPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  travelerUser?: UserProfile | null;
  onOpenTravelerAuth?: () => void;
  onConfirmGuest: (name: string, email?: string) => void;
  onConfirmTraveler: () => void;
}

export const ConciergeLiveAgentPromptModal: React.FC<ConciergeLiveAgentPromptModalProps> = ({
  isOpen,
  onClose,
  travelerUser,
  onOpenTravelerAuth,
  onConfirmGuest,
  onConfirmTraveler
}) => {
  const [mode, setMode] = useState<'choose' | 'guest'>('choose');
  const [guestName, setGuestName] = useState(() => {
    try {
      const saved = localStorage.getItem('holiday_concierge_guest_user');
      if (saved) return JSON.parse(saved).name || '';
    } catch {}
    return '';
  });
  const [guestEmail, setGuestEmail] = useState(() => {
    try {
      const saved = localStorage.getItem('holiday_concierge_guest_user');
      if (saved) return JSON.parse(saved).email || '';
    } catch {}
    return '';
  });

  if (!isOpen) return null;

  // Case 1: User is already signed in as Traveler
  if (travelerUser) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-[#0B1014] border border-white/15 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-ivory">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-ivory">Connect with Live Staff</h3>
                <p className="text-[11px] text-sand-muted">Holiday Travelers Operations Desk</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-sand-muted hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Signed In Account Verified</span>
            </div>
            <p className="text-xs text-ivory font-semibold">{travelerUser.full_name || 'Traveler Account'}</p>
            <p className="text-[11px] text-sand-muted">{travelerUser.email}</p>
          </div>

          <p className="text-xs text-sand-muted leading-relaxed">
            Your support ticket and live conversation will be linked to your traveler account, allowing you to access transcripts anytime.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sand text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirmTraveler();
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-sunset-coral hover:opacity-95 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Start Live Support</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: Not signed in -> Prompt to Log In or Continue as Guest
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#0B1014] border border-white/15 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-ivory">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ivory">Talk with a Live Agent</h3>
              <p className="text-[11px] text-sand-muted">Direct dispatch from Manila office</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-sand-muted hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {mode === 'choose' ? (
          <div className="space-y-3 pt-1">
            <p className="text-xs text-sand leading-relaxed">
              How would you like to connect with our live staff agent?
            </p>

            {/* Option 1: Login / Register */}
            <button
              onClick={() => {
                onClose();
                onOpenTravelerAuth?.();
              }}
              className="w-full text-left p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-sunset-coral/40 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-sunset-coral/20 flex items-center justify-center text-sunset-coral">
                    <LogIn className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-ivory group-hover:text-sunset-coral transition-colors">
                      Log In / Register Account
                    </h4>
                    <p className="text-[10px] text-sand-muted">
                      Save ticket history and transcripts to your account
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-sand-muted group-hover:text-sunset-coral group-hover:translate-x-0.5 transition-all" />
              </div>
            </button>

            {/* Option 2: Guest Mode */}
            <button
              onClick={() => setMode('guest')}
              className="w-full text-left p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-amber-400/40 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-ivory group-hover:text-amber-300 transition-colors">
                      Continue as Guest
                    </h4>
                    <p className="text-[10px] text-sand-muted">
                      Fast access without password or account registration
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-sand-muted group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all" />
              </div>
            </button>
          </div>
        ) : (
          /* Guest Details Form */
          <div className="space-y-3.5 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-sand">Guest Contact Information</span>
              <button
                onClick={() => setMode('choose')}
                className="text-sunset-coral hover:underline text-[11px]"
              >
                Back
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-sand-muted font-medium">Your Name</label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="e.g. Maria Santos"
                className="w-full bg-[#070B0E] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-ivory focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-sand-muted font-medium">
                Email Address <span className="text-sand-muted/60">(Optional, for transcripts)</span>
              </label>
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="maria@example.com"
                className="w-full bg-[#070B0E] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-ivory focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setMode('choose')}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-sand text-xs"
              >
                Back
              </button>
              <button
                onClick={() => {
                  const finalName = guestName.trim() || 'Guest Traveler';
                  const finalEmail = guestEmail.trim() || undefined;
                  try {
                    localStorage.setItem('holiday_concierge_guest_user', JSON.stringify({ name: finalName, email: finalEmail }));
                  } catch {}
                  onConfirmGuest(finalName, finalEmail);
                  onClose();
                }}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold shadow-md transition-all flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Start as Guest</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

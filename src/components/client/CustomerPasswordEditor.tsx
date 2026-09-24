import React, { useState } from 'react';
import { 
  Lock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  ShieldCheck, 
  Sparkles, 
  RefreshCw, 
  Copy, 
  AlertCircle,
  ShieldAlert,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { UserProfile, updateTravelerPassword } from '../../utils/supabaseClient';
import { dispatchAppNotification } from '../../utils/notifications';
import { logSecurityEvent } from '../../utils/rbac';

interface CustomerPasswordEditorProps {
  travelerUser: UserProfile | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
  isCompact?: boolean;
}

export const CustomerPasswordEditor: React.FC<CustomerPasswordEditorProps> = ({
  travelerUser,
  onSuccess,
  onCancel,
  className = '',
  isCompact = false
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedGenerated, setCopiedGenerated] = useState(false);

  // Criteria Checks
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);

  const criteriaMetCount = 
    (hasMinLength ? 1 : 0) +
    (hasUppercase ? 1 : 0) +
    (hasLowercase ? 1 : 0) +
    (hasNumber ? 1 : 0) +
    (hasSymbol ? 1 : 0);

  const isPasswordMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const isMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  // Strength Calculator
  const getStrength = (): {
    score: number;
    label: string;
    textColor: string;
    barColor: string;
    percentage: number;
  } => {
    if (!newPassword) {
      return { score: 0, label: 'Not Entered', textColor: 'text-sand-muted', barColor: 'bg-white/10', percentage: 0 };
    }
    if (criteriaMetCount <= 2) {
      return { score: 1, label: 'Weak', textColor: 'text-rose-400', barColor: 'bg-rose-500', percentage: 25 };
    }
    if (criteriaMetCount === 3) {
      return { score: 2, label: 'Fair', textColor: 'text-amber-400', barColor: 'bg-amber-400', percentage: 50 };
    }
    if (criteriaMetCount === 4) {
      return { score: 3, label: 'Good', textColor: 'text-emerald-400', barColor: 'bg-emerald-400', percentage: 75 };
    }
    return { score: 4, label: 'Strong (Enterprise Grade)', textColor: 'text-cyan-400', barColor: 'bg-gradient-to-r from-emerald-400 to-cyan-400', percentage: 100 };
  };

  const strength = getStrength();

  // Smart Random Password Generator
  const generateStrongPassword = () => {
    const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowers = 'abcdefghijkmnopqrstuvwxyz';
    const numbers = '23456789';
    const symbols = '!@#$%^&*()_+~';
    const all = uppers + lowers + numbers + symbols;

    let generated = '';
    // Guarantee 1 of each
    generated += uppers.charAt(Math.floor(Math.random() * uppers.length));
    generated += lowers.charAt(Math.floor(Math.random() * lowers.length));
    generated += numbers.charAt(Math.floor(Math.random() * numbers.length));
    generated += symbols.charAt(Math.floor(Math.random() * symbols.length));

    for (let i = 4; i < 14; i++) {
      generated += all.charAt(Math.floor(Math.random() * all.length));
    }

    // Shuffle
    const shuffled = generated.split('').sort(() => 0.5 - Math.random()).join('');
    setNewPassword(shuffled);
    setConfirmPassword(shuffled);
    setShowNewPassword(true);
    setShowConfirmPassword(true);
    setErrorMsg(null);

    // Copy to clipboard
    navigator.clipboard?.writeText(shuffled).then(() => {
      setCopiedGenerated(true);
      setTimeout(() => setCopiedGenerated(false), 3000);
    }).catch(() => {});

    dispatchAppNotification({
      title: 'Strong Password Generated',
      message: 'A high-entropy password was generated and automatically copied to your clipboard.',
      type: 'info'
    });
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!travelerUser?.email) {
      setErrorMsg('No active traveler profile found. Please sign in first.');
      return;
    }

    if (criteriaMetCount < 3 || newPassword.length < 6) {
      setErrorMsg('Please choose a stronger password matching at least 3 security criteria.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('The new password and confirmation password do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await updateTravelerPassword(
        travelerUser.email,
        newPassword,
        currentPassword ? currentPassword : undefined
      );

      setSuccessMsg(res.message || 'Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Audit Log for Security
      logSecurityEvent(
        travelerUser.email,
        'TRAVELER_PASSWORD_UPDATED',
        `Traveler account credentials were changed by user (${travelerUser.email}).`,
        'info',
        travelerUser.email
      );

      dispatchAppNotification({
        title: 'Password Updated',
        message: 'Your account password has been securely updated and encrypted.',
        type: 'info'
      });

      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (err: any) {
      console.error('Password update error:', err);
      setErrorMsg(err.message || 'Failed to update password. Please check your credentials and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Info Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-sunset-coral/10 via-[#0B1118] to-cyan-950/20 border border-white/10 relative overflow-hidden">
        <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sunset-coral/20 border border-sunset-coral/40 flex items-center justify-center text-sunset-coral shrink-0 shadow-md">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-serif-display text-base sm:text-lg text-ivory font-medium flex items-center gap-2">
                <span>Account Password & Credentials</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  End-to-End Encrypted
                </span>
              </h4>
              <p className="text-xs text-sand-muted mt-0.5">
                Protect your bookings, vouchers, and traveler identity with a high-entropy password.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={generateStrongPassword}
            className="btn-pop px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-cyan-300 hover:text-cyan-200 text-xs font-mono flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            title="Generate a secure password and copy to clipboard"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>{copiedGenerated ? 'Copied & Filled!' : 'Generate Strong Password'}</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-3 animate-fade-in shadow-lg">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-emerald-200">{successMsg}</p>
            <p className="text-[11px] text-emerald-400/80 font-mono mt-0.5">
              All active sessions and cloud database records have been securely refreshed.
            </p>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-3 animate-fade-in shadow-lg">
          <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-rose-200">{errorMsg}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleUpdatePassword} className="space-y-4">
        {/* Form Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Current Password Field */}
          <div className="md:col-span-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-sand-muted flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-sand-muted" />
                <span>Current Password</span>
                <span className="text-[10px] text-sand-muted/70">(Leave blank if first-time password setup)</span>
              </label>
            </div>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password if applicable"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B0E] border border-white/15 text-ivory text-xs font-mono focus:outline-none focus:border-sunset-coral transition-colors pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sand-muted hover:text-ivory transition-colors"
                title={showCurrentPassword ? 'Hide current password' : 'Show current password'}
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-sand-muted flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-sunset-coral" />
                <span>New Password</span>
                <span className="text-sunset-coral">*</span>
              </label>
              {newPassword && (
                <span className={`text-[11px] font-mono font-medium ${strength.textColor}`}>
                  {strength.label}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="Create secure new password"
                className={`w-full px-3.5 py-2.5 rounded-xl bg-[#070B0E] border text-ivory text-xs font-mono focus:outline-none transition-colors pr-10 ${
                  newPassword 
                    ? strength.score >= 3 
                      ? 'border-emerald-500/50 focus:border-emerald-400' 
                      : strength.score >= 2 
                      ? 'border-amber-500/50 focus:border-amber-400' 
                      : 'border-rose-500/50 focus:border-rose-400'
                    : 'border-white/15 focus:border-sunset-coral'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sand-muted hover:text-ivory transition-colors"
                title={showNewPassword ? 'Hide new password' : 'Show new password'}
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Strength Meter Bar */}
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mt-1.5 flex gap-1">
              <div 
                className={`h-full transition-all duration-300 rounded-full ${strength.barColor}`} 
                style={{ width: `${strength.percentage}%` }}
              />
            </div>
          </div>

          {/* Confirm New Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-sand-muted flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-cyan-400" />
                <span>Confirm New Password</span>
                <span className="text-sunset-coral">*</span>
              </label>
              {confirmPassword && (
                <span className={`text-[10px] font-mono flex items-center gap-1 ${isPasswordMatch ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isPasswordMatch ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Passwords match</span>
                    </>
                  ) : (
                    <>
                      <X className="w-3 h-3" />
                      <span>Passwords mismatch</span>
                    </>
                  )}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Re-enter new password"
                className={`w-full px-3.5 py-2.5 rounded-xl bg-[#070B0E] border text-ivory text-xs font-mono focus:outline-none transition-colors pr-10 ${
                  confirmPassword 
                    ? isPasswordMatch 
                      ? 'border-emerald-500/60 focus:border-emerald-400' 
                      : 'border-rose-500/60 focus:border-rose-400'
                    : 'border-white/15 focus:border-sunset-coral'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sand-muted hover:text-ivory transition-colors"
                title={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Interactive Criteria Checklist */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2.5">
          <span className="text-[11px] font-mono text-sand-muted uppercase tracking-wider block">
            Password Complexity Guidelines:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs font-mono">
            <div className={`flex items-center gap-2 p-2 rounded-xl transition-all ${
              hasMinLength ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'text-sand-muted/80 bg-white/[0.02]'
            }`}>
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                hasMinLength ? 'bg-emerald-500 text-black font-bold' : 'bg-white/10 text-sand-muted'
              }`}>
                {hasMinLength ? <Check className="w-2.5 h-2.5" /> : '•'}
              </div>
              <span>At least 8 characters</span>
            </div>

            <div className={`flex items-center gap-2 p-2 rounded-xl transition-all ${
              hasUppercase ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'text-sand-muted/80 bg-white/[0.02]'
            }`}>
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                hasUppercase ? 'bg-emerald-500 text-black font-bold' : 'bg-white/10 text-sand-muted'
              }`}>
                {hasUppercase ? <Check className="w-2.5 h-2.5" /> : '•'}
              </div>
              <span>Uppercase letter (A-Z)</span>
            </div>

            <div className={`flex items-center gap-2 p-2 rounded-xl transition-all ${
              hasLowercase ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'text-sand-muted/80 bg-white/[0.02]'
            }`}>
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                hasLowercase ? 'bg-emerald-500 text-black font-bold' : 'bg-white/10 text-sand-muted'
              }`}>
                {hasLowercase ? <Check className="w-2.5 h-2.5" /> : '•'}
              </div>
              <span>Lowercase letter (a-z)</span>
            </div>

            <div className={`flex items-center gap-2 p-2 rounded-xl transition-all ${
              hasNumber ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'text-sand-muted/80 bg-white/[0.02]'
            }`}>
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                hasNumber ? 'bg-emerald-500 text-black font-bold' : 'bg-white/10 text-sand-muted'
              }`}>
                {hasNumber ? <Check className="w-2.5 h-2.5" /> : '•'}
              </div>
              <span>Number digit (0-9)</span>
            </div>

            <div className={`flex items-center gap-2 p-2 rounded-xl transition-all ${
              hasSymbol ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'text-sand-muted/80 bg-white/[0.02]'
            }`}>
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                hasSymbol ? 'bg-emerald-500 text-black font-bold' : 'bg-white/10 text-sand-muted'
              }`}>
                {hasSymbol ? <Check className="w-2.5 h-2.5" /> : '•'}
              </div>
              <span>Special symbol (!@#$...)</span>
            </div>

            <div className={`flex items-center gap-2 p-2 rounded-xl transition-all ${
              isPasswordMatch ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'text-sand-muted/80 bg-white/[0.02]'
            }`}>
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                isPasswordMatch ? 'bg-emerald-500 text-black font-bold' : 'bg-white/10 text-sand-muted'
              }`}>
                {isPasswordMatch ? <Check className="w-2.5 h-2.5" /> : '•'}
              </div>
              <span>Passwords Match</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-[11px] text-sand-muted font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Encrypted with SHA-256 PBKDF2 Vault</span>
          </div>

          <div className="flex items-center gap-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sand-muted hover:text-ivory text-xs font-medium border border-white/10 transition-all cursor-pointer"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !newPassword || !confirmPassword || isMismatch || criteriaMetCount < 2}
              className="btn-pop px-6 py-2.5 rounded-xl bg-gradient-to-r from-sunset-coral to-[#ff765b] hover:from-[#ff765b] hover:to-sunset-coral text-white font-semibold text-xs shadow-lg shadow-sunset-coral/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating Credentials...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Update Password</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

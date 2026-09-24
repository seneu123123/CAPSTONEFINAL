import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  KeyRound,
  Compass,
  UserCheck,
  Send,
  Loader2,
  Eye,
  EyeOff,
  Check,
  ShieldAlert
} from 'lucide-react';
import { 
  signInWithGoogle, 
  signInWithEmailPassword, 
  signUpWithEmailPassword, 
  sendEmailOtp, 
  verifyEmailOtpToken,
  sendPasswordResetEmail,
  verifyResetOtpCode,
  updateTravelerPassword,
  signOutUser,
  UserProfile 
} from '../../utils/supabaseClient';
import { 
  checkRateLimit, 
  recordFailedAttempt, 
  clearRateLimit, 
  RateLimitStatus 
} from '../../utils/rateLimiter';

interface TravelerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (profile: UserProfile) => void;
  onContinueAsGuest?: () => void;
  reasonMessage?: string;
  initialTab?: 'google_email' | 'signup' | 'guest' | 'forgot_password';
}

export const TravelerAuthModal: React.FC<TravelerAuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  onContinueAsGuest,
  reasonMessage,
  initialTab = 'google_email'
}) => {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup' | 'otp' | 'guest' | 'forgot_password'>(
    initialTab === 'signup' ? 'signup' : initialTab === 'guest' ? 'guest' : initialTab === 'forgot_password' ? 'forgot_password' : 'signin'
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isResetEmailSent, setIsResetEmailSent] = useState(false);
  const [resetCodeInput, setResetCodeInput] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);

  // Show/Hide Password Toggles
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Progressive Account Lockout Protection (5min -> 10min -> 15min)
  const [rateLimitStatus, setRateLimitStatus] = useState<RateLimitStatus>(() => checkRateLimit('traveler'));

  // Password Security Metrics & Validation
  const hasMinLength = password.length >= 6;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  
  // Count how many of the 3 required criteria are satisfied
  const metCriteriaCount = (hasUppercase ? 1 : 0) + (hasNumber ? 1 : 0) + (hasSymbol ? 1 : 0);
  const isTwoOfThreeMet = metCriteriaCount >= 2;
  const isPasswordMatch = confirmPassword.length > 0 && password === confirmPassword;
  const hasConfirmMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  // Strength Level Calculator
  const getPasswordStrength = (): {
    score: number;
    label: 'Weak' | 'Normal' | 'Strong' | '';
    textColor: string;
    barColor: string;
    badgeBg: string;
  } => {
    if (!password) {
      return { score: 0, label: '', textColor: 'text-sand-muted', barColor: 'bg-white/10', badgeBg: 'bg-white/5 border-white/10 text-sand-muted' };
    }
    
    // Weak: does not meet minimum length or meets less than 2 of the 3 criteria
    if (!hasMinLength || metCriteriaCount < 2) {
      return { score: 1, label: 'Weak', textColor: 'text-rose-400', barColor: 'bg-rose-500', badgeBg: 'bg-rose-500/15 border-rose-500/30 text-rose-300' };
    }

    // Strong: length >= 8 and meets all 3 criteria, or length >= 10 and meets at least 2
    if ((password.length >= 8 && metCriteriaCount === 3) || password.length >= 10) {
      return { score: 3, label: 'Strong', textColor: 'text-emerald-400', barColor: 'bg-emerald-500', badgeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' };
    }

    // Normal: meets minimum length + 2 of 3 criteria
    return { score: 2, label: 'Normal', textColor: 'text-amber-400', barColor: 'bg-amber-400', badgeBg: 'bg-amber-500/15 border-amber-500/30 text-amber-300' };
  };

  const strength = getPasswordStrength();
  const isFormValidToSubmit = Boolean(
    fullName.trim() &&
    email.trim().includes('@') &&
    hasMinLength &&
    isTwoOfThreeMet &&
    isPasswordMatch
  );

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      if (email.trim()) {
        setRateLimitStatus(checkRateLimit(email.trim()));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, email]);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setOtpToken('');
    setIsOtpSent(false);
    setIsResetEmailSent(false);
    setError(null);
    setSuccessMsg(null);
    setLoading(false);
    setGoogleLoading(false);
    setShowSignInPassword(false);
    setShowSignUpPassword(false);
    setShowConfirmPassword(false);
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
      setActiveTab(
        initialTab === 'signup' 
          ? 'signup' 
          : initialTab === 'guest' 
          ? 'guest' 
          : initialTab === 'forgot_password'
          ? 'forgot_password'
          : 'signin'
      );
    } else {
      resetForm();
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleCloseModal = () => {
    resetForm();
    onClose();
  };

  const switchTab = (tab: 'signin' | 'signup' | 'otp' | 'guest' | 'forgot_password') => {
    setActiveTab(tab);
    setPassword('');
    setConfirmPassword('');
    setOtpToken('');
    setIsResetEmailSent(false);
    setError(null);
    setSuccessMsg(null);
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      setError(err?.message || 'Google sign-in could not be completed. Please try again.');
      setGoogleLoading(false);
    }
  };

  const handleEmailPasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    const currentLimit = checkRateLimit(email.trim());
    if (currentLimit.isLocked) {
      const mins = Math.floor(currentLimit.lockoutRemainingSeconds / 60);
      const secs = currentLimit.lockoutRemainingSeconds % 60;
      setError(`Account security lockout active (${mins}m ${secs}s remaining). Cycle #${currentLimit.lockoutLevel} (${currentLimit.currentLockoutMinutes} mins).`);
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const data = await signInWithEmailPassword(email, password);
      if (data.user) {
        clearRateLimit(email.trim());
        const profile: UserProfile = {
          id: data.user.id,
          email: data.user.email || email,
          full_name: data.user.user_metadata?.full_name || email.split('@')[0],
          avatar_url: data.user.user_metadata?.avatar_url || null,
          role: 'Traveler',
          status: 'Active',
          auth_provider: 'email',
        };
        setSuccessMsg('Welcome back! Logging you in...');
        setTimeout(() => {
          onAuthSuccess(profile);
          resetForm();
          onClose();
        }, 150);
      }
    } catch (err: any) {
      const newStatus = recordFailedAttempt(email.trim());
      setRateLimitStatus(newStatus);
      if (newStatus.isLocked) {
        const mins = Math.floor(newStatus.lockoutRemainingSeconds / 60);
        const secs = newStatus.lockoutRemainingSeconds % 60;
        setError(`Security Lockout: 5 consecutive failed login attempts detected. Account temporarily locked for ${mins}m ${secs}s (Cycle #${newStatus.lockoutLevel}: ${newStatus.currentLockoutMinutes} minutes).`);
      } else {
        const remainingAttempts = 5 - newStatus.failedCount;
        setError(`${err?.message || 'Invalid email or password.'} (${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining).`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || !confirmPassword || !fullName.trim()) {
      setError('Please fill in all registration fields.');
      return;
    }

    if (!hasMinLength) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (!isTwoOfThreeMet) {
      setError('Password must contain at least 2 of the following: capital letter, number, or special symbol.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify both fields.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const data = await signUpWithEmailPassword(email, password, fullName);
      if (data.user) {
        const profile: UserProfile = {
          id: data.user.id,
          email: data.user.email || email,
          full_name: fullName.trim(),
          avatar_url: null,
          role: 'Traveler',
          status: 'Active',
          auth_provider: 'email',
        };
        setSuccessMsg('Account created successfully! Welcome to Holiday Travelers.');
        setTimeout(() => {
          onAuthSuccess(profile);
          resetForm();
          onClose();
        }, 400);
      }
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMagicOtp = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await sendEmailOtp(email);
      setIsOtpSent(true);
      setSuccessMsg(`A 6-digit verification code was sent to ${email}. Check your inbox!`);
    } catch (err: any) {
      setError(err?.message || 'Could not send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpToken.trim()) {
      setError('Please enter the 6-digit code from your email.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const data = await verifyEmailOtpToken(email, otpToken);
      if (data.user) {
        const profile: UserProfile = {
          id: data.user.id,
          email: data.user.email || email,
          full_name: data.user.user_metadata?.full_name || email.split('@')[0],
          avatar_url: null,
          role: 'Traveler',
          status: 'Active',
          auth_provider: 'email_otp',
        };
        setSuccessMsg('Email verified! You are now logged in.');
        setTimeout(() => {
          onAuthSuccess(profile);
          resetForm();
          onClose();
        }, 600);
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid or expired OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendForgotPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid registered email address.');
      return;
    }

    setError(null);
    setLoading(true);
    setSuccessMsg(null);
    try {
      const res = await sendPasswordResetEmail(email.trim());
      setIsResetEmailSent(true);
      setSuccessMsg(`A password reset link & 6-digit code was sent to ${email.trim()}. Enter the 6-digit code below to set your new password!`);
    } catch (err: any) {
      console.warn('Password reset error:', err);
      setError(err?.message || 'Could not send reset email. Please verify your email address.');
      setIsResetEmailSent(false);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyResetCodeAndChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter your account email.');
      return;
    }
    if (!resetCodeInput.trim()) {
      setError('Please enter the 6-digit reset code sent to your email.');
      return;
    }
    if (resetNewPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setError('Passwords do not match. Please re-enter both password fields.');
      return;
    }

    // Verify 6-digit OTP code
    const isCodeValid = verifyResetOtpCode(email.trim(), resetCodeInput.trim());
    if (!isCodeValid) {
      setError('Invalid or expired 6-digit reset code. Please check your email or click Resend Code.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await updateTravelerPassword(email.trim(), resetNewPassword);
      setSuccessMsg('Password successfully reset! Signing you in...');
      
      // Auto login after reset
      setTimeout(async () => {
        try {
          const loginData = await signInWithEmailPassword(email.trim(), resetNewPassword);
          if (loginData.user) {
            const profile: UserProfile = {
              id: loginData.user.id,
              email: loginData.user.email || email.trim(),
              full_name: loginData.user.user_metadata?.full_name || email.split('@')[0],
              role: 'Traveler',
              status: 'Active',
              auth_provider: 'email',
            };
            onAuthSuccess(profile);
            resetForm();
            onClose();
          }
        } catch {
          // If auto login fallback, close modal and switch tab
          switchTab('signin');
        }
      }, 800);
    } catch (err: any) {
      setError(err?.message || 'Password update failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSelect = async () => {
    try {
      await signOutUser();
    } catch {}
    if (onContinueAsGuest) {
      onContinueAsGuest();
    }
    resetForm();
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[95] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/60 backdrop-blur-md animate-fade-in"
      onClick={handleCloseModal}
      role="dialog"
      aria-modal="true"
      id="traveler-auth-modal"
    >
      <div 
        className="relative w-full max-w-md bg-[#080D11] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-5 my-8 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-sunset-coral/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        {/* Modal Header */}
        <div className="relative flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sunset-coral/20 to-amber-500/10 border border-sunset-coral/40 flex items-center justify-center text-sunset-coral shadow-inner">
              {activeTab === 'forgot_password' ? <KeyRound className="w-5 h-5" /> : <Compass className="w-5 h-5" />}
            </div>
            <div>
              <p className="text-[10px] font-sans-body tracking-[0.25em] uppercase text-sunset-coral font-medium">
                Holiday Travelers
              </p>
              <h3 className="font-serif-display text-2xl text-ivory leading-tight">
                {activeTab === 'signin' 
                  ? 'Sign In to Account' 
                  : activeTab === 'signup' 
                  ? 'Create Secure Account' 
                  : activeTab === 'otp' 
                  ? 'Email Code Verification' 
                  : activeTab === 'forgot_password'
                  ? 'Forgot Password'
                  : 'Guest Exploration'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloseModal}
            className="w-9 h-9 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-sand-muted hover:text-ivory hover:bg-white/10 transition-all cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reason Banner (e.g., checkout gate) */}
        {reasonMessage && (
          <div className="p-3.5 rounded-2xl bg-sunset-coral/15 border border-sunset-coral/30 text-sunset-coral text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed font-light">{reasonMessage}</p>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 p-1 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => switchTab('signin')}
            className={`py-2 rounded-lg font-medium transition-all ${
              activeTab === 'signin' || activeTab === 'otp' || activeTab === 'forgot_password'
                ? 'bg-sunset-coral text-white shadow-md'
                : 'text-sand-muted hover:text-ivory'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchTab('signup')}
            className={`py-2 rounded-lg font-medium transition-all ${
              activeTab === 'signup'
                ? 'bg-sunset-coral text-white shadow-md'
                : 'text-sand-muted hover:text-ivory'
            }`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => switchTab('guest')}
            className={`py-2 rounded-lg font-medium transition-all ${
              activeTab === 'guest'
                ? 'bg-sunset-coral text-white shadow-md'
                : 'text-sand-muted hover:text-ivory'
            }`}
          >
            Guest
          </button>
        </div>

        {/* Alert Notifications */}
        {error && (
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/30 text-red-200 text-xs flex items-start gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{error}</p>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{successMsg}</p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: SIGN IN (Google + Email) */}
        {/* ========================================================================= */}
        {activeTab === 'signin' && (
          <div className="space-y-4">
            {/* Google One-Tap Sign In */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full relative group flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-medium text-sm transition-all duration-300 shadow-xl shadow-white/5 hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-60"
            >
              {googleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-700" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>

            {/* Subtle Divider */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[11px] font-mono uppercase tracking-wider text-sand-muted">or email credentials</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <form onSubmit={handleEmailPasswordSignIn} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs text-sand-muted flex items-center gap-1.5 font-light">
                  <Mail className="w-3.5 h-3.5 text-sunset-coral" />
                  <span>Email Address</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-ivory placeholder:text-white/30 focus:outline-none focus:border-sunset-coral/80 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-sand-muted flex items-center gap-1.5 font-light">
                    <Lock className="w-3.5 h-3.5 text-sunset-coral" />
                    <span>Password</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => switchTab('forgot_password')}
                    className="text-[11px] text-sunset-coral hover:text-[#ff765b] hover:underline cursor-pointer font-medium"
                    id="btn-forgot-password"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showSignInPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-4 pr-11 py-2.5 text-sm text-ivory placeholder:text-white/30 focus:outline-none focus:border-sunset-coral/80 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignInPassword(!showSignInPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sand-muted hover:text-ivory transition-colors p-1 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    onClick={() => switchTab('otp')}
                    className="text-[11px] text-sand-muted hover:text-sand-light transition-colors cursor-pointer"
                  >
                    Send Magic Code instead →
                  </button>
                </div>
              </div>

              {rateLimitStatus.isLocked ? (
                <div className="py-3 px-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs text-center font-mono font-medium animate-pulse">
                  Account temporarily locked ({Math.floor(rateLimitStatus.lockoutRemainingSeconds / 60)}m {rateLimitStatus.lockoutRemainingSeconds % 60}s). Cycle #{rateLimitStatus.lockoutLevel} ({rateLimitStatus.currentLockoutMinutes} mins).
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-sunset-coral to-[#ff765b] text-white font-medium text-sm flex items-center justify-center gap-2 hover:opacity-95 transition-all shadow-lg shadow-sunset-coral/25 disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: REGISTER (Secure with Password Strength & Confirm Password)         */}
        {/* ========================================================================= */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-sand-muted flex items-center gap-1.5 font-light">
                <User className="w-3.5 h-3.5 text-sunset-coral" />
                <span>Full Name</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Maria Santos"
                required
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-ivory placeholder:text-white/30 focus:outline-none focus:border-sunset-coral/80 transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-sand-muted flex items-center gap-1.5 font-light">
                <Mail className="w-3.5 h-3.5 text-sunset-coral" />
                <span>Email Address</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-ivory placeholder:text-white/30 focus:outline-none focus:border-sunset-coral/80 transition-colors"
              />
            </div>

            {/* Password Input with Visibility Toggle */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-sand-muted flex items-center gap-1.5 font-light">
                  <Lock className="w-3.5 h-3.5 text-sunset-coral" />
                  <span>Create Password</span>
                </label>
                {strength.label && (
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${strength.badgeBg}`}>
                    {strength.label}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showSignUpPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  required
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-4 pr-11 py-2.5 text-sm text-ivory placeholder:text-white/30 focus:outline-none focus:border-sunset-coral/80 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sand-muted hover:text-ivory transition-colors p-1 cursor-pointer"
                  tabIndex={-1}
                >
                  {showSignUpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Dynamic 3-Segment Password Strength Bar */}
              {password.length > 0 && (
                <div className="space-y-1.5 pt-1 animate-fade-in">
                  <div className="grid grid-cols-3 gap-1.5 h-1.5 w-full bg-white/5 rounded-full overflow-hidden p-0.5">
                    <div className={`h-full rounded-full transition-all duration-300 ${strength.score >= 1 ? strength.barColor : 'bg-white/10'}`} />
                    <div className={`h-full rounded-full transition-all duration-300 ${strength.score >= 2 ? strength.barColor : 'bg-white/10'}`} />
                    <div className={`h-full rounded-full transition-all duration-300 ${strength.score >= 3 ? strength.barColor : 'bg-white/10'}`} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-sand-muted">
                    <span>Password Strength:</span>
                    <span className={`font-medium ${strength.textColor}`}>
                      {strength.label === 'Weak' && 'Weak (Improve criteria)'}
                      {strength.label === 'Normal' && 'Normal (Good security)'}
                      {strength.label === 'Strong' && 'Strong (Excellent security)'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Input with Visibility Toggle */}
            <div className="space-y-1.5">
              <label className="text-xs text-sand-muted flex items-center gap-1.5 font-light">
                <KeyRound className="w-3.5 h-3.5 text-sunset-coral" />
                <span>Confirm Password</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  className={`w-full bg-white/[0.04] border rounded-xl pl-4 pr-11 py-2.5 text-sm text-ivory placeholder:text-white/30 focus:outline-none transition-colors ${
                    hasConfirmMismatch
                      ? 'border-rose-500/80 focus:border-rose-500'
                      : isPasswordMatch
                      ? 'border-emerald-500/80 focus:border-emerald-500'
                      : 'border-white/10 focus:border-sunset-coral/80'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sand-muted hover:text-ivory transition-colors p-1 cursor-pointer"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              {/* Match Notice */}
              {confirmPassword.length > 0 && (
                <div className="flex items-center gap-1.5 text-[11px] pt-0.5 animate-fade-in">
                  {isPasswordMatch ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-medium">
                      <Check className="w-3 h-3 text-emerald-400" />
                      Passwords match perfectly
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3 h-3 text-rose-400" />
                      Passwords do not match
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Password Security Policy Checklist (2 of 3 rule) */}
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 text-xs">
              <div className="flex items-center justify-between font-medium text-ivory">
                <span className="flex items-center gap-1 text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-sunset-coral" />
                  Security Requirements:
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${isTwoOfThreeMet ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-sand-muted'}`}>
                  {metCriteriaCount}/3 criteria ({metCriteriaCount >= 2 ? 'Goal met' : 'Min. 2 required'})
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-sand-muted">
                <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-400' : 'text-sand-muted'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${hasMinLength ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40'}`}>
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  <span>At least 6 characters</span>
                </div>

                <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-emerald-400' : 'text-sand-muted'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${hasUppercase ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40'}`}>
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  <span>Capital Letter (A-Z)</span>
                </div>

                <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-400' : 'text-sand-muted'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${hasNumber ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40'}`}>
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  <span>Number (0-9)</span>
                </div>

                <div className={`flex items-center gap-1.5 ${hasSymbol ? 'text-emerald-400' : 'text-sand-muted'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${hasSymbol ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40'}`}>
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  <span>Symbol (!@#$%^&*)</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isFormValidToSubmit}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-sunset-coral to-[#ff765b] text-white font-medium text-sm flex items-center justify-center gap-2 hover:opacity-95 transition-all shadow-lg shadow-sunset-coral/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Create Secure Account</span>
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: MAGIC OTP */}
        {/* ========================================================================= */}
        {activeTab === 'otp' && (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-sand-muted flex items-center gap-1.5 font-light">
                <Mail className="w-3.5 h-3.5 text-sunset-coral" />
                <span>Email Address</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-ivory placeholder:text-white/30 focus:outline-none focus:border-sunset-coral/80 transition-colors"
                />
                <button
                  type="button"
                  onClick={handleSendMagicOtp}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-ivory text-xs font-medium border border-white/15 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-sunset-coral" />
                  <span>Send Code</span>
                </button>
              </div>
            </div>

            {isOtpSent && (
              <form onSubmit={handleVerifyOtp} className="space-y-3.5 pt-2 border-t border-white/10 animate-fade-in">
                <div className="space-y-1">
                  <label className="text-xs text-sand-muted flex items-center gap-1.5 font-light">
                    <KeyRound className="w-3.5 h-3.5 text-sunset-coral" />
                    <span>6-Digit Verification Code</span>
                  </label>
                  <input
                    type="text"
                    value={otpToken}
                    onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    required
                    className="w-full bg-white/[0.04] border border-sunset-coral/50 rounded-xl px-4 py-3 text-center font-mono text-xl tracking-[0.4em] text-ivory focus:outline-none focus:border-sunset-coral transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otpToken.length < 6}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-sunset-coral to-[#ff765b] text-white font-medium text-sm flex items-center justify-center gap-2 hover:opacity-95 transition-all shadow-lg shadow-sunset-coral/25 disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Verify & Continue</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('signin')}
                className="text-xs text-sand-muted hover:text-ivory underline cursor-pointer"
              >
                Back to Password Sign-In
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: GUEST MODE */}
        {/* ========================================================================= */}
        {activeTab === 'guest' && (
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 rounded-full bg-sand-muted/10 border border-white/10 mx-auto flex items-center justify-center text-sunset-coral">
              <UserCheck className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h4 className="font-serif-display text-lg text-ivory">Explore as a Guest</h4>
              <p className="text-xs text-sand-muted leading-relaxed max-w-xs mx-auto font-light">
                Guest mode gives you unrestricted access to browse island expeditions, check live weather radars, and chat with 24/7 AI & live concierge customer service.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/20 text-left text-xs text-amber-200/90 space-y-1">
              <p className="font-semibold text-amber-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Notice on Booking & Checkout:</span>
              </p>
              <p className="text-[11px] text-amber-100/70 font-light leading-relaxed">
                Guest accounts cannot access the checkout section. Philippine DOT and IATA airline regulations require a verified traveler account to confirm booking vouchers and transmit official passenger manifests.
              </p>
            </div>

            <button
              type="button"
              onClick={handleGuestSelect}
              className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-ivory font-medium text-sm border border-white/15 transition-all cursor-pointer shadow-md"
            >
              Continue Browsing as Guest
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: FORGOT PASSWORD (Resend SMTP & 6-Digit Code Recovery Flow)        */}
        {/* ========================================================================= */}
        {activeTab === 'forgot_password' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5 text-left">
              <div className="flex items-center gap-2 text-sunset-coral font-medium text-xs">
                <KeyRound className="w-4 h-4" />
                <span>Account Recovery & Password Reset</span>
              </div>
              <p className="text-xs text-sand-muted leading-relaxed font-light">
                Enter your account email address. We will dispatch a 6-digit reset code and recovery link to your inbox via Resend.
              </p>
            </div>

            {!isResetEmailSent ? (
              <form onSubmit={handleSendForgotPassword} className="space-y-3.5">
                <div className="space-y-1 text-left">
                  <label className="text-xs text-sand-muted flex items-center gap-1.5 font-light">
                    <Mail className="w-3.5 h-3.5 text-sunset-coral" />
                    <span>Account Email Address</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-ivory placeholder:text-white/30 focus:outline-none focus:border-sunset-coral/80 transition-colors font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim() || !email.includes('@')}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-sunset-coral to-[#ff765b] text-white font-medium text-sm flex items-center justify-center gap-2 hover:opacity-95 transition-all shadow-lg shadow-sunset-coral/25 disabled:opacity-60 cursor-pointer"
                  id="btn-send-reset-link"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Password Reset Code & Link</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Inline 6-Digit Verification Code & Password Reset Form */
              <div className="space-y-4 animate-fade-in">
                <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-200 text-xs space-y-1 text-left">
                  <div className="flex items-center gap-2 font-medium text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>6-Digit Recovery Code Dispatched</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-emerald-100/80 font-light">
                    We've sent a 6-digit code to <span className="font-mono text-emerald-200 font-semibold">{email}</span>. Enter it below with your new password!
                  </p>
                </div>

                <form onSubmit={handleVerifyResetCodeAndChangePassword} className="space-y-3.5 text-left">
                  <div className="space-y-1">
                    <label className="text-xs text-sand-muted flex items-center gap-1.5 font-light">
                      <KeyRound className="w-3.5 h-3.5 text-sunset-coral" />
                      <span>6-Digit Reset Code (from email)</span>
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={resetCodeInput}
                      onChange={(e) => setResetCodeInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 849120"
                      required
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-center font-mono text-lg font-bold tracking-[0.3em] text-sunset-coral placeholder:text-white/20 focus:outline-none focus:border-sunset-coral/80"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-sand-muted flex items-center gap-1.5 font-light">
                      <Lock className="w-3.5 h-3.5 text-sunset-coral" />
                      <span>New Password</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showResetNewPassword ? "text" : "password"}
                        value={resetNewPassword}
                        onChange={(e) => setResetNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        required
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-ivory placeholder:text-white/30 focus:outline-none focus:border-sunset-coral/80 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetNewPassword(!showResetNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sand-muted hover:text-ivory"
                      >
                        {showResetNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-sand-muted flex items-center gap-1.5 font-light">
                      <CheckCircle2 className="w-3.5 h-3.5 text-sunset-coral" />
                      <span>Confirm New Password</span>
                    </label>
                    <input
                      type="password"
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      required
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-ivory placeholder:text-white/30 focus:outline-none focus:border-sunset-coral/80"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !resetCodeInput.trim() || resetNewPassword.length < 6 || resetNewPassword !== resetConfirmPassword}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-sunset-coral to-[#ff765b] text-white font-medium text-sm flex items-center justify-center gap-2 hover:opacity-95 transition-all shadow-lg shadow-sunset-coral/25 disabled:opacity-60 cursor-pointer"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Reset Password & Sign In</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={handleSendForgotPassword}
                      className="text-[11px] text-sand-muted hover:text-sunset-coral underline cursor-pointer"
                    >
                      Didn't receive code? Resend Email Code
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
              <button
                type="button"
                onClick={() => switchTab('signin')}
                className="text-sand-muted hover:text-ivory flex items-center gap-1 cursor-pointer transition-colors"
              >
                ← Back to Sign In
              </button>

              <button
                type="button"
                onClick={() => switchTab('otp')}
                className="text-sunset-coral hover:underline cursor-pointer"
              >
                Use Magic Code instead
              </button>
            </div>
          </div>
        )}

        {/* Modal Footer Security Badge */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-sand-muted/70 font-light">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>PostgreSQL & SSL Encrypted</span>
          </span>
          <span>Holiday Travelers Inc.</span>
        </div>
      </div>
    </div>
  );
};

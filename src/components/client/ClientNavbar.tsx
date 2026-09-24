import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, Search, CloudSun, Lock, Ticket, User, LogOut, ChevronDown, Sparkles, KeyRound } from 'lucide-react';
import { RealTimeNotificationCenter } from '../common/RealTimeNotificationCenter';
import { CurrencySelector } from '../common/CurrencySelector';
import { UserProfile } from '../../utils/supabaseClient';

interface ClientNavbarProps {
  onOpenBooking: (packageId?: string) => void;
  onOpenTracker: () => void;
  onOpenAdminAuth?: () => void;
  onOpenWeatherRadar?: () => void;
  isStaffLoggedIn?: boolean;
  onOpenAdminPortal?: () => void;
  travelerUser?: UserProfile | null;
  onOpenTravelerAuth?: () => void;
  onSignOutTraveler?: () => void;
  onOpenMyAccount?: (tab?: 'overview' | 'profile' | 'password' | 'theme' | 'vouchers' | 'privacy') => void;
}

export const ClientNavbar: React.FC<ClientNavbarProps> = ({
  onOpenBooking,
  onOpenTracker,
  onOpenWeatherRadar,
  onOpenAdminAuth,
  isStaffLoggedIn,
  onOpenAdminPortal,
  travelerUser,
  onOpenTravelerAuth,
  onSignOutTraveler,
  onOpenMyAccount,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const [logoTapCount, setLogoTapCount] = useState(0);

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    scrollToSection('hero');

    // Mobile Easter Egg 1: Rapidly tapping brand logo 5 times unlocks/triggers Admin Authentication
    const nextCount = logoTapCount + 1;
    setLogoTapCount(nextCount);

    if (nextCount >= 5) {
      setLogoTapCount(0);
      if (navigator.vibrate) {
        navigator.vibrate([40, 60, 40]);
      }
      if (isStaffLoggedIn && onOpenAdminPortal) {
        onOpenAdminPortal();
      } else if (onOpenAdminAuth) {
        onOpenAdminAuth();
      }
    } else {
      // Reset counter if taps are separated by more than 2 seconds
      setTimeout(() => {
        setLogoTapCount(0);
      }, 2000);
    }
  };

  return (
    <header
      id="main-navigation"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? 'glass-obsidian-nav py-3.5 shadow-2xl'
          : 'bg-gradient-to-b from-[#070B0E]/95 via-[#070B0E]/60 to-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Brand Logo with Custom Suitcase Airplane Logo & Secret Discreet Multi-click Staff Ingress */}
        <a
          href="#hero"
          onClick={(e) => {
            e.preventDefault();
            handleLogoClick(e);
          }}
          className="flex items-center gap-2.5 sm:gap-3 group focus:outline-none cursor-pointer select-none shrink-0"
          id="brand-logo-link"
          title="Holiday Travelers Travel and Tours Inc."
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-sunset-coral/15 to-sunset-coral/5 border border-white/15 flex items-center justify-center p-1 group-hover:scale-105 group-hover:border-sunset-coral/60 transition-all duration-300 shadow-lg shadow-black/40 shrink-0">
            <img
              src="/images/logo.svg"
              alt="Holiday Travelers Inc. Logo"
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-md"
            />
          </div>
          <div className="flex flex-col shrink-0">
            <span className="font-serif-display text-xl sm:text-2xl text-ivory tracking-wide font-medium leading-tight drop-shadow-md whitespace-nowrap">
              Holiday Travelers
            </span>
            <span className="text-[10px] sm:text-[11px] font-sans-body tracking-[0.2em] uppercase text-sand-muted font-normal whitespace-nowrap">
              Travel & Tours Inc.
            </span>
          </div>
        </a>

        {/* Desktop Navigation Links - Single-line guaranteed, no wraps or overlaps */}
        <nav className="hidden lg:flex items-center gap-4 xl:gap-6 2xl:gap-7 shrink-0">
          <button
            onClick={() => scrollToSection('destinations')}
            className="text-xs xl:text-[13px] font-sans-body text-sand-muted hover:text-ivory hover:scale-105 active:scale-95 transition-all duration-300 tracking-wide whitespace-nowrap shrink-0 py-1.5 cursor-pointer"
            id="nav-destinations-btn"
          >
            Destinations
          </button>

          <button
            onClick={() => scrollToSection('expeditions')}
            className="text-xs xl:text-[13px] font-sans-body text-sand-muted hover:text-ivory hover:scale-105 active:scale-95 transition-all duration-300 tracking-wide whitespace-nowrap shrink-0 py-1.5 cursor-pointer"
            id="nav-journeys-btn"
          >
            Packages
          </button>

          <button
            onClick={() => scrollToSection('reviews')}
            className="text-xs xl:text-[13px] font-sans-body text-sand-muted hover:text-ivory hover:scale-105 active:scale-95 transition-all duration-300 tracking-wide whitespace-nowrap shrink-0 py-1.5 cursor-pointer"
            id="nav-reviews-btn"
          >
            Reviews
          </button>

          <a
            href="https://www.facebook.com/share/p/1DrMyBougo/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs xl:text-[13px] font-sans-body text-sand-muted hover:text-ivory hover:scale-105 active:scale-95 transition-all duration-300 tracking-wide whitespace-nowrap shrink-0 py-1.5 flex items-center gap-1.5 cursor-pointer group"
            id="nav-visa-fb-btn"
            title="Inquire about Visa & Passport on official Facebook post"
          >
            <span>Visa Inquiries</span>
            <span className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-white/[0.06] text-sand-muted border border-white/10 group-hover:text-ivory group-hover:border-sky-400/40 group-hover:bg-sky-500/20 transition-all">FB</span>
          </a>

          {/* Subtle divider before utility action items */}
          <div className="h-3.5 w-px bg-white/20 shrink-0" aria-hidden="true" />

          {onOpenWeatherRadar && (
            <>
              <button
                onClick={onOpenWeatherRadar}
                className="text-xs xl:text-[13px] font-sans-body text-sand-muted hover:text-sky-300 hover:scale-105 active:scale-95 transition-all duration-300 tracking-wide whitespace-nowrap shrink-0 py-1.5 flex items-center gap-1.5 cursor-pointer group"
                id="nav-weather-radar-btn"
              >
                <CloudSun className="w-3.5 h-3.5 text-sand-muted group-hover:text-sky-400 transition-colors" />
                <span>Weather</span>
              </button>
              <div className="h-3.5 w-px bg-white/20 shrink-0" aria-hidden="true" />
            </>
          )}

          <button
            onClick={() => onOpenTracker()}
            className="text-xs xl:text-[13px] font-sans-body text-sand-muted hover:text-sunset-coral hover:scale-105 active:scale-95 transition-all duration-300 tracking-wide whitespace-nowrap shrink-0 py-1.5 flex items-center gap-1.5 cursor-pointer group"
            id="nav-track-btn"
            title="Check Tickets & Live Travel Status"
          >
            <Ticket className="w-3.5 h-3.5 text-sunset-coral/90 group-hover:scale-110 transition-transform" />
            <span className="whitespace-nowrap">Check Tickets</span>
          </button>
        </nav>

        {/* Action CTAs (Desktop Hotbar with High-Contrast Spacers) */}
        <div className="hidden lg:flex items-center gap-2 xl:gap-2.5 shrink-0">
          {/* Main Hotbar Separator */}
          <div className="h-4 w-px bg-white/25 shrink-0 mx-1" aria-hidden="true" />

          {/* Multi-Currency Selector Dropdown */}
          <CurrencySelector variant="pill" />

          {/* Spacer Divider */}
          <div className="h-4 w-px bg-white/25 shrink-0 mx-1" aria-hidden="true" />

          {/* Real-time notification center */}
          <RealTimeNotificationCenter 
            onOpenTracker={onOpenTracker} 
            travelerUser={travelerUser} 
            onOpenTravelerAuth={onOpenTravelerAuth} 
          />

          {/* Spacer Divider */}
          <div className="h-4 w-px bg-white/25 shrink-0 mx-1" aria-hidden="true" />

          {/* Traveler Sign-In / Account Dropdown */}
          {travelerUser ? (
            <div className="relative shrink-0" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.15] hover:border-sunset-coral/50 text-ivory text-xs hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer shadow-sm whitespace-nowrap shrink-0 group"
                id="traveler-profile-menu-btn"
                title={`Signed in as ${travelerUser.full_name} (${travelerUser.email})`}
              >
                {travelerUser.avatar_url ? (
                  <img
                    src={travelerUser.avatar_url}
                    alt={travelerUser.full_name}
                    className="w-5 h-5 rounded-full object-cover border border-sunset-coral/60 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-sunset-coral/30 border border-sunset-coral/60 text-sunset-coral flex items-center justify-center text-[10px] font-bold shrink-0">
                    {travelerUser.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-medium text-xs max-w-[65px] xl:max-w-[85px] truncate whitespace-nowrap text-sand-muted group-hover:text-ivory">
                  {travelerUser.full_name.split(' ')[0]}
                </span>
                <ChevronDown className="w-3 h-3 text-sand-muted shrink-0" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-[#090E14]/95 backdrop-blur-2xl border border-white/15 shadow-2xl p-2 z-50 animate-scale-in">
                  <div className="px-3 py-2 border-b border-white/10 mb-1">
                    <p className="text-xs font-serif-display text-ivory font-normal truncate">
                      {travelerUser.full_name}
                    </p>
                    <p className="text-[10px] font-mono text-sand-muted truncate">{travelerUser.email}</p>
                    <span className={`inline-block mt-1 text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                      travelerUser.auth_provider === 'guest'
                        ? 'bg-amber-950/80 text-amber-300 border-amber-500/30'
                        : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30'
                    }`}>
                      {travelerUser.auth_provider === 'guest' ? 'Guest Session' : `${travelerUser.role || 'Traveler'} (Verified)`}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      if (onOpenMyAccount) onOpenMyAccount('overview');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-ivory hover:bg-white/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 font-medium cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-sunset-coral" />
                    <span>My Account & Balances</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      if (onOpenMyAccount) onOpenMyAccount('password');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-sand-muted hover:text-ivory hover:bg-white/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                    id="nav-user-change-password-btn"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-sunset-coral" />
                    <span>Change Password</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onOpenTracker();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-sand-muted hover:text-ivory hover:bg-white/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Ticket className="w-3.5 h-3.5 text-cyan-400" />
                    <span>My Bookings & Vouchers</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      if (onSignOutTraveler) onSignOutTraveler();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 mt-1 border-t border-white/5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenTravelerAuth}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/[0.06] hover:bg-sunset-coral/20 text-sand-muted hover:text-ivory border border-white/10 hover:border-sunset-coral/40 hover:scale-105 active:scale-95 transition-all duration-300 shadow-sm cursor-pointer whitespace-nowrap shrink-0"
              id="nav-traveler-signin-btn"
              title="Sign in with Google or Email"
            >
              <User className="w-3.5 h-3.5 text-sunset-coral shrink-0" />
              <span className="whitespace-nowrap">Sign In</span>
            </button>
          )}

          {isStaffLoggedIn && (
            <>
              {/* Spacer Divider */}
              <div className="h-4 w-px bg-white/15 shrink-0" aria-hidden="true" />
              
              <button
                onClick={onOpenAdminPortal}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-sunset-coral/15 hover:bg-sunset-coral/30 text-sunset-coral border border-sunset-coral/30 hover:border-sunset-coral/60 hover:scale-105 active:scale-95 transition-all duration-300 shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
                title="Open Admin Operations Tower"
                id="nav-admin-portal-active-btn"
              >
                <Lock className="w-3 h-3 shrink-0" />
                <span className="whitespace-nowrap">Admin</span>
              </button>
            </>
          )}
        </div>

        {/* Mobile / Tablet Controls (under lg breakpoint) */}
        <div className="flex lg:hidden items-center gap-2 shrink-0">
          <CurrencySelector variant="compact" />
          <RealTimeNotificationCenter 
            onOpenTracker={onOpenTracker} 
            travelerUser={travelerUser} 
            onOpenTravelerAuth={onOpenTravelerAuth} 
          />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-ivory p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 focus:outline-none transition-colors"
            aria-label="Toggle Navigation Menu"
            id="mobile-menu-toggle-btn"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-ivory" /> : <Menu className="w-5 h-5 text-ivory" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu - Clean, Unified, High-Contrast Luxury Design */}
      {mobileMenuOpen && (
        <div className="lg:hidden glass-obsidian border-b border-white/10 px-5 py-6 mt-3 space-y-5 animate-in fade-in slide-in-from-top-3 duration-300 max-h-[85vh] overflow-y-auto">
          {/* Section 1: Main Exploration Links */}
          <div className="space-y-1">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-sand-muted/70 px-3 pb-1">
              Explore Journeys
            </p>
            <button
              onClick={() => scrollToSection('destinations')}
              className="w-full text-left px-3.5 py-2.5 rounded-xl text-ivory hover:text-white hover:bg-white/[0.05] text-sm font-sans-body font-normal transition-colors flex items-center justify-between"
            >
              <span>Islands & Destinations</span>
              <span className="text-sand-muted text-xs">→</span>
            </button>
            <button
              onClick={() => scrollToSection('expeditions')}
              className="w-full text-left px-3.5 py-2.5 rounded-xl text-ivory hover:text-white hover:bg-white/[0.05] text-sm font-sans-body font-normal transition-colors flex items-center justify-between"
            >
              <span>Tour Packages</span>
              <span className="text-sand-muted text-xs">→</span>
            </button>
            <button
              onClick={() => scrollToSection('reviews')}
              className="w-full text-left px-3.5 py-2.5 rounded-xl text-ivory hover:text-white hover:bg-white/[0.05] text-sm font-sans-body font-normal transition-colors flex items-center justify-between"
            >
              <span>Client Reviews</span>
              <span className="text-sand-muted text-xs">→</span>
            </button>
          </div>

          {/* Section 2: Traveler Services & Utilities */}
          <div className="pt-2 border-t border-white/[0.08] space-y-1">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-sand-muted/70 px-3 pb-1">
              Traveler Services
            </p>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenTracker();
              }}
              className="w-full text-left px-3.5 py-2.5 rounded-xl text-ivory hover:text-white hover:bg-white/[0.05] text-sm font-sans-body font-normal transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <Ticket className="w-4 h-4 text-sunset-coral" />
                <span>Check Tickets & Flight Status</span>
              </div>
              <span className="text-sand-muted text-xs">→</span>
            </button>

            {onOpenWeatherRadar && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenWeatherRadar();
                }}
                className="w-full text-left px-3.5 py-2.5 rounded-xl text-ivory hover:text-white hover:bg-white/[0.05] text-sm font-sans-body font-normal transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <CloudSun className="w-4 h-4 text-sand-muted" />
                  <span>Global Weather Radar</span>
                </div>
                <span className="text-sand-muted text-xs">Live</span>
              </button>
            )}

            <a
              href="https://www.facebook.com/share/p/1DrMyBougo/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-left px-3.5 py-2.5 rounded-xl text-ivory hover:text-white hover:bg-white/[0.05] text-sm font-sans-body font-normal transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-sm">🛂</span>
                <span>Visa & Passport Inquiries</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.08] text-sand-muted border border-white/10">FB Page</span>
            </a>
          </div>

          {/* Section 3: Traveler Account State */}
          <div className="pt-2 border-t border-white/[0.08]">
            {travelerUser ? (
              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3">
                <div className="flex items-center gap-3">
                  {travelerUser.avatar_url ? (
                    <img
                      src={travelerUser.avatar_url}
                      alt={travelerUser.full_name}
                      className="w-9 h-9 rounded-full object-cover border border-sunset-coral/50"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-sunset-coral/30 border border-sunset-coral/60 text-sunset-coral flex items-center justify-center text-xs font-bold">
                      {travelerUser.full_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <p className="text-sm font-sans-body font-medium text-ivory truncate">{travelerUser.full_name}</p>
                    <p className="text-[11px] font-mono text-sand-muted truncate">{travelerUser.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/[0.06]">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (onOpenMyAccount) onOpenMyAccount('overview');
                    }}
                    className="py-2 px-2.5 text-xs text-ivory hover:bg-white/5 rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <User className="w-3.5 h-3.5 text-sunset-coral" />
                    <span>My Account</span>
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (onOpenMyAccount) onOpenMyAccount('password');
                    }}
                    className="py-2 px-2.5 text-xs text-sand-muted hover:text-ivory hover:bg-white/5 rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-sunset-coral" />
                    <span>Change Password</span>
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (onSignOutTraveler) onSignOutTraveler();
                    }}
                    className="col-span-2 py-2 px-2.5 text-xs text-rose-400 hover:bg-rose-950/20 rounded-xl transition-colors flex items-center gap-1.5 justify-center border-t border-white/5 mt-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (onOpenTravelerAuth) onOpenTravelerAuth();
                }}
                className="w-full py-2.5 px-3.5 rounded-xl bg-white/[0.05] border border-white/10 text-ivory text-sm font-sans-body flex items-center justify-between hover:border-sunset-coral/50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <User className="w-4 h-4 text-sunset-coral" />
                  <span>Sign In (Google / Email)</span>
                </div>
                <span className="text-sand-muted text-xs">→</span>
              </button>
            )}
          </div>

          {/* Section 4: Staff Ingress & Primary Booking CTA */}
          <div className="pt-2 border-t border-white/[0.08] space-y-3">
            {isStaffLoggedIn ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (onOpenAdminPortal) onOpenAdminPortal();
                }}
                className="w-full py-2.5 px-3.5 rounded-xl bg-sunset-coral/15 border border-sunset-coral/40 text-sunset-coral text-sm font-sans-body flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>Enter Admin Operations Portal</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (onOpenAdminAuth) onOpenAdminAuth();
                }}
                className="w-full py-2 px-3 text-left text-xs font-mono text-sand-muted hover:text-ivory flex items-center gap-2 opacity-75"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Staff & Operator Clearance Gateway</span>
              </button>
            )}

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenBooking();
              }}
              className="w-full bg-sunset-coral hover:bg-[#ff765b] text-white py-3 rounded-full text-xs font-semibold tracking-wider uppercase text-center shadow-lg shadow-sunset-coral/30 transition-all cursor-pointer"
            >
              Begin Journey
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

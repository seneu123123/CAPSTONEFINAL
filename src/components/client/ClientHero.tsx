import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowDown, 
  CloudSun, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  MapPin, 
  Calendar, 
  Users, 
  Search, 
  ExternalLink,
  Sparkles,
  Check,
  Loader2
} from 'lucide-react';
import { TourPackage, SearchJourneyCriteria } from '../../types';
import { getRandomDelay } from '../../utils/delay';

interface ClientHeroProps {
  onExploreClick: () => void;
  onBookClick: (pkg?: TourPackage, searchCriteria?: SearchJourneyCriteria) => void;
  onWeatherClick?: () => void;
  packages?: TourPackage[];
}

interface HeroSlide {
  id: string;
  destination: string;
  country: string;
  tagline: string;
  imageUrl: string;
  altText: string;
  packageKeyword: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'palawan',
    destination: 'El Nido, Palawan',
    country: 'Philippines',
    tagline: 'Bacuit Bay Big Lagoon & Limestone Karst Haven',
    imageUrl: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=2400&q=85',
    altText: 'Palawan archipelago limestone karst lagoons at turquoise waters',
    packageKeyword: 'Palawan'
  },
  {
    id: 'batanes',
    destination: 'Basco, Batanes',
    country: 'Philippines',
    tagline: 'Rolling Marlboro Hills & Traditional Stone Valugan Boulders',
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2400&q=85',
    altText: 'Batanes scenic rolling hills and dramatic coastline',
    packageKeyword: 'Batanes'
  },
  {
    id: 'boracay',
    destination: 'White Beach, Boracay',
    country: 'Philippines',
    tagline: 'Powdery White Coral Sands & Paraw Sunset Sailing',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2400&q=85',
    altText: 'Boracay tropical coastline with azure ocean',
    packageKeyword: 'Boracay'
  },
  {
    id: 'siargao',
    destination: 'Cloud 9, Siargao',
    country: 'Philippines',
    tagline: 'World-Class Pacific Swells & Sugba Emerald Lagoon',
    imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=2400&q=85',
    altText: 'Siargao tropical palm trees and pristine surf beaches',
    packageKeyword: 'Siargao'
  },
  {
    id: 'japan',
    destination: 'Mt. Fuji & Tokyo',
    country: 'Japan',
    tagline: 'Cherry Blossom Seasons & Historic Shrines',
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=2400&q=85',
    altText: 'Japan historic pagoda with snowcapped Mt Fuji in background',
    packageKeyword: 'Japan'
  },
  {
    id: 'hongkong',
    destination: 'Victoria Harbour',
    country: 'Hong Kong & Macau',
    tagline: 'Disneyland Magic & Ruins of St. Paul Escapes',
    imageUrl: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=2400&q=85',
    altText: 'Hong Kong harbour skyline at sunset',
    packageKeyword: 'Hong Kong'
  },
  {
    id: 'swiss',
    destination: 'Jungfrau & Interlaken',
    country: 'Switzerland',
    tagline: 'Alpine Glaciers & Scenic Panoramic Train Expeditions',
    imageUrl: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=2400&q=85',
    altText: 'Swiss alps dramatic green mountain valley and peaks',
    packageKeyword: 'Swiss'
  }
];

export const ClientHero: React.FC<ClientHeroProps> = ({ 
  onExploreClick, 
  onBookClick, 
  onWeatherClick,
  packages = []
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  
  // Quick Search Capsule State
  const [selectedDestination, setSelectedDestination] = useState('');
  const [departureDate, setDepartureDate] = useState(() => {
    // Default to a date 7 days in future formatted YYYY-MM-DD
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [travelersCount, setTravelersCount] = useState(2);
  const [isDestinationDropdownOpen, setIsDestinationDropdownOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto advance slides every 6.5s
  useEffect(() => {
    if (!isAutoPlay) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6500);
    return () => clearInterval(interval);
  }, [isAutoPlay]);

  // Close destination selector on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDestinationDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePrevSlide = () => {
    setIsAutoPlay(false);
    setCurrentSlideIndex((prev) => (prev === 0 ? HERO_SLIDES.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    setIsAutoPlay(false);
    setCurrentSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        handleNextSlide();
      } else {
        handlePrevSlide();
      }
    }
    touchStartX.current = null;
  };

  const scrollToNext = () => {
    const ethos = document.getElementById('ethos');
    if (ethos) {
      ethos.scrollIntoView({ behavior: 'smooth' });
    } else {
      onExploreClick();
    }
  };

  const currentSlide = HERO_SLIDES[currentSlideIndex];

  // Quick search action: copy destination, departure dates, and travelers to booking modal
  const handleQuickSearch = () => {
    if (isSearching) return;
    setIsSearching(true);
    const delay = getRandomDelay(450, 850);

    setTimeout(() => {
      // If a destination was selected, look for a matching tour package
      const destToUse = selectedDestination || currentSlide.destination;
      let matchedPkg: TourPackage | undefined;
      
      if (destToUse && destToUse !== 'All Destinations (Worldwide & Islands)') {
        const destClean = destToUse.toLowerCase().split('(')[0].replace(/,/g, ' ').trim();
        const keywords = destClean.split(' ').filter(w => w.length > 2);
        
        matchedPkg = packages.find(p => {
          const pDest = p.destination.toLowerCase();
          const pTitle = p.title.toLowerCase();
          return (
            keywords.some(k => pDest.includes(k) || pTitle.includes(k)) ||
            pDest.includes(destClean) ||
            destClean.includes(pDest)
          );
        });
      }

      const searchCriteria: SearchJourneyCriteria = {
        destination: destToUse || undefined,
        departureDate: departureDate || undefined,
        travelersCount: travelersCount || 2,
      };

      setIsSearching(false);
      onBookClick(matchedPkg, searchCriteria);
    }, delay);
  };

  // Jump to specific package for the active slide
  const handleActiveSlideClick = () => {
    const matchedPkg = packages.find((p) => 
      p.destination.toLowerCase().includes(currentSlide.packageKeyword.toLowerCase()) ||
      p.title.toLowerCase().includes(currentSlide.packageKeyword.toLowerCase())
    );
    if (matchedPkg) {
      onBookClick(matchedPkg, {
        destination: currentSlide.destination,
        departureDate,
        travelersCount
      });
    } else {
      const exp = document.getElementById('expeditions');
      if (exp) exp.scrollIntoView({ behavior: 'smooth' });
      else onExploreClick();
    }
  };

  const destinationOptions = [
    'All Destinations (Worldwide & Islands)',
    'Palawan (El Nido & Coron)',
    'Batanes (Basco & Sabtang)',
    'Boracay (White Beach)',
    'Siargao (Cloud 9 & Sugba)',
    'Bohol (Panglao & Chocolate Hills)',
    'Cebu (Oslob & Bantayan)',
    'Japan (Tokyo, Osaka, Kyoto)',
    'Hong Kong & Macau',
    'South Korea (Seoul & Nami)',
    'Switzerland & Western Europe'
  ];

  const todayMinDate = new Date().toISOString().split('T')[0];

  return (
    <section
      id="hero"
      className="relative min-h-[100svh] flex flex-col justify-between pt-24 sm:pt-28 md:pt-32 pb-8 px-4 sm:px-8 bg-[#05080A] select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseEnter={() => setIsAutoPlay(false)}
      onMouseLeave={() => setIsAutoPlay(true)}
    >
      {/* 1. Fullscreen Cinematic Background Slider with Clean Cross-Fade Transition */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-[#05080A]">
        {HERO_SLIDES.map((slide, index) => {
          const isActive = index === currentSlideIndex;
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 w-full h-full overflow-hidden transition-opacity duration-1000 ease-in-out ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
              aria-hidden={!isActive}
            >
              <img
                src={slide.imageUrl}
                alt={slide.altText}
                referrerPolicy="no-referrer"
                loading={index === 0 ? 'eager' : 'lazy'}
                className={`w-full h-full object-cover object-center transition-transform duration-[7000ms] ease-out ${
                  isActive ? 'scale-105' : 'scale-100'
                }`}
              />
              {/* Liquid Glass Overlay Gradients */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#05080A] via-[#05080A]/40 to-black/40 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#05080A]/85 via-transparent to-[#05080A]/50 pointer-events-none" />
              <div className="absolute inset-0 bg-radial-vignette opacity-60 pointer-events-none" />
            </div>
          );
        })}
      </div>

      {/* 2. Hero Content (Editorial Typography + Liquid Glass Search Capsule) */}
      <div className="relative z-10 max-w-6xl mx-auto w-full my-auto text-left pt-2 md:pt-6">
        {/* Eyebrow Label with subtle glowing glass pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.08] backdrop-blur-md border border-white/15 text-sunset-coral mb-4 sm:mb-5 shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-sunset-coral animate-pulse" />
          <span className="text-xs sm:text-sm font-sans-body tracking-[0.24em] uppercase font-medium">Holiday Travelers Inc.</span>
          <span className="text-white/30">·</span>
          <span className="text-sand-muted font-normal text-xs tracking-wider">Pasig City, Metro Manila</span>
        </div>

        {/* Master Editorial Headline */}
        <h1 className="font-serif-display text-4xl sm:text-5xl md:text-6xl lg:text-[4.75rem] font-light text-ivory leading-[1.08] tracking-tight mb-4 hero-text-shadow max-w-4xl">
          Journeys crafted <br className="hidden sm:block" />
          <span className="italic font-normal text-white drop-shadow-[0_4px_24px_rgba(255,255,255,0.25)]">with confidence</span>
        </h1>

        {/* Manifesto Subtitle */}
        <p className="text-xs sm:text-sm md:text-base font-sans-body text-[#C4D0DB] max-w-2xl font-light leading-relaxed mb-5 sm:mb-6">
          Instant online reservations, expedited passport assistance, and hassle-free visa processing for Philippine island escapes and world journeys.
        </p>

        {/* Quick Value Highlights */}
        <div className="flex flex-wrap items-center gap-2 mb-6 sm:mb-8 text-xs font-mono">
          <span className="px-3 py-1 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/10 text-sand-muted shadow-sm hover:border-white/30 transition-colors">
            📍 Mega Plaza Ortigas, Pasig
          </span>
          <span className="px-3 py-1 rounded-full bg-emerald-950/60 backdrop-blur-md border border-emerald-500/30 text-emerald-300 shadow-sm hover:border-emerald-400/50 transition-colors">
            ⚡ 5-Day Passport Assistance
          </span>
          <span className="px-3 py-1 rounded-full bg-sunset-coral/20 backdrop-blur-md border border-sunset-coral/35 text-sunset-coral shadow-sm hover:border-sunset-coral/60 transition-colors">
            ✈️ Visa Approvals & Reservations
          </span>
        </div>

        {/* 3. Floating Liquid Glass Quick Search Capsule */}
        <div 
          className="relative max-w-4xl w-full rounded-2xl md:rounded-full bg-white/[0.12] backdrop-blur-2xl border border-white/25 p-2.5 sm:p-3 shadow-[0_20px_60px_rgba(0,0,0,0.6)] mb-6 sm:mb-8 transition-all duration-300 hover:border-white/40 z-30"
          id="hero-liquid-search-capsule"
        >
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 divide-y md:divide-y-0 md:divide-x divide-white/15">
            {/* Destination Field */}
            <div className="relative flex-1 px-3 py-2 text-left" ref={dropdownRef}>
              <div 
                className="flex items-center justify-between gap-3 cursor-pointer group select-none"
                onClick={() => setIsDestinationDropdownOpen(!isDestinationDropdownOpen)}
                role="button"
                tabIndex={0}
                aria-haspopup="listbox"
                aria-expanded={isDestinationDropdownOpen}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sunset-coral group-hover:bg-sunset-coral group-hover:text-white transition-all duration-300 shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase font-mono tracking-wider text-sand-muted/80">Destination</p>
                    <p className="text-xs sm:text-sm font-medium text-white truncate group-hover:text-sand-light transition-colors">
                      {selectedDestination || currentSlide.destination}
                    </p>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-sand-muted group-hover:text-white transition-transform duration-300 shrink-0 ${isDestinationDropdownOpen ? 'rotate-180 text-sunset-coral' : ''}`} />
              </div>

              {/* Destination Dropdown Menu - 100% Solid Opaque Modal with no backdrop filter bleed */}
              {isDestinationDropdownOpen && (
                <div 
                  className="absolute left-0 top-[calc(100%+8px)] w-full min-w-[290px] max-w-sm max-h-64 overflow-y-auto rounded-2xl border border-white/25 p-2 z-[90] text-left custom-scrollbar animate-fade-in shadow-[0_30px_80px_rgba(0,0,0,1)]"
                  style={{ backgroundColor: '#070C10', opacity: 1, isolation: 'isolate' }}
                  role="listbox"
                >
                  <div className="px-3 py-1.5 text-[10px] font-mono uppercase text-sunset-coral tracking-wider border-b border-white/10 mb-1 font-semibold flex items-center justify-between">
                    <span>Featured Destinations</span>
                    <span className="text-[9px] text-sand-muted font-normal">Choose one</span>
                  </div>
                  {destinationOptions.map((dest, i) => {
                    const isSelected = (!selectedDestination && dest.toLowerCase().includes(currentSlide.packageKeyword.toLowerCase())) || selectedDestination === dest || (dest === 'All Destinations (Worldwide & Islands)' && selectedDestination === '');
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setSelectedDestination(dest === 'All Destinations (Worldwide & Islands)' ? '' : dest);
                          setIsDestinationDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-center justify-between group cursor-pointer ${
                          isSelected
                            ? 'bg-sunset-coral/25 text-white font-medium border border-sunset-coral/50'
                            : 'text-sand-light hover:bg-white/15 hover:text-white'
                        }`}
                        style={{ backgroundColor: isSelected ? 'rgba(242, 106, 79, 0.25)' : undefined }}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <span className="truncate">{dest}</span>
                        {isSelected ? (
                          <Check className="w-3.5 h-3.5 text-sunset-coral shrink-0 ml-2" />
                        ) : (
                          <MapPin className="w-3 h-3 text-white/40 group-hover:text-sunset-coral shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Departure Date Field */}
            <div className="flex-1 px-3 py-2 text-left">
              <label htmlFor="hero-departure-date" className="flex items-center gap-3 cursor-pointer group">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sky-400 group-hover:bg-sky-500 group-hover:text-white transition-all duration-300 shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase font-mono tracking-wider text-sand-muted/80">Departure</p>
                  <input
                    type="date"
                    id="hero-departure-date"
                    value={departureDate}
                    min={todayMinDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    className="w-full bg-transparent text-xs sm:text-sm font-medium text-white focus:outline-none cursor-pointer [color-scheme:dark]"
                  />
                </div>
              </label>
            </div>

            {/* Travelers Count Field */}
            <div className="flex-1 px-3 py-2 text-left">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-emerald-400 shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase font-mono tracking-wider text-sand-muted/80">Travelers</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Decrease travelers"
                      onClick={() => setTravelersCount(Math.max(1, travelersCount - 1))}
                      className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center text-xs font-bold transition-all hover:scale-110 active:scale-95 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-xs sm:text-sm font-medium text-white min-w-[2.5rem] text-center">
                      {travelersCount} {travelersCount === 1 ? 'Guest' : 'Guests'}
                    </span>
                    <button
                      type="button"
                      aria-label="Increase travelers"
                      onClick={() => setTravelersCount(Math.min(20, travelersCount + 1))}
                      className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center text-xs font-bold transition-all hover:scale-110 active:scale-95 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Search Action CTA (Liquid Glass Glow with Hover Zoom & Vivid Color) */}
            <div className="p-1 shrink-0">
              <button
                type="button"
                disabled={isSearching}
                onClick={handleQuickSearch}
                className="w-full md:w-auto inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-sunset-coral via-[#ff6f50] to-[#ff856b] hover:from-[#ff6f50] hover:to-sunset-coral text-white px-6 py-3.5 rounded-xl md:rounded-full text-xs font-bold tracking-[0.14em] uppercase shadow-xl shadow-sunset-coral/40 hover:shadow-sunset-coral/70 hover:scale-105 active:scale-95 transition-all duration-300 border border-white/30 cursor-pointer group disabled:opacity-75"
                id="hero-capsule-search-btn"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Locating Flights...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" />
                    <span>Search Journeys</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 4. Action CTAs with Interactive Hover Zoom-in & Vibrant Color */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 relative z-10">
          <button
            disabled={isSearching}
            onClick={() => handleQuickSearch()}
            className="group relative inline-flex items-center justify-center gap-3 bg-sunset-coral hover:bg-[#ff765b] text-white px-7 sm:px-8 py-3.5 sm:py-4 rounded-full text-xs font-semibold tracking-[0.18em] uppercase shadow-2xl shadow-sunset-coral/30 hover:shadow-sunset-coral/60 hover:scale-105 active:scale-95 transition-all duration-300 border border-white/25 cursor-pointer disabled:opacity-75"
            id="hero-begin-booking-btn"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Preparing Itinerary...</span>
              </>
            ) : (
              <>
                <span>Book an Expedition</span>
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              </>
            )}
          </button>

          <button
            onClick={() => {
              const exp = document.getElementById('expeditions');
              if (exp) exp.scrollIntoView({ behavior: 'smooth' });
              else onExploreClick();
            }}
            className="inline-flex items-center justify-center gap-2 text-ivory hover:text-white px-6 sm:px-7 py-3.5 sm:py-4 rounded-full text-xs font-medium tracking-[0.15em] uppercase bg-white/[0.08] hover:bg-sunset-coral/25 hover:border-sunset-coral/50 border border-white/20 hover:scale-105 active:scale-95 transition-all duration-300 backdrop-blur-xl shadow-lg hover:shadow-sunset-coral/30 cursor-pointer"
            id="hero-explore-journeys-btn"
          >
            <span>View Packages</span>
          </button>

          {onWeatherClick && (
            <button
              onClick={onWeatherClick}
              className="inline-flex items-center justify-center gap-2 text-sand-muted hover:text-sky-300 px-5 sm:px-6 py-3.5 sm:py-4 rounded-full text-xs font-medium tracking-[0.15em] uppercase bg-white/[0.08] hover:bg-sky-500/25 hover:border-sky-400/50 border border-white/20 hover:scale-105 active:scale-95 transition-all duration-300 backdrop-blur-xl shadow-lg hover:shadow-sky-500/30 cursor-pointer"
              id="hero-weather-radar-btn"
            >
              <CloudSun className="w-3.5 h-3.5 text-sky-400 group-hover:text-sky-200" />
              <span>Explore Weather</span>
            </button>
          )}
        </div>
      </div>

      {/* 5. Bottom Controls: Left/Right Carousel Controls + Active Location Tag & Scroll Down */}
      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 pb-2">
        {/* Left: Scroll Prompt */}
        <div className={`hidden sm:flex items-center transition-all duration-300 ${isDestinationDropdownOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <button
            onClick={scrollToNext}
            className="group inline-flex items-center gap-2.5 text-xs font-sans-body tracking-[0.2em] uppercase text-sand-muted hover:text-ivory transition-all duration-300 focus:outline-none hover:scale-105 cursor-pointer"
            id="hero-scroll-down-btn"
          >
            <div className="w-7 h-7 rounded-full bg-white/10 group-hover:bg-sunset-coral group-hover:text-white flex items-center justify-center transition-all duration-300">
              <ArrowDown className="w-3.5 h-3.5 text-sunset-coral group-hover:text-white group-hover:translate-y-0.5 transition-all duration-300" />
            </div>
            <span>Scroll to dive</span>
          </button>
        </div>

        {/* Right: Floating Liquid Glass Location Badge + Sideways Carousel Controls */}
        <div className="flex items-center gap-2.5 sm:gap-3 ml-auto">
          {/* Active Destination Pill Badge */}
          <button
            onClick={handleActiveSlideClick}
            className="group inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.12] hover:bg-white/[0.22] backdrop-blur-2xl border border-white/25 hover:border-white/50 text-white shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
            title={`Explore packages for ${currentSlide.destination}`}
            id="hero-active-location-pill"
          >
            <span className="w-2 h-2 rounded-full bg-sunset-coral animate-ping shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-white tracking-wide">
              {currentSlide.destination}, {currentSlide.country}
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-sand-muted group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
          </button>

          {/* Left Arrow Button */}
          <button
            onClick={handlePrevSlide}
            aria-label="Previous destination photo"
            className="w-10 h-10 rounded-full bg-white/[0.12] hover:bg-sunset-coral hover:border-sunset-coral/60 backdrop-blur-2xl border border-white/25 text-white flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer group"
            id="hero-carousel-prev-btn"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          </button>

          {/* Right Arrow Button */}
          <button
            onClick={handleNextSlide}
            aria-label="Next destination photo"
            className="w-10 h-10 rounded-full bg-white/[0.12] hover:bg-sunset-coral hover:border-sunset-coral/60 backdrop-blur-2xl border border-white/25 text-white flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer group"
            id="hero-carousel-next-btn"
          >
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Slide Indicator Dots */}
          <div className="hidden md:flex items-center gap-1.5 pl-1.5">
            {HERO_SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setIsAutoPlay(false);
                  setCurrentSlideIndex(i);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  i === currentSlideIndex 
                    ? 'w-6 bg-sunset-coral shadow-md shadow-sunset-coral/50' 
                    : 'w-1.5 bg-white/30 hover:bg-white/60'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

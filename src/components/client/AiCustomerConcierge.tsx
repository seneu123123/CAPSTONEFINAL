import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Compass, 
  ArrowRight, 
  CreditCard, 
  MapPin, 
  Calendar, 
  ShieldCheck, 
  HelpCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  PhoneCall,
  CheckCircle2,
  Luggage,
  Sun,
  Flame,
  FileCheck2,
  UserCheck,
  Mail,
  Shield,
  Clock,
  Timer,
  Maximize2,
  Minimize2,
  Ticket,
  LogOut,
  Download,
  AlertCircle
} from 'lucide-react';
import { TourPackage } from '../../types';
import { 
  getOrCreateConciergeChat, 
  saveConciergeMessage, 
  updateConciergeChatStatus, 
  sendEmailTranscript, 
  subscribeToGlobalDatabaseChanges,
  fetchConciergeMessages,
  fetchCustomerTickets,
  fetchConciergeChatById,
  UserProfile
} from '../../utils/supabaseClient';
import { formatTranscriptText, downloadTranscriptFile } from '../../utils/emailService';
import { ConciergeTicketHistoryDrawer } from './concierge/ConciergeTicketHistoryDrawer';
import { ConciergeLiveAgentPromptModal } from './concierge/ConciergeLiveAgentPromptModal';
import { ConciergeEndTranscriptModal } from './concierge/ConciergeEndTranscriptModal';

interface ConciergeMessage {
  id: string;
  sender: 'ai' | 'user' | 'admin';
  senderName?: string;
  senderRole?: string;
  text: string;
  timestamp: string;
  recommendedPackageId?: string;
  detailsList?: string[];
  quickAction?: {
    label: string;
    action: () => void;
  };
}

interface FaqKnowledgeItem {
  id: string;
  question: string;
  category: 'booking' | 'packages' | 'payment' | 'safety' | 'policies';
  badge: string;
  answer: string;
  keyPoints?: string[];
  recommendedPackageId?: string;
  keywords: string[];
}

const FAQ_KNOWLEDGE_BASE: FaqKnowledgeItem[] = [
  // PAYMENT & DOWNPAYMENT
  {
    id: 'faq-downpayment',
    question: 'How does the 50% downpayment policy work?',
    category: 'payment',
    badge: '50% Downpayment',
    answer: 'You only need to settle a 50% reservation deposit today to lock in your tour dates, hotel rooms, airline tickets, and tour permits.',
    keyPoints: [
      'Remaining 50% balance is payable 7 days prior to departure or during arrival check-in.',
      'Instant electronic receipt and BIR-compliant invoice generated.',
      'No hidden service surcharges.'
    ],
    keywords: ['downpayment', 'deposit', '50%', 'half', 'installment', 'terms', 'pay later']
  },
  {
    id: 'faq-payment-methods',
    question: 'What payment methods do you accept?',
    category: 'payment',
    badge: 'Payment Gateways',
    answer: 'We support all major verified Philippine and international payment channels with zero convenience markups.',
    keyPoints: [
      'GCash (Instant QR code verification)',
      'Maya (Instant digital wallet checkout)',
      'BDO & BPI Online Bank Transfers',
      'Major Credit / Debit Cards (Visa & Mastercard)'
    ],
    keywords: ['payment', 'methods', 'gcash', 'maya', 'credit card', 'bdo', 'bpi', 'bank transfer']
  },
  {
    id: 'faq-refunds',
    question: 'What is your cancellation and refund policy?',
    category: 'policies',
    badge: 'Refund Guarantee',
    answer: 'We provide customer-friendly cancellation guarantees in compliance with DOT and DTI guidelines.',
    keyPoints: [
      '100% full refund or free rebooking if cancelled 14+ days before departure.',
      '70% refund if cancelled 7 to 13 days before departure.',
      '100% full refund or free reschedule in cases of severe typhoon or flight suspension advisories.'
    ],
    keywords: ['cancellation', 'refund', 'cancel', 'rebook', 'typhoon', 'weather', 'policy']
  },

  // PACKAGES & DESTINATIONS
  {
    id: 'faq-elnido',
    question: 'What is included in the El Nido Island Hopping Expedition?',
    category: 'packages',
    badge: 'Palawan Highlight',
    answer: 'Our El Nido 4D3N Expedition (₱18,500/pax) is an all-inclusive tropical escape to Palawan’s premier lagoons.',
    keyPoints: [
      'Guided island lagoon tours with roundtrip airport transfers (Big Lagoon & Secret Lagoon)',
      '4D3N boutique beachfront resort accommodation',
      'Daily buffet island grilled seafood lunches & hydration',
      'DOT-certified local guides, kayak rentals, & ETDF eco-permits included'
    ],
    recommendedPackageId: 'pkg-1',
    keywords: ['el nido', 'palawan', 'big lagoon', 'secret lagoon', 'island hopping', 'elnido']
  },
  {
    id: 'faq-batanes',
    question: 'What makes the Batanes Heritage Discovery unique?',
    category: 'packages',
    badge: 'Cultural Expedition',
    answer: 'Batanes (₱28,900/pax) is a serene 5D4N cultural journey through rolling hills, stone houses, and Pacific cliffs.',
    keyPoints: [
      'Authentic Ivatan heritage stone house homestay lodging',
      'Sabtang Island & Marlboro Hills private 4x4 transport',
      'Certified Ivatan cultural guides and daily organic culinary feasts',
      'Best travel window: December to May (cool & dry weather)'
    ],
    recommendedPackageId: 'pkg-2',
    keywords: ['batanes', 'ivatan', 'sabtang', 'marlboro', 'basco', 'stone house', 'northern']
  },
  {
    id: 'faq-cebu',
    question: 'What is included in the Cebu Whale Shark & Canyoneering tour?',
    category: 'packages',
    badge: 'Adrenaline Tour',
    answer: 'Cebu Adventure (₱14,200/pax) combines the gentle giants of Oslob with the thrilling turquoise waterfalls of Kawasan.',
    keyPoints: [
      'Ethical Oslob whale shark snorkeling encounter passes',
      'Kawasan Falls full canyoneering with 2 rescue marshals per group',
      'Certified expedition safety vests, helmets, and aqua shoes',
      'Air-conditioned private van transfers throughout Cebu'
    ],
    recommendedPackageId: 'pkg-3',
    keywords: ['cebu', 'canyoneering', 'kawasan', 'oslob', 'whale shark', 'waterfall', 'cliff jump']
  },
  {
    id: 'faq-coron',
    question: 'What does the Coron Sunken Shipwrecks package cover?',
    category: 'packages',
    badge: 'Diving & Snorkel',
    answer: 'Coron (₱16,800/pax) is a 4D3N underwater dream featuring WWII shipwrecks, Kayangan Lake, and Twin Lagoon.',
    keyPoints: [
      'Exclusive scenic tour to Kayangan Lake & Barracuda Lake',
      'Snorkeling gear & guides at Skeleton Wreck & Lusong Gunboat',
      'Town tour: Mt. Tapyas panoramic trek & Maquinit Hot Springs',
      'All tourism entrance & preservation permits included'
    ],
    recommendedPackageId: 'pkg-4',
    keywords: ['coron', 'shipwreck', 'kayangan', 'barracuda', 'twin lagoon', 'maquinit', 'tapyas']
  },
  {
    id: 'faq-siargao',
    question: 'Is the Siargao Cloud 9 tour suitable for non-surfers?',
    category: 'packages',
    badge: 'Island Lifestyle',
    answer: 'Yes! Siargao (₱12,500/pax) offers much more than surfing—it is an island lifestyle journey.',
    keyPoints: [
      'Sugba Lagoon paddleboarding & Magpupungko Tidal Rock Pools',
      'Tri-island exploration to Naked, Daku, and Guyam Islands',
      'Beginner surf coaching with certified academy instructors at Cloud 9',
      'Eco-resort accommodation with daily smoothie & breakfast bowls'
    ],
    recommendedPackageId: 'pkg-5',
    keywords: ['siargao', 'surf', 'cloud 9', 'sugba lagoon', 'magpupungko', 'guyam', 'daku']
  },

  // BOOKING & MANIFEST
  {
    id: 'faq-fees-included',
    question: 'Are environmental, terminal, and entrance fees included in the price?',
    category: 'booking',
    badge: 'All-Inclusive',
    answer: 'Yes, 100%! Unlike cheap street tours that surprise you with on-the-spot cash fees, Holiday Travelers handles everything.',
    keyPoints: [
      'All municipal environmental user fees (ETDF) included.',
      'Airport terminal and tourism fees included.',
      'Protected eco-sanctuary conservation tickets included.'
    ],
    keywords: ['fees', 'environmental', 'terminal', 'port', 'hidden', 'extra', 'etdf']
  },
  {
    id: 'faq-voucher-manifest',
    question: 'When do I receive my official Travel Voucher and Passenger Manifest pass?',
    category: 'booking',
    badge: 'Instant QR Voucher',
    answer: 'Your official voucher is generated immediately upon receiving your 50% deposit or full payment.',
    keyPoints: [
      'Includes a scannable dynamic QR verification code.',
      'Registered under DOT Passenger Safety Manifest.',
      'Can be saved to Apple/Google Wallet or printed as PDF.'
    ],
    keywords: ['voucher', 'manifest', 'receipt', 'qr code', 'ticket', 'confirmation']
  },
  {
    id: 'faq-group-discounts',
    question: 'Do you offer group discounts for family or corporate bookings?',
    category: 'booking',
    badge: 'Group Perks',
    answer: 'Yes! We offer tiered volume discounts for travel groups:',
    keyPoints: [
      '5–9 Passengers: 5% automatic group discount',
      '10–19 Passengers: 10% group discount + dedicated private transfer',
      '20+ Passengers / Corporate: Customized charter rates & event team'
    ],
    keywords: ['group', 'discount', 'family', 'corporate', 'team building', 'barkada', 'bulk']
  },

  // SAFETY & PACKING
  {
    id: 'faq-packing',
    question: 'What essential items should I pack for Philippine expeditions?',
    category: 'safety',
    badge: 'Packing Essentials',
    answer: 'To make the most of your expeditions, we suggest packing the following gear:',
    keyPoints: [
      'Dry bag (10L–20L) & waterproof phone pouch',
      'Reef-safe biodegradable sunscreen & sunglasses',
      'Aqua shoes / comfortable walking shoes',
      'Quick-dry microfiber towel and light resort wear'
    ],
    keywords: ['pack', 'packing', 'bring', 'clothes', 'dry bag', 'sunscreen', 'aqua shoes', 'gear']
  },
  {
    id: 'faq-safety-standards',
    question: 'What health, emergency, and aviation safety standards do you follow?',
    category: 'safety',
    badge: 'DOT Accredited',
    answer: 'Safety is our absolute highest priority on every single Philippine expedition.',
    keyPoints: [
      'DOT-Accredited Tour Operator Accreditation: #DOT-NCR-TO-2026-889',
      'Comprehensive Passenger Travel & Flight Insurance on all bookings',
      'Certified Red Cross Wilderness First Aid responders on board',
      'Daily aviation & weather clearance compliance monitoring'
    ],
    keywords: ['safety', 'emergency', 'insurance', 'flight', 'dot', 'first aid', 'rescue', 'medical']
  }
];

interface AiCustomerConciergeProps {
  packages: TourPackage[];
  onSelectPackage: (pkg: TourPackage) => void;
  travelerUser?: UserProfile | null;
  onOpenTravelerAuth?: () => void;
}

export const AiCustomerConcierge: React.FC<AiCustomerConciergeProps> = ({
  packages,
  onSelectPackage,
  travelerUser,
  onOpenTravelerAuth
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'all' | 'packages' | 'payment' | 'booking' | 'safety' | 'policies'>('all');
  const [showFaqDrawer, setShowFaqDrawer] = useState(false);
  
  // Realtime Supabase Session State
  const [sessionId, setSessionId] = useState<string>(() => {
    let saved = localStorage.getItem('holiday_concierge_session_id');
    if (!saved) {
      saved = 'session_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      localStorage.setItem('holiday_concierge_session_id', saved);
    }
    return saved;
  });

  // Guest user info stored locally
  const [guestUser, setGuestUser] = useState<{ name: string; email?: string } | null>(() => {
    try {
      const saved = localStorage.getItem('holiday_concierge_guest_user');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  const [dbChatId, setDbChatId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('holiday_concierge_active_chat_id');
    } catch {
      return null;
    }
  });
  const dbChatIdRef = useRef<string | null>(dbChatId);

  const [chatStatus, setChatStatus] = useState<'Active' | 'Handed_To_Human' | 'Resolved'>('Active');
  const chatStatusRef = useRef<'Active' | 'Handed_To_Human' | 'Resolved'>('Active');

  const [isFullScreen, setIsFullScreen] = useState(false);
  const [ticketRef, setTicketRef] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Tickets History and Modals State
  const [customerTickets, setCustomerTickets] = useState<any[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isLivePromptOpen, setIsLivePromptOpen] = useState(false);
  const [isEndConfirmOpen, setIsEndConfirmOpen] = useState(false);
  const [isEndTranscriptOpen, setIsEndTranscriptOpen] = useState(false);
  const [endTranscriptText, setEndTranscriptText] = useState('');

  // Persistent record of locally closed tickets to guarantee 100% instant detachment
  const [closedTicketIds, setClosedTicketIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('holiday_concierge_closed_tickets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const markTicketLocallyClosed = useCallback((idOrRef: string) => {
    if (!idOrRef) return;
    setClosedTicketIds(prev => {
      const updated = Array.from(new Set([...prev, idOrRef]));
      try {
        localStorage.setItem('holiday_concierge_closed_tickets', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const [messages, setMessages] = useState<ConciergeMessage[]>([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: 'Mabuhay! I am your AI Travel Concierge for Holiday Travelers Travel & Tours Inc. Feel free to ask any questions about our 50% downpayment policy, tour package inclusions, flights, hotels, shuttle logistics, or request a live human agent.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      detailsList: [
        '🔒 Flexible 50% downpayment option',
        '✈️ Airline, hotel & shuttle coordination',
        '👤 Request Live Human Staff Agent anytime'
      ]
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Helper to load tickets for the current traveler / guest session
  const loadCustomerTickets = useCallback(async () => {
    setIsLoadingTickets(true);
    const emailToQuery = travelerUser?.email || guestUser?.email;
    const tickets = await fetchCustomerTickets({
      sessionId,
      email: emailToQuery,
      userId: travelerUser?.id
    });
    // STRICT: Filter out any resolved tickets or locally closed tickets
    const activeTickets = (tickets || []).filter((t: any) => {
      if (!t) return false;
      if (t.status === 'Resolved') return false;
      if (closedTicketIds.includes(t.id) || (t.ticket_ref && closedTicketIds.includes(t.ticket_ref))) {
        return false;
      }
      return true;
    });
    setCustomerTickets(activeTickets);
    setIsLoadingTickets(false);
  }, [sessionId, travelerUser, guestUser, closedTicketIds]);

  // Load ticket history on mount & when user identity changes
  useEffect(() => {
    loadCustomerTickets();
  }, [loadCustomerTickets]);

  // Keep dbChatIdRef in sync
  useEffect(() => {
    dbChatIdRef.current = dbChatId;
  }, [dbChatId]);

  // Check and restore active ticket if user previously had one open
  useEffect(() => {
    let isMounted = true;

    const restoreActiveChat = async () => {
      const storedChatId = localStorage.getItem('holiday_concierge_active_chat_id');
      if (!storedChatId) return;

      const chatObj = await fetchConciergeChatById(storedChatId);
      if (isMounted) {
        if (!chatObj || chatObj.status === 'Resolved') {
          // It was resolved or purged, detach immediately from client
          try {
            localStorage.removeItem('holiday_concierge_active_chat_id');
          } catch {}
          setDbChatId(null);
          dbChatIdRef.current = null;
          setTicketRef(null);
          setChatStatus('Active');
          chatStatusRef.current = 'Active';
          setCustomerTickets(prev => prev.filter(t => t.id !== storedChatId && t.status !== 'Resolved'));
        } else {
          setDbChatId(chatObj.id);
          dbChatIdRef.current = chatObj.id;
          setTicketRef(chatObj.ticket_ref || ('TICK-2026-' + chatObj.id.substring(5, 9).toUpperCase()));
          setChatStatus(chatObj.status as any);
          chatStatusRef.current = chatObj.status as any;

          // Fetch messages for this specific ticket
          const dbMsgs = await fetchConciergeMessages(chatObj.id);
          if (isMounted && dbMsgs.length > 0) {
            const mapped: ConciergeMessage[] = dbMsgs.map(m => ({
              id: m.id,
              sender: m.sender_type === 'admin' ? 'admin' : m.sender_type === 'ai' ? 'ai' : 'user',
              senderName: m.sender_name,
              senderRole: m.sender_role,
              text: m.text,
              timestamp: m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }));
            setMessages(mapped);
          }
        }
      }
    };

    restoreActiveChat();

    // Row-level isolated Realtime subscriber
    const unsubscribe = subscribeToGlobalDatabaseChanges(async (payload) => {
      if (payload.table === 'concierge_messages' && payload.new) {
        const newMsg = payload.new;
        // STRICT row-level match: only sync if message belongs to the ACTIVE chat!
        if (dbChatIdRef.current && newMsg.chat_id === dbChatIdRef.current) {
          const dbMsgs = await fetchConciergeMessages(dbChatIdRef.current);
          if (isMounted && dbMsgs.length > 0) {
            const mapped: ConciergeMessage[] = dbMsgs.map(m => ({
              id: m.id,
              sender: m.sender_type === 'admin' ? 'admin' : m.sender_type === 'ai' ? 'ai' : 'user',
              senderName: m.sender_name,
              senderRole: m.sender_role,
              text: m.text,
              timestamp: m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }));
            setMessages(mapped);
          }
        }
      } else if (payload.table === 'concierge_chats' && payload.new) {
        // STRICT row-level match: only update if it is our active chat
        if (dbChatIdRef.current && payload.new.id === dbChatIdRef.current) {
          if (payload.new.status === 'Resolved') {
            setChatStatus('Resolved');
            chatStatusRef.current = 'Resolved';
            localStorage.removeItem('holiday_concierge_active_chat_id');
          } else {
            setChatStatus(payload.new.status);
            chatStatusRef.current = payload.new.status;
          }
        }
        // Refresh customer tickets list in background
        loadCustomerTickets();
      }
    });

    // Auto-clean concierge state upon sign-out event
    const handleSignOutEvent = () => {
      setIsOpen(false);
      setShowFaqDrawer(false);
      setIsHistoryDrawerOpen(false);
      setIsLivePromptOpen(false);
      setIsEndConfirmOpen(false);
      setIsEndTranscriptOpen(false);
      setDbChatId(null);
      dbChatIdRef.current = null;
      setTicketRef(null);
      setChatStatus('Active');
      chatStatusRef.current = 'Active';
      setGuestUser(null);
      setCustomerTickets([]);
      setClosedTicketIds([]);
      setInputQuery('');
      
      const freshSession = 'session_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      setSessionId(freshSession);
      try {
        localStorage.setItem('holiday_concierge_session_id', freshSession);
      } catch {}

      setMessages([
        {
          id: 'welcome-1',
          sender: 'ai',
          text: 'Mabuhay! I am your AI Travel Concierge for Holiday Travelers Travel & Tours Inc. Feel free to ask any questions about our 50% downpayment policy, tour package inclusions, flights, hotels, shuttle logistics, or request a live human agent.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          detailsList: [
            '🔒 Flexible 50% downpayment option',
            '✈️ Airline, hotel & shuttle coordination',
            '👤 Request Live Human Staff Agent anytime'
          ]
        }
      ]);
    };

    window.addEventListener('holiday_signed_out', handleSignOutEvent);

    return () => {
      isMounted = false;
      window.removeEventListener('holiday_signed_out', handleSignOutEvent);
      unsubscribe();
    };
  }, [loadCustomerTickets]);

  // Auto scroll smoothly to the very bottom whenever a new message appears or typing state changes
  const scrollToBottom = (delay = 50) => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }, delay);
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom(100);
    }
  }, [messages, isOpen, isTyping]);

  const handleRequestLiveAgent = () => {
    setIsLivePromptOpen(true);
  };

  const handleConfirmLiveAgent = async (name: string, email?: string, userId?: string) => {
    setShowFaqDrawer(false);
    setIsTyping(false);

    try {
      const chatObj = await getOrCreateConciergeChat(sessionId, name, email, userId);
      if (!chatObj) {
        setToastMessage("Could not connect to live desk. Please try again.");
        return;
      }

      const currentChatId = chatObj.id;
      const currentTicket = chatObj.ticket_ref || ('TICK-2026-' + currentChatId.substring(5, 9).toUpperCase());

      setDbChatId(currentChatId);
      dbChatIdRef.current = currentChatId;
      setTicketRef(currentTicket);
      setChatStatus('Handed_To_Human');
      chatStatusRef.current = 'Handed_To_Human';

      try {
        localStorage.setItem('holiday_concierge_active_chat_id', currentChatId);
      } catch {}

      await updateConciergeChatStatus(currentChatId, 'Handed_To_Human');

      const ticketMsgText = `🎫 Support Ticket Created: #${currentTicket}\n\nAI Assistant is now turned OFF. Your inquiry has been routed to our Live Staff Dispatch Desk. Connected as: ${name}${email ? ` (${email})` : ''}. Our team member will reply directly to this chat thread.`;
      
      const sysMsg: ConciergeMessage = {
        id: `ticket-${Date.now()}`,
        sender: 'admin',
        senderName: 'Dispatch System',
        senderRole: 'Live Desk Router',
        text: ticketMsgText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, sysMsg]);
      scrollToBottom(50);

      await saveConciergeMessage(currentChatId, 'admin', 'Dispatch System', 'Live Desk Router', ticketMsgText);
      await loadCustomerTickets();

      setToastMessage(`Live Agent Connected — Ticket #${currentTicket}`);
    } catch (err) {
      console.error('Error connecting to live agent:', err);
    }
  };

  const handleSelectTicketFromHistory = async (ticket: any) => {
    if (!ticket || ticket.status === 'Resolved') {
      setToastMessage("Closed tickets are archived and cannot be reopened on this device.");
      return;
    }
    const currentChatId = ticket.id;
    const currentTicket = ticket.ticket_ref || ('TICK-2026-' + currentChatId.substring(5, 9).toUpperCase());

    setDbChatId(currentChatId);
    dbChatIdRef.current = currentChatId;
    setTicketRef(currentTicket);
    setChatStatus(ticket.status || 'Active');
    chatStatusRef.current = ticket.status || 'Active';

    try {
      localStorage.setItem('holiday_concierge_active_chat_id', currentChatId);
    } catch {}

    // Fetch messages for this chosen ticket
    const dbMsgs = await fetchConciergeMessages(currentChatId);
    if (dbMsgs.length > 0) {
      const mapped: ConciergeMessage[] = dbMsgs.map(m => ({
        id: m.id,
        sender: m.sender_type === 'admin' ? 'admin' : m.sender_type === 'ai' ? 'ai' : 'user',
        senderName: m.sender_name,
        senderRole: m.sender_role,
        text: m.text,
        timestamp: m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
      setMessages(mapped);
    } else {
      setMessages([
        {
          id: `tkt-${Date.now()}`,
          sender: 'admin',
          senderName: 'Support Desk',
          text: `Opened Support Ticket #${currentTicket} (Status: ${ticket.status})`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
    scrollToBottom(50);
  };

  const handleConfirmEndConversation = async () => {
    if (!dbChatId) {
      setIsEndConfirmOpen(false);
      return;
    }

    const currentChatId = dbChatId;
    const resolvedRef = ticketRef || 'TICK-2026';

    // Immediately mark locally closed
    markTicketLocallyClosed(currentChatId);
    if (resolvedRef) markTicketLocallyClosed(resolvedRef);

    // 1. Mark Resolved in DB
    await updateConciergeChatStatus(currentChatId, 'Resolved', resolvedRef);
    try {
      localStorage.removeItem('holiday_concierge_active_chat_id');
    } catch {}

    // Regenerate a fresh session ID so customer starts clean on next interaction
    const freshSession = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    setSessionId(freshSession);
    try {
      localStorage.setItem('holiday_travelers_guest_session', freshSession);
    } catch {}

    const closeNotice: ConciergeMessage = {
      id: `end-${Date.now()}`,
      sender: 'admin',
      senderName: 'Dispatch Desk',
      text: `Support Ticket #${resolvedRef} has been concluded by traveler. Transcript is generated.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const updatedMessages = [...messages, closeNotice];
    setMessages(updatedMessages);

    // 2. Generate transcript text
    const formattedTranscript = formatTranscriptText({
      ticketRef: resolvedRef,
      customerName: travelerUser?.full_name || guestUser?.name || 'Traveler Guest',
      customerEmail: travelerUser?.email || guestUser?.email,
      status: 'Resolved',
      messages: updatedMessages.map(m => ({
        sender: m.sender,
        senderName: m.senderName,
        senderRole: m.senderRole,
        text: m.text,
        timestamp: m.timestamp
      }))
    });

    setEndTranscriptText(formattedTranscript);
    setChatStatus('Resolved');
    chatStatusRef.current = 'Resolved';
    setIsEndConfirmOpen(false);
    setIsEndTranscriptOpen(true);

    // Immediately remove from client-side customer tickets state
    setCustomerTickets(prev => prev.filter(t => t.id !== currentChatId && t.ticket_ref !== resolvedRef && t.status !== 'Resolved'));
    await loadCustomerTickets();
  };

  const handleCloseTicketFromDrawer = async (ticket: any) => {
    if (!ticket) return;
    const targetChatId = ticket.id;
    const targetTicketRef = ticket.ticket_ref;

    // Immediately mark locally closed so it vanishes in 0ms
    if (targetChatId) markTicketLocallyClosed(targetChatId);
    if (targetTicketRef) markTicketLocallyClosed(targetTicketRef);

    // Filter out from local state right away
    setCustomerTickets(prev => prev.filter(t => t.id !== targetChatId && t.ticket_ref !== targetTicketRef));

    // Update in Supabase
    if (targetChatId) {
      await updateConciergeChatStatus(targetChatId, 'Resolved', targetTicketRef);
    }

    if (dbChatId === targetChatId || (targetTicketRef && ticketRef === targetTicketRef)) {
      setDbChatId(null);
      dbChatIdRef.current = null;
      setTicketRef(null);
      setChatStatus('Active');
      chatStatusRef.current = 'Active';
      try {
        localStorage.removeItem('holiday_concierge_active_chat_id');
      } catch {}
      setMessages([
        {
          id: `welcome-${Date.now()}`,
          sender: 'ai',
          text: 'Mabuhay! How can I help you explore the Philippines today? Feel free to ask about our packages, payments, or click Live Agent to connect with our staff.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }

    setToastMessage(`Ticket #${targetTicketRef || 'TICK'} closed and detached.`);
    await loadCustomerTickets();
  };

  const handleRestartToAi = () => {
    if (dbChatId) {
      updateConciergeChatStatus(dbChatId, 'Resolved').catch(() => {});
    }
    setDbChatId(null);
    dbChatIdRef.current = null;
    setTicketRef(null);
    setChatStatus('Active');
    chatStatusRef.current = 'Active';
    try {
      localStorage.removeItem('holiday_concierge_active_chat_id');
    } catch {}

    const freshSession = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    setSessionId(freshSession);
    try {
      localStorage.setItem('holiday_travelers_guest_session', freshSession);
    } catch {}

    setCustomerTickets(prev => prev.filter(t => t.id !== dbChatId && t.status !== 'Resolved'));
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'ai',
        text: 'Mabuhay! How can I help you explore the Philippines today? Feel free to ask about our packages, payments, or click Live Agent to connect with our staff.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setShowFaqDrawer(false);
    setToastMessage("AI Travel Concierge Active");
    loadCustomerTickets();
  };

  const handleDownloadCurrentTranscript = () => {
    if (messages.length === 0) {
      setToastMessage("No conversation messages to download.");
      return;
    }

    const currentTicketRef = ticketRef || (dbChatId ? ('TICK-2026-' + dbChatId.substring(5, 9).toUpperCase()) : 'CONVERSATION');
    const customerName = travelerUser?.full_name || guestUser?.name || 'Traveler Guest';
    const customerEmail = travelerUser?.email || guestUser?.email;

    const formatted = formatTranscriptText({
      ticketRef: currentTicketRef,
      customerName,
      customerEmail,
      status: chatStatus,
      messages: messages.map(m => ({
        sender: m.sender,
        senderName: m.senderName,
        senderRole: m.senderRole,
        text: m.text,
        timestamp: m.timestamp
      }))
    });

    const filename = `holiday-travelers-transcript-${currentTicketRef}-${Date.now()}.txt`;
    downloadTranscriptFile(filename, formatted);
    setToastMessage("Conversation transcript downloaded (.txt)");
  };

  const handleAskQuestion = async (questionText: string, matchedFaq?: FaqKnowledgeItem) => {
    const isLive = chatStatus === 'Handed_To_Human' || chatStatusRef.current === 'Handed_To_Human';

    // IF LIVE AGENT MODE IS ACTIVE: STRICTLY ZERO AI EXECUTION!
    if (isLive) {
      const userMsg: ConciergeMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: questionText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, userMsg]);
      setInputQuery('');
      setIsTyping(false);
      setShowFaqDrawer(false);
      scrollToBottom(50);

      // Save user message to Supabase for the active chat
      if (dbChatId) {
        const senderName = travelerUser?.full_name || guestUser?.name || 'Traveler Guest';
        await saveConciergeMessage(dbChatId, 'user', senderName, 'Customer', questionText);
      }
      return; // STOP! Absolutely no AI response.
    }

    // Check if question is a request for a human staff agent
    const lowerCheck = questionText.toLowerCase();
    if (
      lowerCheck.includes('human') || 
      lowerCheck.includes('agent') || 
      lowerCheck.includes('person') || 
      lowerCheck.includes('staff') || 
      lowerCheck.includes('representative') ||
      lowerCheck.includes('talk to live agent')
    ) {
      const userMsg: ConciergeMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: questionText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, userMsg]);
      setInputQuery('');
      setShowFaqDrawer(false);
      setIsLivePromptOpen(true);
      return;
    }

    const userMsg: ConciergeMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: questionText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Append user message and close the questions drawer (Local AI mode only - no DB tickets created!)
    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setShowFaqDrawer(false);
    setIsTyping(true);
    scrollToBottom(50);

    setTimeout(async () => {
      // Guard against any handover that happened while waiting
      if (chatStatusRef.current === 'Handed_To_Human') {
        setIsTyping(false);
        return;
      }
      let replyText = '';
      let keyPoints: string[] | undefined = undefined;
      let targetPkgId: string | undefined = undefined;

      if (matchedFaq) {
        replyText = matchedFaq.answer;
        keyPoints = matchedFaq.keyPoints;
        targetPkgId = matchedFaq.recommendedPackageId;
      } else {
        // Intelligent keyword scoring
        const lowerQ = questionText.toLowerCase();
        const found = FAQ_KNOWLEDGE_BASE.find(item => 
          item.question.toLowerCase().includes(lowerQ) ||
          item.keywords.some(k => lowerQ.includes(k)) ||
          lowerQ.includes(item.category)
        );

        if (found) {
          replyText = found.answer;
          keyPoints = found.keyPoints;
          targetPkgId = found.recommendedPackageId;
        } else if (lowerQ.includes('human') || lowerQ.includes('agent') || lowerQ.includes('representative') || lowerQ.includes('person') || lowerQ.includes('staff')) {
          replyText = 'Connecting you directly to our live dispatch desk. A staff member from Holiday Travelers Inc. will join this chat thread shortly.';
          setIsLivePromptOpen(true);
        } else if (lowerQ.includes('el nido') || lowerQ.includes('palawan')) {
          replyText = 'Our El Nido Archipelago Expedition (₱18,500/pax) features Big Lagoon, Secret Lagoon, 4D3N boutique resort accommodation, and private boat transfers.';
          targetPkgId = 'pkg-1';
        } else if (lowerQ.includes('batanes')) {
          replyText = 'Batanes Heritage Discovery (₱28,900/pax) is a 5D4N trip featuring Ivatan culture, Basco lighthouse, Sabtang Island, and daily organic feasts.';
          targetPkgId = 'pkg-2';
        } else if (lowerQ.includes('cebu') || lowerQ.includes('canyoneering')) {
          replyText = 'Cebu Highlights & Kawasan Canyoneering (₱14,200/pax) is a 3D2N thrill with whale shark encounters and full safety gears.';
          targetPkgId = 'pkg-3';
        } else if (lowerQ.includes('coron')) {
          replyText = 'Coron Island & Sunken Shipwrecks (₱16,800/pax) is a 4D3N snorkeling & shipwreck diving wonder with Kayangan Lake passes.';
          targetPkgId = 'pkg-4';
        } else if (lowerQ.includes('siargao')) {
          replyText = 'Siargao Cloud 9 & Pacific Swell (₱12,500/pax) includes 3D2N surf resort lodging, Magpupungko Rock Pools, and Sugba Lagoon tours.';
          targetPkgId = 'pkg-5';
        } else if (lowerQ.includes('passport') || lowerQ.includes('dfa')) {
          replyText = 'Holiday Travelers Inc. provides expedited passport assistance with appointments scheduled quickly and turnaround in as fast as 5 business days for both renewal and first-time applicants.';
          keyPoints = [
            'Turnaround: as fast as 5 days for expedited processing',
            'Document pre-validation and DFA appointment booking',
            'Inquire directly: 0916 525 3517 or holidaytravelersinc2022@gmail.com'
          ];
        } else if (lowerQ.includes('visa') || lowerQ.includes('hong kong') || lowerQ.includes('japan') || lowerQ.includes('korea')) {
          replyText = 'We provide complete visa processing services for Hong Kong, Japan, South Korea, Schengen, USA, Canada, and Australia with high approval track records.';
          keyPoints = [
            'Complete requirements assessment and checklist',
            'Embassy appointment filing and mock interview coaching',
            'Specialist contact: 0916 525 3517'
          ];
        } else if (lowerQ.includes('address') || lowerQ.includes('office') || lowerQ.includes('location') || lowerQ.includes('where are you')) {
          replyText = 'Our main office is located in Ortigas Center, Pasig City: Unit 1101 City & Land Mega Plaza Inc., ADB Ave., Corner Garnet Rd., Ortigas Center, San Antonio, Pasig City, Philippines, 1605.';
          keyPoints = [
            'Address: Unit 1101 City & Land Mega Plaza Inc., ADB Ave. cor. Garnet Rd., Ortigas, Pasig',
            'Phone: 0916 525 3517',
            'Email: holidaytravelersinc2022@gmail.com'
          ];
        } else if (lowerQ.includes('contact') || lowerQ.includes('number') || lowerQ.includes('call') || lowerQ.includes('phone') || lowerQ.includes('email')) {
          replyText = 'You can reach Holiday Travelers Inc. directly via mobile/WhatsApp/Viber at 0916 525 3517 or email us at holidaytravelersinc2022@gmail.com.';
          keyPoints = [
            'Direct Mobile / WhatsApp: 0916 525 3517',
            'Direct Email: holidaytravelersinc2022@gmail.com',
            'Office: Unit 1101 City & Land Mega Plaza Inc., ADB Ave., Ortigas Center, Pasig City'
          ];
        } else {
          replyText = `Thank you for asking! For "${questionText}", our reservations team at Holiday Travelers Inc. can customize your exact itinerary with flexible 50% downpayment terms. Feel free to browse our pre-configured tour packages or contact us at 0916 525 3517.`;
          keyPoints = [
            'Accredited travel agency with full passenger insurance & environmental passes.',
            'Reserve with only 50% deposit today; settle balance prior to tour.',
            'Instant digital receipt, BIR-compliant invoices, and QR passenger voucher.'
          ];
        }
      }

      const targetPkg = targetPkgId ? packages.find(p => p.id === targetPkgId) : undefined;

      const aiMsg: ConciergeMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        detailsList: keyPoints,
        recommendedPackageId: targetPkgId,
        quickAction: targetPkg ? {
          label: `Book ${targetPkg.title} (₱${targetPkg.pricePerPax.toLocaleString()})`,
          action: () => {
            setIsOpen(false);
            onSelectPackage(targetPkg);
          }
        } : undefined
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
      scrollToBottom(80);

      // Save AI reply to Supabase only if an active ticket is currently open
      if (dbChatId) {
        await saveConciergeMessage(dbChatId, 'ai', 'Holiday Concierge AI', 'AI Bot', replyText);
      }
    }, 500);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim()) return;
    handleAskQuestion(inputQuery.trim());
  };

  const filteredFaqs = activeCategory === 'all' 
    ? FAQ_KNOWLEDGE_BASE 
    : FAQ_KNOWLEDGE_BASE.filter(f => f.category === activeCategory);

  return (
    <>
      {/* Floating Launcher Button */}
      <div className="fixed bottom-6 right-6 z-40">
        {!isOpen && (
          <button
            onClick={() => {
              setIsOpen(true);
              setShowFaqDrawer(false);
            }}
            className="group relative flex items-center gap-3 px-5 py-3.5 rounded-full bg-[#0B1014] hover:bg-[#111820] text-ivory border border-sunset-coral/50 shadow-2xl shadow-sunset-coral/30 hover:shadow-sunset-coral/50 hover:scale-105 active:scale-95 transition-all duration-300"
            id="ai-concierge-launcher"
          >
            <div className="w-8 h-8 rounded-full bg-sunset-coral flex items-center justify-center text-white shadow-md shadow-sunset-coral/40 group-hover:rotate-12 transition-transform">
              <Bot className="w-4 h-4" />
            </div>
            <div className="text-left pr-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-ivory tracking-wide">
                  Holiday Concierge AI
                </span>
              </div>
              <span className="text-[10px] text-sand-muted block font-light">
                Ask 50% deposit, tours & policies
              </span>
            </div>
          </button>
        )}
      </div>

      {/* Floating Chat Modal Box */}
      {isOpen && (
        <div 
          className={
            isFullScreen
              ? "fixed inset-2 sm:inset-6 lg:inset-10 z-50 bg-[#070B0E] border border-white/15 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in backdrop-blur-2xl transition-all duration-300"
              : "fixed bottom-4 sm:bottom-6 right-3 sm:right-6 z-50 w-[calc(100vw-1.5rem)] sm:w-[440px] max-h-[680px] h-[86vh] bg-[#070B0E] border border-white/15 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in backdrop-blur-2xl transition-all duration-300"
          }
        >
          {/* Header */}
          <div className="p-4 bg-[#0B1014] border-b border-white/[0.08] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sunset-coral/20 border border-sunset-coral/40 flex items-center justify-center text-sunset-coral shadow-inner shrink-0">
                <Compass className="w-5 h-5 animate-spin-slow" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-ivory">
                    {chatStatus === 'Handed_To_Human' ? 'Live Staff Concierge' : 'Holiday Concierge AI'}
                  </h3>
                  {chatStatus === 'Handed_To_Human' ? (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                      Staff Live
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Online 24/7
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-sand-muted font-light">
                  Holiday Travelers Travel & Tours Inc.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {chatStatus === 'Handed_To_Human' || dbChatId ? (
                <button
                  type="button"
                  onClick={() => setIsEndConfirmOpen(true)}
                  title="Conclude Conversation & Get Transcript"
                  className="px-2.5 py-1 text-[10px] text-rose-300 font-semibold rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 transition-colors flex items-center gap-1 shadow-sm"
                >
                  <LogOut className="w-3 h-3 text-rose-400" />
                  <span>End Chat</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRequestLiveAgent}
                  title="Request Live Human Agent"
                  className="px-2.5 py-1 text-[10px] text-amber-300 font-medium rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 transition-colors flex items-center gap-1"
                >
                  <UserCheck className="w-3 h-3" />
                  Live Agent
                </button>
              )}

              {/* Tickets History Button (Replaced email icon) */}
              <button
                type="button"
                onClick={() => {
                  loadCustomerTickets();
                  setIsHistoryDrawerOpen(true);
                }}
                title="View Active Support Tickets"
                className="relative p-2 text-sand-muted hover:text-white rounded-full bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
              >
                <Ticket className="w-3.5 h-3.5 text-amber-400" />
                {customerTickets.filter(t => t.status && t.status !== 'Resolved').length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-sunset-coral text-[9px] font-bold text-white flex items-center justify-center shadow">
                    {customerTickets.filter(t => t.status && t.status !== 'Resolved').length}
                  </span>
                )}
              </button>

              {/* Download Current Conversation / Transcript Button */}
              <button
                type="button"
                onClick={handleDownloadCurrentTranscript}
                title="Download Conversation Transcript (.txt)"
                className="p-2 text-sand-muted hover:text-emerald-300 rounded-full bg-white/[0.04] hover:bg-emerald-500/15 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
              </button>

              <button
                type="button"
                onClick={() => setIsFullScreen(!isFullScreen)}
                title={isFullScreen ? 'Minimize view' : 'Maximize fullscreen'}
                className="p-2 text-sand-muted hover:text-white rounded-full bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
              >
                {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={handleRestartToAi}
                title="Restart Chat (Switch to AI Assistant)"
                className="p-2 text-sand-muted hover:text-white rounded-full bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 text-sand-muted hover:text-white rounded-full bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Status Banner when Transferred to Live Agent */}
          {chatStatus === 'Handed_To_Human' && (
            <div className="bg-amber-500/15 border-b border-amber-500/30 px-3.5 py-2 flex items-center justify-between text-amber-200 text-xs shrink-0 font-medium">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                <span>AI Bot Disabled — Live Ticket #{ticketRef || 'LIVE'}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEndConfirmOpen(true)}
                  className="text-[10px] bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 px-2.5 py-0.5 rounded border border-rose-500/40 transition-colors font-semibold"
                >
                  End Chat & Get Transcript
                </button>
              </div>
            </div>
          )}

          {/* Status Banner when Ticket is Resolved */}
          {chatStatus === 'Resolved' && (
            <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-3.5 py-2 flex items-center justify-between text-emerald-200 text-xs shrink-0 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Ticket Concluded (#{ticketRef || 'RESOLVED'})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const formatted = formatTranscriptText({
                      ticketRef: ticketRef || 'TICK-RESOLVED',
                      customerName: travelerUser?.full_name || guestUser?.name || 'Traveler Guest',
                      customerEmail: travelerUser?.email || guestUser?.email,
                      status: 'Resolved',
                      messages: messages.map(m => ({
                        sender: m.sender,
                        senderName: m.senderName,
                        senderRole: m.senderRole,
                        text: m.text,
                        timestamp: m.timestamp
                      }))
                    });
                    setEndTranscriptText(formatted);
                    setIsEndTranscriptOpen(true);
                  }}
                  className="text-[10px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40 transition-colors"
                >
                  View Transcript
                </button>
                <button
                  type="button"
                  onClick={handleRestartToAi}
                  className="text-[10px] bg-white/10 hover:bg-white/20 text-ivory px-2 py-0.5 rounded transition-colors"
                >
                  Start New Chat
                </button>
              </div>
            </div>
          )}

          {/* Quick FAQ Toggle Banner - Hidden during Live Agent mode */}
          {chatStatus !== 'Handed_To_Human' && (
            <div className="bg-[#0D141A] border-b border-white/[0.08] px-3.5 py-2.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-[11px] text-sand-muted">
                <HelpCircle className="w-3.5 h-3.5 text-sunset-coral" />
                <span>Explore Frequent Questions ({FAQ_KNOWLEDGE_BASE.length} topics)</span>
              </div>
              <button
                onClick={() => setShowFaqDrawer(!showFaqDrawer)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-sunset-coral/15 hover:bg-sunset-coral/25 border border-sunset-coral/30 text-sunset-coral text-[11px] font-medium transition-all"
              >
                <span>{showFaqDrawer ? 'Hide Topics' : 'Browse Topics'}</span>
                {showFaqDrawer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          )}

          {/* Collapsible FAQ Topics Drawer (Closes when a question is picked so answer is immediately visible) */}
          {showFaqDrawer && (
            <div className="bg-[#0B1014] border-b border-white/[0.1] max-h-56 overflow-y-auto p-3 space-y-2.5 animate-fade-in shrink-0">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px]">
                {(['all', 'packages', 'payment', 'booking', 'safety', 'policies'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-2.5 py-1 rounded-full capitalize whitespace-nowrap transition-all ${
                      activeCategory === cat
                        ? 'bg-sunset-coral text-white font-medium shadow-sm'
                        : 'text-sand-muted hover:text-ivory bg-white/[0.04]'
                    }`}
                  >
                    {cat === 'all' ? 'All Questions' : cat}
                  </button>
                ))}
              </div>

              {/* Filtered Question Buttons */}
              <div className="grid grid-cols-1 gap-1.5">
                {filteredFaqs.map((faq) => (
                  <button
                    key={faq.id}
                    onClick={() => handleAskQuestion(faq.question, faq)}
                    className="p-2 rounded-xl bg-white/[0.03] hover:bg-sunset-coral/15 border border-white/[0.06] hover:border-sunset-coral/40 text-left text-[11px] text-ivory/90 hover:text-white transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2 pr-2">
                      <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-white/[0.06] text-sand-muted group-hover:text-sunset-coral">
                        {faq.badge}
                      </span>
                      <span className="line-clamp-1">{faq.question}</span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-sand-muted group-hover:text-sunset-coral group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages Scroll Area */}
          <div 
            ref={chatContainerRef}
            className="flex-1 p-4 overflow-y-auto space-y-4 text-xs font-sans-body bg-[#070B0E]"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-7 h-7 rounded-xl bg-sunset-coral/20 border border-sunset-coral/40 flex items-center justify-center text-sunset-coral shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                {msg.sender === 'admin' && (
                  <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0 mt-0.5">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] rounded-2xl p-3.5 space-y-2.5 leading-relaxed shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-sunset-coral text-white rounded-br-none shadow-md shadow-sunset-coral/20'
                      : msg.sender === 'admin'
                      ? 'bg-amber-950/40 border border-amber-500/40 text-amber-100 rounded-bl-none'
                      : 'bg-[#0E151B] text-ivory/95 border border-white/[0.08] rounded-bl-none'
                  }`}
                >
                  {msg.sender === 'admin' && (
                    <div className="text-[10px] font-semibold text-amber-300 flex items-center gap-1.5 pb-1 border-b border-amber-500/20">
                      <Shield className="w-3 h-3" />
                      <span>{msg.senderName || 'Staff Agent'}</span>
                      <span className="opacity-75">({msg.senderRole || 'Concierge'})</span>
                    </div>
                  )}

                  <p className="whitespace-pre-line text-[12px]">{msg.text}</p>

                  {/* Structured Key Points list if available */}
                  {msg.detailsList && msg.detailsList.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-white/10">
                      {msg.detailsList.map((point, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-[11px] text-ivory/85">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Direct Package Booking Action Button */}
                  {msg.quickAction && (
                    <div className="pt-2 border-t border-white/10">
                      <button
                        onClick={msg.quickAction.action}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-sunset-coral text-white text-[11px] font-semibold tracking-wide shadow-md hover:brightness-110 active:scale-95 transition-all"
                      >
                        <span>{msg.quickAction.label}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <span className={`text-[9px] block text-right ${msg.sender === 'user' ? 'text-white/70' : 'text-sand-muted'}`}>
                    {msg.timestamp}
                  </span>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-ivory shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 text-sand-muted text-xs pl-1 animate-pulse">
                <div className="w-6 h-6 rounded-xl bg-sunset-coral/20 flex items-center justify-center text-sunset-coral">
                  <Sparkles className="w-3 h-3" />
                </div>
                <span>Island Concierge is retrieving policy information...</span>
              </div>
            )}

            {/* Quick Suggestion Chips at the bottom of the conversation - Hidden during Live Agent mode */}
            {!showFaqDrawer && chatStatus !== 'Handed_To_Human' && (
              <div className="pt-2">
                <p className="text-[10px] uppercase font-mono text-sand-muted tracking-wider mb-2">
                  Suggested inquiries:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => handleAskQuestion('How does the 50% downpayment policy work?', FAQ_KNOWLEDGE_BASE[0])}
                    className="px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-sunset-coral/40 text-[10px] text-ivory/80 hover:text-white transition-all"
                  >
                    💳 50% Downpayment Policy
                  </button>
                  <button
                    onClick={() => handleAskQuestion('What is included in the El Nido Island Hopping Expedition?', FAQ_KNOWLEDGE_BASE[3])}
                    className="px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-sunset-coral/40 text-[10px] text-ivory/80 hover:text-white transition-all"
                  >
                    🏝️ El Nido Inclusions
                  </button>
                  <button
                    onClick={() => handleAskQuestion('Are environmental, terminal, and entrance fees included in the price?', FAQ_KNOWLEDGE_BASE[8])}
                    className="px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-sunset-coral/40 text-[10px] text-ivory/80 hover:text-white transition-all"
                  >
                    🎫 Environmental & Port Fees
                  </button>
                  <button
                    onClick={() => handleAskQuestion('What essential items should I pack for Philippine island hopping?', FAQ_KNOWLEDGE_BASE[11])}
                    className="px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-sunset-coral/40 text-[10px] text-ivory/80 hover:text-white transition-all"
                  >
                    🎒 Packing Essentials
                  </button>
                  <button
                    onClick={() => setShowFaqDrawer(true)}
                    className="px-2.5 py-1 rounded-full bg-sunset-coral/15 border border-sunset-coral/30 text-[10px] text-sunset-coral hover:bg-sunset-coral/25 transition-all"
                  >
                    + View All {FAQ_KNOWLEDGE_BASE.length} Topics
                  </button>
                </div>
              </div>
            )}

            {/* Invisible anchor strictly at the bottom for smooth scrolling */}
            <div ref={messagesEndRef} className="h-2" />
          </div>

          {/* Chat Input Footer */}
          <form
            onSubmit={handleCustomSubmit}
            className="p-3 bg-[#0B1014] border-t border-white/[0.08] flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={chatStatus === 'Handed_To_Human' ? 'Message live staff desk (AI is OFF)...' : 'Ask anything (e.g. 50% deposit, Batanes)...'}
              className="flex-1 bg-[#070B0E] border border-white/[0.1] rounded-full px-4 py-2.5 text-xs text-ivory placeholder-sand-muted focus:outline-none focus:border-sunset-coral"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim()}
              className="w-9 h-9 rounded-full bg-sunset-coral hover:bg-[#ff765b] disabled:opacity-40 text-white flex items-center justify-center shadow-md transition-all shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* End Conversation Confirmation Dialog */}
      {isEndConfirmOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0B1014] border border-white/15 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-ivory">Conclude Live Conversation?</h3>
                <p className="text-[11px] text-sand-muted">Ticket #{ticketRef || 'LIVE'}</p>
              </div>
            </div>

            <p className="text-xs text-sand-muted leading-relaxed">
              Are you sure you want to end this live agent chat? You will immediately receive a complete transcript that you can download or send to your email.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEndConfirmOpen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-sand text-xs transition-colors"
              >
                Continue Chat
              </button>
              <button
                type="button"
                onClick={handleConfirmEndConversation}
                className="px-4 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow-md transition-colors flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Yes, End Chat</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Agent Authentication / Guest Choice Modal */}
      <ConciergeLiveAgentPromptModal
        isOpen={isLivePromptOpen}
        onClose={() => setIsLivePromptOpen(false)}
        travelerUser={travelerUser}
        onOpenTravelerAuth={onOpenTravelerAuth}
        onConfirmGuest={(name, email) => {
          const guest = { name, email };
          setGuestUser(guest);
          try {
            localStorage.setItem('holiday_concierge_guest_user', JSON.stringify(guest));
          } catch {}
          setIsLivePromptOpen(false);
          handleConfirmLiveAgent(name, email);
        }}
        onConfirmTraveler={() => {
          setIsLivePromptOpen(false);
          if (travelerUser) {
            handleConfirmLiveAgent(travelerUser.full_name || 'Valued Traveler', travelerUser.email, travelerUser.id);
          }
        }}
      />

      {/* End Conversation Transcript Modal (Download & EmailJS) */}
      <ConciergeEndTranscriptModal
        isOpen={isEndTranscriptOpen}
        onClose={() => {
          setIsEndTranscriptOpen(false);
          handleRestartToAi();
        }}
        transcriptText={endTranscriptText}
        ticketRef={ticketRef || 'TICK-RESOLVED'}
        customerEmail={travelerUser?.email || guestUser?.email}
        customerName={travelerUser?.full_name || guestUser?.name || 'Traveler'}
        onRestartChat={handleRestartToAi}
      />

      {/* Tickets History Drawer (Replaces old email modal) */}
      <ConciergeTicketHistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        tickets={customerTickets.filter(t => t.status && t.status !== 'Resolved')}
        isLoading={isLoadingTickets}
        activeTicketId={dbChatId}
        onSelectTicket={(ticket) => {
          setIsHistoryDrawerOpen(false);
          handleSelectTicketFromHistory(ticket);
        }}
        onCloseTicket={handleCloseTicketFromDrawer}
        onRefresh={loadCustomerTickets}
        travelerUser={travelerUser}
        guestUser={guestUser}
        onOpenAuth={onOpenTravelerAuth}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-2xl text-xs flex items-center gap-2 shadow-2xl backdrop-blur-md animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
};

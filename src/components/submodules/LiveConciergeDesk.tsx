import React, { useState, useEffect, useRef } from 'react';
import { 
  ConciergeChat, 
  ConciergeChatMessage 
} from '../../types';
import { 
  fetchActiveConciergeChats, 
  fetchConciergeMessages, 
  saveConciergeMessage, 
  updateConciergeChatStatus, 
  manualPurgeConciergeChat,
  sendEmailTranscript, 
  subscribeToGlobalDatabaseChanges 
} from '../../utils/supabaseClient';
import { 
  formatTranscriptText, 
  downloadTranscriptFile, 
  copyTranscriptToClipboard, 
  openGmailWebDraft, 
  openDefaultMailClient,
  dispatchTranscriptEmail 
} from '../../utils/emailService';
import { findStaffAccountByEmail } from '../../utils/rbac';
import { 
  MessageSquare, 
  Send, 
  UserCheck, 
  Bot, 
  User, 
  Clock, 
  CheckCircle2, 
  Mail, 
  AlertCircle, 
  RefreshCw, 
  Search, 
  Shield, 
  Sparkles, 
  Zap, 
  Timer, 
  ExternalLink,
  Copy,
  Download,
  Check
} from 'lucide-react';

interface LiveConciergeDeskProps {
  adminEmail: string;
  adminRole: string;
}

export const LiveConciergeDesk: React.FC<LiveConciergeDeskProps> = ({
  adminEmail,
  adminRole
}) => {
  const [chats, setChats] = useState<ConciergeChat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConciergeChatMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [filter, setFilter] = useState<'all' | 'handed' | 'active' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [hasCopiedTranscript, setHasCopiedTranscript] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const staffAccount = findStaffAccountByEmail(adminEmail);
  const adminName = staffAccount?.fullName || adminEmail.split('@')[0].replace(/[\._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const adminRoleName = staffAccount?.role || adminRole;

  const getSelectedChatTranscript = () => {
    if (!selectedChat) return '';
    return formatTranscriptText({
      ticketRef: selectedChat.ticketRef,
      customerName: selectedChat.customerName,
      customerEmail: selectedChat.customerEmail || emailInput,
      status: selectedChat.status,
      createdAt: selectedChat.createdAt,
      endedAt: selectedChat.endedAt,
      messages: messages.map(m => ({
        sender: m.senderType,
        senderName: m.senderName,
        senderRole: m.senderRole,
        text: m.text,
        timestamp: m.createdAt
      }))
    });
  };

  const handleCopyTranscript = async () => {
    const text = getSelectedChatTranscript();
    if (!text) return;
    const ok = await copyTranscriptToClipboard(text);
    if (ok) {
      setHasCopiedTranscript(true);
      showToast('Transcript copied to clipboard!');
      setTimeout(() => setHasCopiedTranscript(false), 3000);
    }
  };

  const handleDownloadTranscript = () => {
    const text = getSelectedChatTranscript();
    if (!text || !selectedChat) return;
    downloadTranscriptFile(`HolidayTravelers_${selectedChat.ticketRef}_${Date.now()}.txt`, text);
    showToast('Transcript file downloaded.');
  };

  const handleOpenGmailDraft = () => {
    const text = getSelectedChatTranscript();
    if (!text || !selectedChat) return;
    openGmailWebDraft({
      toEmail: emailInput.trim() || selectedChat.customerEmail || '',
      customerName: selectedChat.customerName,
      ticketRef: selectedChat.ticketRef,
      transcriptText: text
    });
    showToast('Opened pre-filled Gmail draft!');
  };

  // Load all chat sessions
  const loadChats = async () => {
    setIsLoading(true);
    const data = await fetchActiveConciergeChats();
    const mapped: ConciergeChat[] = data.map(item => ({
      id: item.id,
      ticketRef: item.ticket_ref || ('TICK-2026-' + item.id.substring(5, 9).toUpperCase()),
      sessionId: item.session_id,
      customerName: item.customer_name || 'Traveler Guest',
      customerEmail: item.customer_email || undefined,
      status: item.status || 'Active',
      lastMessage: item.last_message || '',
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      endedAt: item.ended_at,
      expiresAt: item.expires_at
    }));
    setChats(mapped);
    setIsLoading(false);

    if (mapped.length > 0 && !selectedChatId) {
      setSelectedChatId(mapped[0].id);
    }
  };

  // Load messages for selected chat
  const loadMessages = async (chatId: string) => {
    const rawMsgs = await fetchConciergeMessages(chatId);
    const mapped: ConciergeChatMessage[] = rawMsgs.map(m => ({
      id: m.id,
      chatId: m.chat_id,
      senderType: m.sender_type,
      senderName: m.sender_name,
      senderRole: m.sender_role,
      text: m.text,
      createdAt: m.created_at
    }));
    setMessages(mapped);
  };

  useEffect(() => {
    loadChats();

    // Subscribe to realtime changes in concierge tables
    const unsubscribe = subscribeToGlobalDatabaseChanges((payload) => {
      if (payload.table === 'concierge_chats' || payload.table === 'concierge_messages') {
        loadChats();
        if (selectedChatId) {
          loadMessages(selectedChatId);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (selectedChatId) {
      loadMessages(selectedChatId);
      const currentChat = chats.find(c => c.id === selectedChatId);
      if (currentChat?.customerEmail) {
        setEmailInput(currentChat.customerEmail);
      }
    }
  }, [selectedChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedChatId || isSending) return;

    setIsSending(true);
    const textToSend = replyText.trim();
    setReplyText('');

    await saveConciergeMessage(selectedChatId, 'admin', adminName, adminRoleName, textToSend);
    await loadMessages(selectedChatId);
    await loadChats();
    setIsSending(false);
  };

  const getRemainingPurgeTime = (chat: ConciergeChat) => {
    const now = Date.now();
    let targetTime = 0;
    if (chat.expiresAt) {
      targetTime = new Date(chat.expiresAt).getTime();
    } else if (chat.endedAt) {
      targetTime = new Date(chat.endedAt).getTime() + 24 * 60 * 60 * 1000;
    } else if (chat.updatedAt) {
      targetTime = new Date(chat.updatedAt).getTime() + 24 * 60 * 60 * 1000;
    }
    
    if (!targetTime) return '24h retention active';
    const diffMs = targetTime - now;
    if (diffMs <= 0) return 'Purging in next cycle';
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHrs}h ${diffMins}m remaining`;
  };

  const handleManualPurge = async () => {
    if (!selectedChatId) return;
    const ok = await manualPurgeConciergeChat(selectedChatId);
    if (ok) {
      showToast('Conversation thread permanently purged from cloud storage.');
      setSelectedChatId(null);
      await loadChats();
    } else {
      showToast('Failed to purge thread.');
    }
  };

  const handleTakeover = async () => {
    if (!selectedChatId) return;
    await updateConciergeChatStatus(selectedChatId, 'Handed_To_Human');
    await saveConciergeMessage(selectedChatId, 'admin', adminName, adminRoleName, `[SYSTEM] ${adminName} (${adminRoleName}) has joined the live conversation desk.`);
    await loadMessages(selectedChatId);
    await loadChats();
    showToast(`Successfully took over live chat session.`);
  };

  const handleResolveSession = async () => {
    if (!selectedChatId) return;
    await updateConciergeChatStatus(selectedChatId, 'Resolved');
    await saveConciergeMessage(selectedChatId, 'admin', adminName, adminRoleName, `[SYSTEM] Chat session was concluded by ${adminName} (${adminRoleName}). This thread is detached on client side and will be automatically purged from the cloud database in 24 hours.`);
    await loadMessages(selectedChatId);
    await loadChats();
    showToast(`Session marked as Resolved. 24-hour auto-purge timer initiated.`);
  };

  const handleSendTranscriptEmail = async () => {
    if (!selectedChatId || !emailInput.trim()) return;
    const ok = await sendEmailTranscript(selectedChatId, emailInput.trim());
    if (ok) {
      setEmailModalOpen(false);
      showToast(`Transcript successfully sent to ${emailInput.trim()}`);
    } else {
      showToast(`Failed to dispatch transcript email.`);
    }
  };

  const showToast = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const selectedChat = chats.find(c => c.id === selectedChatId);

  const filteredChats = chats.filter(c => {
    if (filter === 'handed' && c.status !== 'Handed_To_Human') return false;
    if (filter === 'active' && c.status !== 'Active') return false;
    if (filter === 'resolved' && c.status !== 'Resolved') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.customerName.toLowerCase().includes(q);
      const matchEmail = c.customerEmail?.toLowerCase().includes(q);
      const matchMsg = c.lastMessage?.toLowerCase().includes(q);
      return matchName || matchEmail || matchMsg;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-obsidian-card via-obsidian-surface to-obsidian-card border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-48 h-48 bg-coral/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-coral/20 border border-coral/30 flex items-center justify-center text-coral shadow-inner">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-ivory tracking-tight">Live Customer Concierge & Dispatch Desk</h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Supabase Realtime Live
                </span>
              </div>
              <p className="text-sm text-sand-muted mt-0.5">
                Answer customer inquiries live, perform staff takeover from AI bot, and send transcripts via email.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadChats()}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-sand font-medium flex items-center gap-2 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Chats
            </button>
          </div>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-3 shadow-lg animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List of Customer Chat Sessions */}
        <div className="lg:col-span-5 bg-obsidian-card border border-white/10 rounded-2xl p-4 shadow-xl space-y-4">
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-sand-muted" />
              <input
                type="text"
                placeholder="Search guest name, email or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-ivory placeholder-sand-muted focus:outline-none focus:border-coral/50 transition-all"
              />
            </div>

            {/* Status Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all font-medium whitespace-nowrap ${
                  filter === 'all' 
                    ? 'bg-coral text-obsidian font-semibold shadow-md' 
                    : 'bg-white/5 text-sand hover:bg-white/10'
                }`}
              >
                All Chats ({chats.length})
              </button>
              <button
                onClick={() => setFilter('handed')}
                className={`px-3 py-1.5 rounded-lg transition-all font-medium whitespace-nowrap flex items-center gap-1.5 ${
                  filter === 'handed' 
                    ? 'bg-amber-500 text-obsidian font-semibold shadow-md' 
                    : 'bg-white/5 text-amber-300 hover:bg-white/10'
                }`}
              >
                <UserCheck className="w-3 h-3" />
                Live Staff ({chats.filter(c => c.status === 'Handed_To_Human').length})
              </button>
              <button
                onClick={() => setFilter('active')}
                className={`px-3 py-1.5 rounded-lg transition-all font-medium whitespace-nowrap flex items-center gap-1.5 ${
                  filter === 'active' 
                    ? 'bg-cyan-500 text-obsidian font-semibold shadow-md' 
                    : 'bg-white/5 text-cyan-300 hover:bg-white/10'
                }`}
              >
                <Bot className="w-3 h-3" />
                AI Active ({chats.filter(c => c.status === 'Active').length})
              </button>
              <button
                onClick={() => setFilter('resolved')}
                className={`px-3 py-1.5 rounded-lg transition-all font-medium whitespace-nowrap flex items-center gap-1.5 ${
                  filter === 'resolved' 
                    ? 'bg-slate-600 text-ivory font-semibold shadow-md' 
                    : 'bg-white/5 text-sand-muted hover:bg-white/10'
                }`}
              >
                Resolved ({chats.filter(c => c.status === 'Resolved').length})
              </button>
            </div>
          </div>

          {/* Sessions List */}
          <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="py-12 text-center text-xs text-sand-muted flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-coral" />
                Connecting to cloud database...
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="py-12 text-center text-xs text-sand-muted border border-dashed border-white/10 rounded-xl p-4">
                No active concierge sessions match the selected filter.
              </div>
            ) : (
              filteredChats.map((chat) => {
                const isSelected = chat.id === selectedChatId;
                return (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedChatId(chat.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all relative ${
                      isSelected
                        ? 'bg-white/10 border-coral/50 shadow-lg'
                        : 'bg-white/[0.03] border-white/5 hover:bg-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-sand text-xs font-bold">
                          {chat.customerName ? chat.customerName.charAt(0).toUpperCase() : 'G'}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-ivory flex items-center gap-1.5">
                            {chat.customerName}
                          </div>
                          <div className="text-[11px] text-sand-muted truncate max-w-[170px]">
                            {chat.customerEmail || 'Guest Traveler'}
                          </div>
                        </div>
                      </div>

                      {/* Status badge */}
                      {chat.status === 'Handed_To_Human' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Human Assistance
                        </span>
                      )}
                      {chat.status === 'Active' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          AI Bot
                        </span>
                      )}
                      {chat.status === 'Resolved' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Timer className="w-3 h-3 text-amber-400" />
                          {getRemainingPurgeTime(chat)}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 text-xs text-sand-muted line-clamp-1 bg-black/20 p-2 rounded-lg border border-white/5">
                      "{chat.lastMessage || 'No messages yet'}"
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-sand-muted">
                      <span className="font-mono text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">{chat.ticketRef}</span>
                      <span>{chat.updatedAt ? new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Active Conversation Room */}
        <div className="lg:col-span-7 bg-obsidian-card border border-white/10 rounded-2xl p-5 shadow-xl flex flex-col min-h-[660px]">
          {selectedChat ? (
            <>
              {/* Active Header */}
              <div className="pb-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-ivory">{selectedChat.customerName}</h2>
                    <span className="text-xs text-sand-muted">({selectedChat.customerEmail || 'No email provided'})</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-sand-muted mt-1">
                    <span className="font-mono text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md font-semibold">
                      Ticket #{selectedChat.ticketRef}
                    </span>
                    <span>Session: <code className="bg-white/5 px-1.5 py-0.5 rounded text-coral font-mono">{selectedChat.sessionId}</code></span>
                    {selectedChat.status === 'Resolved' && (
                      <span className="text-amber-400 flex items-center gap-1">
                        <Timer className="w-3.5 h-3.5" />
                        24-Hour Auto-Purge Active
                      </span>
                    )}
                  </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedChat.status !== 'Handed_To_Human' && (
                    <button
                      onClick={handleTakeover}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-medium flex items-center gap-1.5 transition-colors"
                      title="Take over conversation from AI"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Intervene / Join Chat
                    </button>
                  )}

                  <button
                    onClick={() => setEmailModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sand border border-white/10 text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5 text-coral" />
                    Email Transcript
                  </button>

                  {selectedChat.status !== 'Resolved' ? (
                    <button
                      onClick={handleResolveSession}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Resolve (Set 24h Purge)
                    </button>
                  ) : (
                    <button
                      onClick={handleManualPurge}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-medium flex items-center gap-1.5 transition-colors"
                      title="Permanently remove from database now"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Wipe Now
                    </button>
                  )}
                </div>
              </div>

              {/* Resolved 24-Hour Audit Banner */}
              {selectedChat.status === 'Resolved' && (
                <div className="mt-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2.5 text-amber-300">
                    <Timer className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-ivory block">
                        Ticket Closed • Unreachable on Client Side
                      </span>
                      <p className="text-[11px] text-sand-muted mt-0.5">
                        Retained on Dispatch Desk for staff audit. Database auto-purge in: <strong className="text-amber-300">{getRemainingPurgeTime(selectedChat)}</strong>.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={handleDownloadTranscript}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-sand text-[11px] font-medium transition-colors"
                    >
                      Export .txt
                    </button>
                    <button
                      type="button"
                      onClick={handleManualPurge}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[11px] font-semibold transition-colors"
                    >
                      Wipe Now
                    </button>
                  </div>
                </div>
              )}

              {/* Message Feed */}
              <div className="flex-1 my-4 space-y-3 overflow-y-auto max-h-[420px] pr-2">
                {messages.length === 0 ? (
                  <div className="py-16 text-center text-xs text-sand-muted">
                    No message history recorded yet for this chat thread.
                  </div>
                ) : (
                  messages.map((m) => {
                    const isUser = m.senderType === 'user';
                    const isAi = m.senderType === 'ai';
                    const isAdmin = m.senderType === 'admin';

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isUser ? 'items-start' : 'items-end'}`}
                      >
                        <div className="flex items-center gap-1.5 text-[10px] text-sand-muted mb-1 px-1">
                          {isUser && <span className="font-semibold text-ivory">{m.senderName} (Guest)</span>}
                          {isAi && <span className="font-semibold text-cyan-400 flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI Assistant</span>}
                          {isAdmin && (
                            <span className="font-semibold text-coral flex items-center gap-1">
                              <Shield className="w-3 h-3" /> {m.senderName} ({m.senderRole || 'Staff Agent'})
                            </span>
                          )}
                          <span>• {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        </div>

                        <div
                          className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-md ${
                            isUser
                              ? 'bg-white/10 text-ivory rounded-tl-none border border-white/10'
                              : isAi
                              ? 'bg-cyan-950/40 border border-cyan-500/30 text-cyan-100 rounded-tr-none'
                              : 'bg-gradient-to-r from-coral/20 to-coral/30 border border-coral/40 text-ivory rounded-tr-none'
                          }`}
                        >
                          {m.text}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Input Box */}
              <form onSubmit={handleSendReply} className="pt-3 border-t border-white/10 space-y-2">
                <div className="text-[11px] text-sand-muted flex items-center justify-between">
                  <span>Replying as: <strong className="text-ivory">{adminName}</strong> ({adminRoleName})</span>
                  {selectedChat.status === 'Handed_To_Human' && (
                    <span className="text-amber-400 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Staff Intervention Active
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={
                      selectedChat.status === 'Resolved' 
                        ? 'Chat resolved. Replying will reactivate live status.' 
                        : 'Type your official staff response here...'
                    }
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-ivory placeholder-sand-muted focus:outline-none focus:border-coral transition-colors"
                  />

                  <button
                    type="submit"
                    disabled={!replyText.trim() || isSending}
                    className="px-5 py-2.5 rounded-xl bg-coral hover:bg-coral-light text-obsidian font-semibold text-xs flex items-center gap-2 shadow-lg disabled:opacity-50 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-sand-muted space-y-3">
              <MessageSquare className="w-12 h-12 text-white/10" />
              <p className="text-sm">Select a customer conversation thread from the left panel to begin replying.</p>
            </div>
          )}
        </div>
      </div>

      {/* Email Transcript Modal */}
      {emailModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-obsidian-card border border-white/10 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-coral/20 border border-coral/30 flex items-center justify-center text-coral">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ivory">Dispatch Conversation Transcript</h3>
                  <p className="text-xs text-sand-muted">Ticket #{selectedChat?.ticketRef || 'TICK-2026'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEmailModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-sand-muted hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-sand font-medium">Customer Email Address</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="customer@example.com"
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-ivory focus:outline-none focus:border-coral"
                />
                <button
                  type="button"
                  onClick={handleSendTranscriptEmail}
                  disabled={!emailInput.trim()}
                  className="px-4 py-2 rounded-xl bg-coral hover:bg-coral-light text-obsidian font-semibold text-xs flex items-center gap-1.5 shadow-md disabled:opacity-50 transition-all"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Auto-Send
                </button>
              </div>
            </div>

            {/* Zero Quota Fast Actions */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <p className="text-[11px] text-sand-muted">Zero-quota immediate alternatives:</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={handleOpenGmailDraft}
                  className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/40 text-xs text-ivory flex items-center justify-center gap-1.5 transition-all text-center"
                  title="Open prefilled draft in Gmail Web"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                  <span>Gmail Draft</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyTranscript}
                  className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-xs text-ivory flex items-center justify-center gap-1.5 transition-all text-center"
                >
                  {hasCopiedTranscript ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-sunset-coral" />
                  )}
                  <span>{hasCopiedTranscript ? 'Copied!' : 'Copy Text'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadTranscript}
                  className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-xs text-ivory flex items-center justify-center gap-1.5 transition-all text-center"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Save .txt</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setEmailModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-ivory text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

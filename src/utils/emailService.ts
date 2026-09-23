/**
 * Enterprise Email & Transcript Dispatcher Service
 * Supports:
 * 1. EmailJS with automatic quota limit detection
 * 2. Web3Forms free cloud email fallback (zero monthly limit / no template setup required)
 * 3. 1-Click Direct Gmail Web Compose (100% free, zero quota, instant prefilled draft)
 * 4. 1-Click Native Mail App Dispatch (mailto: prefilled)
 * 5. 1-Click Direct Clipboard Copy
 * 6. Native Mobile/Browser Web Share API (WhatsApp, Viber, Messenger, Email)
 * 7. Instant .txt Document Download
 */

export interface EmailTranscriptPayload {
  toEmail: string;
  customerName: string;
  ticketRef: string;
  transcriptText: string;
  endedAt?: string;
}

/**
 * Open Gmail Web Compose directly with pre-filled To, Subject, and full transcript body.
 * Works 100% client-side, zero monthly limits, zero API keys required.
 */
export function openGmailWebDraft(payload: EmailTranscriptPayload): void {
  const subject = `Holiday Travelers Support Transcript - Ticket #${payload.ticketRef}`;
  const body = payload.transcriptText;
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(payload.toEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(gmailUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Open native system mail client (Apple Mail, Outlook, Thunderbird, iOS Mail, Android Mail).
 * Works 100% client-side, zero limits, zero setup.
 */
export function openDefaultMailClient(payload: EmailTranscriptPayload): void {
  const subject = `Holiday Travelers Support Transcript - Ticket #${payload.ticketRef}`;
  const body = payload.transcriptText;
  // Keep body within typical mailto URI length limits (~2000 chars safe), or full if supported
  const mailtoUrl = `mailto:${encodeURIComponent(payload.toEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoUrl;
}

/**
 * Copy full formatted transcript to user's clipboard.
 */
export async function copyTranscriptToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for non-secure contexts or older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (err) {
    console.error('Failed to copy transcript to clipboard:', err);
    return false;
  }
}

/**
 * Share transcript via native device share sheet (WhatsApp, Viber, Telegram, Gmail, etc.)
 */
export async function shareTranscriptNative(payload: EmailTranscriptPayload): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: `Holiday Travelers Support Transcript #${payload.ticketRef}`,
        text: payload.transcriptText,
      });
      return true;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Native share error:', err);
      }
      return false;
    }
  }
  return false;
}

/**
 * Send full conversation transcript to recipient email.
 * Tries:
 * 1. Web3Forms (if VITE_WEB3FORMS_ACCESS_KEY is set)
 * 2. EmailJS (checks for quota/rate limit errors and catches them gracefully)
 * 3. Fallback to Gmail Web / Direct Mail launcher
 */
export async function dispatchTranscriptEmail(payload: EmailTranscriptPayload): Promise<{ 
  success: boolean; 
  provider: 'web3forms' | 'emailjs' | 'gmail_opened' | 'mailto_opened' | 'fallback'; 
  message: string;
  isLimitError?: boolean;
}> {
  // 1. Check for Web3Forms access key first (high free limit, no template setup required)
  const web3formsKey = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY;
  if (web3formsKey) {
    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          access_key: web3formsKey,
          subject: `Holiday Travelers Support Transcript - Ticket #${payload.ticketRef}`,
          from_name: 'Holiday Travelers Concierge Desk',
          to_email: payload.toEmail,
          customer_name: payload.customerName,
          ticket_reference: payload.ticketRef,
          message: payload.transcriptText
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        return {
          success: true,
          provider: 'web3forms',
          message: `Transcript successfully sent to ${payload.toEmail} via Web3Forms.`
        };
      }
    } catch (err) {
      console.warn('Web3Forms dispatch error, trying alternatives:', err);
    }
  }

  // 2. Try EmailJS if credentials are present
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  if (serviceId && templateId && publicKey) {
    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: serviceId,
          template_id: templateId,
          user_id: publicKey,
          template_params: {
            to_email: payload.toEmail,
            customer_name: payload.customerName,
            ticket_ref: payload.ticketRef,
            transcript_text: payload.transcriptText,
            ended_at: payload.endedAt || new Date().toLocaleString(),
            company_name: 'Holiday Travelers Travel & Tours Inc.',
            company_contact: '0916 525 3517 | holidaytravelersinc2022@gmail.com'
          }
        }),
      });

      if (response.ok) {
        return {
          success: true,
          provider: 'emailjs',
          message: `Transcript successfully emailed to ${payload.toEmail} via EmailJS.`
        };
      } else {
        const errText = await response.text();
        console.warn('EmailJS API error response:', errText);
        
        // Detect quota or plan limits
        const isLimit = response.status === 429 || 
                        response.status === 402 || 
                        errText.toLowerCase().includes('quota') || 
                        errText.toLowerCase().includes('limit');

        if (isLimit) {
          // Immediately offer instant Gmail Web draft without failing the user
          openGmailWebDraft(payload);
          return {
            success: true,
            provider: 'gmail_opened',
            isLimitError: true,
            message: `EmailJS monthly limit reached. Opened Gmail draft pre-filled with the transcript for ${payload.toEmail}!`
          };
        }
      }
    } catch (err: any) {
      console.warn('EmailJS network exception:', err);
    }
  }

  // 3. If no automated cloud provider is available or both hit limits, open Gmail web directly!
  try {
    openGmailWebDraft(payload);
    return {
      success: true,
      provider: 'gmail_opened',
      message: `Opened pre-filled Gmail draft for ${payload.toEmail}. You can also download or copy the transcript below!`
    };
  } catch (err) {
    // 4. Fallback to mailto
    openDefaultMailClient(payload);
    return {
      success: true,
      provider: 'mailto_opened',
      message: `Launched your mail application with the transcript pre-filled for ${payload.toEmail}.`
    };
  }
}

/**
 * Format conversation messages into a clean, professional text document.
 */
export function formatTranscriptText(params: {
  ticketRef: string;
  customerName: string;
  customerEmail?: string;
  status: string;
  createdAt?: string;
  endedAt?: string;
  messages: Array<{
    sender: 'user' | 'admin' | 'ai';
    senderName?: string;
    senderRole?: string;
    text: string;
    timestamp?: string;
  }>;
}): string {
  const header = [
    '=========================================================================',
    '      HOLIDAY TRAVELERS TRAVEL & TOURS INC. - CONCIERGE CHAT TRANSCRIPT',
    '=========================================================================',
    `Ticket Reference : ${params.ticketRef}`,
    `Customer Name    : ${params.customerName}`,
    `Customer Email   : ${params.customerEmail || 'Guest Traveler'}`,
    `Status           : ${params.status}`,
    `Generated At     : ${new Date().toLocaleString()}`,
    params.createdAt ? `Started At       : ${new Date(params.createdAt).toLocaleString()}` : '',
    params.endedAt ?   `Ended At         : ${new Date(params.endedAt).toLocaleString()}` : '',
    '-------------------------------------------------------------------------',
    'Official Hotline : 0916 525 3517 | (02) 8654 3210',
    'DOT Accreditation: #DOT-NCR-TO-2026-889',
    'Office Address   : Unit 1101 City & Land Mega Plaza, ADB Ave., Ortigas Center, Pasig',
    '=========================================================================\n\n'
  ].filter(Boolean).join('\n');

  const formattedMessages = params.messages.map((m, idx) => {
    let senderLabel = 'GUEST TRAVELER';
    if (m.sender === 'admin') {
      senderLabel = `STAFF [${m.senderName || 'Staff Agent'}${m.senderRole ? ` - ${m.senderRole}` : ''}]`;
    } else if (m.sender === 'ai') {
      senderLabel = 'AI CONCIERGE ASSISTANT';
    } else if (m.sender === 'user') {
      senderLabel = `CUSTOMER [${params.customerName}]`;
    }

    const timeStr = m.timestamp || '';
    return `[#${idx + 1}] ${timeStr} ${senderLabel}:\n${m.text}\n`;
  }).join('\n-------------------------------------------------------------------------\n');

  const footer = [
    '\n\n=========================================================================',
    '  End of Transcript - Holiday Travelers Travel & Tours Inc.',
    '  Thank you for trusting Holiday Travelers. Mabuhay!',
    '========================================================================='
  ].join('\n');

  return header + formattedMessages + footer;
}

/**
 * Trigger immediate browser download of the chat transcript as a .txt file.
 */
export function downloadTranscriptFile(filename: string, content: string): void {
  try {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to trigger transcript download:', err);
  }
}

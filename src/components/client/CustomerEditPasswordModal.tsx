import React from 'react';
import { X, KeyRound, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../../utils/supabaseClient';
import { CustomerPasswordEditor } from './CustomerPasswordEditor';

interface CustomerEditPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  travelerUser: UserProfile | null;
}

export const CustomerEditPasswordModal: React.FC<CustomerEditPasswordModalProps> = ({
  isOpen,
  onClose,
  travelerUser
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div 
        className="w-full max-w-2xl bg-[#090E14] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-6 bg-gradient-to-r from-[#0F1722] via-[#090E14] to-[#0D1520] border-b border-white/10 flex items-center justify-between relative overflow-hidden shrink-0">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-sunset-coral/15 border border-sunset-coral/40 text-sunset-coral flex items-center justify-center shadow-lg shrink-0">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-serif-display text-xl sm:text-2xl text-ivory font-medium">
                  Update Account Password
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Secure Vault</span>
                </span>
              </div>
              <p className="text-xs font-mono text-sand-muted mt-0.5">{travelerUser?.email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-sand-muted hover:text-ivory flex items-center justify-center transition-all cursor-pointer relative z-10"
            aria-label="Close Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1">
          <CustomerPasswordEditor
            travelerUser={travelerUser}
            onSuccess={onClose}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
};

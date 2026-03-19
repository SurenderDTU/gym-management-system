import React from 'react';
import { Lock, LogOut, CreditCard, ShieldAlert } from 'lucide-react';

// FIX: We must keep 'onRenew' in this list to prevent the White Screen crash.
const SuspensionOverlay = ({ onRenew, onLogout }) => {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-in fade-in duration-500">
      
      {/* RESTORED: Heavy Blurred Backdrop (The previous glass design effect) */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-2xl" />

      {/* The Glass Content Card */}
      <div className="relative bg-white/95 backdrop-blur-md w-full max-w-md rounded-[40px] shadow-2xl border border-white/20 p-10 text-center shadow-rose-500/10 animate-in zoom-in-95 duration-300">
        
        {/* Animated Lock Icon */}
        <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 bg-rose-500 rounded-3xl rotate-12 opacity-20 animate-pulse" />
            <div className="absolute inset-0 bg-rose-500 rounded-3xl -rotate-6 opacity-20 animate-pulse delay-75" />
            <div className="relative w-full h-full bg-rose-500 rounded-3xl flex items-center justify-center shadow-lg shadow-rose-500/40">
                <Lock size={44} className="text-white" />
            </div>
        </div>

        {/* RESTORED: Better Fonts and Tracking */}
        <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tighter">Vault Locked</h2>
        <p className="text-slate-500 font-semibold mb-8 leading-relaxed">
            Your subscription has expired. Access to your members, attendance, and analytics is paused until renewal.
        </p>

        <div className="flex flex-col gap-3">
          <button 
            onClick={onRenew} 
            className="group w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2"
          >
            <CreditCard size={18} className="group-hover:animate-bounce" />
            Renew Subscription
          </button>
          
          <button 
            onClick={onLogout}
            className="w-full py-3 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-rose-500 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={14} />
            Logout from System
          </button>
        </div>

        {/* Security Footer */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-slate-400">
            <ShieldAlert size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Secure GymVault Environment</span>
        </div>
      </div>
    </div>
  );
};

export default SuspensionOverlay;
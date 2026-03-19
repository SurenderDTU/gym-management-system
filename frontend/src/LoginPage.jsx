import React, { useState } from 'react';
import axios from 'axios';
import { Dumbbell, Mail, Lock, ArrowRight, Building2, User } from 'lucide-react';

function LoginPage({ setToken }) {
  const [portalType, setPortalType] = useState('OWNER'); // 'OWNER' or 'MEMBER'
  const [isRegistering, setIsRegistering] = useState(false);
  
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [gymName, setGymName]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isRegistering) {
        // Create the new unique gym and owner account in PostgreSQL
        await axios.post('/api/auth/register-owner', {
          gym_name: gymName,
          full_name: fullName,
          email,
          password
        });
      }
      
      // Log them in immediately and get the secure token
      const res = await axios.post('/api/auth/login', { email, password });
      setToken(res.data.token, res.data.user);
      window.history.pushState({}, '', '/dashboard');
    } catch (err) {
      const status = err?.response?.status;
      const retryAfter = err?.response?.data?.retry_after_seconds;
      const apiMessage = err?.response?.data?.message || err?.response?.data?.error;

      if (!err?.response) {
        setError('Backend is offline or unreachable. Please start the server and try again.');
        return;
      }

      if (status === 429) {
        setError(
          retryAfter
            ? `Too many attempts. Please wait ${retryAfter}s and try again.`
            : (apiMessage || 'Too many attempts. Please wait and try again.')
        );
      } else {
        setError(apiMessage || "Invalid credentials. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="h-screen flex items-center justify-center font-['Inter'] relative overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse at 20% 25%, rgba(99,102,241,0.2) 0%, transparent 55%),
          radial-gradient(ellipse at 80% 75%, rgba(168,85,247,0.15) 0%, transparent 55%),
          radial-gradient(ellipse at 75% 10%, rgba(59,130,246,0.1) 0%, transparent 45%),
          #080d1a
        `
      }}
    >
      {/* Decorative blurred orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)', filter: 'blur(40px)' }} />

      {/* Subtle grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      {/* Login Card */}
      <div
        className="relative w-full max-w-md mx-4 p-10 rounded-[32px] overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
        }}
      >
        {/* Inner top glow */}
        <div className="absolute -top-24 -right-24 w-56 h-56 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)' }} />

        {/* Logo */}
        <div className="flex flex-col items-center mb-6 relative">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              boxShadow: '0 8px 32px rgba(99,102,241,0.5)'
            }}
          >
            <Dumbbell size={26} className="text-white" strokeWidth={2.5} />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight">GymVault</h2>
          <p className="text-slate-400 text-sm font-medium mt-1.5">Management System Portal</p>
        </div>

        {/* Portal Toggle */}
        <div className="flex bg-black/20 p-1.5 rounded-2xl mb-8 border border-white/5 relative shadow-inner">
          <div 
            className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-xl transition-all duration-300 shadow-lg z-0"
            style={{ 
              left: portalType === 'OWNER' ? '6px' : 'calc(50%)',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)'
            }}
          />
          <button 
            type="button"
            onClick={() => { setPortalType('OWNER'); setError(''); }}
            className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest relative z-10 transition-colors ${portalType === 'OWNER' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Admin / Staff
          </button>
          <button 
            type="button"
            onClick={() => { setPortalType('MEMBER'); setError(''); }}
            className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest relative z-10 transition-colors ${portalType === 'MEMBER' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Gym Member
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm font-semibold text-rose-300 animate-in fade-in duration-200"
            style={{ background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.2)' }}>
            {error}
          </div>
        )}

        {/* Dynamic Content based on Portal Type */}
        {portalType === 'MEMBER' ? (
          <div className="text-center py-6 animate-in fade-in duration-300">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-5 border border-white/10">
              <User size={24} className="text-indigo-400" />
            </div>
            <h3 className="text-white font-black text-lg mb-2">Member Portal</h3>
            <p className="text-slate-400 text-xs font-medium leading-relaxed px-4">
              The dedicated member app is currently under construction. Soon, you'll be able to log in and track your workouts, payments, and streaks here!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-300">
            
            {isRegistering && (
              <>
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-[10px] font-extrabold uppercase tracking-[0.15em] mb-2 px-1" style={{ color: 'rgba(148,163,184,0.8)' }}>
                    Gym Name
                  </label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      required
                      type="text"
                      placeholder="Titan Fitness"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl text-white placeholder-slate-600 outline-none transition-all font-medium text-sm"
                      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                      onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.6)'; e.target.style.background = 'rgba(99,102,241,0.08)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.07)'; }}
                      onChange={(e) => setGymName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="animate-in fade-in slide-in-from-top-2 duration-300 delay-75">
                  <label className="block text-[10px] font-extrabold uppercase tracking-[0.15em] mb-2 px-1" style={{ color: 'rgba(148,163,184,0.8)' }}>
                    Your Name
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      required
                      type="text"
                      placeholder="Rahul Sharma"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl text-white placeholder-slate-600 outline-none transition-all font-medium text-sm"
                      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                      onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.6)'; e.target.style.background = 'rgba(99,102,241,0.08)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.07)'; }}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-[0.15em] mb-2 px-1" style={{ color: 'rgba(148,163,184,0.8)' }}>
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  required
                  type="email"
                  placeholder="admin@gymvault.com"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-white placeholder-slate-600 outline-none transition-all font-medium text-sm"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.6)'; e.target.style.background = 'rgba(99,102,241,0.08)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.07)'; }}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-[0.15em] mb-2 px-1" style={{ color: 'rgba(148,163,184,0.8)' }}>
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  required
                  type="password"
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-white placeholder-slate-600 outline-none transition-all font-medium text-sm"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.6)'; e.target.style.background = 'rgba(99,102,241,0.08)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.07)'; }}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              disabled={loading}
              className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest text-white transition-all mt-2 flex items-center justify-center gap-2 ${
                loading ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90 active:scale-[0.98]'
              }`}
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                boxShadow: '0 8px 32px rgba(99,102,241,0.45)'
              }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  {isRegistering ? 'Create GymVault' : 'Enter System'} <ArrowRight size={16} />
                </>
              )}
            </button>

            <div className="pt-5 text-center">
              <button
                type="button"
                onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {isRegistering ? "Already have an account? Sign In" : "New gym? Register here"}
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-slate-600 text-xs mt-6 font-medium">
          Authorized Personnel Only &nbsp;•&nbsp; GymVault v2.0
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
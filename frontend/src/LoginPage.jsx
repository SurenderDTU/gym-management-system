import React, { useState } from 'react';
import axios from 'axios';

function LoginPage({ setToken }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      
      // Save the token
      setToken(res.data.token);
      
      // Manually update the URL bar to /dashboard
      window.history.pushState({}, '', '/dashboard');
      
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Invalid Credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-[#0f172a] font-['Inter']">
      <div className="bg-white p-10 rounded-[24px] shadow-2xl w-full max-w-md border border-slate-200">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-[#0f172a] rounded-xl flex items-center justify-center text-white font-bold text-2xl mb-4">G</div>
          <h2 className="text-3xl font-black text-[#0f172a] tracking-tight">GymVault</h2>
          <p className="text-slate-400 text-sm font-medium mt-1">Management System Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-widest text-slate-500 mb-2 px-1">Email Address</label>
            <input 
              required
              type="email" 
              placeholder="admin@gymvault.com" 
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f172a]/10 focus:border-[#0f172a] transition-all"
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-widest text-slate-500 mb-2 px-1">Password</label>
            <input 
              required
              type="password" 
              placeholder="••••••••" 
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f172a]/10 focus:border-[#0f172a] transition-all"
              onChange={(e) => setPassword(e.target.value)} 
            />
          </div>

          <button 
            disabled={loading}
            className={`w-full bg-[#0f172a] text-white p-4 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-blue-900/20 mt-4 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Authenticating...' : 'Enter System →'}
          </button>
        </form>

        <p className="text-center text-slate-400 text-xs mt-8">
          Authorized Personnel Only • v1.0.4
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
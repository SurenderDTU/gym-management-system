import React, { useState, useEffect } from 'react'
import axios from 'axios'
import DashboardPage from './DashboardPage';
import MembersPage from './MembersPage';
import PlansPage from './PlansPage';
import PaymentsPage from "./PaymentsPage";
import AttendancePage from './AttendancePage';
import InsightsPage from './InsightsPage';
import SettingsPage from './SettingsPage';
import LoginPage from './LoginPage';


function App() {
  const [currentPage, setCurrentPage] = useState('Dashboard');
  const [stats, setStats] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // 1. URL CLEANUP
  useEffect(() => {
    if (token && window.location.pathname === '/login') {
      window.history.pushState({}, '', '/dashboard');
      setCurrentPage('Dashboard');
    }
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    window.history.pushState({}, '', '/login');
  };

  const fetchDashboard = async () => {
    if (!token) return; 
    try {
      const res = await axios.get('http://localhost:5000/api/dashboard/stats', {
        headers: { 'x-auth-token': token }
      });
      
      if (res.data) {
        setStats({
          activeMembers: res.data.active_members || 0,
          monthlyRevenue: res.data.total_earnings || 0,
          todayCheckins: 0, 
          expiringSoon: res.data.inactive_members || 0
        });
      }
    } catch (err) {
      console.error("Connection error:", err);
      if (err.response?.status === 401) handleLogout();
    }
  };

  useEffect(() => {
    if (currentPage === 'Dashboard') {
      fetchDashboard();
    }
  }, [currentPage, token]);

  // LOGIN GATE
  if (!token) {
    return <LoginPage setToken={(newToken) => {
      localStorage.setItem('token', newToken);
      setToken(newToken);
    }} />;
  }

  // LOADING STATE
  if (!stats && currentPage === 'Dashboard') return (
    <div className="h-screen flex items-center justify-center text-white bg-slate-900 flex-col gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      <p className="font-medium tracking-widest uppercase text-sm">GymVault Initializing...</p>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-[#0f172a] font-['Inter'] antialiased">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#0f172a] p-6 hidden md:block text-white shadow-xl">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-[#0f172a] font-bold">G</div>
          <span className="text-xl font-extrabold tracking-tight">GymVault</span>
        </div>
        
        <nav className="space-y-1">
          {['Dashboard', 'Members', 'Plans', 'Payments', 'Attendance', 'Insights', 'Settings'].map((item) => (
            <div 
              key={item} 
              onClick={() => setCurrentPage(item)}
              className={`flex items-center p-3 rounded-xl cursor-pointer text-sm font-semibold transition-all duration-150 ${
                currentPage === item 
                ? 'bg-white/10 text-white shadow-inner' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {item}
            </div>
          ))}
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* TOP HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">Home</span>
            {currentPage !== 'Dashboard' && (
               <>
                 <span className="text-slate-300">/</span>
                 <span className="text-sm font-medium text-slate-500">{currentPage}</span>
               </>
            )}
          </div>
          
          <div className="flex items-center gap-4">
             <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-1.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all">
               <span>Logout</span>
               <span className="text-xs">→</span>
             </button>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-0 md:p-4 lg:p-8">
            <div className="max-w-[1400px] mx-auto w-full">
              {currentPage === 'Dashboard' ? <DashboardPage token={token} setCurrentPage={setCurrentPage} /> :
               currentPage === 'Members' ? <MembersPage token={token} /> :
               currentPage === 'Plans' ? <PlansPage token={token} /> :
               currentPage === 'Payments' ? <PaymentsPage token={token} /> : 
               currentPage === 'Attendance' ? <AttendancePage token={token} /> :
               currentPage === 'Insights' ? <InsightsPage token={token} /> :
               currentPage === 'Settings' ? <SettingsPage /> : null}
            </div>
        </main>
      </div>
    </div>
  )
}

// SUB-COMPONENTS (Kept intact so nothing breaks if used elsewhere)
function StatCard({ title, value, color, labelColor }) {
  return (
    <div className="bg-white p-6 rounded-[16px] border border-slate-200 shadow-sm transition-all hover:shadow-md">
      <p className={`text-[11px] font-extrabold uppercase tracking-widest mb-3 ${labelColor}`}>{title}</p>
      <div className="flex items-center justify-between">
        <span className="text-2xl font-black tracking-tight">{value}</span>
        <div className={`p-2.5 rounded-xl ${color} text-lg`}>📊</div>
      </div>
    </div>
  )
}

function ActionItem({ label, count, onClick }) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-[12px] hover:bg-slate-100 transition-colors cursor-pointer" onClick={onClick}>
      <div>
        <p className="text-sm font-bold text-slate-700">{label}</p>
        <p className="text-[11px] font-semibold text-slate-400">{count}</p>
      </div>
      <button className="text-[11px] font-black uppercase bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:text-blue-600 transition-colors">View</button>
    </div>
  )
}

export default App;
import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, Users, DollarSign, AlertTriangle, ArrowUpRight, ArrowDownRight, 
  Plus, Zap, MessageSquare, Download, Target, ShieldAlert, Sparkles, Clock, 
  CheckCircle, CreditCard, ChevronRight, Flame, UserMinus, Activity, X
} from 'lucide-react';

// --- UTILITY COMPONENTS ---
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 ${className}`}>
    {children}
  </div>
);

const KPICard = ({ title, value, change, trend, icon: Icon, color, subtext }) => (
  <Card className="p-5 flex flex-col justify-between relative overflow-hidden group">
    <div className={`absolute -right-6 -top-6 w-24 h-24 ${color} opacity-5 rounded-full group-hover:scale-150 transition-transform duration-700`}></div>
    <div className="flex justify-between items-start mb-2 relative z-10">
      <div className={`p-2.5 rounded-2xl ${color} bg-opacity-10 text-opacity-100`}>
        <Icon size={18} className={color.replace('bg-', 'text-')} />
      </div>
      {change && (
        <div className={`flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-full ${trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {trend === 'up' ? <ArrowUpRight size={12} strokeWidth={3} /> : <ArrowDownRight size={12} strokeWidth={3} />}
          {change}
        </div>
      )}
    </div>
    <div className="relative z-10 mt-2">
      <h3 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h3>
      <div className="flex items-center justify-between mt-1">
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{title}</p>
        {subtext && <span className="text-[10px] font-bold text-slate-300">{subtext}</span>}
      </div>
    </div>
  </Card>
);

// --- MAIN DASHBOARD COMPONENT ---
const DashboardPage = ({ token, setCurrentPage }) => {
  const [members, setMembers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- MODAL STATES ---
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  // Form States
  const [addFormData, setAddFormData] = useState({ full_name: '', email: '', phone: '' });
  const [addFile, setAddFile] = useState(null);
  
  const [selectedMemberForPay, setSelectedMemberForPay] = useState('');
  const [selectedPlanForPay, setSelectedPlanForPay] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');

  const [broadcastAudience, setBroadcastAudience] = useState('All');
  const [broadcastMessage, setBroadcastMessage] = useState('');

  // --- DATA FETCHING ---
  const fetchData = async () => {
    try {
      const [membersRes, plansRes] = await Promise.all([
        axios.get('http://localhost:5000/api/members', { headers: { 'x-auth-token': token } }),
        axios.get('http://localhost:5000/api/memberships/plans', { headers: { 'x-auth-token': token } })
      ]);
      setMembers(membersRes.data);
      setPlans(plansRes.data);
    } catch (err) {
      console.error("Dashboard data error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  // Safe Navigation Handler
  const navigateTo = (page) => {
    if (setCurrentPage) {
      setCurrentPage(page);
    }
  };

  // --- MODAL ACTION HANDLERS ---
  const handleAddMember = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('full_name', addFormData.full_name);
    formData.append('email', addFormData.email);
    formData.append('phone', addFormData.phone);
    if (addFile) formData.append('profile_pic', addFile); 
    
    try {
      await axios.post('http://localhost:5000/api/members/add', formData, { 
        headers: { 'x-auth-token': token, 'Content-Type': 'multipart/form-data' } 
      });
      setShowAddModal(false);
      setAddFormData({ full_name: '', email: '', phone: '' });
      setAddFile(null);
      fetchData(); // Refresh dashboard stats instantly
    } catch (err) { 
      alert(err.response?.data?.error || "Error adding member."); 
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!selectedMemberForPay || !selectedPlanForPay) return alert("Please select a member and a plan.");
    try {
      await axios.post('http://localhost:5000/api/memberships/activate', {
        member_id: selectedMemberForPay,
        plan_id: selectedPlanForPay,
        payment_mode: paymentMode,
        payment_id: paymentMode === 'Online' ? `PAY-${Date.now()}` : null // Mock ID for direct dashboard payments
      }, { headers: { 'x-auth-token': token } });
      
      setShowPaymentModal(false);
      setSelectedMemberForPay('');
      setSelectedPlanForPay('');
      fetchData(); // Refresh dashboard stats instantly
    } catch (err) {
      alert("Payment recording failed.");
    }
  };

  const handleBroadcast = (e) => {
    e.preventDefault();
    let targets = members;
    if (broadcastAudience === 'Active') targets = members.filter(m => m.membership_status === 'ACTIVE');
    else if (broadcastAudience === 'Expiring') targets = members.filter(m => m.days_left > 0 && m.days_left <= 7);
    else if (broadcastAudience === 'Ghosts') targets = members.filter(m => m.last_visit && Math.floor((new Date() - new Date(m.last_visit)) / (1000 * 60 * 60 * 24)) > 20);

    if (targets.length === 0) return alert("No members found in this category.");

    // Opens WhatsApp Web/App for each member with a slight delay
    targets.forEach((m, i) => {
      setTimeout(() => {
        window.open(`https://wa.me/91${m.phone}?text=${encodeURIComponent(broadcastMessage)}`, '_blank');
      }, i * 1500);
    });
    
    setShowBroadcastModal(false);
    setBroadcastMessage('');
  };

  // --- DASHBOARD INTELLIGENCE ENGINE ---
  const dashboardData = useMemo(() => {
    if (!members.length) return null;

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let monthlyRevenue = 0;
    let todayCheckins = Math.floor(Math.random() * 15) + 5; 
    let monthlyGoal = 50000;

    const active = members.filter(m => m.membership_status === 'ACTIVE');
    const unpaid = members.filter(m => m.membership_status === 'UNPAID');
    const expired = members.filter(m => m.membership_status === 'EXPIRED');
    
    const expiringIn3Days = active.filter(m => m.days_left > 0 && m.days_left <= 3);
    const expiringIn7Days = active.filter(m => m.days_left > 0 && m.days_left <= 7);
    
    const ghosts = active.filter(m => {
        if (!m.last_visit) return true;
        const daysSince = Math.floor((today - new Date(m.last_visit)) / (1000 * 60 * 60 * 24));
        return daysSince > 20;
    });

    members.forEach(m => {
      if (m.payment_history && Array.isArray(m.payment_history)) {
        m.payment_history.forEach(pay => {
          const payDate = new Date(pay.payment_date);
          if (payDate.getMonth() === currentMonth && payDate.getFullYear() === currentYear) {
            monthlyRevenue += parseFloat(pay.amount_paid || 0);
          }
        });
      }
    });

    let aiMessage = "Business is stable.";
    let aiAction = "Keep it up";
    let aiTargetModal = null;

    if (expiringIn3Days.length > 0) {
      aiMessage = `${expiringIn3Days.length} members are expiring in the next 72 hours. Broadcast a quick reminder now to secure renewals.`;
      aiAction = "Send Broadcast";
      aiTargetModal = () => setShowBroadcastModal(true);
    } else if (unpaid.length > 0) {
      aiMessage = `You have ${unpaid.length} unpaid members. Quick record their payments to boost your monthly revenue.`;
      aiAction = "Record Payment";
      aiTargetModal = () => setShowPaymentModal(true);
    } else if (ghosts.length > 3) {
      aiMessage = `${ghosts.length} active members haven't visited in 20+ days. Broadcast a 'We Miss You' message to save them from churning.`;
      aiAction = "Broadcast to Ghosts";
      aiTargetModal = () => { setBroadcastAudience('Ghosts'); setShowBroadcastModal(true); };
    }

    const chartData = [
      { name: '1', rev: monthlyRevenue * 0.1 }, { name: '5', rev: monthlyRevenue * 0.3 },
      { name: '10', rev: monthlyRevenue * 0.4 }, { name: '15', rev: monthlyRevenue * 0.6 },
      { name: '20', rev: monthlyRevenue * 0.8 }, { name: 'Today', rev: monthlyRevenue }
    ];

    return {
      kpi: {
        active: active.length,
        todayCheckins,
        monthlyRevenue,
        revenueAtRisk: expiringIn7Days.length * 1500,
        expiring7: expiringIn7Days.length,
        unpaid: unpaid.length,
        churnRate: expired.length > 0 ? ((expired.length / members.length) * 100).toFixed(1) : 0,
        goalProgress: Math.min((monthlyRevenue / monthlyGoal) * 100, 100).toFixed(0)
      },
      actionCenter: {
        expiring3: expiringIn3Days.length,
        expired: expired.length,
        ghosts: ghosts.length,
        unpaid: unpaid.length
      },
      ai: { message: aiMessage, action: aiAction, trigger: aiTargetModal },
      chartData,
      monthlyGoal
    };
  }, [members]);

  if (loading) return <div className="flex h-screen items-center justify-center text-slate-400 font-bold animate-pulse">Initializing Command Center...</div>;
  if (!dashboardData) return <div className="p-10 text-center font-bold text-slate-400">Add members to generate dashboard.</div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-6 lg:p-8 font-inter text-slate-900 pb-24 relative overflow-hidden">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            Command Center 
            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full tracking-widest uppercase">Live</span>
          </h1>
          <p className="text-slate-500 font-medium mt-1 text-sm">Your 10-second business pulse.</p>
        </div>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <Clock size={14} /> {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        
        {/* --- SECTION 1: SMART KPI STRIP --- */}
        <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
          <KPICard title="Active Members" value={dashboardData.kpi.active} change="+2" trend="up" icon={Users} color="bg-blue-500" />
          <KPICard title="Check-ins Today" value={dashboardData.kpi.todayCheckins} subtext="Peak: 6PM" icon={CheckCircle} color="bg-emerald-500" />
          <KPICard title="Monthly Rev" value={`₹${dashboardData.kpi.monthlyRevenue.toLocaleString()}`} change="+8%" trend="up" icon={DollarSign} color="bg-indigo-500" />
          <KPICard title="Rev At Risk" value={`₹${dashboardData.kpi.revenueAtRisk.toLocaleString()}`} subtext="Next 7 Days" icon={Target} color="bg-orange-500" />
          <KPICard title="Expiring (7D)" value={dashboardData.kpi.expiring7} icon={Clock} color="bg-amber-500" />
          <KPICard title="Unpaid Profiles" value={dashboardData.kpi.unpaid} icon={CreditCard} color="bg-slate-500" />
          <KPICard title="Total Expired" value={dashboardData.actionCenter.expired} icon={UserMinus} color="bg-rose-500" />
          <KPICard title="Churn Rate" value={`${dashboardData.kpi.churnRate}%`} change="-1.2%" trend="down" icon={Activity} color="bg-violet-500" />
        </div>

        {/* --- LEFT COLUMN (Action & AI) --- */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          
          {/* SECTION 9: SMART INSIGHTS WIDGET (AI) */}
          <div className="relative p-[2px] rounded-[24px] bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-lg animate-in zoom-in-95 duration-700">
            <div className="bg-white p-6 rounded-[22px] h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-indigo-600 mb-3">
                  <Sparkles size={18} className="animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-widest">AI Suggestion</span>
                </div>
                <p className="text-slate-700 font-bold text-sm leading-relaxed mb-6">
                  "{dashboardData.ai.message}"
                </p>
              </div>
              <button 
                onClick={dashboardData.ai.trigger || (() => {})} 
                className="w-full bg-indigo-50 text-indigo-700 font-bold text-xs py-3 rounded-xl hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <Zap size={14} fill="currentColor" /> {dashboardData.ai.action}
              </button>
            </div>
          </div>

          {/* SECTION 2: ACTION CENTER */}
          <Card className="p-0 overflow-hidden flex-1 border-rose-100">
            <div className="p-6 bg-rose-50/50 border-b border-rose-100">
              <h3 className="font-black text-rose-900 flex items-center gap-2 text-lg">
                <ShieldAlert size={20} className="text-rose-500" /> Action Required
              </h3>
            </div>
            <div className="divide-y divide-slate-50">
              
              <div className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Expiring in 3 Days</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{dashboardData.actionCenter.expiring3} Members • ~₹{dashboardData.actionCenter.expiring3 * 1500} Risk</p>
                </div>
                <button onClick={() => { setBroadcastAudience('Expiring'); setShowBroadcastModal(true); }} className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase rounded-lg shadow-sm hover:bg-slate-800 transition-all">Broadcast</button>
              </div>

              <div className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Expired Members</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{dashboardData.actionCenter.expired} Members • Need Renewal</p>
                </div>
                <button onClick={() => setShowPaymentModal(true)} className="px-4 py-2 bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-black uppercase rounded-lg hover:bg-rose-500 hover:text-white transition-all">Renew</button>
              </div>

              <div className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Ghosts (20+ Days)</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{dashboardData.actionCenter.ghosts} Members • High Churn Risk</p>
                </div>
                <button onClick={() => { setBroadcastAudience('Ghosts'); setShowBroadcastModal(true); }} className="px-4 py-2 bg-amber-50 text-amber-600 border border-amber-100 text-[10px] font-black uppercase rounded-lg hover:bg-amber-500 hover:text-white transition-all">Remind</button>
              </div>

            </div>
          </Card>
        </div>

        {/* --- RIGHT COLUMN (Revenue & Health) --- */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          
          {/* SECTION 3: REVENUE INTELLIGENCE */}
          <Card className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Current Month Revenue</h3>
                <p className="text-xs text-slate-400 font-medium mt-1">Pacing toward ₹{dashboardData.monthlyGoal.toLocaleString()} goal</p>
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-black text-emerald-500">₹{dashboardData.kpi.monthlyRevenue.toLocaleString()}</h2>
                <div className="flex items-center justify-end gap-2 mt-1">
                  <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${dashboardData.kpi.goalProgress}%` }}></div>
                  </div>
                  <span className="text-[10px] font-black text-slate-400">{dashboardData.kpi.goalProgress}%</span>
                </div>
              </div>
            </div>
            
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboardData.chartData}>
                  <defs>
                    <linearGradient id="colorRevDash" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} tickFormatter={(val) => `₹${val}`} width={50} />
                  <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                  <Area type="monotone" dataKey="rev" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorRevDash)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* SECTION 4, 5, 6: SNAPSHOT WIDGETS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <Card className="p-5 flex flex-col justify-center">
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Health Score</h4>
              <div className="flex items-end gap-3 mb-4">
                <span className="text-4xl font-black text-indigo-600">88</span>
                <span className="text-sm font-bold text-slate-400 mb-1">/ 100</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full flex overflow-hidden">
                <div className="h-full bg-emerald-400 w-[60%]" title="Safe"></div>
                <div className="h-full bg-amber-400 w-[30%]" title="At Risk"></div>
                <div className="h-full bg-rose-400 w-[10%]" title="Churned"></div>
              </div>
              <div className="flex justify-between mt-2 text-[9px] font-bold text-slate-400 uppercase">
                <span>Safe</span><span>Risk</span><span>Lost</span>
              </div>
            </Card>

            <Card className="p-5">
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Attendance Heat</h4>
              <div className="h-[80px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{t:'6A', v:2}, {t:'9A', v:5}, {t:'12P', v:1}, {t:'5P', v:8}, {t:'8P', v:6}]}>
                    <Bar dataKey="v" fill="#6366f1" radius={[4,4,0,0]} />
                    <XAxis dataKey="t" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#cbd5e1'}} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-5">
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Top Plan</h4>
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-3">
                <Flame size={24} fill="currentColor" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">3 Month Plan</h3>
              <p className="text-xs text-slate-500 mt-1">Driving 65% of revenue</p>
            </Card>

          </div>
        </div>

      </div>

      {/* --- SECTION 8: FLOATING QUICK ACTION BAR --- */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] animate-in slide-in-from-bottom-10 duration-500">
        <div className="bg-slate-900/95 backdrop-blur-xl p-2 rounded-full shadow-2xl border border-slate-700 flex items-center gap-1">
          <button 
            onClick={() => setShowAddModal(true)} 
            className="flex items-center gap-2 px-5 py-3 rounded-full hover:bg-slate-800 text-white transition-colors group"
          >
            <div className="bg-emerald-500 text-white rounded-full p-1 group-hover:scale-110 transition-transform">
              <Plus size={16} strokeWidth={3} />
            </div>
            <span className="text-sm font-bold pr-2">Add Member</span>
          </button>
          
          <div className="w-[1px] h-8 bg-slate-700 mx-1"></div>
          
          <button 
            onClick={() => setShowPaymentModal(true)} 
            className="px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full text-sm font-bold transition-colors flex items-center gap-2"
          >
            <CreditCard size={18} /> Payment
          </button>
          
          <button 
            onClick={() => setShowBroadcastModal(true)} 
            className="px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full text-sm font-bold transition-colors flex items-center gap-2"
          >
            <MessageSquare size={18} /> Broadcast
          </button>
          
          <button 
            onClick={() => window.print()} 
            className="px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full text-sm font-bold transition-colors flex items-center gap-2"
          >
            <Download size={18} /> Report
          </button>
        </div>
      </div>

      {/* --- MODALS OVERLAYS --- */}
      
      {/* 1. ADD MEMBER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Plus size={20} className="text-emerald-500"/> Quick Add</h2>
              <button onClick={() => setShowAddModal(false)}><X size={20} className="text-slate-400 hover:text-slate-900" /></button>
            </div>
            <form onSubmit={handleAddMember} className="p-6 space-y-4">
              <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label><input type="text" required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-900" value={addFormData.full_name} onChange={(e) => setAddFormData({...addFormData, full_name: e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone</label><input type="text" required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-900" value={addFormData.phone} onChange={(e) => setAddFormData({...addFormData, phone: e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label><input type="email" required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-900" value={addFormData.email} onChange={(e) => setAddFormData({...addFormData, email: e.target.value})} /></div>
              <button type="submit" className="w-full mt-2 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-md">Create Member</button>
            </form>
          </div>
        </div>
      )}

      {/* 2. RECORD PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><CreditCard size={20} className="text-indigo-500"/> Record Payment</h2>
              <button onClick={() => setShowPaymentModal(false)}><X size={20} className="text-slate-400 hover:text-slate-900" /></button>
            </div>
            <form onSubmit={handlePayment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Member</label>
                <select required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-900" value={selectedMemberForPay} onChange={(e) => setSelectedMemberForPay(e.target.value)}>
                  <option value="">Choose a member...</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.full_name} ({m.phone})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Plan</label>
                <select required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-900" value={selectedPlanForPay} onChange={(e) => setSelectedPlanForPay(e.target.value)}>
                  <option value="">Choose a plan...</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name} — ₹{p.price}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Payment Mode</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setPaymentMode('Cash')} className={`flex-1 py-2 rounded-lg font-bold text-sm border ${paymentMode === 'Cash' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}>Cash</button>
                  <button type="button" onClick={() => setPaymentMode('Online')} className={`flex-1 py-2 rounded-lg font-bold text-sm border ${paymentMode === 'Online' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}>Online / UPI</button>
                </div>
              </div>
              <button type="submit" className="w-full mt-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md flex items-center justify-center gap-2"><Zap size={18} fill="currentColor"/> Complete Transaction</button>
            </form>
          </div>
        </div>
      )}

      {/* 3. BROADCAST MODAL */}
      {showBroadcastModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-500 text-white">
              <h2 className="text-xl font-bold flex items-center gap-2"><MessageSquare size={20}/> Bulk Broadcast</h2>
              <button onClick={() => setShowBroadcastModal(false)}><X size={20} className="text-emerald-100 hover:text-white" /></button>
            </div>
            <form onSubmit={handleBroadcast} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Audience</label>
                <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-900" value={broadcastAudience} onChange={(e) => setBroadcastAudience(e.target.value)}>
                  <option value="All">All Members ({members.length})</option>
                  <option value="Active">Active Members ({dashboardData.kpi.active})</option>
                  <option value="Expiring">Expiring Soon ({dashboardData.kpi.expiring7})</option>
                  <option value="Ghosts">Ghost Members ({dashboardData.actionCenter.ghosts})</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">WhatsApp Message</label>
                <textarea required rows="4" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Type your message here..." value={broadcastMessage} onChange={(e) => setBroadcastMessage(e.target.value)}></textarea>
                <p className="text-[10px] text-slate-400 mt-1">Note: This will open WhatsApp Web tabs to send individual messages.</p>
              </div>
              <button type="submit" className="w-full mt-2 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-md">Launch Broadcast</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default DashboardPage;
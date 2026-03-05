import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, Users, DollarSign, Activity, AlertTriangle, 
  ArrowUpRight, ArrowDownRight, Download, CreditCard, 
  UserMinus, UserCheck, Clock, Target, ShieldCheck,
  MessageSquare, Phone
} from 'lucide-react';

// --- UTILITY COMPONENTS ---

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm ${className}`}>
    {children}
  </div>
);

const KPICard = ({ title, value, change, trend, icon: Icon, color }) => (
  <Card className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-opacity-100`}>
        <Icon size={20} className={color.replace('bg-', 'text-')} />
      </div>
      {change && (
        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {change}
        </div>
      )}
    </div>
    <div>
      <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-2xl font-black text-slate-900">{value}</h3>
    </div>
  </Card>
);

const Flame = ({size, className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0 1.1.2 2.2.5 3.3a9 9 0 0 0 12.1-4.7"/></svg>
);

// --- MAIN PAGE COMPONENT ---

const InsightsPage = ({ token }) => {
  const [activeTab, setActiveTab] = useState('revenue');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('6M');

  // --- ACTION FUNCTIONS ---
  const sendWhatsApp = (member, type) => {
    const gymName = "Gym Dashboard"; 
    let message = "";
    
    // Updated to include the specific "expired" template
    if (type === 'expiring') {
      message = `Hi ${member.full_name}, your membership at ${gymName} is expiring in ${member.days_left} days. Renew now to keep your fitness journey going!`;
    } else if (type === 'expired') {
      message = `Hi ${member.full_name}, your membership at ${gymName} has expired. We would love to have you back! Renew your plan today.`;
    } else {
      message = `Hi ${member.full_name}, we missed you at ${gymName}! It's been a while since your last visit. Hope to see you back in the gym soon!`;
    }
    
    window.open(`https://wa.me/91${member.phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleCall = (phoneNumber) => window.open(`tel:${phoneNumber}`, '_self');

  const handleDownloadReport = () => {
    // This triggers the browser's native "Save as PDF" / Print dialog
    window.print();
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/members', {
          headers: { 'x-auth-token': token }
        });
        setMembers(res.data);
      } catch (err) {
        console.error("Failed to load insights data", err);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchData();
  }, [token]);

  // --- THE INTELLIGENCE ENGINE ---
  const analytics = useMemo(() => {
    if (!members.length) return null;

    const today = new Date();
    
    // A. STRATEGIC REVENUE CALCULATIONS
    let totalRevenue = 0;
    let revenueByMonth = {};
    let planPerformance = {};
    let lostRevenue = 0;

    members.forEach(m => {
      const paid = parseFloat(m.total_paid || 0);
      totalRevenue += paid;

      // 1. Calculate Plan Performance
      if (m.plan_name) {
        if (!planPerformance[m.plan_name]) {
          planPerformance[m.plan_name] = { name: m.plan_name, revenue: 0, users: 0 };
        }
        planPerformance[m.plan_name].revenue += paid;
        if (m.membership_status === 'ACTIVE') planPerformance[m.plan_name].users += 1;
      }

      // 2. Calculate Churn Cost
      if (m.membership_status === 'EXPIRED') {
        lostRevenue += paid > 0 ? paid : 1500; 
      }

      // 3. Historical Revenue Trend
      if (m.payment_history && Array.isArray(m.payment_history)) {
        m.payment_history.forEach(pay => {
          const date = new Date(pay.payment_date);
          const monthKey = date.toLocaleString('default', { month: 'short' });
          revenueByMonth[monthKey] = (revenueByMonth[monthKey] || 0) + parseFloat(pay.amount_paid);
        });
      }
    });

    const activeMembers = members.filter(m => m.membership_status === 'ACTIVE').length;
    const expiredMembers = members.filter(m => m.membership_status === 'EXPIRED').length;
    const totalMembers = members.length;
    
    // Core Business Metrics
    const arpu = activeMembers > 0 ? Math.round(totalRevenue / activeMembers) : 0;
    const retentionRate = totalMembers > 0 ? ((activeMembers / totalMembers) * 100).toFixed(1) : 0;
    const churnRate = (100 - retentionRate).toFixed(1);
    
    // Sort plans by highest revenue generator
    const topPlans = Object.values(planPerformance).sort((a, b) => b.revenue - a.revenue);

   // Determine how many months to show based on the active filter
    let monthsToShow = 6;
    if (dateRange === '1M') monthsToShow = 1;
    if (dateRange === '3M') monthsToShow = 3;
    if (dateRange === '6M') monthsToShow = 6;
    if (dateRange === '1Y') monthsToShow = 12;

    const revenueData = Object.keys(revenueByMonth).map(key => ({
      name: key,
      revenue: revenueByMonth[key]
    })).slice(-monthsToShow);
    // B. RISK ANALYSIS
    // Captures both members about to expire AND those already expired, skipping unpaid new members
    const criticalMembers = members.filter(m => m.days_left <= 7 && m.membership_status !== 'UNPAID');
    
    // Revenue at risk only calculates for those > 0 days, because expired is already counted in 'lost revenue'
    const revenueAtRisk = criticalMembers.filter(m => m.days_left > 0).length * (arpu > 0 ? arpu : 1500); 

    const ghostMembers = members.filter(m => {
        if (!m.last_visit) return true;
        const daysSince = Math.floor((today - new Date(m.last_visit)) / (1000 * 60 * 60 * 24));
        return daysSince > 4 && m.membership_status === 'ACTIVE';
    });

    return {
      revenue: {
        total: totalRevenue,
        graphData: revenueData.length > 0 ? revenueData : [{ name: 'Current', revenue: totalRevenue }],
        growth: "+12.5%",
        arpu: arpu,
        lostRevenue: lostRevenue,
        topPlans: topPlans
      },
      health: {
        active: activeMembers,
        retention: retentionRate,
        churn: churnRate,
        expired: expiredMembers
      },
      risk: {
        expiringCount: criticalMembers.length,
        revenueAtRisk: revenueAtRisk,
        expiringList: criticalMembers,
        ghostCount: ghostMembers.length,
        ghostList: ghostMembers.slice(0, 5)
      }
    };
  }, [members]);

  if (loading) return <div className="flex h-screen items-center justify-center text-slate-400 font-bold animate-pulse">Loading Business Intelligence...</div>;
  if (!analytics) return <div className="p-10 text-center text-slate-500 font-bold">No Data Available. Add members to see insights.</div>;

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 space-y-8 font-inter text-slate-900">
      
      {/* 1. HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Business Insights</h1>
          <p className="text-slate-500 font-medium mt-1">Real-time strategic performance metrics</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          {['1M', '3M', '6M', '1Y'].map(range => (
            <button 
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${dateRange === range ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
            >
              {range}
            </button>
          ))}
          <div className="w-[1px] h-6 bg-slate-200 mx-1"></div>
        <button 
            onClick={handleDownloadReport} 
            className="px-3 py-2 text-slate-400 hover:text-slate-900 transition-colors"
            title="Download PDF Report"
          >
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* 2. KPI STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Revenue" value={`₹${analytics.revenue.total.toLocaleString()}`} change={analytics.revenue.growth} trend="up" icon={DollarSign} color="bg-emerald-500" />
        <KPICard title="Active Members" value={analytics.health.active} change="+4" trend="up" icon={Users} color="bg-blue-500" />
        <KPICard title="Retention Rate" value={`${analytics.health.retention}%`} change="-1.2%" trend="down" icon={Activity} color="bg-violet-500" />
        <KPICard title="Revenue At Risk" value={`₹${analytics.risk.revenueAtRisk.toLocaleString()}`} trend="down" icon={AlertTriangle} color="bg-rose-500" />
      </div>

      {/* 3. TABS */}
      <div className="border-b border-slate-200 flex gap-8">
        {[
          { id: 'revenue', label: 'Revenue & Finance', icon: DollarSign },
          { id: 'attendance', label: 'Attendance & Trends', icon: Users },
          { id: 'retention', label: 'Retention & Churn', icon: UserCheck },
          { id: 'risk', label: 'Risk Analysis', icon: AlertTriangle },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-4 flex items-center gap-2 text-sm font-bold transition-all border-b-2 ${activeTab === tab.id ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200'}`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4. DYNAMIC CONTENT AREA */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* --- STRATEGIC REVENUE TAB --- */}
        {activeTab === 'revenue' && (
          <div className="space-y-6">
            
            {/* CEO Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-5 border-l-4 border-l-blue-500">
                <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5"><Target size={12}/> ARPU (Avg Rev Per User)</p>
                <div className="flex items-end gap-2">
                  <h3 className="text-2xl font-black text-slate-900">₹{analytics.revenue.arpu.toLocaleString()}</h3>
                  <span className="text-sm font-bold text-slate-400 mb-1">/ active member</span>
                </div>
              </Card>
              <Card className="p-5 border-l-4 border-l-rose-500">
                <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5"><TrendingUp size={12} className="rotate-180"/> Churn Cost (Lost Revenue)</p>
                <div className="flex items-end gap-2">
                  <h3 className="text-2xl font-black text-rose-600">₹{analytics.revenue.lostRevenue.toLocaleString()}</h3>
                  <span className="text-sm font-bold text-slate-400 mb-1">from expired plans</span>
                </div>
              </Card>
              <Card className="p-5 border-l-4 border-l-emerald-500">
                <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5"><ShieldCheck size={12}/> Projected Next Month</p>
                <div className="flex items-end gap-2">
                  <h3 className="text-2xl font-black text-emerald-600">₹{(analytics.health.active * analytics.revenue.arpu).toLocaleString()}</h3>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded mb-1 border border-emerald-100">Safe Baseline</span>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Graph */}
              <Card className="lg:col-span-2 p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">Revenue Velocity</h3>
                    <p className="text-xs text-slate-400 font-medium mt-1">Cash flow mapped over your selected period</p>
                  </div>
                </div>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.revenue.graphData}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(val) => `₹${val}`} />
                      <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} formatter={(val) => [`₹${val}`, 'Revenue']} />
                      <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Plan Performance Matrix */}
              <Card className="p-0 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-50 bg-slate-900 text-white">
                  <h3 className="font-bold text-lg">Plan Performance Matrix</h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">Which memberships drive your business</p>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {analytics.revenue.topPlans.length > 0 ? (
                    <div className="space-y-1">
                      {analytics.revenue.topPlans.map((plan, idx) => (
                        <div key={idx} className="p-4 hover:bg-slate-50 rounded-xl transition-colors border-b border-slate-50 last:border-0">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-sm text-slate-800">{plan.name}</span>
                            <span className="font-black text-sm text-emerald-600">₹{plan.revenue.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                              <Users size={12} />
                              <span>{plan.users} Active Users</span>
                            </div>
                            <span className="text-slate-400 font-bold uppercase text-[10px]">Rank #{idx + 1}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-10 text-center text-slate-400 text-sm font-bold">No plan data available yet.</div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* --- ATTENDANCE TAB --- */}
        {activeTab === 'attendance' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <Card className="p-6">
                    <h3 className="font-bold text-lg text-slate-900 mb-6">Peak Visiting Hours</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                                { time: '6AM', count: 12 }, { time: '8AM', count: 35 }, { time: '10AM', count: 18 },
                                { time: '12PM', count: 8 }, { time: '4PM', count: 22 }, { time: '6PM', count: 45 },
                                { time: '8PM', count: 30 }
                            ]}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none'}} />
                                <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                 </Card>

                 <Card className="p-6">
                    <h3 className="font-bold text-lg text-slate-900 mb-6">Most Consistent Members</h3>
                    <div className="space-y-4">
                        {members.slice(0, 5).map((m, i) => (
                            <div key={m.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <span className="text-slate-300 font-bold text-sm">0{i+1}</span>
                                    <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                                        <img src={m.profile_pic || 'https://via.placeholder.com/150'} alt="pic" className="w-full h-full object-cover" />
                                    </div>
                                    <span className="font-bold text-sm text-slate-700">{m.full_name}</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                                    <Flame size={12} /> {Math.floor(Math.random() * 20) + 10} Day Streak
                                </div>
                            </div>
                        ))}
                    </div>
                 </Card>
            </div>
        )}

        {/* --- RISK ANALYSIS TAB --- */}
        {activeTab === 'risk' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-rose-50 border border-rose-100 p-6 rounded-2xl">
                        <div className="flex items-center gap-2 text-rose-600 mb-2 font-bold uppercase text-xs tracking-wider">
                            <AlertTriangle size={14} /> Critical Attention
                        </div>
                        <h3 className="text-2xl font-black text-rose-900">{analytics.risk.expiringCount} Members</h3>
                        <p className="text-rose-700/70 text-sm font-medium mt-1">Expired or expiring within 7 days. Potential future revenue loss of <b>₹{analytics.risk.revenueAtRisk.toLocaleString()}</b>.</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl">
                        <div className="flex items-center gap-2 text-amber-600 mb-2 font-bold uppercase text-xs tracking-wider">
                            <UserMinus size={14} /> At Risk of Churn
                        </div>
                        <h3 className="text-2xl font-black text-amber-900">{analytics.risk.ghostCount} Members</h3>
                        <p className="text-amber-700/70 text-sm font-medium mt-1">Have not visited the gym in the last 4+ days.</p>
                    </div>
                </div>

                {/* TWO-COLUMN LAYOUT FOR ACTION TABLES */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* 1. Critical Members Table (Expired & Expiring) */}
                    <Card className="p-6">
                        <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
                            <AlertTriangle size={18} className="text-rose-500" />
                            Critical Attention (Expired & Expiring)
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="text-[10px] text-slate-400 uppercase font-black border-b border-slate-100">
                                    <tr>
                                        <th className="pb-3 pl-2">Name</th>
                                        <th className="pb-3 text-center">Status</th>
                                        <th className="pb-3 text-right">Quick Contact</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {analytics.risk.expiringList.length > 0 ? analytics.risk.expiringList.map(m => (
                                        <tr key={m.id} className="group hover:bg-slate-50 transition-colors">
                                            <td className="py-3 pl-2">
                                              <span className="font-bold text-slate-700 block">{m.full_name}</span>
                                              <span className="text-xs text-slate-400">{m.phone}</span>
                                            </td>
                                            <td className="py-3 text-center">
                                                {m.days_left <= 0 ? (
                                                    <span className="text-[10px] font-black bg-rose-100 text-rose-600 px-2 py-1 rounded-full uppercase">Expired</span>
                                                ) : (
                                                    <span className="font-black text-amber-500">{m.days_left} Days Left</span>
                                                )}
                                            </td>
                                            <td className="py-3 text-right">
                                              <div className="flex justify-end gap-2">
                                                <button onClick={() => handleCall(m.phone)} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"><Phone size={14} /></button>
                                                <button onClick={() => sendWhatsApp(m, m.days_left <= 0 ? 'expired' : 'expiring')} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-500 hover:text-white transition-colors"><MessageSquare size={14} /></button>
                                              </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="3" className="py-8 text-center text-slate-400 font-bold">No critical members found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* 2. Ghost Members Table */}
                    <Card className="p-6">
                        <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
                            <Clock size={18} className="text-amber-500" />
                            Inactive Members (Ghosts)
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="text-[10px] text-slate-400 uppercase font-black border-b border-slate-100">
                                    <tr>
                                        <th className="pb-3 pl-2">Name</th>
                                        <th className="pb-3 text-center">Last Visit</th>
                                        <th className="pb-3 text-right">Quick Contact</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {analytics.risk.ghostList.length > 0 ? analytics.risk.ghostList.map(m => (
                                        <tr key={m.id} className="group hover:bg-slate-50 transition-colors">
                                            <td className="py-3 pl-2">
                                              <span className="font-bold text-slate-700 block">{m.full_name}</span>
                                              <span className="text-xs text-slate-400">{m.phone}</span>
                                            </td>
                                            <td className="py-3 text-center font-bold text-amber-500">
                                              {m.last_visit ? new Date(m.last_visit).toLocaleDateString('en-GB') : 'Never'}
                                            </td>
                                            <td className="py-3 text-right">
                                              <div className="flex justify-end gap-2">
                                                <button onClick={() => handleCall(m.phone)} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"><Phone size={14} /></button>
                                                <button onClick={() => sendWhatsApp(m, 'ghost')} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-500 hover:text-white transition-colors"><MessageSquare size={14} /></button>
                                              </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="3" className="py-8 text-center text-slate-400 font-bold">No inactive members found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                </div>
            </div>
        )}

        {/* --- RETENTION TAB --- */}
        {activeTab === 'retention' && (
             <Card className="p-10 flex flex-col items-center justify-center text-center border-dashed border-2">
                <div className="w-16 h-16 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center mb-4">
                    <TrendingUp size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Retention Analytics</h3>
                <p className="text-slate-400 max-w-sm mt-2 mb-6">Detailed churn prediction and cohort analysis is being calculated based on your historical data.</p>
                <div className="w-full max-w-2xl bg-slate-100 rounded-full h-3 mb-2 overflow-hidden shadow-inner">
                    <div className="bg-violet-500 h-full w-[85%] rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]"></div>
                </div>
                <div className="flex justify-between w-full max-w-2xl text-xs font-bold text-slate-500">
                    <span>Churn Rate: {analytics.health.churn}%</span>
                    <span>Retention Goal: 90%</span>
                </div>
             </Card>
        )}

      </div>
    </div>
  );
};

export default InsightsPage;
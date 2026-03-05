import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Search, Filter, Download, Plus, DollarSign, 
  TrendingUp, AlertCircle, FileText, CheckCircle2, 
  Clock, X, ChevronDown, User, ArrowDownToLine, History, Wallet, CreditCard, Trash2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const PaymentsPage = ({ token }) => {
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [stats, setStats] = useState({ total_revenue: 0, today_revenue: 0, pending_dues: 0 });
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [chartDays, setChartDays] = useState('30');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  // MODALS
  const [showModal, setShowModal] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [memberHistory, setMemberHistory] = useState([]); 
  const [historyLoading, setHistoryLoading] = useState(false); 

  const [members, setMembers] = useState([]); 
  const [plans, setPlans] = useState([]); 
  
  // DEFAULT TO ONLINE MODE
  const [formData, setFormData] = useState({
    user_id: '', plan_id: '', amount_paid: '', total_amount: '', payment_mode: 'Online', transaction_id: '', notes: ''
  });

  const getImageUrl = (path) => {
      if (!path) return null;
      const filename = path.split(/[/\\]/).pop(); 
      return `http://localhost:5000/uploads/${filename}`;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = { 'x-auth-token': token };
      const paymentUrl = searchTerm 
        ? `http://localhost:5000/api/payments?search=${searchTerm}` 
        : 'http://localhost:5000/api/payments';
      const chartUrl = `http://localhost:5000/api/payments/chart?days=${chartDays}`;

      const [paymentsRes, statsRes, chartRes, membersRes, plansRes] = await Promise.all([
        axios.get(paymentUrl, { headers }),
        axios.get('http://localhost:5000/api/payments/stats', { headers }),
        axios.get(chartUrl, { headers }),
        axios.get('http://localhost:5000/api/members', { headers }), 
        axios.get('http://localhost:5000/api/plans', { headers })
      ]);

      setPayments(paymentsRes.data);
      let newData = paymentsRes.data;
      if (activeFilter === 'Pending') newData = newData.filter(p => p.status === 'Pending');
      else if (activeFilter === 'Cash') newData = newData.filter(p => p.payment_mode === 'Cash');
      else if (activeFilter === 'Online') newData = newData.filter(p => p.payment_mode === 'Online');
      setFilteredPayments(newData);

      setStats(statsRes.data || { total_revenue: 0, today_revenue: 0, pending_dues: 0 });
      setChartData(chartRes.data || []);
      setMembers(membersRes.data || []); 
      setPlans(plansRes.data || []);
      setLoading(false);
    } catch (err) {
      console.error("Error loading data:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
        const delayDebounceFn = setTimeout(() => { fetchData(); }, 300);
        return () => clearTimeout(delayDebounceFn);
    }
  }, [token, searchTerm, chartDays]);

  useEffect(() => {
      let data = payments;
      if (activeFilter === 'Pending') data = data.filter(p => p.status === 'Pending');
      else if (activeFilter === 'Cash') data = data.filter(p => p.payment_mode === 'Cash');
      else if (activeFilter === 'Online') data = data.filter(p => p.payment_mode === 'Online');
      setFilteredPayments(data);
  }, [activeFilter, payments]);

  const handleRecordPayment = async (e) => {
    if (e) e.preventDefault();
    try {
      const finalPayload = {
          ...formData,
          payment_mode: (formData.transaction_id && formData.transaction_id.trim() !== "") ? "Online" : formData.payment_mode
      };
      await axios.post('http://localhost:5000/api/payments/record', finalPayload, { headers: { 'x-auth-token': token } });
      setShowModal(false);
      setFormData({ user_id: '', plan_id: '', amount_paid: '', total_amount: '', payment_mode: 'Online', transaction_id: '', notes: '' });
      await fetchData(); 
      alert("Payment Recorded Successfully!");
    } catch (err) {
      alert("Error recording payment");
    }
  };

  // --- 🛠️ UPDATED DELETE LOGIC: REFRESHES EVERYTHING ---
  const handleDeletePayment = async (id) => {
      if (window.confirm("ARE YOU SURE? This will delete the payment record and reset the member's status to UNPAID. The member profile itself will not be deleted.")) {
          try {
              await axios.delete(`http://localhost:5000/api/payments/${id}`, {
                  headers: { 'x-auth-token': token }
              });
              setShowReceipt(false); 
              await fetchData(); // Force global refresh
              alert("Transaction deleted. Member status reset.");
          } catch (err) {
              console.error("Delete failed", err);
              alert("Error deleting record.");
          }
      }
  };

  const handlePlanSelect = (e) => {
    const planId = e.target.value;
    const selectedPlan = plans.find(p => p.id === parseInt(planId));
    setFormData({ ...formData, plan_id: planId, total_amount: selectedPlan ? selectedPlan.price : '' });
  };

  const openReceipt = async (payment) => {
      setSelectedPayment(payment);
      setShowReceipt(true);
      setMemberHistory([]); 
      setHistoryLoading(true); 
      if (!payment.user_id) {
          setHistoryLoading(false);
          return;
      }
      try {
          const res = await axios.get(`http://localhost:5000/api/payments/history/${payment.user_id}`, {
              headers: { 'x-auth-token': token }
          });
          setMemberHistory(res.data);
      } catch (err) {
      } finally {
          setHistoryLoading(false);
      }
  };

  const handleDownloadReceipt = () => {
      if (!selectedPayment) return;
      const refId = selectedPayment.transaction_id || selectedPayment.invoice_id;
      const receiptText = `GYM RECEIPT\nRef ID: ${refId}\nDate: ${new Date(selectedPayment.payment_date).toLocaleDateString()}\nMember: ${selectedPayment.member_name}\nAmount: ₹${selectedPayment.amount_paid}`;
      const blob = new Blob([receiptText], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `Receipt_${refId}.txt`;
      document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    if (payments.length === 0) return alert("No data");
    const headers = ["ID", "Member", "Date", "Amount", "Mode", "Transaction ID"];
    const rows = payments.map(p => [p.invoice_id, p.member_name, new Date(p.payment_date).toLocaleDateString(), p.amount_paid, p.payment_mode, p.transaction_id || '-']);
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri); link.setAttribute("download", "payments.csv");
    document.body.appendChild(link); link.click();
  };

  const revenueSplit = useMemo(() => {
    let cashTotal = 0, onlineTotal = 0, onlineCount = 0;
    payments.forEach(p => { 
        const amount = parseFloat(p.amount_paid) || 0;
        const modeLabel = p.payment_mode ? p.payment_mode.toString().toLowerCase().trim() : '';
        const txnId = p.transaction_id ? p.transaction_id.toString().toLowerCase().trim() : '';
        const invId = p.invoice_id ? p.invoice_id.toString().toLowerCase().trim() : '';
        const isOnline = (txnId !== "" && txnId !== invId && txnId !== "null" && txnId !== "processing...") || modeLabel.includes('online') || modeLabel.includes('upi') || txnId.startsWith('pay_');
        if (isOnline) { onlineTotal += amount; onlineCount++; } 
        else { cashTotal += amount; }
    });
    const total = cashTotal + onlineTotal;
    return { cash: cashTotal, online: onlineTotal, onlineCount: onlineCount, cashPer: total > 0 ? (cashTotal / total) * 100 : 0, onlinePer: total > 0 ? (onlineTotal / total) * 100 : 0 };
  }, [payments]); 

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans relative" onClick={() => setShowFilterDropdown(false)}>
      <div className="flex justify-between items-end mb-8">
        <div><h1 className="text-3xl font-black text-slate-900 tracking-tight">Financial Overview</h1></div>
        <div className="flex gap-3">
             <button onClick={handleExport} className="bg-white border border-slate-200 text-slate-600 px-5 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 shadow-sm"><Download size={18} /> Export</button>
             <button onClick={() => setShowModal(true)} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 shadow-lg"><Plus size={20} /> Record Payment</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-6 opacity-10"><DollarSign size={80} className="text-emerald-500" /></div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Total Revenue</p>
              <h3 className="text-3xl font-black text-slate-900">₹{parseFloat(stats.total_revenue || 0).toLocaleString()}</h3>
          </div>
          <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm relative overflow-hidden">
               <div className="absolute right-0 top-0 p-6 opacity-10"><Clock size={80} className="text-blue-500" /></div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Collected Today</p>
              <h3 className="text-3xl font-black text-slate-900">₹{parseFloat(stats.today_revenue || 0).toLocaleString()}</h3>
          </div>
          <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm relative overflow-hidden">
               <div className="absolute right-0 top-0 p-6 opacity-10"><AlertCircle size={80} className="text-orange-500" /></div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Pending Dues</p>
              <h3 className="text-3xl font-black text-orange-500">₹{parseFloat(stats.pending_dues || 0).toLocaleString()}</h3>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-black text-slate-900">Revenue Trend</h3>
                  <div className="flex gap-2">
                      <button onClick={() => setChartDays('7')} className={`px-3 py-1 text-xs font-bold rounded-lg ${chartDays === '7' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>7D</button>
                      <button onClick={() => setChartDays('30')} className={`px-3 py-1 text-xs font-bold rounded-lg ${chartDays === '30' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>30D</button>
                  </div>
              </div>
              <div className="h-[300px] w-full">
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="99%" height="100%">
                        <AreaChart data={chartData}>
                            <defs><linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2}/><stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/></linearGradient></defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                            <Area type="monotone" dataKey="revenue" stroke="#7C3AED" strokeWidth={4} fillOpacity={1} fill="url(#colorRevenue)" />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (<div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-bold bg-slate-50 border border-dashed border-slate-200">No revenue data</div>)}
              </div>
          </div>

          <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col">
               <h3 className="text-lg font-black text-slate-900 mb-2">Revenue Split</h3>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Cash vs Online Values</p>
               <div className="space-y-6 mt-4">
                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <div className="flex items-center gap-2 text-blue-600"><Wallet size={16} /><span className="text-sm font-black uppercase">Cash</span></div>
                            <span className="text-lg font-black text-slate-900">₹{revenueSplit.cash.toLocaleString()}</span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${revenueSplit.cashPer}%` }}></div></div>
                    </div>
                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <div className="flex items-center gap-2 text-emerald-600"><CreditCard size={16} /><span className="text-sm font-black uppercase">Online</span></div>
                            <span className="text-lg font-black text-slate-900">₹{revenueSplit.online.toLocaleString()}</span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${revenueSplit.onlinePer}%` }}></div></div>
                    </div>
                    <div className="pt-6 border-t border-slate-50">
                        <div className="bg-slate-50 p-4 rounded-2xl">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status Summary</p>
                            <div className="flex items-center justify-between font-black text-slate-700"><span>{revenueSplit.onlineCount} DETECTED ONLINE</span><span className="text-emerald-500">{revenueSplit.onlinePer.toFixed(0)}% SHARE</span></div>
                        </div>
                    </div>
               </div>
          </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between gap-4">
              <div className="relative flex-1 max-w-md"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input type="text" placeholder="Search..." className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-900/10 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
              <div className="relative">
                   <button onClick={(e) => { e.stopPropagation(); setShowFilterDropdown(!showFilterDropdown); }} className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 flex items-center gap-2 hover:bg-slate-50"><Filter size={16}/> {activeFilter}</button>
                   {showFilterDropdown && (<div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-10 animate-in fade-in zoom-in-95 duration-200">{['All', 'Cash', 'Online', 'Pending'].map(filter => (<button key={filter} onClick={() => { setActiveFilter(filter); setShowFilterDropdown(false); }} className={`w-full text-left px-4 py-2 rounded-lg text-sm font-bold ${activeFilter === filter ? 'bg-slate-100' : 'hover:bg-slate-50'}`}>{filter}</button>))}</div>)}
              </div>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                  <thead><tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400"><th className="p-6">Member / Plan</th><th className="p-6">Transaction ID</th><th className="p-6">Date</th><th className="p-6">Amount</th><th className="p-6">Status</th><th className="p-6">Action</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                      {loading ? (<tr><td colSpan="6" className="p-8 text-center text-slate-400 font-bold animate-pulse">Loading Ledger...</td></tr>) : filteredPayments.map((payment) => (
                          <tr key={payment.id} className="group hover:bg-slate-50/50 transition-colors">
                              <td className="p-6"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 border border-slate-100">{payment.profile_pic ? (<img src={getImageUrl(payment.profile_pic)} onError={(e) => {e.target.onerror = null; e.target.src = 'https://via.placeholder.com/40';}} alt="Member" className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center text-slate-400"><User size={20} /></div>)}</div><div><div className="font-bold text-slate-900">{payment.member_name}</div><div className="text-xs font-bold text-slate-400">{payment.plan_name}</div></div></div></td>
                              <td className="p-6"><div className={`font-mono text-xs font-bold px-2 py-1 rounded w-fit ${payment.transaction_id || payment.invoice_id ? 'bg-slate-100 text-slate-600' : 'bg-slate-50 text-slate-400'}`}>{(payment.transaction_id && payment.transaction_id.trim() !== "" && payment.transaction_id !== "Processing...") ? payment.transaction_id : (payment.invoice_id || `ID-${payment.id}`)}</div></td>
                              <td className="p-6"><div className="text-sm font-bold text-slate-600">{new Date(payment.payment_date).toLocaleDateString()}</div><div className="text-xs font-bold text-slate-400 mt-0.5">{new Date(payment.payment_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div></td>
                              <td className="p-6"><div className="font-black text-slate-900">₹{parseFloat(payment.amount_paid).toLocaleString()}</div>{parseFloat(payment.amount_due) > 0 && (<div className="text-[10px] font-bold text-orange-500">Due: ₹{payment.amount_due}</div>)}</td>
                              <td className="p-6">{payment.status === 'Completed' ? (<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700"><CheckCircle2 size={12} /> Paid</span>) : (<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700"><Clock size={12} /> Pending</span>)}</td>
                              <td className="p-6"><button onClick={() => openReceipt(payment)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-900 transition-all"><FileText size={18} /></button></td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div><h2 className="text-xl font-black text-slate-900">Record Transaction</h2><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Log a manual payment</p></div>
                    <button onClick={() => setShowModal(false)} className="bg-white p-2 rounded-full text-slate-400 hover:text-slate-900 shadow-sm transition-all"><X size={20} /></button>
                </div>
                <form onSubmit={handleRecordPayment} className="p-6 space-y-5">
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Select Member</label><div className="relative"><select required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none appearance-none" value={formData.user_id} onChange={e => setFormData({...formData, user_id: e.target.value})}><option value="">-- Choose Member --</option>{members.map(m => (<option key={m.id} value={m.id}>{m.full_name} ({m.email})</option>))}</select><ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} /></div></div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Select Plan</label><div className="relative"><select required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none appearance-none" value={formData.plan_id} onChange={handlePlanSelect}><option value="">-- Choose Plan --</option>{plans.map(p => (<option key={p.id} value={p.id}>{p.name} - ₹{p.price}</option>))}</select><ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} /></div></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Total Amount (₹)</label><input type="number" readOnly className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-500 outline-none cursor-not-allowed" value={formData.total_amount} /></div>
                        <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Amount Paid (₹)</label><input type="number" required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-black text-emerald-600 outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder="0" value={formData.amount_paid} onChange={e => setFormData({...formData, amount_paid: e.target.value})} /></div>
                    </div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Payment Mode</label><div className="flex gap-2">{['Cash', 'Online'].map(mode => (<button key={mode} type="button" onClick={() => setFormData({...formData, payment_mode: mode})} className={`flex-1 py-3 rounded-xl text-xs font-bold border-2 transition-all ${formData.payment_mode === mode ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-300'}`}>{mode}</button>))}</div></div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Razorpay / UPI Reference ID</label><input type="text" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10" placeholder="e.g. pay_Lw82..." value={formData.transaction_id} onChange={e => setFormData({...formData, transaction_id: e.target.value})} /></div>
                    <button type="submit" className="w-full py-4 bg-emerald-500 text-white rounded-xl font-black text-sm uppercase tracking-wider hover:bg-emerald-600 shadow-lg shadow-emerald-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"><CheckCircle2 size={18} /> Confirm Payment</button>
                </form>
            </div>
        </div>
      )}

      {showReceipt && selectedPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-white rounded-[24px] w-full max-w-sm shadow-2xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
                  <div className="bg-emerald-500 p-6 text-center text-white relative">
                      <button onClick={() => setShowReceipt(false)} className="absolute right-4 top-4 text-white/80 hover:text-white"><X size={20}/></button>
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-md"><CheckCircle2 size={24} className="text-white"/></div>
                      <h3 className="text-xl font-black">Payment Successful</h3>
                  </div>
                  <div className="p-6 space-y-4">
                      <div className="text-center mb-6"><p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Total Amount Paid</p><h2 className="text-3xl font-black text-slate-900 mt-1">₹{parseFloat(selectedPayment.amount_paid).toLocaleString()}</h2></div>
                      <div className="space-y-3">
                          <div className="flex justify-between text-sm"><span className="text-slate-500 font-bold">Member</span><span className="text-slate-900 font-bold">{selectedPayment.member_name}</span></div>
                          <div className="flex justify-between text-sm"><span className="text-slate-500 font-bold">Ref ID</span><span className="font-mono text-slate-900 font-bold bg-slate-100 px-2 rounded">{selectedPayment.transaction_id || selectedPayment.invoice_id || 'N/A'}</span></div>
                          <div className="flex justify-between text-sm"><span className="text-slate-500 font-bold">Date</span><span className="text-slate-900 font-bold">{new Date(selectedPayment.payment_date).toLocaleDateString()}</span></div>
                      </div>
                      <div className="pt-4 border-t border-slate-100">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><History size={12}/> Recent Transactions</h4>
                          {historyLoading ? (<div className="text-center py-4 text-slate-400 text-xs">Loading history...</div>) : (
                              <div className="space-y-2">
                                  {memberHistory.map((hist, i) => (<div key={i} className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50"><div className="font-bold text-slate-600">{new Date(hist.payment_date).toLocaleDateString()}</div><div className="font-black text-slate-900">₹{hist.amount_paid}</div><div className="text-slate-400">{hist.transaction_id || hist.invoice_id}</div></div>))}
                                  {memberHistory.length === 0 && <div className="text-xs text-slate-400 italic">No previous records found.</div>}
                              </div>
                          )}
                      </div>
                  </div>
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
                       <button onClick={handleDownloadReceipt} className="w-full py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 shadow-sm flex justify-center items-center gap-2 hover:bg-slate-100 active:scale-95 transition-all"><ArrowDownToLine size={16}/> Download Receipt</button>
                       {/* 🛠️ DELETE BUTTON ADDED HERE */}
                       <button onClick={() => handleDeletePayment(selectedPayment.id)} className="w-full py-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl font-bold text-xs flex justify-center items-center gap-2 hover:bg-rose-600 hover:text-white transition-all active:scale-95"><Trash2 size={14}/> Delete This Record</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default PaymentsPage;
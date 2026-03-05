import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Search, Eye, Edit2, Plus, X, Zap, RefreshCw, Trash2, Ban, Calendar, 
  CreditCard, Clock, AlertTriangle, CheckCircle, Flame, TrendingUp, 
  MessageSquare, ListChecks, UserPlus, Phone, Download, Users 
} from 'lucide-react';

const MembersPage = ({ token }) => {
  const [members, setMembers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [filter, setFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [addFormData, setAddFormData] = useState({ full_name: '', email: '', phone: '' });
  const [editFormData, setEditFormData] = useState({ id: '', full_name: '', email: '', phone: '' });

  const [addFile, setAddFile] = useState(null);
  const [editFile, setEditFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const fetchMembers = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/members', {
        headers: { 'x-auth-token': token }
      });
      setMembers(res.data);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/memberships/plans', {
        headers: { 'x-auth-token': token }
      });
      setPlans(res.data);
    } catch (err) {
      console.error("Error fetching plans:", err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchMembers();
      fetchPlans();
    }
  }, [token]);

  const downloadReceipt = () => {
    if (!receiptData) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${receiptData.memberName}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; background: #f8fafc; }
            .receipt-box { background: white; border: 1px solid #e2e8f0; padding: 40px; border-radius: 24px; max-width: 450px; margin: auto; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
            .logo { font-size: 24px; font-weight: 900; text-align: center; margin-bottom: 5px; color: #0f172a; }
            .sub-logo { font-size: 10px; font-weight: 700; text-align: center; color: #64748b; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 30px; }
            .divider { border-top: 2px dashed #e2e8f0; margin: 20px 0; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 12px; }
            .label { color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; }
            .value { font-weight: 700; color: #0f172a; font-size: 14px; }
            .total-row { background: #f1f5f9; padding: 15px; border-radius: 12px; margin-top: 20px; display: flex; justify-content: space-between; align-items: center; }
            .footer { text-align: center; margin-top: 30px; font-size: 10px; color: #94a3b8; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="receipt-box">
            <div class="logo">GYM DASHBOARD</div>
            <div class="sub-logo">Official Payment Receipt</div>
            <div class="info-row"><span class="label">Receipt Date</span><span class="value">${new Date().toLocaleDateString('en-GB')}</span></div>
            <div class="info-row"><span class="label">Member Name</span><span class="value">${receiptData.memberName}</span></div>
            <div class="info-row"><span class="label">Plan Activated</span><span class="value">${receiptData.planName}</span></div>
            <div class="info-row"><span class="label">Payment ID</span><span class="value" style="font-size: 10px;">${receiptData.payId}</span></div>
            <div class="divider"></div>
            <div class="total-row">
              <span class="label" style="color: #0f172a; font-size: 14px;">Total Amount</span>
              <span style="font-weight: 900; font-size: 20px; color: #10b981;">₹${receiptData.amount}</span>
            </div>
            <div class="footer">This is a computer generated receipt.</div>
          </div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleActivateSubscription = async (e, type = 'online') => {
    if (e) e.preventDefault();
    if (!selectedPlanId) return alert("Please select a plan first.");
    const selectedPlan = plans.find(p => p.id === parseInt(selectedPlanId));
    
    if (type === 'cash') {
      if (window.confirm(`Confirm cash payment of ₹${selectedPlan.price}?`)) {
        await processActivation(selectedPlan, `CASH-${Date.now()}`);
      }
      return;
    }

    const options = {
      key: "rzp_test_SGpsNCBP4TXtP5",
      amount: selectedPlan.price * 100,
      currency: "INR",
      name: "Gym Dashboard",
      description: `Membership: ${selectedPlan.name}`,
      handler: async (res) => await processActivation(selectedPlan, res.razorpay_payment_id),
      prefill: { name: selectedMember.full_name, contact: selectedMember.phone, email: selectedMember.email },
      theme: { color: "#7c3aed" }
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const processActivation = async (plan, paymentId) => {
    try {
      const isOnline = paymentId && String(paymentId).startsWith('pay_');
      const mode = isOnline ? 'Online' : 'Cash';

      await axios.post('http://localhost:5000/api/memberships/activate', {
        member_id: selectedMember.id,
        plan_id: plan.id,
        payment_id: paymentId,
        payment_mode: mode
      }, { headers: { 'x-auth-token': token } });

      await axios.put(`http://localhost:5000/api/members/${selectedMember.id}/check-in`, {}, { 
        headers: { 'x-auth-token': token } 
      });

      setReceiptData({ memberName: selectedMember.full_name, planName: plan.name, amount: plan.price, payId: paymentId });
      setShowActivateModal(false);
      setShowSuccessAnim(true); 
    } catch (err) { 
      alert("Activation failed");
    }
  };

  const sendWhatsApp = (member, type) => {
    const gymName = "Gym Dashboard"; 
    let message = type === 'reminder' 
      ? `Hi ${member.full_name}, your membership at ${gymName} is expiring in ${member.days_left} days.`
      : `Hi ${member.full_name}, we missed you at ${gymName}! Hope to see you back soon!`;
    window.open(`https://wa.me/91${member.phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleCall = (phoneNumber) => window.open(`tel:${phoneNumber}`, '_self');

  const handleBulkReminder = () => {
    const selected = members.filter(m => selectedIds.includes(m.id));
    selected.forEach((m, index) => setTimeout(() => sendWhatsApp(m, 'reminder'), index * 1000));
  };

  const handleQuickExtend = async (days) => {
    try {
      await axios.post('http://localhost:5000/api/memberships/extend', { member_id: editFormData.id, days }, { headers: { 'x-auth-token': token } });
      fetchMembers();
      alert(`Extended by ${days} days!`);
    } catch (err) { alert("Extension failed."); }
  };

 const getWarning = (member) => {
    // 1. Expiry Warning
    if (member.days_left <= 5 && member.days_left > 0 && member.membership_status === 'ACTIVE') {
      return { 
        type: 'expiry', 
        text: `Expiring in ${member.days_left} days`, 
        color: 'text-orange-500', 
        bgColor: 'bg-orange-500' 
      };
    }
    
    // 2. Inactive Warning (FIXED: Changed > 7 to > 4 to match status)
    if (member.last_visit) {
      const lastVisitDate = new Date(member.last_visit);
      const today = new Date();
      // Use the same math as status logic for consistency
      const diffTime = Math.abs(today - lastVisitDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

      if (diffDays > 4 && member.membership_status === 'ACTIVE') {
        return { 
          type: 'inactive', 
          text: `Inactive for ${diffDays} days`, 
          color: 'text-amber-500', 
          bgColor: 'bg-amber-500'
        };
      }
    } else if (!member.last_visit && member.membership_status === 'ACTIVE') {
       return { type: 'inactive', text: 'Never visited', color: 'text-slate-400', bgColor: 'bg-slate-400' };
    }
    
    return null; 
  };

// 🛠️ FIX: Corrected Status Logic (Unpaid check is now #1 Priority)
const getStatusInfo = (member) => {
  // Priority 1: Unpaid Check
  if (member.membership_status === 'UNPAID' || !member.plan_name) {
    return { label: 'UNPAID', color: 'bg-slate-300', text: 'text-slate-400' };
  }
  
  // Priority 2: Expired Check
  if (member.days_left <= 0) {
    return { label: 'EXPIRED', color: 'bg-rose-500', text: 'text-rose-500' };
  }
  
  // Priority 3: INACTIVE CALCULATION (Using raw timestamps to be safe)
  const today = new Date();
  const lastVisit = member.last_visit ? new Date(member.last_visit) : null;

  let diffDays = 0;
  if (lastVisit) {
    // Reset both to midnight UTC for fair calendar day comparison
    const d1 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const d2 = Date.UTC(lastVisit.getFullYear(), lastVisit.getMonth(), lastVisit.getDate());
    diffDays = Math.floor((d1 - d2) / (1000 * 60 * 60 * 24));
  } else {
    diffDays = 999; 
  }

  // If visit was more than 4 days ago, label as Inactive
  if (diffDays > 4) {
    return { label: 'INACTIVE', color: 'bg-amber-400', text: 'text-amber-500' };
  }

  // Priority 4: Expiring Soon
  if (member.days_left <= 5) {
    return { label: 'EXPIRING SOON', color: 'bg-orange-500', text: 'text-orange-500' };
  }
  
  return { label: 'ACTIVE', color: 'bg-emerald-400', text: 'text-emerald-500' };
};

  const handleManualCheckIn = async (e, memberId) => {
    e.stopPropagation();
    try {
      await axios.put(`http://localhost:5000/api/members/${memberId}/check-in`, {}, { headers: { 'x-auth-token': token } });
      fetchMembers();
    } catch (err) { alert("Check-in failed"); }
  };

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
      setAddFile(null); setPreviewUrl(null);
      fetchMembers();
  } catch (err) { 
      // FIX: Show the specific error message from backend if available
      const errorMessage = err.response && err.response.data && err.response.data.error 
        ? err.response.data.error 
        : "Error adding member.";
      alert(errorMessage); 
    }
  };

  const handleEditClick = (member) => {
    setEditFormData({ id: member.id, full_name: member.full_name, email: member.email, phone: member.phone });
    setShowEditModal(true);
  };

  const handleViewDetails = (member) => {
    setSelectedMember(member);
    setShowDetailsModal(true);
  };

  const handleUpdateMember = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('full_name', editFormData.full_name);
    formData.append('email', editFormData.email);
    formData.append('phone', editFormData.phone);
    if (editFile) formData.append('profile_pic', editFile);
    try {
      await axios.put(`http://localhost:5000/api/members/${editFormData.id}`, formData, { 
        headers: { 'x-auth-token': token, 'Content-Type': 'multipart/form-data' } 
      });
      setShowEditModal(false);
      setEditFile(null); fetchMembers();
    } catch (err) { alert("Update failed"); }
  };

  const handleDeleteMember = async () => {
    if (window.confirm("Are you sure you want to delete this member?")) {
      try {
        await axios.delete(`http://localhost:5000/api/members/${editFormData.id}`, { headers: { 'x-auth-token': token } });
        setShowEditModal(false); fetchMembers();
      } catch (err) { alert("Delete failed"); }
    }
  };

  const handleRemovePlan = async () => {
    if (window.confirm("Cancel active plan?")) {
      try {
        await axios.post(`http://localhost:5000/api/memberships/remove-plan`, { member_id: editFormData.id }, { headers: { 'x-auth-token': token } });
        setShowEditModal(false); fetchMembers();
      } catch (err) { alert("Failed to remove plan"); }
    }
  };

  const toggleSelection = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const filteredMembers = members.filter(m => {
    const statusInfo = getStatusInfo(m);
    const lastVisitDate = m.last_visit ? new Date(m.last_visit) : null;
    const diffDays = lastVisitDate ? Math.ceil((new Date() - lastVisitDate) / (1000 * 60 * 60 * 24)) : 999;
    const matchesFilter = filter === 'All' ? true : 
                          (filter === 'Active' && (statusInfo.label === 'ACTIVE' || statusInfo.label === 'EXPIRING SOON')) ||
                          (filter === 'Expired' && statusInfo.label === 'EXPIRED') ||
                          (filter === 'Expiring Soon' && statusInfo.label === 'EXPIRING SOON') ||
                          // FIX: Added label check here as well
                          (filter === 'Inactive' && statusInfo.label !== 'UNPAID' && diffDays > 4);
    const searchLower = searchTerm.toLowerCase();
    return matchesFilter && (m.full_name?.toLowerCase().includes(searchLower) || m.email?.toLowerCase().includes(searchLower) || m.phone?.includes(searchTerm));
  });

  const counts = {
    All: members.length,
    Active: members.filter(m => ['ACTIVE', 'EXPIRING SOON'].includes(getStatusInfo(m).label)).length,
    Expired: members.filter(m => getStatusInfo(m).label === 'EXPIRED').length,
    "Expiring Soon": members.filter(m => getStatusInfo(m).label === 'EXPIRING SOON').length,
   Inactive: members.filter(m => {
  const statusInfo = getStatusInfo(m);
  return statusInfo.label === 'INACTIVE';
}).length
  };

  return (
    <div className="flex flex-col gap-6 p-6 bg-white min-h-screen relative">
      
      {showSuccessAnim && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white p-10 rounded-[40px] shadow-2xl text-center flex flex-col items-center animate-in zoom-in-95 duration-500 max-w-sm w-full">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 animate-bounce"><CheckCircle size={48} /></div>
            <h2 className="text-2xl font-black text-slate-900">Success!</h2>
            <p className="text-slate-500 font-bold mb-8">Membership Activated for {selectedMember?.full_name}</p>
            <div className="w-full space-y-3">
              <button onClick={downloadReceipt} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-[0.98]"><Download size={18} /> Download Receipt</button>
              <button onClick={() => { setShowSuccessAnim(false); fetchMembers(); }} className="w-full py-2 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition-colors">Close & Refresh</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center ml-[4px]">
        <div><h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">Members {isBulkMode && <span className="text-xs bg-slate-900 text-white px-2 py-1 rounded-full">{selectedIds.length} Selected</span>}</h1><p className="text-slate-500 text-sm">Manage your gym members</p></div>
        <div className="flex gap-3">
          <button onClick={() => {setIsBulkMode(!isBulkMode); setSelectedIds([]);}} className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 border transition-all ${isBulkMode ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}><ListChecks size={18} /> {isBulkMode ? 'Exit Selection' : 'Bulk Actions'}</button>
          <button onClick={() => setShowAddModal(true)} className="bg-[#0f172a] text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-slate-800 shadow-sm transition-all"><Plus size={18} /> Add Member</button>
        </div>
      </div>    

      <div className="flex items-center justify-between gap-4 ml-[4px]">
        <div className="relative w-full max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="Search by name, email, or phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border-b border-slate-200 focus:outline-none text-sm" /></div>
        <div className="flex gap-2">
          {['All', 'Active', 'Inactive', 'Expired', 'Expiring Soon'].map((tab) => (
            <button key={tab} onClick={() => setFilter(tab)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${filter === tab ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>{tab}<span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${filter === tab ? 'bg-white text-slate-900 shadow-sm' : 'bg-slate-50 text-slate-400'}`}>{counts[tab] || 0}</span></button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto ml-[4px]">
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6 text-slate-300"><Users size={40} /></div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Build Your Community!</h2>
            <p className="text-slate-500 font-bold mb-8 text-center max-w-xs">Your gym looks quiet. Start by adding your very first member to the system.</p>
            <button onClick={() => setShowAddModal(true)} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-slate-800 shadow-2xl transition-all active:scale-95"><UserPlus size={20} /> Add First Member</button>
          </div>
        ) : (
          <table className="w-full text-left border-collapse table-fixed min-w-[1050px]">
            <thead><tr className="text-slate-400 text-[11px] uppercase font-bold tracking-widest border-b border-slate-100"><th className="py-4 w-[45px] px-2">{isBulkMode && '✓'}</th><th className="py-4 w-[18%] pr-2 pl-0 text-left">Name</th><th className="py-4 w-[11%] px-2">Phone</th><th className="py-4 w-[17%] px-2">Email</th><th className="py-4 w-[12%] text-center px-2">Status</th><th className="py-4 w-[13%] text-center px-2">Plan</th><th className="py-4 w-[8%] text-center px-2">Days Left</th><th className="py-4 w-[11%] text-center px-2">Last Visit</th><th className="py-4 w-[10%] text-right px-4">Actions</th></tr></thead>
           <tbody className="divide-y divide-slate-50">
  {filteredMembers.map((member) => {
    const statusInfo = getStatusInfo(member);
    const warning = getWarning(member);
    const displayDays = member.days_left < 0 ? 0 : (member.days_left || 0);
    const lastVisitDate = member.last_visit ? new Date(member.last_visit) : null;
    return (
      <tr key={member.id} className={`group transition-colors ${selectedIds.includes(member.id) ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}>
        <td className="py-5 px-2">{isBulkMode && <input type="checkbox" checked={selectedIds.includes(member.id)} onChange={() => toggleSelection(member.id)} className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900" />}</td>
       <td className="py-5 pr-2 pl-0 font-bold text-slate-900 text-sm text-left">
  <div className="flex items-center gap-3 relative group/name">
    <div 
      onClick={() => setPreviewImage(member.profile_pic || 'https://via.placeholder.com/150')} 
      className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 overflow-hidden cursor-zoom-in hover:border-purple-400 transition-all shrink-0"
    >
      <img src={member.profile_pic || 'https://via.placeholder.com/150'} alt="Profile" className="w-full h-full object-cover" />
    </div>
    
    <div className="flex flex-col min-w-0">
      <span className="truncate">{member.full_name}</span>
      <div className="flex items-center gap-1">
        {/* FIX: Showing warning for both Expired AND Inactive members, but NOT Unpaid */}
        {(warning || member.days_left <= 0) && statusInfo.label !== 'UNPAID' && (
          <div className="group/warn relative flex items-center">
            <AlertTriangle 
              size={12} 
              className={`${member.days_left <= 0 ? 'text-rose-500' : 'text-amber-500'} cursor-help`} 
            />
            {/* FIX: Tooltip text logic to show actual status instead of '?' */}
            <div className={`absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover/warn:flex ${member.days_left <= 0 ? 'bg-rose-600' : 'bg-amber-600'} text-white text-[10px] py-1 px-2 rounded whitespace-nowrap z-50 shadow-xl font-bold items-center`}>
              {member.days_left <= 0 ? 'Membership Expired' : (warning ? warning.text : 'Inactive Member')}
            </div>
          </div>
        )}
      </div>
    </div>
    
    <div className="flex items-center gap-1 opacity-0 group-hover/name:opacity-100 transition-all ml-1 shrink-0">
      <button onClick={() => handleCall(member.phone)} className="p-1 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-600 hover:text-white transition-colors shadow-sm">
        <Phone size={10} fill="currentColor" />
      </button>
      <button onClick={() => sendWhatsApp(member, 'reminder')} className="p-1 bg-emerald-50 text-emerald-600 rounded-full hover:bg-emerald-600 hover:text-white transition-colors shadow-sm">
        <MessageSquare size={10} fill="currentColor" />
      </button>
    </div>
  </div>
</td>
        <td className="py-5 px-2 text-slate-600 text-sm truncate">{member.phone}</td>
        <td className="py-5 px-2 text-slate-500 text-sm truncate">{member.email}</td>
        <td className="py-5 px-2 text-center text-sm"><div className="flex items-center justify-center"><span className={`inline-block w-2 h-2 rounded-full mr-2 ${statusInfo.color}`}></span><span className={`text-[10px] font-bold uppercase tracking-wider ${statusInfo.text}`}>{statusInfo.label}</span></div></td>
        <td className="py-5 px-2 text-center text-slate-600 text-sm">{statusInfo.label === 'UNPAID' ? (<button onClick={() => { setSelectedMember(member); setShowActivateModal(true); }} className="inline-flex items-center gap-1 bg-purple-50 text-purple-600 px-3 py-1 rounded border border-purple-100 text-[10px] font-bold uppercase hover:bg-purple-600 hover:text-white transition-all active:scale-95 shadow-sm"><Zap size={10} fill="currentColor" /> Initiate</button>) : statusInfo.label === 'EXPIRED' ? (<button onClick={() => { setSelectedMember(member); setShowActivateModal(true); }} className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 px-3 py-1 rounded border border-rose-100 text-[10px] font-bold uppercase hover:bg-rose-600 hover:text-white transition-all active:scale-95 shadow-sm"><RefreshCw size={10} /> Renew</button>) : (statusInfo.label === 'INACTIVE' || statusInfo.label === 'EXPIRING SOON') ? (<button onClick={() => sendWhatsApp(member, statusInfo.label === 'INACTIVE' ? 'followup' : 'reminder')} className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 px-3 py-1 rounded border border-blue-100 text-[10px] font-bold uppercase hover:bg-blue-600 hover:text-white transition-all active:scale-95 shadow-sm"><MessageSquare size={10} fill="currentColor" /> Send Reminder</button>) : <span className="font-bold text-slate-900 truncate block">{member.plan_name}</span>}</td>
        <td className={`py-5 px-2 text-center font-bold text-sm ${member.days_left <= 0 ? 'text-rose-500' : member.days_left <= 5 ? 'text-orange-500' : 'text-slate-900'}`}>{displayDays}</td>
        <td className="py-5 px-2 text-center"><div className="flex items-center justify-center gap-1 pl-4"><span className="text-sm font-semibold text-slate-600">{member.last_visit ? new Date(member.last_visit).toLocaleDateString('en-GB') : '-'}</span><button onClick={(e) => handleManualCheckIn(e, member.id)} className="opacity-0 group-hover:opacity-100 text-emerald-500 bg-emerald-50 p-1 rounded-full transition-all shrink-0"><CheckCircle size={12} /></button></div></td>
        <td className="py-5 px-4 text-right"><div className="flex justify-end items-center gap-3 text-slate-300"><button onClick={() => handleViewDetails(member)} className="hover:text-slate-600 transition-colors"><Eye size={18} /></button><button onClick={() => handleEditClick(member)} className="hover:text-slate-600 transition-colors"><Edit2 size={16} /></button></div></td>
      </tr>
    );
  })}
</tbody>
          </table>
        )}
      </div>

      {/* --- RESTORED BULK ACTION BAR --- */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-8 z-[100] border border-slate-700 backdrop-blur-md bg-opacity-95 animate-in slide-in-from-bottom-10">
            <div className="flex flex-col">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-tight">Bulk Actions</span>
                <span className="text-sm font-black">{selectedIds.length} Selected</span>
            </div>
            
            <div className="h-8 w-[1px] bg-slate-700"></div>
            
            {/* Restored Reminder Button */}
            <button 
              onClick={handleBulkReminder} 
              className="flex items-center gap-2 text-xs font-bold bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-xl border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all"
            >
                <Zap size={14} fill="currentColor"/> Send Reminders
            </button>
            
            <button className="flex items-center gap-2 text-xs font-bold bg-rose-500/10 text-rose-400 px-4 py-2 rounded-xl border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all">
                <Trash2 size={14}/> Delete Selection
            </button>
            
            <button onClick={() => setSelectedIds([])} className="text-slate-400 hover:text-white ml-2">
                <X size={20} />
            </button>
        </div>
      )}

      {showDetailsModal && selectedMember && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
            <div className="p-6 bg-[#0f172a] text-white flex justify-between items-center shrink-0">
              <div><h2 className="text-xl font-bold">{selectedMember.full_name}</h2><p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold">Comprehensive Profile</p></div>
              <button onClick={() => setShowDetailsModal(false)} className="hover:bg-white/10 p-2 rounded-full transition-all"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex flex-col items-center text-center"><span className="text-[9px] font-bold text-blue-500 uppercase tracking-tighter mb-1">Total Visits</span><span className="text-lg font-black text-blue-900">{selectedMember.total_visits || 0}</span></div>
                <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-100 flex flex-col items-center text-center"><span className="text-[9px] font-bold text-orange-500 uppercase tracking-tighter mb-1">Streak</span><div className="flex items-center gap-1"><Flame size={12} className="text-orange-500" fill="currentColor" /><span className="text-lg font-black text-orange-900">{selectedMember.streak || 0}</span></div></div>
                <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 flex flex-col items-center text-center"><span className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter mb-1">Total Paid</span><span className="text-lg font-black text-emerald-900">₹{selectedMember.total_paid || 0}</span></div>
                <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-100 flex flex-col items-center text-center"><span className="text-[9px] font-bold text-purple-500 uppercase tracking-tighter mb-1 truncate w-full">Plan Type</span><span className="text-[10px] font-black text-purple-900 uppercase truncate w-full">{selectedMember.plan_name || 'N/A'}</span></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><div className="flex items-center gap-2 text-slate-400 mb-1"><Calendar size={14}/> <span className="text-[10px] font-bold uppercase tracking-tight">Joined On</span></div><p className="font-bold text-slate-900">{selectedMember.joining_date ? new Date(selectedMember.joining_date).toLocaleDateString('en-GB') : 'N/A'}</p></div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><div className="flex items-center gap-2 text-slate-400 mb-1"><Clock size={14}/> <span className="text-[10px] font-bold uppercase tracking-tight">Valid Till</span></div><p className={`font-bold ${selectedMember.days_left <= 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{selectedMember.expiry_date ? new Date(selectedMember.expiry_date).toLocaleDateString('en-GB') : 'No Active Plan'}</p></div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><div className="flex items-center gap-2 text-slate-400 mb-1"><TrendingUp size={14}/> <span className="text-[10px] font-bold uppercase tracking-tight">Last Checked In</span></div><p className="font-bold text-slate-700">{selectedMember.last_visit ? new Date(selectedMember.last_visit).toLocaleString('en-GB') : 'Never Checked In'}</p></div>
              <div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><CreditCard size={14}/> Recent Payment History</h3>
                <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                  <div className="max-h-[220px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b sticky top-0"><tr><th className="px-4 py-2 text-left">Date</th><th className="px-4 py-2 text-left">Category</th><th className="px-4 py-2 text-right">Amount</th></tr></thead>
                      <tbody className="divide-y text-slate-600">
                        {/* FIX 5: SHOWING AMOUNT AND CHANGING RENEWAL TO JOINING/RENEWAL */}
                        {selectedMember.payment_history?.map((pay, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3">{new Date(pay.payment_date).toLocaleDateString('en-GB')}</td>
                            <td className="px-4 py-3">{idx === selectedMember.payment_history.length - 1 ? 'Membership Joining' : 'Plan Renewal'}</td>
                            <td className="px-4 py-3 text-right font-black text-slate-900">₹{pay.amount_paid}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center"><div><h2 className="text-xl font-bold text-slate-900">Edit Member</h2></div><button onClick={() => setShowEditModal(false)} className="bg-white p-2 rounded-full shadow-sm hover:bg-slate-100 text-slate-400"><X size={20} /></button></div>
            <form onSubmit={handleUpdateMember} className="p-6 space-y-5">
              <div className="flex justify-center -mt-2"><div className="relative group"><div className="w-20 h-20 rounded-full bg-white border-4 border-white shadow-lg overflow-hidden"><img src={editFile ? URL.createObjectURL(editFile) : (members.find(m => m.id === editFormData.id)?.profile_pic || 'https://via.placeholder.com/150')} alt="Current" className="w-full h-full object-cover" /></div><label className="absolute inset-0 flex items-center justify-center bg-slate-900/50 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-all rounded-full cursor-pointer">Change<input type="file" accept="image/*" className="hidden" onChange={(e) => setEditFile(e.target.files[0])} /></label></div></div>
              <div className="space-y-4">
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Full Name</label><input type="text" required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900 font-semibold" value={editFormData.full_name} onChange={(e) => setEditFormData({...editFormData, full_name: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Phone</label><input type="text" required className="w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-slate-900 font-semibold" value={editFormData.phone} onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})} /></div>
                  <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 ml-1">Email</label><input type="email" required className="w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-slate-900 font-semibold" value={editFormData.email} onChange={(e) => setEditFormData({...editFormData, email: e.target.value})} /></div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300"><label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1 flex items-center gap-2"><Clock size={12}/> Quick Extend</label><div className="flex items-center gap-2">{[2, 5, 15].map(days => (<button key={days} type="button" onClick={() => handleQuickExtend(days)} className="flex-1 bg-white border border-slate-200 px-2 py-2 rounded-lg text-[10px] font-black hover:bg-slate-900 hover:text-white transition-all shadow-sm">+ {days} DAYS</button>))}</div></div>
              </div>
              <div className="pt-4 flex flex-col gap-3"><button type="submit" className="w-full py-3 bg-[#0f172a] text-white rounded-xl font-bold hover:bg-slate-800 shadow-md transition-all active:scale-95">Save Changes</button><div className="flex items-center gap-3 pt-2"><button type="button" onClick={handleRemovePlan} className="flex-1 py-2.5 text-[10px] font-bold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2"><Ban size={12} /> Remove Plan</button><button type="button" onClick={handleDeleteMember} className="flex-1 py-2.5 text-[10px] font-bold text-rose-500 border border-rose-100 bg-rose-50 rounded-xl hover:bg-rose-500 hover:text-white flex items-center justify-center gap-2"><Trash2 size={12} /> Delete</button></div></div>
            </form>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center"><h2 className="text-xl font-bold text-slate-900">New Member</h2><button onClick={() => setShowAddModal(false)}><X size={20} className="text-slate-400" /></button></div>
            <form onSubmit={handleAddMember} className="p-6 space-y-4">
              <div className="flex justify-center mb-6"><div className="relative group"><div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">{previewUrl ? (<img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />) : (<UserPlus size={32} className="text-slate-300" />)}</div><label className="absolute inset-0 flex items-center justify-center bg-slate-900/50 text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-all rounded-full cursor-pointer">Upload<input type="file" accept="image/*" className="hidden" onChange={(e) => { setAddFile(e.target.files[0]); setPreviewUrl(URL.createObjectURL(e.target.files[0])); }} /></label></div></div>
              <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label><input type="text" required className="w-full px-4 py-2 bg-slate-50 border rounded-lg font-semibold text-slate-900" value={addFormData.full_name} onChange={(e) => setAddFormData({...addFormData, full_name: e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label><input type="email" required className="w-full px-4 py-2 bg-slate-50 border rounded-lg font-semibold text-slate-900" value={addFormData.email} onChange={(e) => setAddFormData({...addFormData, email: e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone</label><input type="text" required className="w-full px-4 py-2 bg-slate-50 border rounded-lg font-semibold text-slate-900" value={addFormData.phone} onChange={(e) => setAddFormData({...addFormData, phone: e.target.value})} /></div>
              <button type="submit" className="w-full py-3 bg-[#0f172a] text-white rounded-xl font-bold shadow-lg transition-all active:scale-95">Save Member</button>
            </form>
          </div>
        </div>
      )}

      {showActivateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-[32px] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 border">
            <div className="p-8 text-center bg-gradient-to-b from-slate-50 to-white"><div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3 shadow-inner"><Zap size={32} fill="currentColor" /></div><h2 className="text-2xl font-black text-slate-900 tracking-tight">Activate Plan</h2><p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">For {selectedMember?.full_name}</p></div>
            <div className="px-8 pb-8 space-y-4">
              <div className="relative"><select required className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-purple-500 text-sm font-black appearance-none cursor-pointer" value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)}><option value="">Select Membership Plan...</option>{plans.map(p => <option key={p.id} value={p.id}>{p.name} — ₹{p.price}</option>)}</select><div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><Calendar size={18} /></div></div>
              <div className="pt-2 space-y-3">
                <button onClick={() => handleActivateSubscription(null, 'online')} className="w-full py-4 bg-[#7c3aed] text-white rounded-2xl font-black text-sm hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all flex items-center justify-center gap-2"><CreditCard size={18} /> Proceed for Payment</button>
                <button onClick={() => handleActivateSubscription(null, 'cash')} className="w-full py-4 bg-white text-slate-600 border-2 border-slate-100 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"><span className="text-emerald-500 font-bold">₹</span> Paid as Cash</button>
              </div>
              <button onClick={() => setShowActivateModal(false)} className="w-full text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition-colors">Cancel Transaction</button>
            </div>
          </div>
        </div>
      )}

      {previewImage && (
        <div className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setPreviewImage(null)}>
          <div className="relative animate-whatsapp-in" onClick={(e) => e.stopPropagation()}>
            <button className="absolute -top-16 left-1/2 -translate-x-1/2 text-white/40 hover:text-white flex flex-col items-center" onClick={() => setPreviewImage(null)}>
              <X size={32} strokeWidth={1.5} /><span className="text-[9px] font-bold tracking-[0.2em] mt-1 uppercase">Close</span>
            </button>
            <div className="w-[300px] h-[300px] md:w-[380px] md:h-[380px] rounded-full border-[6px] border-white shadow-2xl overflow-hidden bg-slate-800"><img src={previewImage} alt="Profile" className="w-full h-full object-cover select-none" /></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MembersPage;
import React, { useState } from 'react';
import axios from 'axios';

function AttendancePage({ token }) {
  const [memberId, setMemberId] = useState('');
  const [message, setMessage] = useState(null);
  const [isError, setIsError] = useState(false);

  const handleCheckIn = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await axios.post('http://localhost:5000/api/attendance/checkin', 
        { member_id: memberId },
        { headers: { 'x-auth-token': token } }
      );
      setMessage(res.data.message);
      setIsError(false);
      setMemberId(''); // Clear input on success
    } catch (err) {
      setMessage(err.response?.data?.message || "Check-in Failed");
      setIsError(true);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold">Member Check-in</h1>
        <p className="text-slate-500">Enter Member ID to log attendance</p>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <form onSubmit={handleCheckIn} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Member ID</label>
            <input 
              type="text" 
              placeholder="e.g. 5"
              className="w-full border border-slate-200 p-4 rounded-2xl text-xl outline-none focus:ring-2 focus:ring-slate-900"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              required
            />
          </div>
          <button 
            type="submit" 
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-slate-800 transition shadow-lg"
          >
            Check In
          </button>
        </form>

        {message && (
          <div className={`mt-8 p-4 rounded-2xl text-center font-bold ${isError ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {message}
          </div>
        )}
      </div>

      <div className="mt-10 bg-slate-100 p-6 rounded-3xl border border-dashed border-slate-300">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Pro Tip</h3>
        <p className="text-slate-600 text-sm">In production, this screen would connect to a barcode scanner or RFID reader to automate the ID entry.</p>
      </div>
    </div>
  );
}

export default AttendancePage;
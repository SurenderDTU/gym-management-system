import React from 'react';

function SettingsPage() {
  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Gym Settings</h1>
      
      <div className="grid gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold mb-4">Gym Profile</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-500">Gym Name</label>
              <p className="text-lg font-semibold">GymVault Prime</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500">Subscription Tier</label>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">PRO PLAN</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm opacity-50 cursor-not-allowed">
          <h3 className="text-lg font-bold mb-2">Security</h3>
          <p className="text-sm text-slate-400">Change password and two-factor authentication (Coming in V2)</p>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
import React from 'react';
import { Lock } from 'lucide-react';

interface OwnerPinGateProps {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  pinError: string;
  loading?: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onBackToCustomer: () => void;
}
export function OwnerPinGate({ email, setEmail, password, setPassword, pinError, loading, onSubmit, onBackToCustomer }: OwnerPinGateProps) {
  return <div className="flex-1 flex items-center justify-center p-4 bg-slate-100">
    <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 sm:p-8 max-w-md w-full text-center space-y-5">
      <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto"><Lock className="w-8 h-8" /></div>
      <div><span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">Parbati Bhandar Admin</span>
        <h2 className="text-xl font-extrabold text-slate-900 mt-1">Store Owner Login (মালিক লগইন)</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">Sign in with your authorised owner email and Supabase password.</p></div>
      <form onSubmit={onSubmit} className="space-y-3">
        <input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Owner email" className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-300 focus:outline-none focus:border-emerald-600" />
        <input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Supabase account password" className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-300 focus:outline-none focus:border-emerald-600" />
        {pinError && <p role="alert" className="text-xs font-bold text-red-600 bg-red-50 py-2 px-3 rounded-xl">{pinError}</p>}
        <button disabled={loading} type="submit" className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-extrabold text-sm shadow-md">{loading ? 'Signing in…' : 'Sign in to Owner Portal'}</button>
      </form>
      <p className="text-xs text-slate-500">Your account must be registered as a store administrator. The old default PIN login has been disabled.</p>
      <button type="button" onClick={onBackToCustomer} className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline">← Back to Customer Storefront</button>
    </div>
  </div>;
}

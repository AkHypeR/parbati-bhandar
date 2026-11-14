import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, LockKeyhole, ShieldCheck, Store } from 'lucide-react';

interface OwnerPinGateProps {
  password: string;
  setPassword: (v: string) => void;
  pinError: string;
  loading?: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onBackToCustomer: () => void;
}

export function OwnerPinGate({ password, setPassword, pinError, loading, onSubmit, onBackToCustomer }: OwnerPinGateProps) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <main className="relative flex-1 overflow-hidden bg-[#f4f7f4] px-4 py-10 sm:py-16">
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-28 h-80 w-80 rounded-full bg-emerald-200/50 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -right-20 h-96 w-96 rounded-full bg-amber-100/70 blur-3xl" />
      <div className="relative mx-auto grid min-h-[520px] max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.10)] md:grid-cols-[1fr_1.05fr]">
        <section className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 p-7 text-white sm:p-10">
          <div aria-hidden="true" className="absolute -right-16 top-20 h-64 w-64 rounded-full border-[36px] border-white/5" />
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300 text-emerald-950 shadow-lg"><Store className="h-6 w-6" /></div>
            <p className="mt-8 text-xs font-black uppercase tracking-[0.22em] text-emerald-200">Parbati Bhandar</p>
            <h1 className="mt-3 max-w-sm text-3xl font-black leading-tight sm:text-4xl">Your store, made simpler.</h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-emerald-100/90">A single place to manage orders, products, stock and daily store operations.</p>
          </div>
          <div className="relative mt-12 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
            <ShieldCheck className="h-6 w-6 shrink-0 text-amber-300" />
            <div><p className="text-sm font-bold">Private owner access</p><p className="mt-0.5 text-xs text-emerald-100/80">Your access key is checked securely by the store server.</p></div>
          </div>
        </section>
        <section className="flex flex-col justify-center p-6 sm:p-10">
          <button type="button" onClick={onBackToCustomer} className="mb-10 inline-flex w-fit items-center gap-2 text-xs font-bold text-slate-500 transition hover:text-emerald-800"><ArrowLeft className="h-4 w-4" /> Back to customer store</button>
          <div className="mb-7">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><LockKeyhole className="h-6 w-6" /></div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Owner workspace</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Welcome back</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Enter your private owner access key to continue.</p>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block text-xs font-bold text-slate-700" htmlFor="owner-access-key">Owner access key</label>
            <div className="relative">
              <input id="owner-access-key" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required minLength={12} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your access key" className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-4 pr-12 text-sm font-semibold text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100" />
              <button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide access key' : 'Show access key'} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-slate-400 hover:text-slate-700">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </div>
            {pinError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-xs font-semibold leading-5 text-red-700">{pinError}</p>}
            <button disabled={loading || !password.trim()} type="submit" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-4 text-sm font-extrabold text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">{loading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Checking access…</> : <><LockKeyhole className="h-4 w-4" /> Unlock owner workspace</>}</button>
          </form>
          <p className="mt-6 text-center text-[11px] leading-5 text-slate-400">For authorised store owners only. Keep your access key private.</p>
        </section>
      </div>
    </main>
  );
}

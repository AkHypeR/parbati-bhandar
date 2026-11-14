import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, Eye, EyeOff, UserRound, Phone, Package, LogOut,
  UserPlus, LogIn, ShoppingBasket, Sparkles, CheckCircle2, Clock3,
  LockKeyhole, ArrowRight, ShieldCheck, ChevronRight, ReceiptText
} from 'lucide-react';
import { TurnstileWidget } from './TurnstileWidget';

type Customer = { id: string; name: string; phone: string };
type Order = { orderNumber?: number; status: string; total: number; createdAt: number; items: {name:string;quantity:number;unit:string}[] };

export function CustomerAccount({ customer, onAuthenticated, onLogout, onBack, onViewOrders }: {
  customer: Customer | null;
  onAuthenticated: (customer: Customer) => void;
  onLogout: () => void;
  onBack: () => void;
  onViewOrders: () => void;
}) {
  const [mode,setMode] = useState<'login'|'register'>('login');
  const [name,setName] = useState('');
  const [phone,setPhone] = useState('');
  const [password,setPassword] = useState('');
  const [showPassword,setShowPassword] = useState(false);
  const [turnstileToken,setTurnstileToken] = useState('');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [orders,setOrders] = useState<Order[]>([]);
  const [ordersLoading,setOrdersLoading] = useState(false);

  useEffect(() => {
    if (!customer) return;
    let active = true;
    const loadOrders = async (showLoading = false) => {
      if (showLoading) setOrdersLoading(true);
      try {
        const response = await fetch('/api/orders/track?history=1',{credentials:'same-origin',cache:'no-store'});
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load order history');
        if (active) { setOrders(Array.isArray(data.orders)?data.orders:[]); setError(''); }
      } catch (e) { if (active) setError((e as Error).message || 'Could not load order history'); }
      finally { if (active && showLoading) setOrdersLoading(false); }
    };
    void loadOrders(true);
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void loadOrders(); }, 15000);
    return () => { active = false; window.clearInterval(timer); };
  },[customer?.id]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!turnstileToken) { setError('Please complete the security verification below.'); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/customer-auth/'+(mode==='register'?'register':'login'),{
        method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({name,phone,password,turnstileToken})
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok) {
        const diagnostic = mode === 'register' && typeof data.code === 'string' ? ` (Reference: ${data.code})` : '';
        throw new Error((data.error || 'We couldn’t complete that. Please try again.') + diagnostic);
      }
      if (!data.customer?.id || !data.customer?.name || !data.customer?.phone) {
        throw new Error('Your account response was incomplete. Please try signing in again.');
      }
      onAuthenticated(data.customer);
      setPassword('');
    } catch(e) { setError((e as Error).message || 'Please try again in a moment.'); }
    finally { setBusy(false); }
  };

  const signOut = async () => {
    try { await fetch('/api/customer-auth/logout',{method:'POST',credentials:'same-origin'}); }
    finally { setOrders([]); onLogout(); }
  };

  const switchMode = (next: 'login'|'register') => {
    setMode(next); setError(''); setPassword(''); setShowPassword(false); setTurnstileToken('');
  };

  return (
    <main className="relative min-h-[78vh] flex-1 overflow-hidden bg-[#f5f8f2] px-4 py-7 sm:py-12">
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-emerald-200/50 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-amber-100/80 blur-3xl" />
      <div className="relative mx-auto max-w-5xl">
        <button onClick={onBack} className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white/80 px-4 py-2 text-sm font-bold text-emerald-900 shadow-sm transition hover:bg-white">
          <ArrowLeft className="h-4 w-4"/> Back to store
        </button>

        <section className="grid overflow-hidden rounded-[2rem] border border-white bg-white shadow-[0_24px_80px_-32px_rgba(6,78,59,0.28)] md:grid-cols-[0.92fr_1.08fr]">
          <aside className="relative hidden min-h-[590px] flex-col justify-between overflow-hidden bg-gradient-to-br from-[#064e3b] via-[#08634b] to-[#0d7660] p-9 text-white md:flex">
            <div aria-hidden="true" className="absolute -right-24 -top-20 h-72 w-72 rounded-full border-[36px] border-white/[0.06]"/>
            <div aria-hidden="true" className="absolute -bottom-28 -left-20 h-80 w-80 rounded-full border-[42px] border-amber-200/[0.09]"/>
            <div className="relative">
              <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-lg backdrop-blur">
                <ShoppingBasket className="h-7 w-7 text-amber-200"/>
              </div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-100">Parbati Bhandar</p>
              <h1 className="mt-4 max-w-sm text-4xl font-black leading-[1.12] tracking-tight">Your everyday shopping, made easier.</h1>
              <p className="mt-5 max-w-sm text-sm leading-7 text-emerald-50/85">Sign in once and keep your shopping details and order updates together in one place.</p>
              <div className="mt-9 space-y-4">
                <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10"><Package className="h-4 w-4 text-amber-200"/></span><span className="text-sm font-semibold">See your previous orders</span></div>
                <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10"><Clock3 className="h-4 w-4 text-amber-200"/></span><span className="text-sm font-semibold">Follow order progress</span></div>
                <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10"><CheckCircle2 className="h-4 w-4 text-amber-200"/></span><span className="text-sm font-semibold">Faster checkout next time</span></div>
              </div>
            </div>
            <div className="relative mt-12 rounded-2xl border border-white/15 bg-white/[0.08] p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-amber-200"><Sparkles className="h-4 w-4"/><span className="text-xs font-extrabold uppercase tracking-wider">A simpler way to shop</span></div>
              <p className="mt-2 text-xs leading-5 text-emerald-50/80">Your account keeps your name, mobile number and order history ready when you need them.</p>
            </div>
          </aside>

          <div className="p-5 sm:p-8 md:p-10">
            {customer ? (
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div><div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800"><UserRound className="h-5 w-5"/></div><p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Your account</p><h2 className="mt-1 text-2xl font-black text-slate-900">Welcome, {customer.name.split(' ')[0]}!</h2><p className="mt-1 text-sm text-slate-500">Your shopping details and orders in one place.</p></div>
                  <button onClick={signOut} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"><LogOut className="h-4 w-4"/> Sign out</button>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-lime-50 p-4">
                  <p className="font-extrabold text-slate-900">{customer.name}</p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-slate-600"><Phone className="h-4 w-4"/>{customer.phone}</p>
                  <p className="mt-3 text-xs font-semibold text-emerald-800">Your details are ready for your next checkout.</p>
                </div>
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <div><h3 className="font-extrabold text-slate-900">Your recent orders</h3><p className="mt-0.5 text-xs text-slate-500">A quick look at your latest shopping</p></div>
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><ReceiptText className="h-5 w-5"/></span>
                  </div>
                  {ordersLoading ? <p className="py-8 text-center text-sm text-slate-500">Loading your orders…</p> : orders.length===0 ? <div className="p-7 text-center text-sm text-slate-500"><Package className="mx-auto mb-2 h-7 w-7 text-slate-400"/>Your first order will appear here after checkout.</div> :
                    <div className="divide-y divide-slate-100">{orders.slice(0,2).map(order=><button type="button" key={order.orderNumber || order.createdAt} onClick={onViewOrders} className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-emerald-50/50"><span className="min-w-0"><span className="flex items-center gap-2"><strong className="text-sm text-slate-900">Order #{order.orderNumber || '—'}</strong><span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${order.status==='new'?'bg-blue-50 text-blue-800':order.status==='processing'?'bg-amber-50 text-amber-800':order.status==='ready'?'bg-emerald-50 text-emerald-800':order.status==='completed'?'bg-slate-100 text-slate-700':'bg-rose-50 text-rose-800'}`}>{order.status==='new'?'Received':order.status==='processing'?'Preparing':order.status==='ready'?'Ready':order.status==='completed'?'Completed':order.status==='cancelled'?'Cancelled':order.status==='unavailable'?'Update needed':order.status}</span></span><span className="mt-1 block truncate text-xs text-slate-500">{order.items.slice(0,2).map(i=>i.name+' × '+i.quantity).join(' · ')}{order.items.length>2?' · + more':''}</span><span className="mt-1 block text-[11px] text-slate-400">{new Date(order.createdAt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'})}</span></span><span className="shrink-0 text-sm font-black text-slate-900">₹{order.total}<ChevronRight className="ml-auto mt-1 h-4 w-4 text-emerald-700"/></span></button>)}</div>}
                  <button type="button" onClick={onViewOrders} className="flex w-full items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-3 text-sm font-extrabold text-emerald-800 hover:bg-emerald-50">View all orders and live updates <ArrowRight className="h-4 w-4"/></button>
                </div>
                {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
              </div>
            ) : (
              <>
                <div className="mb-7 text-center md:text-left">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800 md:hidden"><ShoppingBasket className="h-6 w-6"/></div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">Parbati Bhandar</p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{mode==='register'?'Create your account':'Welcome back'}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{mode==='register'?'Join us for a quicker, simpler checkout.':'Sign in to continue shopping and check your orders.'}</p>
                </div>

                <div className="mb-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
                  <button type="button" onClick={()=>switchMode('login')} className={`rounded-xl py-3 text-sm font-extrabold transition ${mode==='login'?'bg-white text-emerald-800 shadow-sm':'text-slate-500 hover:text-slate-800'}`}>Sign in</button>
                  <button type="button" onClick={()=>switchMode('register')} className={`rounded-xl py-3 text-sm font-extrabold transition ${mode==='register'?'bg-white text-emerald-800 shadow-sm':'text-slate-500 hover:text-slate-800'}`}>Create account</button>
                </div>

                <form onSubmit={submit} className="space-y-4">
                  {mode==='register' && <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-600">Full name
                    <span className="relative mt-2 block"><UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input required minLength={2} maxLength={80} value={name} onChange={e=>setName(e.target.value)} autoComplete="name" placeholder="Enter your full name" className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-semibold normal-case tracking-normal text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"/></span>
                  </label>}
                  <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-600">Mobile number
                    <span className="relative mt-2 block"><Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><span className="absolute left-11 top-1/2 -translate-y-1/2 border-r border-slate-200 pr-2 text-sm font-bold text-slate-500">+91</span><input required type="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,'').slice(0,10))} autoComplete="tel-national" placeholder="10-digit mobile number" className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-[4.4rem] pr-4 text-sm font-semibold tracking-normal text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"/></span>
                  </label>
                  <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-600">Password
                    <span className="relative mt-2 block"><LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input required type={showPassword?'text':'password'} minLength={mode==='register'?8:1} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='register'?'new-password':'current-password'} placeholder={mode==='register'?'Create a password (8+ characters)':'Enter your password'} className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-12 text-sm font-semibold tracking-normal text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"/><button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?'Hide password':'Show password'} className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-slate-400 hover:bg-slate-200/70 hover:text-slate-700">{showPassword?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>}</button></span>
                  </label>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                    <div className="mb-2 flex items-center gap-2 text-xs font-extrabold text-slate-800"><ShieldCheck className="h-4 w-4 text-emerald-700"/> Security verification</div>
                    <p className="mb-3 text-[11px] leading-5 text-slate-500">Complete this quick check to protect customer accounts from automated sign-ins.</p>
                    <TurnstileWidget key={mode} action={mode} onVerify={setTurnstileToken}/>
                    {turnstileToken && <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4"/> Verification complete</p>}
                  </div>
                  {error && <div role="alert" className="rounded-2xl border border-red-100 bg-red-50 p-3.5 text-sm font-semibold leading-5 text-red-700">{error}</div>}
                  <button disabled={busy || !turnstileToken} className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-700 to-emerald-600 py-4 text-sm font-black text-white shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60">
                    {busy?'Please wait…':mode==='register'?<><UserPlus className="h-4 w-4"/> Create my account</>:<><LogIn className="h-4 w-4"/> Sign in to my account</>}
                    {!busy && <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1"/>}
                  </button>
                </form>
                <div className="mt-6 flex items-center justify-center gap-2 text-xs font-medium text-slate-400"><CheckCircle2 className="h-4 w-4 text-emerald-600"/> Simple sign-in • Your details stay with your account</div>
              </>
            )}
          </div>
        </section>
        <p className="mt-5 text-center text-xs font-medium text-slate-500">Parbati Bhandar · Everyday essentials, closer to home</p>
      </div>
    </main>
  );
}

import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, Eye, EyeOff, UserRound, Phone, LogOut,
  UserPlus, LogIn, ShoppingBasket, Sparkles, CheckCircle2,
  LockKeyhole, ArrowRight, ShieldCheck, Download, Package, Clock3
} from 'lucide-react';
import { TurnstileWidget } from './TurnstileWidget';
import { CustomerOrders } from './CustomerOrders';

type Customer = { id: string; name: string; phone: string };
type AccountOrder = { orderNumber:number; status:string; total:number; createdAt:number; items:{name:string;quantity:number;unit:string}[] };

export function CustomerAccount({ customer, onAuthenticated, onLogout, onBack, onViewOrders, orderNumber, orderPhone, whatsappNumber, products, onNavigate }: {
  customer: Customer | null;
  onAuthenticated: (customer: Customer, created?: boolean) => void;
  onLogout: () => void;
  onBack: () => void;
  onViewOrders: (orderNumber?: number) => void;
  orderNumber?: number;
  orderPhone?: string;
  whatsappNumber?: string;
  products?: any[];
  onNavigate?: (path: string) => void;
}) {
  const [mode,setMode] = useState<'login'|'register'>('login');
  const [name,setName] = useState('');
  const [phone,setPhone] = useState('');
  const [password,setPassword] = useState('');
  const [showPassword,setShowPassword] = useState(false);
  const [turnstileToken,setTurnstileToken] = useState('');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [orders,setOrders] = useState<AccountOrder[]>([]);
  const [ordersLoading,setOrdersLoading] = useState(false);
  const [ordersError,setOrdersError] = useState('');
  useEffect(() => {
    if (!customer) { setOrders([]); return; }
    let active = true; setOrdersLoading(true); setOrdersError('');
    const params = new URLSearchParams({history:'1',phone:String(customer.phone||'').replace(/\\D/g,'')});
    fetch('/api/orders/track?'+params.toString(),{credentials:'same-origin',cache:'no-store'})
      .then(async response => { const data=await response.json().catch(()=>({})); if(!response.ok) throw new Error(data.error||'Could not load your orders.'); return data; })
      .then(data => { if(active) setOrders(Array.isArray(data.orders)?data.orders:[]); })
      .catch(e => { if(active) setOrdersError((e as Error).message||'Could not load your orders.'); })
      .finally(() => { if(active) setOrdersLoading(false); });
    return () => { active=false; };
  },[customer?.id,customer?.phone]);
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
      onAuthenticated(data.customer, mode === 'register');
      setPassword('');
    } catch(e) { setError((e as Error).message || 'Please try again in a moment.'); }
    finally { setBusy(false); }
  };

  const signOut = async () => {
    try { await fetch('/api/customer-auth/logout',{method:'POST',credentials:'same-origin'}); }
    finally { onLogout(); }
  };

  const switchMode = (next: 'login'|'register') => {
    setMode(next); setError(''); setPassword(''); setShowPassword(false); setTurnstileToken('');
  };

  return (
    <main className="pb-customer-account relative min-h-dvh w-full flex-1 overflow-x-clip bg-[#f5f8f2] px-3 py-4 sm:px-4 sm:py-10">
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 hidden h-72 w-72 rounded-full bg-emerald-200/50 blur-3xl md:block" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-16 hidden h-80 w-80 rounded-full bg-amber-100/80 blur-3xl md:block" />
      <div className="relative mx-auto w-full min-w-0 max-w-5xl">
        <button onClick={onBack} className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white/80 px-4 py-2 text-sm font-bold text-emerald-900 shadow-sm transition hover:bg-white">
          <ArrowLeft className="h-4 w-4"/> Back to store
        </button>

        <section className={'min-w-0 overflow-hidden rounded-2xl border border-white bg-white shadow-[0_12px_36px_-24px_rgba(6,78,59,0.22)] sm:rounded-[2rem] ' + (customer ? 'block' : 'grid md:grid-cols-[0.92fr_1.08fr]')}>
          <aside className={'relative hidden min-h-[590px] flex-col justify-between overflow-hidden bg-gradient-to-br from-[#064e3b] via-[#08634b] to-[#0d7660] p-9 text-white md:flex ' + (customer ? '!hidden' : '')}>
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

          <div className="min-w-0 p-4 sm:p-8 md:p-10">
            {customer ? (
              <div className="pb-account-dashboard space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">PARBATI VANDAR · ACCOUNT</p>
                    <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Hello, {customer.name.split(' ')[0]}</h2>
                    <p className="mt-1 text-sm text-slate-500">Manage your personal details and account access.</p>
                  </div>
                  <button onClick={signOut} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"><LogOut className="h-4 w-4"/> Sign out</button>
                </div>
                {orderNumber && orderPhone && products && onNavigate && <CustomerOrders orderNumber={orderNumber} phone={orderPhone} whatsappNumber={whatsappNumber || '919734765207'} products={products} onNavigate={onNavigate} onBack={() => onNavigate('/account')} />}
                <section className="pb-account-hero relative overflow-hidden rounded-3xl p-5 text-white sm:p-7">
                  <div aria-hidden="true" className="absolute -right-12 -top-16 h-52 w-52 rounded-full border-[26px] border-white/10"/>
                  <div className="relative flex items-center gap-4">
                    <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/15 text-2xl font-black shadow-inner">{customer.name.trim().charAt(0).toUpperCase()}</span>
                    <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-100">Customer profile</p><h3 className="mt-1 truncate text-xl font-black">{customer.name}</h3><p className="mt-1 text-sm text-white/80">Parbati Vandar member</p></div>
                    <span className="ml-auto hidden shrink-0 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold sm:inline-flex"><CheckCircle2 className="h-3.5 w-3.5"/> Account active</span>
                  </div>
                  <div className="relative mt-6 grid gap-3 border-t border-white/15 pt-4 sm:grid-cols-2">
                    <div><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">Registered mobile</p><p className="mt-1 flex items-center gap-2 text-sm font-bold"><Phone className="h-4 w-4 text-amber-200"/>{customer.phone}</p></div>
                    <div><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">Account security</p><p className="mt-1 flex items-center gap-2 text-sm font-bold"><ShieldCheck className="h-4 w-4 text-amber-200"/> Password protected</p></div>
                  </div>
                </section>
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><UserRound className="h-5 w-5"/></span><div><h3 className="font-extrabold text-slate-900">Personal information</h3><p className="text-xs text-slate-500">Your registered account details</p></div></div>
                  <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-4"><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Full name</dt><dd className="mt-1 break-words text-sm font-bold text-slate-900">{customer.name}</dd></div>
                    <div className="rounded-xl bg-slate-50 p-4"><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Mobile number</dt><dd className="mt-1 text-sm font-bold text-slate-900">+91 {customer.phone}</dd></div>
                  </dl>
                </section>
                <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 bg-emerald-50/60 px-5 py-4"><div><h3 className="font-extrabold text-slate-900">Your orders</h3><p className="mt-0.5 text-xs text-slate-500">Track active orders and view completed orders here.</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-emerald-800">{orders.length} {orders.length===1?'order':'orders'}</span></div>
                  {ordersLoading ? <p className="px-5 py-8 text-center text-sm text-slate-500">Loading your orders…</p> : ordersError ? <p role="alert" className="px-5 py-5 text-sm font-semibold text-rose-700">{ordersError}</p> : orders.length===0 ? <div className="px-5 py-9 text-center"><ShoppingBasket className="mx-auto h-8 w-8 text-slate-300"/><p className="mt-2 text-sm font-bold text-slate-800">No orders yet</p><p className="mt-1 text-xs text-slate-500">Your grocery orders will appear here after checkout.</p></div> :
                    <div className="divide-y divide-slate-100">{orders.map(order => <button key={order.orderNumber} type="button" onClick={()=>onViewOrders(order.orderNumber)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-emerald-50/50">
                      <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><strong className="text-sm text-slate-900">Order #{order.orderNumber}</strong><span className={'rounded-full px-2.5 py-1 text-[10px] font-extrabold '+(order.status==='completed'?'bg-emerald-100 text-emerald-800':order.status==='cancelled'?'bg-rose-100 text-rose-700':'bg-amber-100 text-amber-800')}>{order.status==='new'||order.status==='review'?'Received':order.status==='processing'?'Being prepared':order.status==='ready'?'Ready for pickup':order.status==='completed'?'Completed':order.status==='cancelled'?'Cancelled':order.status}</span></span><span className="mt-1 block truncate text-xs text-slate-500">{order.items?.slice(0,2).map(item=>item.name+' × '+item.quantity).join(' · ')}{order.items?.length>2?' · + more':''}</span><span className="mt-1 block text-[11px] text-slate-400">{new Date(order.createdAt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'})}</span></span>
                      <span className="shrink-0 text-right"><strong className="block text-sm text-slate-900">₹{order.total}</strong><span className="mt-1 inline-flex items-center gap-1 rounded-lg bg-emerald-800 px-3 py-2 text-xs font-extrabold text-white">{order.status==='completed'?'View':'Track'} <ArrowRight className="h-3.5 w-3.5"/></span></span>
                    </button>)}</div>}
                </section>
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-800"/><div><h3 className="text-sm font-extrabold text-slate-900">Your account, kept secure</h3><p className="mt-1 text-xs leading-5 text-slate-600">Your profile is linked to your registered mobile number. Order history and notifications have their own dedicated sections.</p></div></div></div>
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
            <section aria-label="Download the Parbati Bhandar Android app" className="mt-6 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-lime-50 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-700 text-white"><Download className="h-5 w-5"/></span>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-slate-900">Download Parbati Bhandar App</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-600">Get the Android app for convenient grocery shopping from your phone.</p>
                    <span className="mt-2 inline-flex rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-800">Android APK · Version 1.0.0</span>
                  </div>
                </div>
                <a href="https://expo.dev/artifacts/eas/Ygu8qZWb165XkroJ4GTELlXIdaK91YVxbeTbMvxDzeI.apk" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-700/20 sm:w-auto">
                  <Download className="h-4 w-4"/> Download app
                </a>
              </div>
            </section>
          </div>
        </section>
        <p className="mt-5 text-center text-xs font-medium text-slate-500">Parbati Bhandar · Everyday essentials, closer to home</p>
      </div>
    </main>
  );
}

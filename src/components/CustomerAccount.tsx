import React, { useEffect, useState } from 'react';
import { ArrowLeft, LockKeyhole, UserRound, Phone, Package, LogOut, UserPlus, LogIn } from 'lucide-react';

type Customer = { id: string; name: string; phone: string };
type Order = { status: string; total: number; createdAt: number; items: {name:string;quantity:number;unit:string}[] };

export function CustomerAccount({ customer, onAuthenticated, onLogout, onBack }: {
  customer: Customer | null;
  onAuthenticated: (customer: Customer) => void;
  onLogout: () => void;
  onBack: () => void;
}) {
  const [mode,setMode] = useState<'login'|'register'>('login');
  const [name,setName] = useState('');
  const [phone,setPhone] = useState('');
  const [password,setPassword] = useState('');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [orders,setOrders] = useState<Order[]>([]);
  const [ordersLoading,setOrdersLoading] = useState(false);

  useEffect(() => {
    if (!customer) return;
    setOrdersLoading(true);
    fetch('/api/orders/track?history=1',{credentials:'same-origin',cache:'no-store'})
      .then(async r => { const data=await r.json(); if(!r.ok) throw new Error(data.error || 'Could not load order history'); setOrders(Array.isArray(data.orders)?data.orders:[]); })
      .catch(e => setError(e.message || 'Could not load order history'))
      .finally(()=>setOrdersLoading(false));
  },[customer?.id]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/customer-auth/'+(mode==='register'?'register':'login'),{
        method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({name,phone,password})
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(data.error || 'Could not sign in');
      onAuthenticated(data.customer);
      setPassword('');
    } catch(e) { setError((e as Error).message || 'Please try again'); }
    finally { setBusy(false); }
  };

  const signOut = async () => {
    await fetch('/api/customer-auth/logout',{method:'POST',credentials:'same-origin'});
    setOrders([]); onLogout();
  };

  return (
    <main className="min-h-[70vh] flex-1 bg-[#f4f8f3] px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-lg">
        <button onClick={onBack} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-emerald-800"><ArrowLeft className="h-4 w-4"/> Back to store</button>
        <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
          <div className="bg-emerald-800 px-6 py-7 text-white">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><UserRound className="h-6 w-6"/></div>
            <h1 className="text-2xl font-black">{customer ? 'My account' : mode==='register' ? 'Create your account' : 'Welcome back'}</h1>
            <p className="mt-1 text-sm text-emerald-100">{customer ? 'Your saved details and recent orders' : 'Sign in to continue checkout and manage your orders.'}</p>
          </div>
          {customer ? (
            <div className="space-y-5 p-5 sm:p-6">
              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="font-extrabold text-slate-900">{customer.name}</p>
                <p className="mt-1 flex items-center gap-2 text-sm text-slate-600"><Phone className="h-4 w-4"/>{customer.phone}</p>
                <p className="mt-3 text-xs font-semibold text-emerald-800">You are signed in. Your details will be used automatically at checkout.</p>
              </div>
              <div>
                <div className="mb-3 flex items-center justify-between"><h2 className="font-extrabold text-slate-900">Recent orders</h2><span className="text-xs text-slate-500">Last 7 days</span></div>
                {ordersLoading ? <p className="py-5 text-center text-sm text-slate-500">Loading orders…</p> : orders.length===0 ? <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500"><Package className="mx-auto mb-2 h-6 w-6"/>No recent orders yet.</div> :
                  <div className="space-y-2">{orders.map(order=><div key={order.createdAt} className="rounded-xl border border-slate-200 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Order placed</p><strong className="text-sm">{new Date(order.createdAt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}</strong></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${order.status==='new'?'bg-blue-50 text-blue-800':order.status==='processing'?'bg-amber-50 text-amber-800':order.status==='ready'?'bg-emerald-50 text-emerald-800':order.status==='completed'?'bg-slate-100 text-slate-700':'bg-rose-50 text-rose-800'}`}>{order.status==='new'?'Order received':order.status==='processing'?'Processing':order.status==='ready'?'Ready for pickup':order.status==='completed'?'Completed':order.status==='cancelled'?'Cancelled':order.status==='unavailable'?'Availability update':order.status}</span></div><p className="mt-2 text-xs text-slate-500">{order.items.map(i=>i.name+' × '+i.quantity+' '+i.unit).join(', ')}</p><p className="mt-2 text-sm font-extrabold text-slate-800">₹{order.total}</p></div>)}</div>}
              </div>
              {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
              <button onClick={signOut} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700"><LogOut className="h-4 w-4"/> Sign out</button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4 p-5 sm:p-6">
              {mode==='register' && <label className="block text-sm font-bold text-slate-700">Full name<input required minLength={2} maxLength={80} value={name} onChange={e=>setName(e.target.value)} autoComplete="name" placeholder="Enter your name" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-3 font-medium outline-none focus:border-emerald-600"/></label>}
              <label className="block text-sm font-bold text-slate-700">Mobile number<input required type="tel" inputMode="numeric" maxLength={15} value={phone} onChange={e=>setPhone(e.target.value)} autoComplete="tel" placeholder="10-digit mobile number" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-3 font-medium outline-none focus:border-emerald-600"/></label>
              <label className="block text-sm font-bold text-slate-700">Password<input required type="password" minLength={mode==='register'?8:1} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='register'?'new-password':'current-password'} placeholder={mode==='register'?'At least 8 characters':'Enter your password'} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-3 font-medium outline-none focus:border-emerald-600"/></label>
              {mode==='register' && <p className="text-xs leading-5 text-slate-500">Your password is stored as a secure hash, not readable text. We only save your name and phone number for checkout.</p>}
              {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
              <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 py-3.5 text-sm font-extrabold text-white disabled:opacity-60">{busy?'Please wait…':mode==='register'?<><UserPlus className="h-4 w-4"/> Create account</>:<><LogIn className="h-4 w-4"/> Sign in</>}</button>
              <button type="button" onClick={()=>{setMode(mode==='login'?'register':'login');setError('');}} className="w-full py-2 text-sm font-bold text-emerald-800">{mode==='login'?"New customer? Create an account":"Already registered? Sign in"}</button>
            </form>
          )}
        </section>
        <p className="mt-4 text-center text-xs text-slate-500">Your account is used only for checkout and order history.</p>
      </div>
    </main>
  );
}

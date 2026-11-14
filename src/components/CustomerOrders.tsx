import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, PackageCheck, ShoppingBag, Clock3, CheckCircle2, ChefHat, Truck, ReceiptText, RefreshCw, ShieldCheck } from 'lucide-react';

type OrderItem = { name: string; quantity: number; unit: string; price?: number; lineTotal?: number; unavailable?: boolean };
type Order = { id?: string; orderNumber: number; status: string; total: number; originalTotal?: number; unavailableDeduction?: number; createdAt: number; updatedAt?: number; readyAt?: number | null; estimatedReadyAt?: number | null; items: OrderItem[] };

const statusLabel = (status: string) => {
  const labels: Record<string, string> = { new: 'Received', processing: 'Being prepared', ready: 'Ready for pickup', completed: 'Completed', cancelled: 'Cancelled', unavailable: 'Availability update' };
  return labels[status] || status;
};
const steps = [
  { key: 'new', title: 'Order received', detail: 'Your order is safely placed with Parbati Bhandar.', icon: CheckCircle2 },
  { key: 'processing', title: 'Being prepared', detail: 'The store is preparing your grocery items.', icon: ChefHat },
  { key: 'ready', title: 'Ready', detail: 'Your order is ready for pickup or delivery.', icon: PackageCheck },
  { key: 'completed', title: 'Completed', detail: 'Your order has been completed. Thank you!', icon: Truck },
];
const formatDate = (value: number) => new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
const formatTime = (value: number) => new Date(value).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });

export function CustomerOrders({ orderNumber, phone, whatsappNumber, onNavigate, onBack }: { orderNumber?: number; phone: string; whatsappNumber?: string; onNavigate: (path: string) => void; onBack: () => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editQuantities, setEditQuantities] = useState<number[]>([]);
  const [savingAction, setSavingAction] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const requestInFlight = useRef(false);

  const load = useCallback(async (initial = false) => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    if (initial) setLoading(true);
    else setRefreshing(true);
    try {
      const params = new URLSearchParams({ phone: phone.replace(/\D/g, '') });
      if (orderNumber) params.set('orderNumber', String(orderNumber));
      else params.set('history', '1');
      const url = '/api/orders/track?' + params.toString();
      const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not load your order.');
      if (orderNumber) setSelected({ ...data, orderNumber: Number(data.orderNumber || orderNumber) });
      else setOrders(Array.isArray(data.orders) ? data.orders : []);
      setError('');
    } catch (e) {
      setError((e as Error).message || 'Could not load your order.');
    } finally {
      requestInFlight.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderNumber, phone]);

  useEffect(() => {
    void load(true);
  }, [load]);

  useEffect(() => {
    if (orderNumber && selected && ['completed', 'cancelled'].includes(selected.status)) return;
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    const timer = window.setInterval(refreshIfVisible, 15000);
    document.addEventListener('visibilitychange', refreshIfVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [load, orderNumber, selected?.status]);

  const currentIndex = selected ? steps.findIndex(step => step.key === selected.status) : -1;
  const exceptional = selected?.status === 'cancelled' || selected?.status === 'unavailable';
  const cancelOrder = async () => {
    if (!selected || savingAction || !window.confirm('Cancel this order? It can only be cancelled before processing starts.')) return;
    setSavingAction(true); setActionMessage('');
    try {
      const response = await fetch('/api/orders/manage', { method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id:selected.id,action:'cancel'}) });
      const data = await response.json().catch(()=>({}));
      if (!response.ok) throw new Error(data.error || 'Could not cancel this order.');
      setEditing(false); await load(true);
      setActionMessage('Your order has been cancelled. Inventory has been updated.');
    } catch(error) { setActionMessage((error as Error).message || 'Could not cancel this order.'); }
    finally { setSavingAction(false); }
  };
  const saveOrderEdit = async () => {
    if (!selected || savingAction) return;
    setSavingAction(true); setActionMessage('');
    try {
      const response = await fetch('/api/orders/manage', { method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id:selected.id,action:'edit',quantities:editQuantities}) });
      const data = await response.json().catch(()=>({}));
      if (!response.ok) throw new Error(data.error || 'Could not update this order.');
      setEditing(false); await load(true);
      setActionMessage('Your order has been updated successfully.');
    } catch(error) { setActionMessage((error as Error).message || 'Could not update this order.'); }
    finally { setSavingAction(false); }
  };

  return (
    <main className="min-h-dvh w-full overflow-x-clip bg-[#f5f8f2] px-3 py-4 sm:px-4 sm:py-10">
      <div className="mx-auto w-full min-w-0 max-w-4xl">
        <button type="button" onClick={orderNumber ? () => onNavigate('/orders') : onBack} className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white px-4 py-2 text-sm font-bold text-emerald-900 shadow-sm hover:bg-emerald-50">
          <ArrowLeft className="h-4 w-4"/> {orderNumber ? 'All orders' : 'Back to account'}
        </button>
        <section className="min-w-0 overflow-hidden rounded-2xl border border-white bg-white shadow-[0_12px_36px_-24px_rgba(6,78,59,.22)] sm:rounded-[2rem]">
          <header className="relative overflow-hidden bg-gradient-to-br from-[#064e3b] via-[#087256] to-[#0e8063] px-6 py-8 text-white sm:px-9 sm:py-10">
            <div aria-hidden="true" className="absolute -right-10 -top-20 h-56 w-56 rounded-full border-[30px] border-white/[.07]"/>
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[.25em] text-emerald-100">Parbati Bhandar · Order centre</p>
                <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{orderNumber ? 'Track your order' : 'Your orders'}</h1>
                <p className="mt-2 max-w-lg text-sm leading-6 text-emerald-50/85">{orderNumber ? 'Every update, item and total for this order — all in one place.' : 'Your grocery orders and their latest progress, together in one place.'}</p>
              </div>
              <span className="hidden h-14 w-14 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/10 text-amber-200 sm:grid"><PackageCheck className="h-7 w-7"/></span>
            </div>
            <div className="relative mt-6 flex flex-wrap gap-2 text-xs font-bold text-emerald-50">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5"><CheckCircle2 className="mr-1.5 inline h-3.5 w-3.5"/> Auto-refreshes every 15 seconds</span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5"><ShieldCheck className="mr-1.5 inline h-3.5 w-3.5"/> Private to your signed-in account</span>
            </div>
          </header>

          <div className="min-w-0 p-3 sm:p-8">
            <div className="mb-4 flex justify-end">
              <button type="button" onClick={() => void load()} disabled={loading || refreshing} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-extrabold text-emerald-800 shadow-sm transition hover:bg-emerald-50 disabled:opacity-60"><RefreshCw className={'h-4 w-4 ' + (refreshing ? 'animate-spin' : '')}/>{refreshing ? 'Refreshing…' : 'Refresh order details'}</button>
            </div>
            {loading && <div className="py-16 text-center text-sm font-semibold text-slate-500"><span className="mx-auto mb-3 block h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"/>Loading your orders…</div>}
            {!loading && error && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700">{error}<button type="button" onClick={() => onNavigate('/account')} className="mt-3 block font-extrabold underline">Go to sign in</button></div>}

            {!loading && !error && !orderNumber && orders.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-14 text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><ReceiptText className="h-7 w-7"/></span>
                <h2 className="mt-4 text-lg font-black text-slate-900">No orders just yet</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">When you place your first grocery order, you’ll see its progress and full details here.</p>
                <button type="button" onClick={onBack} className="mt-5 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-extrabold text-white hover:bg-emerald-800">Start shopping</button>
              </div>
            )}

            {!loading && !error && !orderNumber && orders.length > 0 && (
              <div className="space-y-3">
                {orders.map(order => (
                  <button type="button" key={order.orderNumber} onClick={() => onNavigate('/orders/' + order.orderNumber)} className="group flex w-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-800"><ShoppingBag className="h-5 w-5"/></span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <strong className="text-base text-slate-900">Your grocery order</strong>
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-800">{statusLabel(order.status)}</span>
                        </span>
                        <span className="mt-1 block truncate text-xs text-slate-500">{order.items.slice(0,3).map(item => item.name + ' × ' + item.quantity).join(' · ')}{order.items.length > 3 ? ' · + ' + (order.items.length - 3) + ' more' : ''}</span>
                        <span className="mt-1 flex items-center gap-1 text-[11px] text-slate-400"><Clock3 className="h-3 w-3"/>{formatDate(order.createdAt)}</span>{order.estimatedReadyAt && <span className="mt-1 block text-xs font-bold text-amber-700">Estimated ready: {formatTime(order.estimatedReadyAt)}</span>}
                      </span>
                    </span>
                    <span className="flex items-center justify-between gap-3 sm:justify-end">
                      <strong className="text-lg font-black text-slate-900">₹{order.total}</strong>
                      <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-extrabold text-white">Track <ArrowRight className="h-3.5 w-3.5"/></span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {!loading && !error && orderNumber && selected && (
              <div className="space-y-4 text-slate-900">
                <section className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-700"><Truck className="h-5 w-5"/></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold">{selected.status === 'completed' ? 'Your order was delivered!' : selected.status === 'cancelled' ? 'Your order was cancelled' : selected.status === 'ready' ? 'Your order is ready!' : selected.estimatedReadyAt ? 'Estimated ready in ' + Math.max(0, Math.ceil((selected.estimatedReadyAt - Date.now()) / 60000)) + ' minutes' : statusLabel(selected.status)}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{selected.readyAt ? 'Ready at ' + formatTime(selected.readyAt) : selected.estimatedReadyAt ? 'Estimated at ' + formatTime(selected.estimatedReadyAt) : 'We’ll update your order status here'}</p>
                  </div>
                  <span className="shrink-0 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-black text-white">#{selected.orderNumber}</span>
                </section>

                {!exceptional && <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-sm font-black">Order progress</h2><span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-extrabold text-emerald-800">{statusLabel(selected.status)}</span></div>
                  <ol className="grid grid-cols-4 gap-1">
                    {steps.map((step,index)=>{const Icon=step.icon;const done=currentIndex>=index;return <li key={step.key} className="min-w-0 text-center">
                      <span className={'mx-auto grid h-9 w-9 place-items-center rounded-full '+(done?'bg-emerald-700 text-white':'bg-slate-100 text-slate-400')}><Icon className="h-4 w-4"/></span>
                      <span className={'mt-2 block text-[10px] font-extrabold leading-4 '+(done?'text-emerald-800':'text-slate-400')}>{step.title}</span>
                    </li>;})}
                  </ol>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-600 transition-all" style={{width:((Math.max(0,currentIndex)/3)*100)+'%'}}/></div>
                </section>}
                {selected.status === 'cancelled' && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">This order was cancelled. Any inventory deducted for it has been restored.</div>}
                {actionMessage && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">{actionMessage}</p>}
                {selected.status === 'new' && <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-black text-slate-900">Change your order</h2><p className="mt-1 text-xs text-slate-600">You can edit or cancel until the store starts processing.</p></div>
                    {!editing ? <div className="flex gap-2"><button type="button" onClick={()=>{setEditQuantities(selected.items.map(item=>Number(item.quantity)||1));setEditing(true);setActionMessage('');}} className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-xs font-extrabold text-blue-800">Edit order</button><button type="button" onClick={()=>void cancelOrder()} disabled={savingAction} className="rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-60">{savingAction?'Please wait…':'Cancel order'}</button></div> : <button type="button" onClick={()=>setEditing(false)} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700">Close editor</button>}
                  </div>
                  {editing && <div className="mt-4 space-y-3">
                    {selected.items.map((item,index)=><div key={index} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                      <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-900">{item.name}</p><p className="text-[10px] text-slate-500">{item.unit} · ₹{item.price||0} each</p></div>
                      <div className="flex items-center gap-2"><button type="button" aria-label={'Decrease '+item.name} onClick={()=>setEditQuantities(q=>q.map((v,i)=>i===index?Math.max(0,v-1):v))} className="h-8 w-8 rounded-lg border border-slate-200 font-black">−</button><span className="w-5 text-center text-sm font-black">{editQuantities[index]||0}</span><button type="button" aria-label={'Increase '+item.name} onClick={()=>setEditQuantities(q=>q.map((v,i)=>i===index?Math.min(999,v+1):v))} className="h-8 w-8 rounded-lg border border-slate-200 font-black">+</button></div>
                    </div>)}
                    <div className="flex items-center justify-between gap-3 border-t border-blue-100 pt-3"><span className="text-xs font-bold text-slate-600">Revised estimate</span><strong className="text-lg font-black text-slate-900">₹{selected.items.reduce((sum,item,index)=>sum+(Number(item.price)||0)*(editQuantities[index]||0),0)}</strong></div>
                    <button type="button" onClick={()=>void saveOrderEdit()} disabled={savingAction||editQuantities.every(q=>q===0)} className="w-full rounded-xl bg-blue-800 px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50">{savingAction?'Saving changes…':'Save order changes'}</button>
                  </div>}
                </section>}
                {selected.status !== 'new' && <p className="rounded-xl bg-slate-50 p-3 text-[11px] font-semibold text-slate-500">Order changes and cancellation are locked after processing starts.</p>}
                <section className="rounded-lg border border-slate-200 bg-white px-3 py-3 sm:px-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="text-sm font-black">{selected.items.reduce((sum,item)=>sum+Number(item.quantity||0),0)} items in your order</h2>
                    <span className="text-[11px] text-slate-500">{formatDate(selected.createdAt)}</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {selected.items.map((item,index) => (
                      <div key={index} className="flex min-h-[58px] items-center gap-3 py-2.5">
                        <span className={'grid h-10 w-10 shrink-0 place-items-center rounded-md border ' + (item.unavailable ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-blue-700')}><ShoppingBag className="h-5 w-5"/></span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold leading-5 text-slate-900">{item.name}</p>
                          <p className="text-[10px] text-slate-500">{item.unit} · {item.quantity} {Number(item.quantity) === 1 ? 'unit' : 'units'}</p>
                          {item.unavailable && <p className="mt-0.5 text-[10px] font-bold text-amber-700">Unavailable · Removed from bill</p>}
                        </div>
                        <div className="shrink-0 text-right">
                          {item.unavailable && <p className="text-[10px] text-slate-400 line-through">₹{item.lineTotal ?? Number(item.price||0)*Number(item.quantity||0)}</p>}
                          <p className={'text-xs font-extrabold ' + (item.unavailable ? 'text-amber-700' : 'text-slate-900')}>{item.unavailable ? '₹0' : '₹' + (item.lineTotal ?? Number(item.price||0)*Number(item.quantity||0))}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white px-4 py-4">
                  <h2 className="mb-3 text-sm font-black">Bill summary</h2>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between gap-3"><span className="text-slate-600">Items total</span><span className="font-bold">₹{selected.originalTotal ?? (selected.total + Number(selected.unavailableDeduction || 0))}</span></div>
                    {Number(selected.unavailableDeduction || 0) > 0 && <div className="flex justify-between gap-3 text-amber-700"><span>Unavailable items deduction</span><span className="font-bold">−₹{selected.unavailableDeduction}</span></div>}
                    <div className="flex justify-between gap-3"><span className="text-slate-600">Handling fee</span><span className="font-bold text-blue-700">FREE</span></div>
                    <div className="flex justify-between gap-3"><span className="text-slate-600">Delivery fee</span><span className="font-bold text-blue-700">FREE</span></div>
                  </div>
                  <div className="mt-3 border-t border-slate-200 pt-3">
                    <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black">You pay</p><p className="text-[10px] text-slate-500">Final amount after availability updates</p></div><p className="text-xl font-black text-blue-800">₹{selected.total}</p></div>
                  </div>
                </section>

                <button type="button" onClick={() => onNavigate('/')} className="flex min-h-11 w-full items-center justify-center rounded-full bg-amber-400 px-5 py-3 text-xs font-black text-slate-950 shadow-sm transition hover:bg-amber-300">Continue shopping</button>
                <section className="rounded-lg bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-bold text-slate-600">Order ID</p><p className="mt-1 text-xs text-slate-700">#{selected.orderNumber}</p>
                  <p className="mt-2 text-[10px] text-slate-500">Last updated {formatDate(selected.updatedAt || selected.createdAt)}</p>
                </section>
                <section className="rounded-lg border border-slate-200 bg-white p-4">
                  <h2 className="text-xs font-black">Need help with your order?</h2>
                  <a
                    href={`https://wa.me/${String(whatsappNumber || '919734765207').replace(/\\D/g, '').replace(/^0+/, '')}?text=${encodeURIComponent(`নমস্কার Parbati Bhandar, আমার অর্ডার #${selected.orderNumber} সম্পর্কে সাহায্য দরকার।\\nCheckout phone: ${phone}\\nঅনুগ্রহ করে আমার সঙ্গে যোগাযোগ করুন।`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex w-full items-center justify-between border-t border-slate-100 pt-3 text-left"
                  ><span><span className="block text-xs font-bold">Message us on WhatsApp</span><span className="mt-0.5 block text-[10px] text-slate-500">Ask about an item or order update · Order #{selected.orderNumber}</span></span><ArrowRight className="h-4 w-4 text-slate-400"/></a>
                </section>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

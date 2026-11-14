import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, PackageCheck, ShoppingBag, Clock3, CheckCircle2, ChefHat, Truck, ReceiptText, RefreshCw, ShieldCheck } from 'lucide-react';

type OrderItem = { name: string; quantity: number; unit: string; price?: number; lineTotal?: number; unavailable?: boolean };
type Order = { orderNumber: number; status: string; total: number; createdAt: number; updatedAt?: number; readyAt?: number | null; estimatedReadyAt?: number | null; items: OrderItem[] };

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

export function CustomerOrders({ orderNumber, phone, onNavigate, onBack }: { orderNumber?: number; phone: string; onNavigate: (path: string) => void; onBack: () => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const requestInFlight = useRef(false);

  const load = async (initial = false) => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    if (initial) setLoading(true);
    else setRefreshing(true);
    try {
      const params = new URLSearchParams({ phone: phone.replace(/\\D/g, '') });
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
  };

  useEffect(() => {
    void load(true);
  }, [orderNumber, phone]);

  const currentIndex = selected ? steps.findIndex(step => step.key === selected.status) : -1;
  const exceptional = selected?.status === 'cancelled' || selected?.status === 'unavailable';

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
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5"><CheckCircle2 className="mr-1.5 inline h-3.5 w-3.5"/> Loads once when opened</span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5"><ShieldCheck className="mr-1.5 inline h-3.5 w-3.5"/> Verified with your checkout phone</span>
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
              <div className="space-y-5 text-slate-900">
                <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-50 text-blue-700"><PackageCheck className="h-5 w-5"/></span>
                      <div>
                        <p className="text-sm font-extrabold">{selected.status === 'completed' ? 'Your order was delivered!' : selected.status === 'ready' ? 'Your order is ready!' : selected.status === 'cancelled' ? 'This order was cancelled' : 'Your order is confirmed'}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{statusLabel(selected.status)}</p>
                      </div>
                    </div>
                    <span className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-center text-xs font-black leading-tight text-white">#{selected.orderNumber}</span>
                  </div>
                </div>

                {selected.estimatedReadyAt && !selected.readyAt && !["ready","completed","cancelled"].includes(selected.status) && (
                  <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"/>
                    <div><p className="text-sm font-extrabold text-amber-950">A little more time needed?</p><p className="mt-1 text-sm text-amber-900">The store estimates your order will be ready around {formatTime(selected.estimatedReadyAt)}.</p></div>
                  </div>
                )}

                <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 px-4 py-4 sm:px-5">
                    <div><h2 className="text-sm font-black">Order summary</h2><p className="mt-1 text-xs text-slate-500">Order #{selected.orderNumber}</p></div>
                    <div className="text-right"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Placed at</p><p className="mt-0.5 text-xs font-bold text-slate-700">{formatTime(selected.createdAt)}</p><p className="text-[11px] text-slate-500">{new Date(selected.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'})}</p></div>
                  </div>
                  <div className="flex gap-3 overflow-x-auto p-4 sm:p-5">
                    {selected.items.map((item,index) => (
                      <div key={index} className={'w-40 shrink-0 rounded-lg border p-3 ' + (item.unavailable ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 bg-white')}>
                        <div className="mx-auto grid h-16 w-16 place-items-center rounded-lg bg-slate-50 text-blue-700"><ShoppingBag className="h-8 w-8"/></div>
                        <p className="mt-2 line-clamp-2 min-h-8 text-center text-xs font-bold">{item.name}</p>
                        <p className="mt-1 text-center text-[11px] text-slate-500">{item.unit} · {item.quantity} {Number(item.quantity) === 1 ? 'unit' : 'units'}</p>
                        {item.unavailable ? <p className="mt-1 text-center text-[11px] font-extrabold text-amber-700">Unavailable · Deducted</p> : <p className="mt-1 text-center text-xs font-extrabold text-slate-800">₹{item.lineTotal ?? Number(item.price || 0) * Number(item.quantity || 0)}</p>}
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-4 sm:px-5">
                    {selected.items.some(item => item.unavailable) && (
                      <div className="mb-3 space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-500"><span>Original order amount</span><span>₹{selected.total + selected.items.filter(item=>item.unavailable).reduce((sum,item)=>sum+Number(item.price||0)*Number(item.quantity||0),0)}</span></div>
                        <div className="flex justify-between font-semibold text-amber-700"><span>Unavailable item deduction</span><span>−₹{selected.items.filter(item=>item.unavailable).reduce((sum,item)=>sum+Number(item.price||0)*Number(item.quantity||0),0)}</span></div>
                      </div>
                    )}
                    <div className="flex items-center justify-between"><span className="text-sm font-extrabold">Final amount payable</span><span className="text-xl font-black text-blue-800">₹{selected.total}</span></div>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                  <h2 className="text-sm font-black">Delivery details</h2>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-700"><Truck className="h-5 w-5"/></span>
                    <div><p className="text-xs font-bold">Checkout details verified</p><p className="mt-0.5 text-xs text-slate-500">Your order is linked to the phone number used at checkout.</p></div>
                  </div>
                </section>

                <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <h2 className="px-4 pb-2 pt-4 text-sm font-black sm:px-5">Need help with your order?</h2>
                  <button type="button" onClick={() => onNavigate('/account')} className="flex w-full items-center justify-between border-t border-slate-100 px-4 py-3 text-left hover:bg-slate-50 sm:px-5"><span><span className="block text-xs font-bold">Contact Parbati Bhandar</span><span className="mt-0.5 block text-[11px] text-slate-500">Ask about an item, delivery or order update</span></span><ArrowRight className="h-4 w-4 text-slate-400"/></button>
                  <button type="button" onClick={() => onNavigate('/')} className="flex w-full items-center justify-between border-t border-slate-100 px-4 py-3 text-left hover:bg-slate-50 sm:px-5"><span><span className="block text-xs font-bold">Continue shopping</span><span className="mt-0.5 block text-[11px] text-slate-500">Browse everyday grocery essentials</span></span><ArrowRight className="h-4 w-4 text-slate-400"/></button>
                </section>
                <p className="text-center text-[11px] text-slate-400">Last updated {formatDate(selected.updatedAt || selected.createdAt)}</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

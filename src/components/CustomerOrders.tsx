import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, PackageCheck, ShoppingBag, Clock3, CheckCircle2, ChefHat, Truck, ReceiptText, RefreshCw, ShieldCheck } from 'lucide-react';

type OrderItem = { name: string; quantity: number; unit: string; price?: number; lineTotal?: number; unavailable?: boolean };
type Order = { orderNumber: number; status: string; total: number; createdAt: number; updatedAt?: number; readyAt?: number | null; items: OrderItem[] };

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

export function CustomerOrders({ orderNumber, onNavigate, onBack }: { orderNumber?: number; onNavigate: (path: string) => void; onBack: () => void }) {
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
      const url = orderNumber ? '/api/orders/track?orderNumber=' + encodeURIComponent(String(orderNumber)) : '/api/orders/track?history=1';
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
  }, [orderNumber]);

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
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5"><ShieldCheck className="mr-1.5 inline h-3.5 w-3.5"/> Private to your account</span>
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
                        <span className="mt-1 flex items-center gap-1 text-[11px] text-slate-400"><Clock3 className="h-3 w-3"/>{formatDate(order.createdAt)}</span>
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
              <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-lime-50 p-5">
                  <div><p className="text-xs font-black uppercase tracking-widest text-emerald-700">Order placed</p><p className="mt-1 text-xl font-black tracking-tight text-slate-900">{formatDate(selected.createdAt)}</p><p className="mt-2 text-xs text-slate-500">{selected.readyAt ? `Ready at ${formatTime(selected.readyAt)}` : selected.status === "ready" || selected.status === "completed" ? "Ready time is being updated" : "We’ll show the ready time here once your order is ready."}</p></div>
                  <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-sm"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Order total</p><p className="mt-1 text-2xl font-black text-emerald-800">₹{selected.total}</p><span className="mt-1 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-extrabold text-emerald-800">{statusLabel(selected.status)}</span></div>
                </div>

                <section className="rounded-2xl border border-slate-200 p-5">
                  <div className="mb-5 flex items-center justify-between gap-2"><h2 className="font-black text-slate-900">Order journey</h2><span className="text-xs text-slate-400">Live status</span></div>
                  {exceptional ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">{selected.status === 'cancelled' ? 'This order has been cancelled. Please contact the store if you need help.' : 'The store has an availability update for this order. Please check with the store for details.'}</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                      {steps.map((step,index) => {
                        const Icon = step.icon;
                        const done = index <= currentIndex;
                        return <div key={step.key}>
                          <div className={'mb-3 grid h-11 w-11 place-items-center rounded-2xl ' + (done ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400')}><Icon className="h-5 w-5"/></div>
                          <p className={'text-sm font-extrabold ' + (done ? 'text-emerald-900' : 'text-slate-400')}>{step.title}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">{step.key === "ready" && selected.readyAt ? `Ready at ${formatTime(selected.readyAt)}` : step.detail}</p>
                          <div className={'mt-3 h-1.5 rounded-full ' + (done ? 'bg-emerald-500' : 'bg-slate-100')}/>
                        </div>;
                      })}
                    </div>
                  )}
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between bg-slate-50 px-5 py-4"><h2 className="font-black text-slate-900">Items in this order</h2><span className="text-xs font-bold text-slate-500">{selected.items.length} product lines</span></div>
                  <div className="divide-y divide-slate-100">
                    {selected.items.map((item,index) => (
                      <div key={index} className="flex items-center justify-between gap-4 px-5 py-4">
                        <div className="min-w-0"><p className="text-sm font-bold text-slate-900">{item.name}</p><p className="mt-1 text-xs text-slate-500">{item.unit} × {item.quantity}{item.unavailable ? ' · Availability issue' : ''}</p></div>
                        <p className="shrink-0 text-sm font-extrabold text-slate-800">{item.lineTotal !== undefined ? '₹' + item.lineTotal : ''}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 bg-emerald-50/70 px-5 py-4"><span className="font-extrabold text-slate-800">Total payable</span><span className="text-xl font-black text-emerald-800">₹{selected.total}</span></div>
                </section>
                <p className="text-center text-xs text-slate-400">Last updated {formatDate(selected.updatedAt || selected.createdAt)} · Refresh whenever you need the latest status</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

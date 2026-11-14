import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bell, BellRing, Trash2, CheckCheck, LogIn } from 'lucide-react';

type Customer = { id: string; name: string; phone: string };
type InboxNotification = { id: string; title: string; body: string; createdAt: number; readAt: number | null };

export function CustomerNotifications({ customer, onBack, onSignIn }: {
  customer: Customer | null;
  onBack: () => void;
  onSignIn: () => void;
}) {
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    if (!customer) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/customer-inbox', {
        credentials: 'same-origin', cache: 'no-store',
        headers: { Accept: 'application/json' }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not load notifications.');
      setItems(Array.isArray(data.notifications) ? data.notifications : []);
      setLoaded(true);
    } catch (e) {
      setError((e as Error).message || 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (customer) void load(); }, [customer?.id]);

  const markRead = async (id: string) => {
    setBusyId(id);
    try {
      const response = await fetch('/api/customer-inbox', {
        method: 'PATCH', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not update notification.');
      setItems(previous => previous.map(item => item.id === id ? { ...item, readAt: item.readAt || Date.now() } : item));
    } catch (e) { setError((e as Error).message || 'Could not update notification.'); }
    finally { setBusyId(''); }
  };

  const markAllRead = async () => {
    setBusyId('all');
    try {
      const response = await fetch('/api/customer-inbox', {
        method: 'PATCH', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAllRead: true })
      });
      if (!response.ok) throw new Error('Could not mark notifications as read.');
      const now = Date.now();
      setItems(previous => previous.map(item => ({ ...item, readAt: item.readAt || now })));
    } catch (e) { setError((e as Error).message || 'Could not update notifications.'); }
    finally { setBusyId(''); }
  };

  const remove = async (id?: string) => {
    const all = !id;
    if (all && !window.confirm('Delete all notifications? This cannot be undone.')) return;
    setBusyId(id || 'all');
    try {
      const response = await fetch('/api/customer-inbox', {
        method: 'DELETE', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(all ? { deleteAll: true } : { id })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not delete notification.');
      setItems(previous => all ? [] : previous.filter(item => item.id !== id));
    } catch (e) { setError((e as Error).message || 'Could not delete notification.'); }
    finally { setBusyId(''); }
  };

  const unreadCount = items.filter(item => !item.readAt).length;

  return (
    <main className="min-h-dvh flex-1 bg-[#f4f7fc] px-3 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <button type="button" onClick={onBack} className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" /> Back to store
        </button>
        <section className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-5 sm:px-7">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-100 text-blue-800"><BellRing className="h-6 w-6" /></span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Parbati Bhandar</p>
                <h1 className="text-2xl font-black text-slate-900">Notifications</h1>
                <p className="text-xs text-slate-500">{customer ? unreadCount + ' unread' : 'Sign in to view your store updates'}</p>
              </div>
            </div>
            {customer && items.length > 0 && <div className="flex flex-wrap gap-2">
              {unreadCount > 0 && <button type="button" onClick={() => void markAllRead()} disabled={!!busyId} className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-extrabold text-blue-800 disabled:opacity-50"><CheckCheck className="h-4 w-4" /> Mark all read</button>}
              <button type="button" onClick={() => void remove()} disabled={!!busyId} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-extrabold text-rose-700 disabled:opacity-50"><Trash2 className="h-4 w-4" /> Delete all</button>
            </div>}
          </div>
          {!customer ? <div className="px-6 py-12 text-center">
            <LogIn className="mx-auto h-9 w-9 text-slate-400" />
            <h2 className="mt-3 text-lg font-black text-slate-900">Sign in to see notifications</h2>
            <p className="mt-1 text-sm text-slate-500">Your store announcements will be saved to your account.</p>
            <button type="button" onClick={onSignIn} className="mt-5 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-extrabold text-white hover:bg-emerald-800">Sign in / Create account</button>
          </div> : loading && !loaded ? <div className="px-6 py-12 text-center text-sm text-slate-500">Loading your notifications…</div> : items.length === 0 ? <div className="px-6 py-14 text-center">
            <Bell className="mx-auto h-9 w-9 text-slate-300" />
            <h2 className="mt-3 text-lg font-black text-slate-900">You’re all caught up</h2>
            <p className="mt-1 text-sm text-slate-500">New store announcements will appear here.</p>
          </div> : <div className="divide-y divide-slate-100">
            {items.map(item => <article key={item.id} className={'px-5 py-4 sm:px-7 ' + (!item.readAt ? 'bg-blue-50/40' : 'bg-white')}>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-800"><Bell className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="font-extrabold text-slate-900">{item.title}</h2>{!item.readAt && <span className="rounded-full bg-blue-700 px-2 py-0.5 text-[10px] font-black text-white">NEW</span>}</div>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.body}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">{new Date(item.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  {!item.readAt && <button type="button" onClick={() => void markRead(item.id)} disabled={!!busyId} aria-label="Mark as read" title="Mark as read" className="rounded-lg p-2 text-blue-700 hover:bg-blue-100 disabled:opacity-50"><CheckCheck className="h-4 w-4" /></button>}
                  <button type="button" onClick={() => void remove(item.id)} disabled={!!busyId} aria-label="Delete notification" title="Delete notification" className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </article>)}
          </div>}
          {error && <p role="alert" className="border-t border-rose-100 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700">{error}</p>}
          {customer && !loading && loaded && items.length > 0 && <p className="border-t border-slate-100 px-5 py-3 text-center text-[11px] text-slate-400">Notifications are private to your account. Delete them whenever you wish.</p>}
        </section>
      </div>
    </main>
  );
}

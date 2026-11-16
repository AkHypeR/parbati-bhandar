import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bell, BellRing, Trash2, CheckCheck, LogIn, BellOff, ShieldCheck } from 'lucide-react';

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

  const [pushState, setPushState] = useState<'off'|'working'|'on'|'unsupported'|'error'>('off');
  const [pushMessage, setPushMessage] = useState('');
  const toUint8 = (value: string) => {
    const padding = '='.repeat((4 - value.length % 4) % 4);
    return Uint8Array.from(atob((value + padding).replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  };
  useEffect(() => {
    if (!customer || !('serviceWorker' in navigator)) return;
    let active = true;
    navigator.serviceWorker.getRegistration('/sw.js').then(async registration => {
      const subscription = await registration?.pushManager.getSubscription();
      if (active && subscription) setPushState('on');
    }).catch(() => {});
    return () => { active = false; };
  }, [customer?.id]);
  const togglePush = async () => {
    if (pushState === 'on') {
      setPushState('working');
      try {
        const registration = await navigator.serviceWorker.getRegistration('/sw.js');
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) await subscription.unsubscribe();
        const response = await fetch('/api/customer-notifications', { method:'DELETE', credentials:'same-origin' });
        if (!response.ok) throw new Error('Could not update your notification settings.');
        setPushState('off'); setPushMessage('Push notifications are turned off on this device.');
      } catch (e) { setPushState('error'); setPushMessage((e as Error).message || 'Could not turn off notifications.'); }
      return;
    }
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setPushState('unsupported'); setPushMessage('This browser does not support push notifications.'); return;
    }
    setPushState('working'); setPushMessage('');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Please allow notifications in your browser settings.');
      const keyResponse = await fetch('/api/push-key', { cache:'no-store' });
      const keyData = await keyResponse.json();
      if (!keyResponse.ok || !keyData.publicKey) throw new Error('Push notifications are not configured yet.');
      const registration = await navigator.serviceWorker.register('/sw.js');
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing || await registration.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey:toUint8(keyData.publicKey) });
      const saved = await fetch('/api/customer-notifications', { method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'}, body:JSON.stringify({subscription:subscription.toJSON()}) });
      const result = await saved.json().catch(() => ({}));
      if (!saved.ok) throw new Error(result.error || 'Could not save notification settings.');
      setPushState('on'); setPushMessage('You’ll receive store announcements and important order alerts on this device.');
    } catch (e) { setPushState('error'); setPushMessage((e as Error).message || 'Could not enable notifications.'); }
  };

  const unreadCount = items.filter(item => !item.readAt).length;

  return (
    <main className="pb-customer-notifications min-h-dvh flex-1 bg-[#f5f7f2] px-3 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <button type="button" onClick={onBack} className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" /> Back to store
        </button>
        {customer && <section className="pb-notification-preferences mb-5 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><BellRing className="h-5 w-5"/></span>
            <div className="min-w-0 flex-1"><h2 className="font-extrabold text-slate-900">Push notification settings</h2><p className="mt-1 text-xs leading-5 text-slate-500">Enable notifications to receive store announcements and order updates from Parbati Vandar.</p></div>
            <span className={'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ' + (pushState==='on'?'bg-emerald-100 text-emerald-800':'bg-slate-100 text-slate-600')}>{pushState==='on'?'ENABLED':'OFF'}</span>
          </div>
          <button type="button" onClick={togglePush} disabled={pushState==='working'||pushState==='unsupported'} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-emerald-900 disabled:opacity-60">{pushState==='working'?'Updating…':pushState==='on'?<><BellOff className="h-4 w-4"/> Turn off notifications</>:<><Bell className="h-4 w-4"/> Enable push notifications</>}</button>
          {pushMessage && <p role="status" className={'mt-2 text-xs font-semibold '+(pushState==='error'||pushState==='unsupported'?'text-rose-700':'text-emerald-700')}>{pushMessage}</p>}
          <p className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-400"><ShieldCheck className="h-3.5 w-3.5"/> You can change this setting at any time.</p>
        </section>}
        <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-amber-50 px-5 py-5 sm:px-7">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-800"><BellRing className="h-6 w-6" /></span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-800">Parbati Bhandar</p>
                <h1 className="text-2xl font-black text-slate-900">Notifications</h1>
                <p className="text-xs text-slate-500">{customer ? unreadCount + ' unread' : 'Sign in to view your store updates'}</p>
              </div>
            </div>
            {customer && items.length > 0 && <div className="flex flex-wrap gap-2">
              {unreadCount > 0 && <button type="button" onClick={() => void markAllRead()} disabled={!!busyId} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-extrabold text-emerald-800 disabled:opacity-50"><CheckCheck className="h-4 w-4" /> Mark all read</button>}
              <button type="button" onClick={() => void remove()} disabled={!!busyId} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-extrabold text-rose-700 disabled:opacity-50"><Trash2 className="h-4 w-4" /> Delete all</button>
            </div>}
          </div>
          {!customer ? <div className="px-6 py-12 text-center">
            <LogIn className="mx-auto h-9 w-9 text-slate-400" />
            <h2 className="mt-3 text-lg font-black text-slate-900">Sign in to see notifications</h2>
            <p className="mt-1 text-sm text-slate-500">Your store announcements will be saved to your account.</p>
            <button type="button" onClick={onSignIn} className="mt-5 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-extrabold text-white hover:bg-emerald-800">Sign in / Create account</button>
          </div> : loading && !loaded ? <div className="px-6 py-12 text-center text-sm text-slate-500"><span className="mx-auto mb-3 block h-7 w-7 animate-spin rounded-full border-[3px] border-blue-700 border-t-transparent" aria-hidden="true"/><span>Loading your notifications…</span></div> : items.length === 0 ? <div className="px-6 py-14 text-center">
            <Bell className="mx-auto h-9 w-9 text-slate-300" />
            <h2 className="mt-3 text-lg font-black text-slate-900">You’re all caught up</h2>
            <p className="mt-1 text-sm text-slate-500">New store announcements will appear here.</p>
          </div> : <div className="divide-y divide-slate-100">
            {items.map(item => <article key={item.id} className={'px-5 py-4 sm:px-7 ' + (!item.readAt ? 'bg-emerald-50/40' : 'bg-white')}>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-800"><Bell className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="font-extrabold text-slate-900">{item.title}</h2>{!item.readAt && <span className="rounded-full bg-emerald-800 px-2 py-0.5 text-[10px] font-black text-white">NEW</span>}</div>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.body}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">{new Date(item.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  {!item.readAt && <button type="button" onClick={() => void markRead(item.id)} disabled={!!busyId} aria-label="Mark as read" title="Mark as read" className="rounded-lg p-2 text-blue-700 hover:bg-blue-100 disabled:opacity-50"><CheckCheck className="h-4 w-4" /></button>}
                  <button type="button" onClick={() => void remove(item.id)} disabled={!!busyId} aria-label="Delete notification" title="Delete notification" className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-extrabold text-rose-700 shadow-sm hover:bg-rose-50 disabled:opacity-50"><Trash2 className="h-4 w-4" /><span>Delete</span></button>
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

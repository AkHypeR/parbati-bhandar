import React, { useEffect, useRef } from 'react';

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  action?: string;
}

export function TurnstileWidget({ onVerify, action = 'order' }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const callbackRef = useRef(onVerify);
  callbackRef.current = onVerify;

  useEffect(() => {
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
    if (!siteKey || !containerRef.current) return;
    let widgetId: string | undefined;
    let cancelled = false;
    const render = () => {
      const turnstile = (window as any).turnstile;
      if (cancelled || !turnstile || !containerRef.current) return;
      widgetId = turnstile.render(containerRef.current, {
        sitekey: siteKey,
        action,
        theme: 'light',
        callback: (token: string) => callbackRef.current(token),
        'expired-callback': () => callbackRef.current(''),
        'error-callback': () => callbackRef.current(''),
      });
    };
    const existing = document.querySelector<HTMLScriptElement>('script[data-turnstile-script]');
    if ((window as any).turnstile) render();
    else if (existing) existing.addEventListener('load', render, { once: true });
    else {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.turnstileScript = 'true';
      script.addEventListener('load', render, { once: true });
      document.head.appendChild(script);
    }
    return () => {
      cancelled = true;
      if (widgetId && (window as any).turnstile) (window as any).turnstile.remove(widgetId);
    };
  }, [action]);

  if (!import.meta.env.VITE_TURNSTILE_SITE_KEY) {
    return <p className="text-xs text-amber-700">Security verification is being configured. Ordering is temporarily unavailable.</p>;
  }
  return <div ref={containerRef} />;
}

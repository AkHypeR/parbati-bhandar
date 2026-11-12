import React, { useMemo, useState, useEffect } from 'react';
import { QrCode, X, Printer, Sparkles, Globe, Image as ImageIcon } from 'lucide-react';
import { StoreSettings, generateQrMatrix } from '../utils/storeLogic';

interface QrPosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeSettings: StoreSettings;
}

export function QrPosterModal({ isOpen, onClose, storeSettings }: QrPosterModalProps) {
  const defaultOrigin = typeof window !== 'undefined' ? window.location.origin : storeSettings.mapsUrl;
  const targetWebsiteUrl = storeSettings.storeWebsiteUrl?.trim() || defaultOrigin;
  const hasUploadedScanner = Boolean(storeSettings.scannerImageUrl?.trim());

  const [displayMode, setDisplayMode] = useState<'link' | 'upload'>(
    storeSettings.scannerMode === 'upload' && hasUploadedScanner ? 'upload' : 'link'
  );

  useEffect(() => {
    setDisplayMode(
      storeSettings.scannerMode === 'upload' && Boolean(storeSettings.scannerImageUrl?.trim())
        ? 'upload'
        : 'link'
    );
  }, [storeSettings.scannerMode, storeSettings.scannerImageUrl, isOpen]);

  const matrix = useMemo(() => generateQrMatrix(targetWebsiteUrl), [targetWebsiteUrl]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Parbati Bhandar Counter QR Scanner"
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-600" />
            <h3 className="font-extrabold text-slate-900">Parbati Bhandar Store Scanner</h3>
          </div>
          <button
            type="button"
            aria-label="Close QR Poster Modal"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toggle if owner has both an uploaded scanner pic and website link */}
        {hasUploadedScanner && (
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200">
            <button
              type="button"
              onClick={() => setDisplayMode('link')}
              className={`py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                displayMode === 'link'
                  ? 'bg-white text-emerald-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Website Link Scanner</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('upload')}
              className={`py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                displayMode === 'upload'
                  ? 'bg-white text-emerald-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Uploaded Scanner Pic</span>
            </button>
          </div>
        )}

        {/* Printable Poster Card */}
        <div className="border-4 border-emerald-700 rounded-3xl p-5 text-center bg-gradient-to-b from-emerald-50/70 to-white space-y-3">
          <div className="inline-block px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] uppercase tracking-wider">
            Scan to Open Store Catalog
          </div>
          <h2 className="text-xl font-black text-emerald-950">{storeSettings.storeName}</h2>
          <p className="text-xs font-semibold text-slate-600">{storeSettings.address}</p>

          <div className="bg-white p-4 rounded-2xl border-2 border-emerald-200 inline-block shadow-sm my-2">
            {displayMode === 'upload' && hasUploadedScanner ? (
              <img
                src={storeSettings.scannerImageUrl}
                alt="Uploaded Store Scanner QR"
                referrerPolicy="no-referrer"
                className="w-44 h-44 object-contain mx-auto rounded-lg"
              />
            ) : (
              <svg
                viewBox="0 0 21 21"
                role="img"
                aria-label="Store Website Link QR Scanner"
                className="w-44 h-44 mx-auto"
                shapeRendering="crispEdges"
              >
                <rect width="21" height="21" fill="#ffffff" />
                {matrix.map((row, rIdx) =>
                  row.map((cell, cIdx) =>
                    cell ? (
                      <rect
                        key={`${rIdx}-${cIdx}`}
                        x={cIdx}
                        y={rIdx}
                        width={1}
                        height={1}
                        fill="#064e3b"
                      />
                    ) : null
                  )
                )}
              </svg>
            )}
          </div>

          <div className="text-[11px] font-mono text-emerald-800 bg-emerald-100/70 px-2.5 py-1 rounded-lg truncate">
            {displayMode === 'upload' && hasUploadedScanner
              ? 'Custom Uploaded Scanner Picture'
              : targetWebsiteUrl}
          </div>

          <p className="text-xs font-bold text-emerald-900">
            📱 আমাদের দোকানের সব জিনিসের আজকের দাম দেখুন ও WhatsApp-এ ফর্দ পাঠান!
          </p>
          <div className="text-xs font-extrabold text-slate-800 pt-1 border-t border-emerald-200 tabular-nums">
            📞 WhatsApp / Call: {storeSettings.phone}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Poster for Shop Counter</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

interface SetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SetupGuideModal({ isOpen, onClose }: SetupGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Free Deployment and Usage Guide"
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <h3 className="font-extrabold text-lg text-slate-900">
              100% Free (₹0) Deployment &amp; Usage Guide for Parbati Bhandar
            </h3>
          </div>
          <button
            type="button"
            aria-label="Close Setup Guide Modal"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
            <h4 className="font-extrabold text-emerald-950 text-sm mb-1">
              Why is this 100% Free (₹0/month)?
            </h4>
            <p className="text-emerald-900">
              Normally, websites charge money for photo storage servers. This app automatically
              compresses your phone camera photos and saves them directly inside the store database
              document—meaning <strong>zero paid cloud storage fees forever</strong>!
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="font-extrabold text-slate-900 block mb-1">
                Step 1: How to Use on Your Phone Like Two Separate Apps
              </span>
              <p>
                1. Open your website link on your phone in Chrome.
                <br />
                2. Tap the 3 dots menu (⋮) and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong>.
                <br />
                3. Now you have a one-tap app icon on your phone! Tap{' '}
                <strong>&ldquo;Owner Upload App&rdquo;</strong> at the top, enter PIN{' '}
                <code className="font-bold font-mono">1234</code>, and update prices or take photos
                of new stock in seconds.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="font-extrabold text-slate-900 block mb-1">
                Step 2: Add Your Link to Your Google Maps Profile (Swasti Pally, Gangpur)
              </span>
              <p>
                1. Open your <strong>Parbati Bhandar (পার্বতী ভান্ডার)</strong> Google Business
                Profile on Google Maps.
                <br />
                2. Tap <strong>&ldquo;Edit Profile&rdquo; → &ldquo;Website&rdquo;</strong> and paste
                your live website link.
                <br />
                3. Now anyone searching for groceries in Gangpur or Purba Bardhaman on Google Maps
                can tap &ldquo;Website&rdquo; to see your live catalog and send orders to{' '}
                <strong>097347 65207</strong>!
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="font-extrabold text-slate-900 block mb-1">
                Step 3: Free Hosting on Firebase / Vercel / Netlify (₹0 Forever)
              </span>
              <p>
                • <strong>Database:</strong> Go to{' '}
                <code className="font-bold font-mono">console.firebase.google.com</code> (free with
                your Gmail), create a project on the Free &ldquo;Spark Plan&rdquo; (₹0), enable{' '}
                <em>Anonymous Auth</em> and <em>Firestore Database</em>.
                <br />• <strong>Website Hosting:</strong> Host for free on{' '}
                <strong>Firebase Hosting</strong>, <strong>Vercel</strong>, or{' '}
                <strong>Netlify</strong>—none of them require a credit card.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm cursor-pointer"
        >
          Got It! Let&apos;s Manage Parbati Bhandar
        </button>
      </div>
    </div>
  );
}

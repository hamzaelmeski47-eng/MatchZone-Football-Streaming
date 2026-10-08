import { useRef, useState, useEffect } from 'react';
import { Maximize2, RefreshCw, Radio, Loader2, AlertTriangle } from 'lucide-react';

export interface IframePlayerProps {
  src: string;
  title?: string;
  onError?: () => void;
  onSwitchNext?: () => void;
}

export function IframePlayer({ src, title, onError, onSwitchNext }: IframePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState(0);

  useEffect(() => {
    setLoading(true);
  }, [src]);

  // Programmatically neutralize popup windows while player is active
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const originalOpen = window.open;
    window.open = function (...args) {
      console.log('[MatchZone] Neutralized popup window:', args[0]);
      return null;
    };
    return () => {
      window.open = originalOpen;
    };
  }, []);

  // Prevent self-nesting and known dead/ad parked domains
  const isInvalidOrSelf =
    !src ||
    src.includes('embedme.top') ||
    (typeof window !== 'undefined' && (src.includes(window.location.host) || (src.startsWith('/') && !src.startsWith('//'))));

  if (isInvalidOrSelf) {
    return (
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16/9',
          background: '#040711',
          borderRadius: 14,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: 24,
          textAlign: 'center',
          border: '1px solid hsl(var(--border))',
        }}
      >
        <div style={{ width: 56, height: 56, borderRadius: 28, background: 'rgba(245, 158, 11, 0.1)', display: 'grid', placeItems: 'center' }}>
          <AlertTriangle size={28} style={{ color: '#f59e0b' }} />
        </div>
        <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>المصدر الحالي غير متاح</h4>
        <p style={{ margin: 0, fontSize: 13, color: 'hsl(var(--muted-foreground))', maxWidth: 460, lineHeight: 1.6 }}>
          تعذر تشغيل هذا المصدر في الوقت الحالي.
        </p>
        {(onSwitchNext || onError) && (
          <button
            onClick={() => {
              if (onSwitchNext) onSwitchNext();
              else if (onError) onError();
            }}
            className="btn btn-primary"
            style={{ fontSize: 13, padding: '8px 16px', borderRadius: 8, marginTop: 4 }}
          >
            الانتقال للمصدر التالي
          </button>
        )}
      </div>
    );
  }

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen().catch(() => {});
      }
    }
  };

  const handleReload = () => {
    setLoading(true);
    setKey((k) => k + 1);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16/9',
        background: '#03060c',
        borderRadius: 14,
        overflow: 'hidden',
        border: '1px solid hsl(var(--border))',
      }}
    >
      {/* Loading overlay */}
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#03060c',
            zIndex: 10,
            gap: 14,
          }}
        >
          <Loader2 size={32} style={{ color: 'hsl(var(--primary))', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 13, margin: 0 }}>
            Connecting to stream server...
          </p>
        </div>
      )}

      {/* Live indicator */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(6px)',
          padding: '5px 10px',
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <Radio size={11} style={{ color: '#ef4444' }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.08em' }}>LIVE</span>
      </div>

      {/* Controls overlay */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 20,
          display: 'flex',
          gap: 6,
          alignItems: 'center',
        }}
      >
        <button
          onClick={handleReload}
          title="Reload stream"
          style={{
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            width: 34,
            height: 34,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#fff',
          }}
        >
          <RefreshCw size={15} />
        </button>
        <button
          onClick={handleFullscreen}
          title="Fullscreen"
          style={{
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            width: 34,
            height: 34,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#fff',
          }}
        >
          <Maximize2 size={15} />
        </button>
      </div>

      {/* Responsive Video Player Iframe */}
      {(() => {
        // Ensure Matchora embed URLs always use valid /embed/match/{eventId}?ch={channelId} format.
        // Standalone /embed/channel/{id} triggers "Channel unavailable, use the embed: matchora.to/developers".
        let cleanSrc = src;
        const chDirectMatch = cleanSrc.match(/matchora\.to\/embed\/channel\/([0-9a-zA-Z_-]+)/i);
        if (chDirectMatch && chDirectMatch[1]) {
          const pageMatch = typeof window !== 'undefined' ? window.location.pathname.match(/\/match\/(\d+)/) : null;
          if (pageMatch && pageMatch[1]) {
            cleanSrc = `https://matchora.to/embed/match/${pageMatch[1]}?ch=${chDirectMatch[1]}`;
          }
        }

        return (
          <>
            <iframe
              key={`${key}-${cleanSrc}`}
              ref={iframeRef}
              src={cleanSrc}
              title={title || 'Live Stream'}
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              allow="autoplay; fullscreen; encrypted-media"
              allowFullScreen
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                if (onError) onError();
              }}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                border: 'none',
                background: '#000',
              }}
            />

            {/* Seamless blocker to ensure in-video Channels button is never shown */}
            <div
              className="inplayer-channels-blocker"
              style={{
                position: 'absolute',
                bottom: 50,
                right: 8,
                width: 96,
                height: 40,
                background: '#03060c',
                zIndex: 15,
                pointerEvents: 'none',
                opacity: cleanSrc.includes('/embed/match/') ? 1 : 0,
              }}
            />
          </>
        );
      })()}
    </div>
  );
}

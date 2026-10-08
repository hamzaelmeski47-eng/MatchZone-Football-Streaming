import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  Loader2,
  Volume2,
  VolumeX,
  Maximize2,
  Play,
  Pause,
  RotateCcw,
  Wifi,
  Radio,
  Sliders,
} from 'lucide-react';

type PlayerState = 'idle' | 'loading' | 'buffering' | 'playing' | 'error';

export interface QualityLevel {
  id: number;
  label: string;
  height?: number;
  bitrate?: number;
}

export interface HlsPlayerProps {
  src: string;
  type?: 'hls' | 'dash';
  title?: string;
  onServerChange?: (serverId: string) => void;
  onError?: () => void;
  onSwitchNext?: () => void;
}

export function HlsPlayer({ src, type = 'hls', title, onError, onSwitchNext }: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [state, setState] = useState<PlayerState>('loading');
  const [muted, setMuted] = useState(true); // muted autoplay per browser standards
  const [volume, setVolume] = useState(1);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState('');
  const [showUnmutePrompt, setShowUnmutePrompt] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  // Quality levels
  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1); // -1 = Auto
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  const handleRetry = () => {
    setState('loading');
    setError('');
    setRetryCount((prev) => prev + 1);
  };

  const handleUnmute = () => {
    if (videoRef.current) {
      videoRef.current.muted = false;
      setMuted(false);
      setShowUnmutePrompt(false);
    }
  };

  const handleSelectQuality = (levelId: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelId;
      setCurrentLevel(levelId);
    }
    setShowQualityMenu(false);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setState('loading');
    setError('');
    setLevels([]);
    setCurrentLevel(-1);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = src.includes('.m3u8') || type === 'hls';

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
      });
      hlsRef.current = hls;

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setState('playing');
        if (data.levels && data.levels.length > 1) {
          const parsedLevels: QualityLevel[] = [
            { id: -1, label: 'Auto' },
            ...data.levels.map((lvl, index) => ({
              id: index,
              label: lvl.height ? `${lvl.height}p` : `${Math.round(lvl.bitrate / 1000)}k`,
              height: lvl.height,
              bitrate: lvl.bitrate,
            })),
          ];
          setLevels(parsedLevels);
        }

        video.play().catch(() => {
          video.muted = true;
          setMuted(true);
          video.play().catch(() => {});
        });
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        setCurrentLevel(data.level);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setState('error');
              setError('Stream playback error. Reconnecting or check stream status.');
              onError?.();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Apple HLS (Safari on iOS / macOS)
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        setState('playing');
        video.play().catch(() => {
          video.muted = true;
          setMuted(true);
          video.play().catch(() => {});
        });
      });
      video.addEventListener('error', () => {
        setState('error');
        setError('Unable to load authorized stream on this browser.');
        onError?.();
      });
    } else {
      // Standard HTML5 fallback
      video.src = src;
      video.addEventListener('loadeddata', () => setState('playing'));
      video.addEventListener('error', () => {
        setState('error');
        setError('Stream playback error or unsupported format.');
        onError?.();
      });
      video.play().catch(() => {
        video.muted = true;
        setMuted(true);
      });
    }

    // Native event listeners for buffering / pause
    const onWaiting = () => setState('buffering');
    const onPlaying = () => setState('playing');
    const onPause = () => setPaused(true);
    const onPlay = () => setPaused(false);

    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('pause', onPause);
    video.addEventListener('play', onPlay);

    return () => {
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('play', onPlay);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, retryCount, type]);

  const togglePause = () => {
    if (videoRef.current) {
      if (paused) {
        videoRef.current.play().catch(() => {});
        setPaused(false);
      } else {
        videoRef.current.pause();
        setPaused(true);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !muted;
      setMuted(!muted);
      if (showUnmutePrompt) setShowUnmutePrompt(false);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      if (val === 0) {
        videoRef.current.muted = true;
        setMuted(true);
      } else if (muted) {
        videoRef.current.muted = false;
        setMuted(false);
      }
    }
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen().catch(() => {});
    }
  };

  const currentLevelLabel =
    currentLevel === -1
      ? 'Auto'
      : levels.find((lvl) => lvl.id === currentLevel)?.label || 'HD';

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16/9',
        background: '#040711',
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid hsl(var(--border) / .6)',
        boxShadow: '0 20px 40px -15px rgba(0,0,0,0.8), 0 0 30px rgba(163,230,53,0.06)',
      }}
    >
      <video
        ref={videoRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          objectFit: 'contain',
          background: '#02050c',
        }}
        playsInline
        autoPlay
        muted={muted}
        title={title}
        onClick={togglePause}
      />

      {/* Top stream metadata overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '12px 16px',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pointerEvents: 'none',
          zIndex: 5,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 9px',
              borderRadius: 20,
              background: '#ef4444',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}
          >
            <Radio size={12} className="animate-pulse" /> LIVE
          </span>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{title || 'Authorized Stream'}</span>
        </div>

        {/* Quality indicator / selector */}
        {levels.length > 0 && (
          <div style={{ pointerEvents: 'auto', position: 'relative' }}>
            <button
              onClick={() => setShowQualityMenu(!showQualityMenu)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(6px)',
                color: 'hsl(var(--primary))',
                fontSize: 11,
                fontWeight: 700,
                border: '1px solid rgba(255,255,255,0.2)',
                cursor: 'pointer',
              }}
            >
              <Sliders size={12} />
              {currentLevelLabel}
            </button>

            {showQualityMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 6,
                  background: '#0d131f',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  padding: 4,
                  minWidth: 90,
                  zIndex: 20,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
                }}
              >
                {levels.map((lvl) => (
                  <button
                    key={lvl.id}
                    onClick={() => handleSelectQuality(lvl.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '5px 10px',
                      background: currentLevel === lvl.id ? 'hsl(var(--primary))' : 'transparent',
                      color: currentLevel === lvl.id ? '#000' : '#fff',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tap to Unmute Banner */}
      {muted && showUnmutePrompt && (state === 'playing' || state === 'buffering') && (
        <button
          onClick={handleUnmute}
          style={{
            position: 'absolute',
            top: 60,
            left: 16,
            background: 'hsl(var(--primary))',
            color: '#000',
            border: 'none',
            borderRadius: 8,
            padding: '7px 14px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
            zIndex: 10,
          }}
        >
          <Volume2 size={16} /> Tap for Sound
        </button>
      )}

      {/* Loading or Buffering Indicator */}
      {(state === 'loading' || state === 'buffering') && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(2, 5, 12, 0.75)',
            gap: 12,
            zIndex: 6,
          }}
        >
          <Loader2
            size={36}
            style={{
              color: 'hsl(var(--primary))',
              animation: 'spin 1s linear infinite',
            }}
          />
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: 0 }}>
              {state === 'buffering' ? 'Buffering stream...' : 'Connecting to authorized stream...'}
            </p>
          </div>
        </div>
      )}

      {/* Error state */}
      {state === 'error' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(2, 5, 12, 0.95)',
            gap: 14,
            padding: 24,
            zIndex: 7,
          }}
        >
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Wifi size={24} style={{ color: '#ef4444' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: 0 }}>
              {error || 'Authorized stream unavailable'}
            </p>
            <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 12, margin: '4px 0 0' }}>
              Please check your network or click reconnect
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={handleRetry}
              className="btn btn-secondary"
              style={{ height: 34, fontSize: 12, padding: '0 16px', gap: 6 }}
            >
              <RotateCcw size={14} /> إعادة المحاولة
            </button>
            {onSwitchNext && (
              <button
                onClick={onSwitchNext}
                className="btn btn-primary"
                style={{ height: 34, fontSize: 12, padding: '0 16px', gap: 6 }}
              >
                الانتقال للمصدر التالي ←
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bottom player controls bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '10px 16px',
          background: 'linear-gradient(0deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={togglePause}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: 4,
            }}
            title={paused ? 'Play' : 'Pause'}
          >
            {paused ? <Play size={20} /> : <Pause size={20} />}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={toggleMute}
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: 4,
              }}
              title={muted ? 'Unmute' : 'Mute'}
            >
              {muted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={muted ? 0 : volume}
              onChange={handleVolumeChange}
              style={{
                width: 65,
                accentColor: 'hsl(var(--primary))',
                cursor: 'pointer',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              color: 'hsl(var(--primary))',
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'hsl(var(--primary))',
                boxShadow: '0 0 8px hsl(var(--primary))',
              }}
            />
            AUTHORIZED BROADCAST
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={handleRetry}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: 4,
            }}
            title="Reload Stream"
          >
            <RotateCcw size={16} />
          </button>

          <button
            onClick={toggleFullscreen}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: 4,
            }}
            title="Fullscreen"
          >
            <Maximize2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

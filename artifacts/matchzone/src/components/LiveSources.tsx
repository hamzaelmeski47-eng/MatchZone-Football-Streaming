import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Radio, RefreshCw, AlertCircle, Tv, Play, CheckCircle2, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';
import { loadLiveSources, type LiveSource, type MatchChannelItem } from '../lib/api';
import { IframePlayer } from './IframePlayer';
import { HlsPlayer } from './HlsPlayer';

export interface LiveSourcesProps {
  matchId: string | number;
  status: 'live' | 'upcoming' | 'finished' | string;
  homeName?: string;
  awayName?: string;
  rawHomeName?: string;
  rawAwayName?: string;
  competitionName?: string;
  kickoffTime?: string;
  date?: string;
  rawDate?: string;
  className?: string;
  onActiveChannelChange?: (info: { channelName: string; lang?: string; commentator?: string }) => void;
}

export function LiveSources({
  matchId,
  status,
  homeName = 'الفريق المضيف',
  awayName = 'الفريق الضيف',
  rawHomeName,
  rawAwayName,
  competitionName = '',
  kickoffTime = '',
  date = '',
  rawDate = '',
  className = '',
  onActiveChannelChange,
}: LiveSourcesProps) {
  const kickoffMs = rawDate ? new Date(rawDate).getTime() : 0;
  const [now, setNow] = useState<number>(Date.now());

  // Real-time ticker to detect the exact second the kickoff starting whistle blows
  useEffect(() => {
    if (kickoffMs > 0 && kickoffMs > Date.now()) {
      const timer = setInterval(() => {
        const current = Date.now();
        setNow(current);
        if (current >= kickoffMs) {
          clearInterval(timer);
        }
      }, 1000);
      return () => clearInterval(timer);
    }
    return undefined;
  }, [kickoffMs]);

  // The match only starts broadcasting when the opening whistle blows
  const isWhistleBlown = kickoffMs === 0 || now >= kickoffMs;
  const isLive = status === 'live' && isWhistleBlown;
  const isUpcoming = status === 'upcoming' || !isWhistleBlown;
  const isFinished = status === 'finished' && isWhistleBlown;

  const [sources, setSources] = useState<LiveSource[]>([]);
  const [matchChannels, setMatchChannels] = useState<MatchChannelItem[]>([]);
  const [showChannelsMenu, setShowChannelsMenu] = useState<boolean>(false);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const channelsMenuRef = useRef<HTMLDivElement>(null);
  const [activeSourceIndex, setActiveSourceIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(isLive);
  const [failedSourceIds, setFailedSourceIds] = useState<Set<string>>(new Set());
  const [allFailed, setAllFailed] = useState<boolean>(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (channelsMenuRef.current && !channelsMenuRef.current.contains(e.target as Node)) {
        setShowChannelsMenu(false);
      }
    };
    if (showChannelsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showChannelsMenu]);

  // Fetch permitted sources only when match is live
  const fetchSources = useCallback(() => {
    if (!isLive || !matchId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setFailedSourceIds(new Set());
    setAllFailed(false);
    setErrorNotice(null);

    loadLiveSources(matchId, {
      home: rawHomeName || homeName,
      away: rawAwayName || awayName,
      league: competitionName,
      status,
      date,
      kickoff: kickoffTime,
    })
      .then((res) => {
        const permitted = (res.sources || []).filter(
          (s) =>
            s.embedUrl &&
            s.status !== 'offline' &&
            s.embedUrl.startsWith('https://') &&
            !s.embedUrl.includes('[') &&
            !String(s.id).startsWith('server-') &&
            !String(s.name).toLowerCase().includes('server 1') &&
            !String(s.name).toLowerCase().includes('server 2') &&
            !String(s.name).toLowerCase().includes('server 3')
        );

        // User requested: "khali ghir wahda li na9la lmatch bel arbiya w tkoun HD"
        const arabicSources = permitted.filter(
          (s) => s.isArabic || s.name.includes('عربي') || s.commentator?.includes('عربي') || s.lang?.toLowerCase() === 'arabic'
        );

        let finalSources: LiveSource[] = [];
        if (arabicSources.length > 0) {
          const best = { ...arabicSources[0], quality: 'HD' };
          finalSources = [best];
        } else if (permitted.length > 0) {
          finalSources = [{ ...permitted[0], quality: permitted[0].quality || 'HD' }];
        }

        setSources(finalSources);
        setMatchChannels(res.matchChannels || []);
        setActiveSourceIndex(0);
        setLoading(false);

        if (finalSources.length > 0 && onActiveChannelChange) {
          const s0 = finalSources[0];
          onActiveChannelChange({
            channelName: s0.name || s0.channel || 'قناة البث المباشر (HD)',
            lang: s0.lang,
            commentator: s0.commentator,
          });
        }
      })
      .catch(() => {
        setSources([]);
        setLoading(false);
      });
  }, [matchId, isLive, homeName, awayName, rawHomeName, rawAwayName, competitionName, status, date, kickoffTime, onActiveChannelChange]);

  const handleSelectChannel = (ch: MatchChannelItem) => {
    setSelectedChannelId(ch.id);
    setShowChannelsMenu(false);
    if (onActiveChannelChange) {
      onActiveChannelChange({
        channelName: ch.name,
        lang: ch.lang,
      });
    }
    setSources((prev) => {
      let finalEmbedUrl = ch.embedUrl;
      const chIdMatch = finalEmbedUrl.match(/matchora\.to\/embed\/channel\/([0-9a-zA-Z_-]+)/i);
      if (chIdMatch && chIdMatch[1]) {
        finalEmbedUrl = `https://matchora.to/embed/match/${matchId}?ch=${chIdMatch[1]}`;
      }
      const newSource: LiveSource = {
        id: `channel-${ch.id}`,
        name: ch.name,
        type: 'embed',
        embedUrl: finalEmbedUrl,
        status: 'active',
        quality: ch.quality || 'HD',
        channel: ch.name,
      };
      if (prev.length === 0) return [newSource];
      const updated = [...prev];
      updated[activeSourceIndex] = newSource;
      return updated;
    });
  };

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  // Handle switching to next available permitted source when one fails
  const handleSourceError = useCallback(
    (sourceId: string) => {
      setFailedSourceIds((prev) => {
        const next = new Set(prev);
        next.add(sourceId);

        // Find next source that hasn't failed
        const remainingIndices = sources
          .map((s, idx) => ({ source: s, idx }))
          .filter((item) => !next.has(item.source.id));

        if (remainingIndices.length > 0) {
          const nextIndex = remainingIndices[0].idx;
          setActiveSourceIndex(nextIndex);
          setErrorNotice(
            `تعذر الاتصال بالمصدر الحالي، جاري الانتقال تلقائياً إلى: ${sources[nextIndex]?.name || `المصدر ${nextIndex + 1}`}`
          );
          // Dismiss notice after 4 seconds
          setTimeout(() => setErrorNotice(null), 4000);
        } else {
          setAllFailed(true);
          setErrorNotice(null);
        }

        return next;
      });
    },
    [sources]
  );

  const activeSource = sources[activeSourceIndex];

  // ============================================================
  // UPCOMING MATCH: No live player shown
  // ============================================================
  if (isUpcoming) {
    return (
      <div
        className={`live-sources-card upcoming-state ${className}`}
        data-testid="live-sources-upcoming"
        style={{
          background: '#111827',
          border: '1px solid #253044',
          borderRadius: 14,
          padding: '24px 20px',
          textAlign: 'center',
          color: '#F8FAFC',
          marginBottom: 20,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            background: 'rgba(37, 48, 68, 0.6)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
            border: '1px solid #253044',
          }}
        >
          <Tv size={24} style={{ color: '#94A3B8' }} />
        </div>
        <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700 }}>
          المباراة لم تبدأ بعد
        </h4>
        <p style={{ margin: 0, fontSize: 13, color: '#94A3B8', maxWidth: 460, marginInline: 'auto' }}>
          البث المباشر سيبدأ تلقائياً مع صافرة الانطلاق في تمام الساعة {kickoffTime || 'المحددة'} {date ? `(${date})` : ''}.
        </p>
      </div>
    );
  }

  // ============================================================
  // FINISHED MATCH: No live player shown
  // ============================================================
  if (isFinished) {
    return (
      <div
        className={`live-sources-card finished-state ${className}`}
        data-testid="live-sources-finished"
        style={{
          background: '#111827',
          border: '1px solid #253044',
          borderRadius: 14,
          padding: '24px 20px',
          textAlign: 'center',
          color: '#F8FAFC',
          marginBottom: 20,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            background: 'rgba(37, 48, 68, 0.6)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
            border: '1px solid #253044',
          }}
        >
          <Tv size={24} style={{ color: '#94A3B8' }} />
        </div>
        <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700 }}>
          انتهت المباراة
        </h4>
        <p style={{ margin: 0, fontSize: 13, color: '#94A3B8', maxWidth: 460, marginInline: 'auto' }}>
          انتهى البث المباشر بنهاية المباراة. يمكنك الاطلاع على النتيجة النهائية وملخص الأحداث والإحصائيات أدناه.
        </p>
      </div>
    );
  }

  // ============================================================
  // LIVE MATCH: Loading State
  // ============================================================
  if (loading) {
    return (
      <div
        className={`live-sources-card loading-state ${className}`}
        data-testid="live-sources-loading"
        style={{
          aspectRatio: '16/9',
          background: '#080B12',
          border: '1px solid #253044',
          borderRadius: 14,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          color: '#F8FAFC',
          marginBottom: 20,
        }}
      >
        <RefreshCw size={28} className="animate-spin" style={{ color: '#16A34A' }} />
        <span style={{ fontSize: 13, color: '#94A3B8' }}>جاري البحث عن مصادر البث المصرح بها...</span>
      </div>
    );
  }

  // ============================================================
  // NO SOURCE OR ALL SOURCES FAILED: Show exact fallback message
  // "البث المباشر غير متوفر حالياً" / "البث غير متوفر حالياً"
  // DO NOT SHOW A FAKE PLAYER.
  // ============================================================
  if (sources.length === 0 || allFailed) {
    return (
      <div
        className={`live-sources-card no-stream-state ${className}`}
        data-testid="live-sources-no-stream"
        style={{
          aspectRatio: '16/9',
          maxHeight: 460,
          background: '#080B12',
          border: '1px solid #253044',
          borderRadius: 14,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: 24,
          textAlign: 'center',
          color: '#F8FAFC',
          marginBottom: 20,
        }}
      >
        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: 29,
            background: 'rgba(37, 48, 68, 0.45)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #253044',
          }}
        >
          <Tv size={30} style={{ color: '#94A3B8' }} />
        </div>
        <div>
          <h3
            style={{
              margin: '0 0 6px',
              fontSize: 18,
              fontWeight: 800,
              color: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {allFailed ? 'البث غير متوفر حالياً' : "Le direct n'est pas disponible pour ce match."}
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: '#94A3B8',
              maxWidth: 460,
              lineHeight: 1.6,
            }}
          >
            {allFailed
              ? 'تعذر الوصول إلى مصادر البث المتاحة حالياً. يمكنك إعادة المحاولة أو متابعة الأحداث الحية أدناه.'
              : "البث المباشر غير متوفر حالياً لهذه المباراة. Live stream unavailable for this match."}
          </p>
        </div>
        <button
          onClick={fetchSources}
          className="btn btn-secondary"
          data-testid="btn-retry-sources"
          style={{
            marginTop: 8,
            fontSize: 12.5,
            padding: '7px 16px',
            borderRadius: 8,
            border: '1px solid #253044',
            background: '#111827',
            color: '#F8FAFC',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} /> إعادة فحص المصادر
        </button>
      </div>
    );
  }

  // ============================================================
  // AUTHORIZED LIVE SOURCES AVAILABLE: Render Player & Switcher
  // ============================================================
  return (
    <div
      className={`live-sources-section ${className}`}
      data-testid="live-sources-container"
      style={{
        background: '#111827',
        border: '1px solid #253044',
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 24,
      }}
    >
      {/* Live Sources Bar Header */}
      <div
        style={{
          padding: '12px 18px',
          background: 'rgba(8, 11, 18, 0.95)',
          borderBottom: '1px solid #253044',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', position: 'relative' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>
            مصدر البث:
          </span>
          <div ref={channelsMenuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="channels-btn"
              onClick={() => setShowChannelsMenu(!showChannelsMenu)}
              data-testid="btn-channels"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '5px 14px',
                borderRadius: 8,
                background: showChannelsMenu
                  ? 'linear-gradient(135deg, #7C3AED, #059669)'
                  : 'linear-gradient(135deg, rgba(124, 58, 237, 0.25), rgba(16, 185, 129, 0.2))',
                border: '1px solid rgba(139, 92, 246, 0.5)',
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: showChannelsMenu ? '0 0 14px rgba(124, 58, 237, 0.5)' : 'none',
                transition: 'all 0.2s ease',
              }}
              title="اختيار القنوات الناقلة للمباراة"
            >
              <Tv size={14} style={{ color: '#C084FC' }} />
              <span>Channels</span>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  background: '#16A34A',
                  color: '#FFFFFF',
                  padding: '1px 6px',
                  borderRadius: 4,
                }}
              >
                HD
              </span>
              {showChannelsMenu ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {/* Channels Dropdown Menu */}
            {showChannelsMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  insetInlineStart: 0,
                  zIndex: 60,
                  minWidth: 260,
                  maxWidth: 340,
                  maxHeight: 320,
                  overflowY: 'auto',
                  background: '#0B0F19',
                  border: '1px solid rgba(139, 92, 246, 0.45)',
                  borderRadius: 10,
                  padding: 6,
                  boxShadow: '0 12px 28px rgba(0, 0, 0, 0.75)',
                }}
              >
                <div style={{ padding: '6px 10px 8px', fontSize: 11, fontWeight: 700, color: '#94A3B8', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  القنوات المتاحة للمباراة (Channels):
                </div>
                {matchChannels.length > 0 ? (
                  matchChannels.map((ch) => {
                    const isSelected = selectedChannelId === ch.id;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => handleSelectChannel(ch)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          padding: '8px 10px',
                          borderRadius: 6,
                          background: isSelected ? 'rgba(124, 58, 237, 0.25)' : 'transparent',
                          color: isSelected ? '#FFFFFF' : '#E2E8F0',
                          border: isSelected ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid transparent',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'start',
                          transition: 'all 0.15s ease',
                          margin: '2px 0',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.background = isSelected ? 'rgba(124, 58, 237, 0.25)' : 'transparent';
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <Play size={10} fill={isSelected ? '#10B981' : '#94A3B8'} style={{ color: isSelected ? '#10B981' : '#94A3B8' }} />
                          <span>{ch.name}</span>
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          {ch.lang && ch.lang !== 'Other' && (
                            <span style={{ fontSize: 10, color: '#94A3B8', background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 3 }}>
                              {ch.lang}
                            </span>
                          )}
                          <span style={{ fontSize: 9.5, background: '#16A34A', color: '#FFF', padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>
                            {ch.quality || 'HD'}
                          </span>
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div style={{ padding: '12px 10px', fontSize: 12, color: '#94A3B8', textAlign: 'center' }}>
                    القناة الرئيسية نشطة ومدمجة داخل المشغل
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Source Switcher Buttons only if more than 1 source exists */}
        {sources.length > 1 && (
          <div
            className="live-sources-switcher"
            data-testid="live-sources-switcher"
            style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}
          >
            {sources.map((src, index) => {
              const isActive = index === activeSourceIndex;
              const hasFailed = failedSourceIds.has(src.id);
              const isBein = src.isBein || src.name.toLowerCase().includes('bein');

              return (
                <button
                  key={src.id || index}
                  onClick={() => {
                    setActiveSourceIndex(index);
                    setErrorNotice(null);
                    if (onActiveChannelChange) {
                      onActiveChannelChange({
                        channelName: src.name || src.channel || `المصدر ${index + 1}`,
                        lang: src.lang,
                        commentator: src.commentator,
                      });
                    }
                  }}
                  disabled={hasFailed}
                  data-testid={`btn-source-${index + 1}`}
                  style={{
                    background: isActive
                      ? (isBein ? 'linear-gradient(135deg, #7C3AED, #059669)' : '#16A34A')
                      : hasFailed
                      ? 'rgba(37, 48, 68, 0.3)'
                      : isBein
                      ? 'rgba(124, 58, 237, 0.15)'
                      : '#080B12',
                    color: isActive ? '#FFFFFF' : hasFailed ? '#64748B' : isBein ? '#E9D5FF' : '#F8FAFC',
                    border: `1px solid ${isActive ? '#10B981' : isBein ? 'rgba(139, 92, 246, 0.45)' : '#253044'}`,
                    borderRadius: 8,
                    padding: '5px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: hasFailed ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    transition: 'all 0.15s ease',
                    opacity: hasFailed ? 0.5 : 1,
                    textDecoration: hasFailed ? 'line-through' : 'none',
                  }}
                  title={hasFailed ? 'هذا المصدر غير متاح حالياً' : src.name || `المصدر ${index + 1}`}
                >
                  {isActive ? <CheckCircle2 size={12} /> : <Play size={10} fill="currentColor" />}
                  <span>{src.name || `المصدر ${index + 1}`}</span>
                  <span
                    style={{
                      fontSize: 10,
                      opacity: 0.85,
                      background: isActive ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.08)',
                      padding: '1px 5px',
                      borderRadius: 4,
                    }}
                  >
                    HD
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Switching notice banner if auto-fallback happened */}
      {errorNotice && (
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.12)',
            borderBottom: '1px solid rgba(245, 158, 11, 0.3)',
            padding: '8px 16px',
            fontSize: 12,
            color: '#FCD34D',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertCircle size={14} />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* Video Player Display with Strict HTTPS Validation */}
      <div style={{ position: 'relative', width: '100%', background: '#080B12' }}>
        {activeSource.embedUrl && activeSource.embedUrl.startsWith('https://') ? (
          activeSource.type === 'embed' ? (
            <IframePlayer
              key={activeSource.embedUrl}
              src={activeSource.embedUrl}
              title={`${homeName} vs ${awayName} - ${activeSource.name}`}
              onError={() => handleSourceError(activeSource.id)}
              onSwitchNext={() => handleSourceError(activeSource.id)}
            />
          ) : (
            <HlsPlayer
              key={activeSource.embedUrl}
              src={activeSource.embedUrl}
              type={activeSource.type as 'hls' | 'dash'}
              title={`${homeName} vs ${awayName} - ${activeSource.name}`}
              onError={() => handleSourceError(activeSource.id)}
              onSwitchNext={() => handleSourceError(activeSource.id)}
            />
          )
        ) : (
          <div style={{ padding: 24, textAlign: 'center', color: '#94A3B8' }}>
            رابط البث غير متوفر أو غير متوافق.
          </div>
        )}
      </div>


    </div>
  );
}
export default LiveSources;

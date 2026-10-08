import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import {
  Radio,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  Shield,
  Loader2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  listAllStreams,
  createAuthorizedStream,
  updateAuthorizedStream,
  deleteAuthorizedStream,
  loadAvailableFixturesForAdmin,
  type AuthorizedStream,
} from '@/lib/api';
import { useMatchZoneData } from '@/lib/app-state';
import type { Match } from '@/lib/mock-data';

export function AdminStreamsPage() {
  const { matches, refresh } = useMatchZoneData();
  const [streams, setStreams] = useState<AuthorizedStream[]>([]);
  const [availableFixtures, setAvailableFixtures] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Form state
  const [isAdding, setIsAdding] = useState(false);
  const [editingStream, setEditingStream] = useState<AuthorizedStream | null>(null);

  const [matchIdInput, setMatchIdInput] = useState('');
  const [providerInput, setProviderInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [typeInput, setTypeInput] = useState<'hls' | 'dash' | 'iframe'>('iframe');
  const [isActiveInput, setIsActiveInput] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const candidateMatches = availableFixtures.length > 0 ? availableFixtures : matches;

  const fetchStreams = () => {
    setLoading(true);
    listAllStreams()
      .then((data) => {
        setStreams(data);
        setLoading(false);
      })
      .catch((err) => {
        setActionError('Failed to load streams: ' + (err.message || 'Server error'));
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchStreams();
    loadAvailableFixturesForAdmin().then(setAvailableFixtures).catch(() => {});
  }, []);

  const openAddForm = () => {
    setEditingStream(null);
    setMatchIdInput(candidateMatches.length > 0 ? candidateMatches[0].id : '');
    setProviderInput('سيرفر 1 (Iframe)');
    setUrlInput('');
    setTypeInput('iframe');
    setIsActiveInput(true);
    setIsAdding(true);
    setActionError(null);
    setActionSuccess(null);
  };

  const openEditForm = (stream: AuthorizedStream) => {
    setEditingStream(stream);
    setMatchIdInput(String(stream.match_id));
    setProviderInput(stream.provider);
    setUrlInput(stream.stream_url);
    setTypeInput(stream.stream_type as 'hls' | 'dash' | 'iframe');
    setIsActiveInput(stream.is_active);
    setIsAdding(true);
    setActionError(null);
    setActionSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchIdInput || !providerInput || !urlInput) {
      setActionError('All fields are required.');
      return;
    }

    const numericMatchId = parseInt(matchIdInput, 10);
    if (isNaN(numericMatchId)) {
      setActionError('Match ID must be a valid number.');
      return;
    }

    setSubmitting(true);
    setActionError(null);

    try {
      if (editingStream) {
        await updateAuthorizedStream(editingStream.id, {
          match_id: numericMatchId,
          provider: providerInput.trim(),
          stream_url: urlInput.trim(),
          stream_type: typeInput,
          is_active: isActiveInput,
        });
        setActionSuccess('Stream updated successfully.');
      } else {
        await createAuthorizedStream({
          match_id: numericMatchId,
          provider: providerInput.trim(),
          stream_url: urlInput.trim(),
          stream_type: typeInput,
          is_active: isActiveInput,
        });
        setActionSuccess('Authorized stream created successfully.');
      }
      setIsAdding(false);
      fetchStreams();
      refresh();
    } catch (err: any) {
      setActionError(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (stream: AuthorizedStream) => {
    try {
      await updateAuthorizedStream(stream.id, {
        is_active: !stream.is_active,
      });
      fetchStreams();
      refresh();
    } catch (err: any) {
      setActionError('Failed to toggle status: ' + err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to remove this authorized stream?')) return;
    try {
      await deleteAuthorizedStream(id);
      setActionSuccess('Stream deleted.');
      fetchStreams();
      refresh();
    } catch (err: any) {
      setActionError('Failed to delete stream: ' + err.message);
    }
  };

  const getMatchLabel = (mId: number) => {
    const found = candidateMatches.find((m) => m.id === String(mId));
    if (found) {
      return `${found.homeName || found.home} vs ${found.awayName || found.away} (${found.competitionName || 'Match'})`;
    }
    return `Fixture #${mId}`;
  };

  return (
    <div className="page-frame">
      <div className="content-head">
        <div>
          <span className="eyebrow">
            <Shield size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Management / Access Control
          </span>
          <h1 className="page-title">Authorized Streams</h1>
          <p className="page-subtitle">
            Configure, assign, and operate legal HLS/DASH streaming URLs for real API-Football matches.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={fetchStreams}
            className="btn btn-secondary"
            disabled={loading}
            title="Refresh list"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={openAddForm} className="btn btn-primary">
            <Plus size={15} /> Add Stream
          </button>
        </div>
      </div>

      {actionError && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            borderRadius: 10,
            padding: '10px 16px',
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {actionError}
        </div>
      )}

      {actionSuccess && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#34d399',
            borderRadius: 10,
            padding: '10px 16px',
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {actionSuccess}
        </div>
      )}

      {/* Add / Edit Modal Form */}
      {isAdding && (
        <div
          style={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 14,
            padding: 20,
            marginBottom: 24,
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          }}
        >
          <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#fff' }}>
            {editingStream ? 'Edit Authorized Stream' : 'Assign Authorized Stream to Match'}
          </h3>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'hsl(var(--muted-foreground))', marginBottom: 6 }}>
                Target Match (Fixture)
              </label>
              {candidateMatches.length > 0 && !editingStream ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    value={matchIdInput}
                    onChange={(e) => setMatchIdInput(e.target.value)}
                    style={{
                      flex: 1,
                      background: 'hsl(var(--secondary))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: 13,
                    }}
                  >
                    {candidateMatches.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.homeName || m.home} vs {m.awayName || m.away} ({m.competitionName || 'Match'} · {m.status.toUpperCase()}) [ID: {m.id}]
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Or enter Fixture ID"
                    value={matchIdInput}
                    onChange={(e) => setMatchIdInput(e.target.value)}
                    style={{
                      width: 160,
                      background: 'hsl(var(--secondary))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: 13,
                    }}
                  />
                </div>
              ) : (
                <input
                  type="number"
                  placeholder="Fixture ID (e.g. 867946)"
                  value={matchIdInput}
                  onChange={(e) => setMatchIdInput(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    background: 'hsl(var(--secondary))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    padding: '8px 12px',
                    color: '#fff',
                    fontSize: 13,
                  }}
                />
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'hsl(var(--muted-foreground))', marginBottom: 6 }}>
                  Authorized Provider Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Akamai CDN, Broadcaster Feed, Private HLS"
                  value={providerInput}
                  onChange={(e) => setProviderInput(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    background: 'hsl(var(--secondary))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    padding: '8px 12px',
                    color: '#fff',
                    fontSize: 13,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'hsl(var(--muted-foreground))', marginBottom: 6 }}>
                  Stream Type
                </label>
                <select
                  value={typeInput}
                  onChange={(e) => setTypeInput(e.target.value as any)}
                  style={{
                    width: '100%',
                    background: 'hsl(var(--secondary))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    padding: '8px 12px',
                    color: '#fff',
                    fontSize: 13,
                  }}
                >
                  <option value="hls">📺 HLS (.m3u8) — Native video player</option>
                  <option value="dash">📺 MPEG-DASH (.mpd) — Native video player</option>
                  <option value="iframe">📡 Iframe Embed — External stream page</option>
                </select>
                {typeInput === 'iframe' && (
                  <p style={{ fontSize: 11, color: '#818cf8', marginTop: 6, marginBottom: 0 }}>
                    💡 Iframe embeds the external URL directly. Paste the full embed page URL (e.g. your streaming panel URL).
                  </p>
                )}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'hsl(var(--muted-foreground))', marginBottom: 6 }}>
                {typeInput === 'iframe' ? 'Stream Embed URL (full page URL)' : 'Authorized Stream URL (.m3u8 / .mpd)'}
              </label>
              <input
                type="url"
                placeholder={
                  typeInput === 'iframe'
                    ? 'https://your-stream-panel.com/embed/channel'
                    : 'https://your-authorized-stream-provider.com/live/stream.m3u8'
                }
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                required
                style={{
                  width: '100%',
                  background: 'hsl(var(--secondary))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: '#fff',
                  fontSize: 13,
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                id="is-active-check"
                checked={isActiveInput}
                onChange={(e) => setIsActiveInput(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'hsl(var(--primary))' }}
              />
              <label htmlFor="is-active-check" style={{ fontSize: 13, color: '#fff', cursor: 'pointer' }}>
                Activate stream immediately for users
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
                {editingStream ? 'Save Changes' : 'Create Stream'}
              </button>
              <button type="button" onClick={() => setIsAdding(false)} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Streams Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Loader2 size={32} className="animate-spin" style={{ color: 'hsl(var(--primary))', margin: '0 auto 12px' }} />
          <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>Loading authorized streams...</p>
        </div>
      ) : streams.length === 0 ? (
        <div
          style={{
            background: 'hsl(var(--card))',
            border: '1px dashed hsl(var(--border))',
            borderRadius: 14,
            padding: '40px 20px',
            textAlign: 'center',
          }}
        >
          <Radio size={36} style={{ color: 'hsl(var(--muted-foreground))', margin: '0 auto 12px' }} />
          <h3 style={{ margin: '0 0 6px', fontSize: 16, color: '#fff' }}>No Authorized Streams Yet</h3>
          <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 13, maxWidth: 440, margin: '0 auto 20px' }}>
            Add your legally authorized HLS streams provided by your streaming infrastructure to enable live playback for users.
          </p>
          <button onClick={openAddForm} className="btn btn-primary">
            <Plus size={15} /> Add First Stream
          </button>
        </div>
      ) : (
        <div className="standings-table-wrap">
          <table className="standings-table">
            <thead>
              <tr>
                <th>Match</th>
                <th>Provider</th>
                <th>Stream URL</th>
                <th>Type</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {streams.map((stream) => (
                <tr key={stream.id} className="standings-row">
                  <td>
                    <div style={{ fontWeight: 600, color: '#fff' }}>
                      {getMatchLabel(stream.match_id)}
                    </div>
                    <small style={{ color: 'hsl(var(--muted-foreground))' }}>Fixture ID: {stream.match_id}</small>
                  </td>
                  <td style={{ fontWeight: 500 }}>{stream.provider}</td>
                  <td>
                    <span
                      style={{
                        display: 'inline-block',
                        maxWidth: 240,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: 'hsl(var(--muted-foreground))',
                        fontFamily: 'var(--app-font-mono)',
                        fontSize: 12,
                      }}
                      title={stream.stream_url}
                    >
                      {stream.stream_url}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: stream.stream_type === 'iframe'
                          ? 'rgba(99,102,241,0.15)'
                          : 'rgba(255,255,255,0.08)',
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: stream.stream_type === 'iframe' ? '#818cf8' : 'hsl(var(--primary))',
                      }}
                    >
                      {stream.stream_type === 'iframe' ? '📡 Iframe' : stream.stream_type}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleToggleActive(stream)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: stream.is_active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: stream.is_active ? '#34d399' : '#f87171',
                        border: `1px solid ${stream.is_active ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                        padding: '3px 10px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      title="Click to toggle status"
                    >
                      {stream.is_active ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {stream.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <Link
                        href={`/match/${stream.match_id}`}
                        className="btn btn-secondary"
                        style={{ height: 30, padding: '0 8px' }}
                        title="View Match Details & Stream"
                      >
                        <ExternalLink size={13} />
                      </Link>
                      <button
                        onClick={() => openEditForm(stream)}
                        className="btn btn-secondary"
                        style={{ height: 30, padding: '0 8px' }}
                        title="Edit Stream"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(stream.id)}
                        className="btn btn-secondary"
                        style={{ height: 30, padding: '0 8px', color: '#f87171' }}
                        title="Delete Stream"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

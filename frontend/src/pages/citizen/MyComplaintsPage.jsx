import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const PRIORITY_STYLES = {
  EMERGENCY: { bg: 'rgba(255,59,48,0.15)', color: '#ff3b30' },
  HIGH: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
  MODERATE: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
  INFORMATIONAL: { bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
};

export default function MyComplaintsPage() {
  const { user, logoutCitizen } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchComplaints();
  }, [page]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/complaints/my?page=${page}&limit=10`);
      setComplaints(res.data.complaints);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--clr-bg)' }}>
      <div
        style={{
          background: 'rgba(8,12,20,0.9)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--clr-border)',
          padding: '0 24px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>My Complaints</div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link to="/profile" className="btn btn-ghost btn-sm">
            Profile
          </Link>
          <Link to="/complaint" className="btn btn-primary btn-sm">
            + New Complaint
          </Link>
          <button className="btn btn-ghost btn-sm" onClick={logoutCitizen}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '32px auto', padding: '0 24px' }}>
        <h2 style={{ marginBottom: '24px' }}>Your Filed Complaints</h2>

        {loading ? (
          <div style={{ display: 'grid', gap: '16px' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: '100px', borderRadius: '12px' }} />
            ))}
          </div>
        ) : complaints.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 24px',
              color: 'var(--clr-text-muted)',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📋</div>
            <h3 style={{ marginBottom: '8px', fontSize: '1.1rem' }}>No complaints yet</h3>
            <p style={{ fontSize: '0.85rem', marginBottom: '20px' }}>
              Start by filing your first complaint
            </p>
            <Link to="/complaint" className="btn btn-primary">
              File a Complaint
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gap: '12px',
              animation: 'fadeIn 0.4s ease',
            }}
          >
            {complaints.map((c) => {
              const pStyle = PRIORITY_STYLES[c.priorityLevel] || PRIORITY_STYLES.INFORMATIONAL;
              return (
                <Link
                  key={c.trackingId}
                  to={`/track/${c.trackingId}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div className="card" style={{ cursor: 'pointer' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '8px',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: 'var(--clr-primary-light)',
                            fontSize: '0.9rem',
                          }}
                        >
                          {c.trackingId}
                        </div>
                        <div
                          style={{
                            fontWeight: 600,
                            color: 'var(--clr-text)',
                            marginTop: '2px',
                          }}
                        >
                          {c.incidentType || 'General Complaint'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        {c.isEmergency && (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '20px',
                              background: 'rgba(255,59,48,0.2)',
                              color: '#ff3b30',
                              border: '1px solid rgba(255,59,48,0.3)',
                            }}
                          >
                            🚨 EMERGENCY
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '4px 10px',
                            borderRadius: '20px',
                            background: pStyle.bg,
                            color: pStyle.color,
                          }}
                        >
                          {c.priorityLevel}
                        </span>
                      </div>
                    </div>
                    <p
                      style={{
                        fontSize: '0.82rem',
                        color: 'var(--clr-text-muted)',
                        lineHeight: 1.5,
                        marginBottom: '8px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {c.summaryText || 'No summary available'}
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.78rem',
                        color: 'var(--clr-text-faint)',
                      }}
                    >
                      <span>📍 {c.station?.stationName}</span>
                      <span>{new Date(c.createdAt).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {pagination && pagination.pages > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '24px',
            }}
          >
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ← Prev
            </button>
            <span
              style={{
                padding: '6px 12px',
                color: 'var(--clr-text-muted)',
                fontSize: '0.85rem',
              }}
            >
              {page} / {pagination.pages}
            </span>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../utils/api";
import toast from "react-hot-toast";

const PRIORITY_COLORS = {
  EMERGENCY: "#ff3b30",
  HIGH: "#f87171",
  MODERATE: "#fbbf24",
  INFORMATIONAL: "#34d399",
};

const STATUS_LABELS = {
  FILED: "Filed",
  UNDER_REVIEW: "Under Review",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  ESCALATED: "Escalated",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export default function LinkedComplaintsPage() {
  const navigate = useNavigate();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    fetchLinkedComplaints();
  }, []);

  const fetchLinkedComplaints = async () => {
    try {
      const res = await api.get("/api/evidence/linked-complaints", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("reva_police_token")}`,
        },
      });
      setLinks(res.data.links || []);
    } catch (err) {
      toast.error("Failed to load linked complaints.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sidebarItems = [
    { to: "/police/dashboard", icon: "📊", label: "Dashboard" },
    { to: "/police/complaints", icon: "📁", label: "All Cases" },
    { to: "/police/map", icon: "🗺️", label: "Crime Map" },
    { to: "/police/analytics", icon: "📈", label: "Analytics" },
    { to: "/police/officers", icon: "👥", label: "Officers" },
    { to: "/police/linked-complaints", icon: "🔗", label: "Joint Complaints" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--clr-bg)", fontFamily: "var(--font-sans)" }}>
      {/* Sidebar */}
      <aside style={{ width: 220, background: "var(--clr-surface)", borderRight: "1px solid var(--clr-border)", padding: "20px 12px", display: "flex", flexDirection: "column", gap: 8, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        <div style={{ marginBottom: 20, padding: "0 8px" }}>
          <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--clr-primary-light)" }}>REVA</span>
          <span style={{ fontSize: "0.7rem", color: "var(--clr-text-muted)", marginLeft: 6 }}>Police Portal</span>
        </div>
        <nav style={{ flex: 1 }}>
          {sidebarItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                borderRadius: 8, marginBottom: 4, textDecoration: "none", fontSize: "0.88rem",
                background: window.location.pathname === item.to ? "rgba(59,130,246,0.1)" : "transparent",
                color: window.location.pathname === item.to ? "var(--clr-primary-light)" : "var(--clr-text-muted)",
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: "32px 28px", overflowY: "auto" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--clr-text)", margin: 0 }}>
              🔗 Joint Complaint Intelligence
            </h1>
            <p style={{ color: "var(--clr-text-muted)", marginTop: 6, fontSize: "0.88rem" }}>
              Complaints automatically linked by matching evidence (≥85% visual similarity). Confidential — not visible to citizens.
            </p>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--clr-text-muted)" }}>
              Loading linked complaints...
            </div>
          ) : links.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--clr-text-muted)", background: "var(--clr-surface)", borderRadius: 12, border: "1px solid var(--clr-border)" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🔍</div>
              <p style={{ margin: 0, fontWeight: 600 }}>No linked complaints yet</p>
              <p style={{ marginTop: 6, fontSize: "0.85rem" }}>When users upload visually similar evidence, complaints will be automatically linked here.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {links.map((link) => {
                const isOpen = expanded === link.linkId;
                const sim = link.evidenceMatch ? Math.round(link.evidenceMatch.similarityScore * 100) : null;
                return (
                  <div
                    key={link.linkId}
                    style={{ background: "var(--clr-surface)", borderRadius: 12, border: "1px solid var(--clr-border)", overflow: "hidden" }}
                  >
                    {/* Summary row */}
                    <button
                      onClick={() => setExpanded(isOpen ? null : link.linkId)}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                    >
                      {/* Match badge */}
                      <div style={{
                        minWidth: 64, textAlign: "center", padding: "6px 10px", borderRadius: 8,
                        background: link.evidenceMatch?.matchType === "EXACT" ? "rgba(16,185,129,0.15)" : "rgba(59,130,246,0.12)",
                        border: `1px solid ${link.evidenceMatch?.matchType === "EXACT" ? "rgba(16,185,129,0.4)" : "rgba(59,130,246,0.3)"}`,
                      }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: link.evidenceMatch?.matchType === "EXACT" ? "#10b981" : "#60a5fa" }}>
                          {link.evidenceMatch?.matchType === "EXACT" ? "EXACT" : `${sim}%`}
                        </div>
                        <div style={{ fontSize: "0.65rem", color: "var(--clr-text-muted)", marginTop: 2 }}>match</div>
                      </div>

                      {/* Complaints summary */}
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                          {[link.complaintA, link.complaintB].map((c, i) => (
                            <span key={i} style={{ fontSize: "0.82rem", color: "var(--clr-text)", display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontFamily: "monospace", color: "#a78bfa", fontWeight: 700 }}>{c.trackingId}</span>
                              <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: 20, background: `${PRIORITY_COLORS[c.priorityLevel]}22`, color: PRIORITY_COLORS[c.priorityLevel], border: `1px solid ${PRIORITY_COLORS[c.priorityLevel]}44` }}>
                                {c.priorityLevel}
                              </span>
                              <span style={{ color: "var(--clr-text-muted)", fontSize: "0.78rem" }}>{c.incidentType || "Unknown"}</span>
                            </span>
                          ))}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)" }}>
                          Linked {new Date(link.linkedAt).toLocaleString()} · {link.linkReason.replace(/_/g, " ")}
                        </div>
                      </div>

                      <span style={{ color: "var(--clr-text-muted)", fontSize: "0.85rem" }}>{isOpen ? "▲" : "▼"}</span>
                    </button>

                    {/* Expanded details */}
                    {isOpen && (
                      <div style={{ padding: "0 20px 20px", borderTop: "1px solid var(--clr-border)" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
                          {[link.complaintA, link.complaintB].map((c, i) => (
                            <div key={i} style={{ background: "rgba(0,0,0,0.2)", borderRadius: 10, padding: 16 }}>
                              <div style={{ fontSize: "0.7rem", color: "var(--clr-text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                                Complaint {i + 1}
                              </div>
                              <div style={{ fontFamily: "monospace", fontWeight: 700, color: "#a78bfa", marginBottom: 6 }}>{c.trackingId}</div>
                              <div style={{ fontSize: "0.82rem", color: "var(--clr-text)", marginBottom: 4 }}>{c.incidentType || "Unknown type"}</div>
                              <div style={{ fontSize: "0.78rem", color: "var(--clr-text-muted)", marginBottom: 4 }}>
                                {c.station?.stationName}{c.station?.district ? `, ${c.station.district}` : ""}
                              </div>
                              <div style={{ fontSize: "0.78rem", color: "var(--clr-text-muted)", marginBottom: 4 }}>
                                {c.locationAddress || "No address"}
                              </div>
                              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                                <span style={{ fontSize: "0.73rem", padding: "3px 10px", borderRadius: 20, background: `${PRIORITY_COLORS[c.priorityLevel]}22`, color: PRIORITY_COLORS[c.priorityLevel], border: `1px solid ${PRIORITY_COLORS[c.priorityLevel]}44` }}>
                                  {c.priorityLevel}
                                </span>
                                <span style={{ fontSize: "0.73rem", padding: "3px 10px", borderRadius: 20, background: "rgba(255,255,255,0.06)", color: "var(--clr-text-muted)", border: "1px solid var(--clr-border)" }}>
                                  {STATUS_LABELS[c.status] || c.status}
                                </span>
                              </div>
                              <Link
                                to={`/police/complaints/${c.id}`}
                                style={{ display: "inline-block", marginTop: 12, fontSize: "0.78rem", color: "#60a5fa", textDecoration: "none" }}
                              >
                                View Full Case →
                              </Link>
                            </div>
                          ))}
                        </div>

                        {/* Evidence match details */}
                        {link.evidenceMatch && (
                          <div style={{ marginTop: 16, padding: 14, background: "rgba(139,92,246,0.08)", borderRadius: 10, border: "1px solid rgba(139,92,246,0.2)" }}>
                            <div style={{ fontSize: "0.7rem", color: "#a78bfa", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, fontWeight: 700 }}>
                              Matching Evidence
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                              {[link.evidenceMatch.source, link.evidenceMatch.target].map((ev, i) => (
                                <div key={i} style={{ fontSize: "0.8rem", color: "var(--clr-text-muted)" }}>
                                  <div style={{ color: "var(--clr-text)", fontWeight: 600, marginBottom: 3 }}>{ev.fileName}</div>
                                  <div>{ev.mimeType}</div>
                                  {ev.riskLevel && (
                                    <div style={{ marginTop: 4 }}>
                                      Risk: <span style={{ color: ev.riskLevel === "Critical" || ev.riskLevel === "High" ? "#f87171" : "#fbbf24" }}>{ev.riskLevel}</span>
                                    </div>
                                  )}
                                  {ev.overview && <div style={{ marginTop: 4, fontStyle: "italic", fontSize: "0.75rem" }}>{ev.overview}</div>}
                                </div>
                              ))}
                            </div>
                            <div style={{ marginTop: 10, fontSize: "0.78rem", color: "var(--clr-text-muted)" }}>
                              Match type: <strong style={{ color: link.evidenceMatch.matchType === "EXACT" ? "#10b981" : "#60a5fa" }}>{link.evidenceMatch.matchType}</strong>
                              {" · "}Similarity: <strong style={{ color: "#a78bfa" }}>{Math.round(link.evidenceMatch.similarityScore * 100)}%</strong>
                              {" · "}Detected: {new Date(link.evidenceMatch.createdAt).toLocaleString()}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

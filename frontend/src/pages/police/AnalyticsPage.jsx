import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";

export default function AnalyticsPage() {
  const { policeUser } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("reva_police_token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    api
      .get("/api/analytics/overview", { headers })
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const PRIORITY_COLORS = {
    EMERGENCY: "#ff3b30",
    HIGH: "#f87171",
    MODERATE: "#fbbf24",
    INFORMATIONAL: "#34d399",
  };
  const STATUS_COLORS = {
    FILED: "#60a5fa",
    UNDER_REVIEW: "#fbbf24",
    ASSIGNED: "#a78bfa",
    IN_PROGRESS: "#34d399",
    ESCALATED: "#f87171",
    RESOLVED: "#10b981",
    CLOSED: "#94a3b8",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--clr-bg)",
        padding: "24px",
      }}
    >
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ marginBottom: "28px" }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate("/police/dashboard")}
            style={{ marginBottom: "8px" }}
          >
            ← Back
          </button>
          <h2>Analytics Dashboard</h2>
          <p style={{ color: "var(--clr-text-muted)", fontSize: "0.85rem" }}>
            {policeUser?.station?.stationName} — Last 30 days
          </p>
        </div>

        {loading ? (
          <div style={{ display: "grid", gap: "16px" }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="skeleton"
                style={{ height: "200px", borderRadius: "12px" }}
              />
            ))}
          </div>
        ) : (
          data && (
            <div style={{ display: "grid", gap: "20px" }}>
              {/* By Priority */}
              <div className="card">
                <h4 style={{ marginBottom: "20px" }}>Complaints by Priority</h4>
                <div style={{ display: "grid", gap: "12px" }}>
                  {Object.entries(data.byPriority || {}).map(
                    ([priority, count]) => {
                      const max = Math.max(
                        ...Object.values(data.byPriority || {}),
                      );
                      const pct = (count / max) * 100;
                      return (
                        <div key={priority}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "0.85rem",
                              marginBottom: "6px",
                            }}
                          >
                            <span
                              style={{
                                color: PRIORITY_COLORS[priority] || "#94a3b8",
                              }}
                            >
                              {priority}
                            </span>
                            <span
                              style={{
                                fontWeight: 600,
                                color: "var(--clr-text)",
                              }}
                            >
                              {count}
                            </span>
                          </div>
                          <div
                            style={{
                              height: "8px",
                              background: "var(--clr-bg-3)",
                              borderRadius: "4px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${pct}%`,
                                background:
                                  PRIORITY_COLORS[priority] || "#94a3b8",
                                borderRadius: "4px",
                                transition: "width 0.6s ease",
                              }}
                            />
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>

              {/* By Status */}
              <div className="card">
                <h4 style={{ marginBottom: "20px" }}>Complaints by Status</h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                  {Object.entries(data.byStatus || {}).map(
                    ([status, count]) => (
                      <div
                        key={status}
                        style={{
                          padding: "12px 20px",
                          background: "var(--clr-bg-3)",
                          borderRadius: "10px",
                          border: "1px solid var(--clr-border)",
                          textAlign: "center",
                          minWidth: "120px",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: "1.5rem",
                            color: STATUS_COLORS[status] || "#94a3b8",
                          }}
                        >
                          {count}
                        </div>
                        <div
                          style={{
                            fontSize: "0.78rem",
                            color: "var(--clr-text-muted)",
                            marginTop: "4px",
                          }}
                        >
                          {status.replace("_", " ")}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>

              {/* Top Incident Types */}
              {data.topIncidentTypes?.length > 0 && (
                <div className="card">
                  <h4 style={{ marginBottom: "20px" }}>Top Incident Types</h4>
                  <div style={{ display: "grid", gap: "8px" }}>
                    {data.topIncidentTypes.slice(0, 8).map((item, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <div
                          style={{
                            width: "20px",
                            fontSize: "0.8rem",
                            color: "var(--clr-text-faint)",
                            flexShrink: 0,
                          }}
                        >
                          #{i + 1}
                        </div>
                        <div
                          style={{
                            flex: 1,
                            fontSize: "0.88rem",
                            color: "var(--clr-text)",
                          }}
                        >
                          {item.type}
                        </div>
                        <div
                          style={{
                            fontWeight: 600,
                            color: "var(--clr-primary-light)",
                            fontSize: "0.9rem",
                          }}
                        >
                          {item.count}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trend */}
              {data.recentTrend?.length > 0 && (
                <div className="card">
                  <h4 style={{ marginBottom: "16px" }}>
                    Recent Trend (30 days)
                  </h4>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      gap: "4px",
                      height: "80px",
                    }}
                  >
                    {data.recentTrend.map((d, i) => {
                      const max = Math.max(
                        ...data.recentTrend.map((t) => t.count),
                      );
                      const h = max > 0 ? (d.count / max) * 100 : 0;
                      return (
                        <div
                          key={i}
                          title={`${d.date}: ${d.count}`}
                          style={{
                            flex: 1,
                            height: `${Math.max(h, 4)}%`,
                            background: "var(--grad-primary)",
                            borderRadius: "3px 3px 0 0",
                            minHeight: "4px",
                            transition: "height 0.3s ease",
                            cursor: "pointer",
                            opacity: 0.8,
                          }}
                        />
                      );
                    })}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: "6px",
                      fontSize: "0.72rem",
                      color: "var(--clr-text-faint)",
                    }}
                  >
                    <span>{data.recentTrend[0]?.date}</span>
                    <span>
                      {data.recentTrend[data.recentTrend.length - 1]?.date}
                    </span>
                  </div>
                </div>
              )}

              <div
                style={{
                  textAlign: "center",
                  padding: "16px",
                  fontSize: "0.8rem",
                  color: "var(--clr-text-faint)",
                }}
              >
                Total Complaints:{" "}
                <strong style={{ color: "var(--clr-text)" }}>
                  {data.totalComplaints}
                </strong>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

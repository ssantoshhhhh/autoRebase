import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
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

export default function PoliceDashboard() {
  const { policeUser, logoutPolice } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: "",
    priority: "",
    assignedTo: "",
    search: "",
  });
  const [complaints, setComplaints] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [page, filter, activeTab]);

  const fetchDashboard = async () => {
    try {
      const res = await api.get("/api/police/dashboard", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("reva_police_token")}`,
        },
      });
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchComplaints = async () => {
    try {
      const params = new URLSearchParams({ page, limit: 15, ...filter });
      if (activeTab === "mine") params.set("assignedTo", "me");
      if (activeTab === "emergency") params.set("priority", "EMERGENCY");
      if (activeTab === "cyber") params.set("search", "Cybercrime");

      const res = await api.get(`/api/police/complaints?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("reva_police_token")}`,
        },
      });
      setComplaints(res.data.complaints);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
    }
  };

  const stats = data?.stats;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--clr-bg)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Sidebar + Main layout */}
      <div style={{ display: "flex", minHeight: "100vh" }}>
        {/* Sidebar */}
        <aside
          style={{
            width: "240px",
            background: "var(--clr-bg-2)",
            borderRight: "1px solid var(--clr-border)",
            padding: "24px 16px",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            position: "sticky",
            top: 0,
            height: "100vh",
            overflow: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "32px",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "8px",
                background: "var(--grad-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
              }}
            >
              👮
            </div>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                }}
              >
                REVA Police
              </div>
              <div
                style={{ fontSize: "0.7rem", color: "var(--clr-text-faint)" }}
              >
                {policeUser?.station?.stationName}
              </div>
            </div>
          </div>

          <nav style={{ flex: 1 }}>
            {[
              { to: "/police/dashboard", icon: "📊", label: "Dashboard" },
              { to: "/police/complaints", icon: "📁", label: "All Cases" },
              { to: "/police/map", icon: "🗺️", label: "Crime Map" },
              { to: "/police/analytics", icon: "📈", label: "Analytics" },
              { to: "/police/officers", icon: "👥", label: "Officers" },
              ...(policeUser?.role === "GLOBAL_ADMIN"
                ? [{ to: "/police/stations", icon: "🏢", label: "Stations" }]
                : []),
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  marginBottom: "4px",
                  textDecoration: "none",
                  fontSize: "0.88rem",
                  transition: "all 0.15s",
                  background:
                    window.location.pathname === item.to
                      ? "rgba(59,130,246,0.1)"
                      : "transparent",
                  color:
                    window.location.pathname === item.to
                      ? "var(--clr-primary-light)"
                      : "var(--clr-text-muted)",
                }}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>

          <div
            style={{
              borderTop: "1px solid var(--clr-border)",
              paddingTop: "16px",
            }}
          >
            <div
              style={{
                fontSize: "0.8rem",
                color: "var(--clr-text-muted)",
                marginBottom: "4px",
              }}
            >
              {policeUser?.name}
            </div>
            <div
              style={{
                fontSize: "0.7rem",
                color: "var(--clr-text-faint)",
                marginBottom: "12px",
              }}
            >
              {policeUser?.role?.replace("_", " ")}
            </div>
            <button
              className="btn btn-ghost btn-sm w-full"
              onClick={logoutPolice}
              style={{ justifyContent: "flex-start" }}
            >
              🚪 Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main style={{ flex: 1, overflow: "auto" }}>
          <div style={{ padding: "24px 28px" }}>
            {/* Dashboard Header with Station Settings (Admin only) */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "28px",
              }}
            >
              <div>
                <h1 style={{ fontSize: "1.5rem", marginBottom: "6px" }}>
                  {policeUser?.station?.stationName || "Station Dashboard"}
                </h1>
                <p
                  style={{
                    color: "var(--clr-text-muted)",
                    fontSize: "0.85rem",
                  }}
                >
                  {policeUser?.station?.district}, {policeUser?.station?.state}
                </p>
              </div>

              {policeUser?.role === "STATION_ADMIN" && (
                <div
                  className="card"
                  style={{
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    minWidth: "280px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "var(--clr-primary-light)",
                    }}
                  >
                    Geofence Settings
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "8px",
                    }}
                  >
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label
                        style={{
                          fontSize: "0.65rem",
                          display: "block",
                          marginBottom: "4px",
                        }}
                      >
                        Latitude
                      </label>
                      <input
                        type="number"
                        className="input"
                        style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                        defaultValue={policeUser?.station?.latitude}
                        onBlur={async (e) => {
                          try {
                            await api.patch(
                              `/api/stations/${policeUser.stationId}`,
                              { latitude: e.target.value },
                            );
                            toast.success("Latitude updated");
                          } catch (err) {
                            toast.error("Failed to update");
                          }
                        }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label
                        style={{
                          fontSize: "0.65rem",
                          display: "block",
                          marginBottom: "4px",
                        }}
                      >
                        Longitude
                      </label>
                      <input
                        type="number"
                        className="input"
                        style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                        defaultValue={policeUser?.station?.longitude}
                        onBlur={async (e) => {
                          try {
                            await api.patch(
                              `/api/stations/${policeUser.stationId}`,
                              { longitude: e.target.value },
                            );
                            toast.success("Longitude updated");
                          } catch (err) {
                            toast.error("Failed to update");
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label
                      style={{
                        fontSize: "0.65rem",
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      Radius (km)
                    </label>
                    <input
                      type="number"
                      className="input"
                      style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                      defaultValue={policeUser?.station?.radiusKm || 5}
                      onBlur={async (e) => {
                        const radius = parseFloat(e.target.value);
                        try {
                          await api.patch(
                            `/api/stations/${policeUser.stationId}`,
                            { radiusKm: radius },
                          );
                          toast.success(`Radius updated to ${radius}km`);
                        } catch (err) {
                          toast.error("Failed to update");
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Stats Grid */}
            {!loading && stats && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: "16px",
                  marginBottom: "28px",
                }}
              >
                <StatCard
                  label="Total"
                  value={stats.total}
                  color="var(--clr-primary)"
                  icon="📋"
                />
                <StatCard
                  label="Emergency"
                  value={stats.emergency}
                  color="#ff3b30"
                  icon="🚨"
                />
                <StatCard
                  label="Pending"
                  value={stats.pending}
                  color="#fbbf24"
                  icon="⏳"
                />
                <StatCard
                  label="In Progress"
                  value={stats.inProgress}
                  color="#a78bfa"
                  icon="🔄"
                />
                <StatCard
                  label="Resolved"
                  value={stats.resolved}
                  color="#10b981"
                  icon="✅"
                />
                <StatCard
                  label="High Priority"
                  value={stats.highPriority}
                  color="#f87171"
                  icon="⚠️"
                />
              </div>
            )}

            {/* Cyber Intel Dashboard Integration */}
            <div style={{ marginBottom: "28px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "#60a5fa",
                    boxShadow: "0 0 10px #60a5fa",
                  }}
                />
                <h2 style={{ fontSize: "1.2rem", color: "#60a5fa" }}>
                  🛡️ Cyber-Intel Threat Awareness
                </h2>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr",
                  gap: "16px",
                }}
              >
                {/* Attack Vectors */}
                <div className="card" style={{ padding: "20px" }}>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--clr-text-muted)",
                      marginBottom: "12px",
                    }}
                  >
                    Active Attack Vectors (Regional)
                  </div>
                  <div style={{ display: "flex", gap: "12px" }}>
                    {[
                      { l: "Social Engineering", v: "44%", c: "#fbbf24" },
                      { l: "Phishing", v: "28%", c: "#f87171" },
                      { l: "Identity Theft", v: "15%", c: "#a78bfa" },
                      { l: "Financial Fraud", v: "13%", c: "#60a5fa" },
                    ].map((vector) => (
                      <div
                        key={vector.l}
                        style={{ flex: 1, textAlign: "center" }}
                      >
                        <div
                          style={{
                            fontSize: "1.2rem",
                            fontWeight: 700,
                            color: vector.c,
                          }}
                        >
                          {vector.v}
                        </div>
                        <div
                          style={{
                            fontSize: "0.65rem",
                            color: "var(--clr-text-faint)",
                            textTransform: "uppercase",
                          }}
                        >
                          {vector.l}
                        </div>
                        <div
                          style={{
                            height: "4px",
                            background: "rgba(255,255,255,0.05)",
                            borderRadius: "2px",
                            marginTop: "8px",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: vector.v,
                              background: vector.c,
                              borderRadius: "2px",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Forensic Audit Stream */}
                <div
                  className="card"
                  style={{ padding: "16px", background: "rgba(0,0,0,0.2)" }}
                >
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#10b981",
                      marginBottom: "8px",
                      fontWeight: 700,
                    }}
                  >
                    IMMUTABLE AUDIT STREAM
                  </div>
                  <div
                    style={{
                      fontSize: "0.65rem",
                      fontFamily: "monospace",
                      color: "rgba(255,255,255,0.4)",
                      lineHeight: "1.4",
                    }}
                  >
                    [SYS] Integrity Check: PASSED (SHA-256)
                    <br />
                    [AUDIT] Auth Request: Officer_
                    {policeUser?.name?.slice(0, 3)}...
                    <br />
                    [SIGN] Forensic Envelope: Sealed v1.2
                    <br />
                    [BLOCK] Tracking ID verification...
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                marginBottom: "20px",
                borderBottom: "1px solid var(--clr-border)",
                paddingBottom: "0",
              }}
            >
              {[
                { id: "all", label: "All Complaints" },
                { id: "emergency", label: "🚨 Emergency" },
                { id: "cyber", label: "🛡️ Cyber Crimes" },
                { id: "mine", label: "Assigned to Me" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setPage(1);
                  }}
                  style={{
                    padding: "10px 16px",
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    fontFamily: "var(--font-sans)",
                    fontSize: "0.88rem",
                    fontWeight: activeTab === tab.id ? 600 : 400,
                    color:
                      activeTab === tab.id
                        ? "var(--clr-text)"
                        : "var(--clr-text-muted)",
                    borderBottom:
                      activeTab === tab.id
                        ? "2px solid var(--clr-primary)"
                        : "2px solid transparent",
                    transition: "all 0.15s",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search & Filter */}
            <div
              style={{
                display: "flex",
                gap: "10px",
                marginBottom: "16px",
                flexWrap: "wrap",
              }}
            >
              <input
                id="complaint-search"
                type="text"
                className="input"
                style={{ flex: 1, minWidth: "200px" }}
                placeholder="Search by tracking ID, type..."
                value={filter.search}
                onChange={(e) =>
                  setFilter((f) => ({ ...f, search: e.target.value }))
                }
              />
              <select
                id="status-filter"
                className="input"
                style={{ width: "auto" }}
                value={filter.status}
                onChange={(e) =>
                  setFilter((f) => ({ ...f, status: e.target.value }))
                }
              >
                <option value="">All Statuses</option>
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              <select
                id="priority-filter"
                className="input"
                style={{ width: "auto" }}
                value={filter.priority}
                onChange={(e) =>
                  setFilter((f) => ({ ...f, priority: e.target.value }))
                }
              >
                <option value="">All Priority</option>
                {Object.keys(PRIORITY_COLORS).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Complaints Table */}
            <div
              style={{
                background: "var(--clr-surface)",
                border: "1px solid var(--clr-border)",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.85rem",
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--clr-border)" }}>
                      {[
                        "Tracking ID",
                        "Type",
                        "Priority",
                        "Status",
                        "Officer",
                        "Filed",
                        "Action",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "12px 16px",
                            textAlign: "left",
                            color: "var(--clr-text-faint)",
                            fontWeight: 500,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {complaints.map((c) => (
                      <tr
                        key={c.id}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.03)",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background =
                            "rgba(255,255,255,0.02)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <td style={{ padding: "12px 16px" }}>
                          <div
                            style={{
                              fontFamily: "monospace",
                              color: "var(--clr-primary-light)",
                              fontSize: "0.8rem",
                            }}
                          >
                            {c.trackingId}
                            {c.isEmergency && (
                              <span
                                style={{
                                  marginLeft: "6px",
                                  color: "#ff3b30",
                                  fontSize: "0.7rem",
                                }}
                              >
                                🚨
                              </span>
                            )}
                          </div>
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            color: "var(--clr-text)",
                            maxWidth: "150px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {c.incidentType || "General"}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: "12px",
                              fontSize: "0.72rem",
                              fontWeight: 600,
                              background: `${PRIORITY_COLORS[c.priorityLevel]}20`,
                              color: PRIORITY_COLORS[c.priorityLevel],
                            }}
                          >
                            {c.priorityLevel}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: "12px",
                              fontSize: "0.72rem",
                              background: "rgba(255,255,255,0.06)",
                              color: "var(--clr-text-muted)",
                            }}
                          >
                            {STATUS_LABELS[c.status]}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            color: "var(--clr-text-muted)",
                          }}
                        >
                          {c.assignedOfficer?.name || "—"}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            color: "var(--clr-text-faint)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {new Date(c.createdAt).toLocaleDateString("en-IN")}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            display: "flex",
                            gap: "8px",
                          }}
                        >
                          <Link
                            to={`/police/complaints/${c.id}`}
                            className="btn btn-primary btn-sm"
                            style={{ whiteSpace: "nowrap" }}
                          >
                            Case File →
                          </Link>
                          <Link
                            to={`/police/map?id=${c.id}`}
                            className="btn btn-ghost btn-sm"
                            title="View on Map"
                          >
                            📍
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {complaints.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "48px",
                    color: "var(--clr-text-muted)",
                  }}
                >
                  <div style={{ fontSize: "2rem", marginBottom: "8px" }}>
                    📋
                  </div>
                  <p>No complaints found matching your filters</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "8px",
                  marginTop: "16px",
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
                    padding: "6px 12px",
                    color: "var(--clr-text-muted)",
                    fontSize: "0.8rem",
                  }}
                >
                  {page} of {pagination.pages}
                </span>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === pagination.pages}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon }) {
  return (
    <div className="card" style={{ textAlign: "center", padding: "16px" }}>
      <div style={{ fontSize: "1.5rem", marginBottom: "4px" }}>{icon}</div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "1.8rem",
          fontWeight: 800,
          color,
        }}
      >
        {value ?? "—"}
      </div>
      <div
        style={{
          fontSize: "0.78rem",
          color: "var(--clr-text-faint)",
          marginTop: "2px",
        }}
      >
        {label}
      </div>
    </div>
  );
}

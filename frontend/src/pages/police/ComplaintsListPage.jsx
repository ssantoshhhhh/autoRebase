import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import toast from "react-hot-toast";

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

export default function ComplaintsListPage() {
  const { policeUser, logoutPolice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    search: "",
  });

  const token = localStorage.getItem("reva_police_token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchComplaints();
  }, [page, filters.status, filters.priority]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 15,
        status: filters.status,
        priority: filters.priority,
        search: filters.search,
      });
      const res = await api.get(`/api/police/complaints?${params}`, {
        headers,
      });
      setComplaints(res.data.complaints);
      setTotal(res.data.pagination.total);
    } catch (err) {
      toast.error("Failed to load complaints");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchComplaints();
  };

  const navItems = [
    { to: "/police/dashboard", icon: "📊", label: "Dashboard" },
    { to: "/police/complaints", icon: "📁", label: "All Cases" },
    { to: "/police/map", icon: "🗺️", label: "Crime Map" },
    { to: "/police/analytics", icon: "📈", label: "Analytics" },
    { to: "/police/officers", icon: "👥", label: "Officers" },
    { to: "/police/linked-complaints", icon: "🔗", label: "Joint Complaints" },
    ...(policeUser?.role === "GLOBAL_ADMIN"
      ? [{ to: "/police/stations", icon: "🏢", label: "Stations" }]
      : []),
  ];

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--clr-bg)",
      }}
    >
      {/* Sidebar - Consistent with Dashboard */}
      <aside
        style={{
          width: "260px",
          background: "rgba(8,12,20,0.8)",
          backdropFilter: "blur(20px)",
          borderRight: "1px solid var(--clr-border)",
          display: "flex",
          flexDirection: "column",
          padding: "24px 16px",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <div style={{ padding: "0 12px 32px" }}>
          <h1
            style={{
              fontSize: "1.4rem",
              fontWeight: 800,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span style={{ color: "var(--clr-primary)" }}>REVA</span>
            <span
              style={{
                fontSize: "0.8rem",
                background: "var(--grad-primary)",
                padding: "2px 8px",
                borderRadius: "4px",
                textTransform: "uppercase",
              }}
            >
              Police
            </span>
          </h1>
        </div>

        <nav style={{ flex: 1 }}>
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 14px",
                borderRadius: "10px",
                marginBottom: "6px",
                textDecoration: "none",
                fontSize: "0.9rem",
                transition: "all 0.2s",
                background:
                  location.pathname === item.to
                    ? "rgba(59,130,246,0.15)"
                    : "transparent",
                color:
                  location.pathname === item.to
                    ? "var(--clr-primary-light)"
                    : "var(--clr-text-muted)",
                fontWeight: location.pathname === item.to ? 600 : 500,
                border:
                  location.pathname === item.to
                    ? "1px solid rgba(59,130,246,0.2)"
                    : "1px solid transparent",
              }}
            >
              <span style={{ fontSize: "1.2rem" }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div
          style={{ padding: "16px", borderTop: "1px solid var(--clr-border)" }}
        >
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--clr-text-faint)",
              marginBottom: "4px",
            }}
          >
            Logged in as
          </div>
          <div
            style={{
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "var(--clr-text)",
              marginBottom: "12px",
            }}
          >
            {policeUser?.name}
          </div>
          <button
            onClick={logoutPolice}
            className="btn btn-ghost btn-sm w-full"
            style={{ justifyContent: "flex-start", color: "#f87171" }}
          >
            🚫 Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "32px", overflowY: "auto" }}>
        <header
          style={{
            marginBottom: "32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.8rem", marginBottom: "8px" }}>
              Case Management
            </h2>
            <p style={{ color: "var(--clr-text-muted)" }}>
              Manage all registered complaints and legal proceedings.
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: "2rem",
                fontWeight: 800,
                color: "var(--clr-primary-light)",
              }}
            >
              {total}
            </div>
            <div
              style={{
                fontSize: "0.7rem",
                color: "var(--clr-text-faint)",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              Total Records
            </div>
          </div>
        </header>

        {/* Filters */}
        <div className="card" style={{ marginBottom: "24px", padding: "20px" }}>
          <form
            onSubmit={handleSearch}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 180px 180px 120px",
              gap: "16px",
            }}
          >
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search by Tracking ID, Incident Type..."
                className="input"
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
                style={{ paddingLeft: "40px" }}
              />
              <span
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "10px",
                  color: "var(--clr-text-faint)",
                }}
              >
                🔍
              </span>
            </div>
            <select
              className="input"
              value={filters.status}
              onChange={(e) => {
                setFilters({ ...filters, status: e.target.value });
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              {Object.keys(STATUS_COLORS).map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={filters.priority}
              onChange={(e) => {
                setFilters({ ...filters, priority: e.target.value });
                setPage(1);
              }}
            >
              <option value="">All Priorities</option>
              {Object.keys(PRIORITY_COLORS).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn-primary">
              Search
            </button>
          </form>
        </div>

        {/* Complaints Table */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    borderBottom: "1px solid var(--clr-border)",
                  }}
                >
                  <th
                    style={{
                      padding: "16px",
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      color: "var(--clr-text-faint)",
                    }}
                  >
                    Case ID
                  </th>
                  <th
                    style={{
                      padding: "16px",
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      color: "var(--clr-text-faint)",
                    }}
                  >
                    Incident
                  </th>
                  <th
                    style={{
                      padding: "16px",
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      color: "var(--clr-text-faint)",
                    }}
                  >
                    Priority
                  </th>
                  <th
                    style={{
                      padding: "16px",
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      color: "var(--clr-text-faint)",
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      padding: "16px",
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      color: "var(--clr-text-faint)",
                    }}
                  >
                    Date Filed
                  </th>
                  <th
                    style={{
                      padding: "16px",
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      color: "var(--clr-text-faint)",
                    }}
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan="6"
                      style={{ padding: "60px", textAlign: "center" }}
                    >
                      <div
                        className="skeleton-text"
                        style={{ width: "100px", margin: "0 auto" }}
                      >
                        Loading cases...
                      </div>
                    </td>
                  </tr>
                ) : complaints.length > 0 ? (
                  complaints.map((c) => (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: "1px solid var(--clr-border)",
                        transition: "background 0.2s",
                      }}
                      className="table-row-hover"
                    >
                      <td style={{ padding: "16px" }}>
                        <div
                          style={{
                            fontFamily: "monospace",
                            fontWeight: 700,
                            color: "var(--clr-primary-light)",
                          }}
                        >
                          {c.trackingId}
                        </div>
                        {c.isEmergency && (
                          <span
                            style={{
                              fontSize: "0.65rem",
                              color: "#ff3b30",
                              fontWeight: 800,
                            }}
                          >
                            🚨 EMERGENCY
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "16px" }}>
                        <div style={{ fontWeight: 600 }}>
                          {c.incidentType || "General"}
                        </div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--clr-text-muted)",
                          }}
                        >
                          {c.locationAddress?.slice(0, 30)}...
                        </div>
                      </td>
                      <td style={{ padding: "16px" }}>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: "12px",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            background: `${PRIORITY_COLORS[c.priorityLevel]}20`,
                            color: PRIORITY_COLORS[c.priorityLevel],
                            border: `1px solid ${PRIORITY_COLORS[c.priorityLevel]}40`,
                          }}
                        >
                          {c.priorityLevel}
                        </span>
                      </td>
                      <td style={{ padding: "16px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: STATUS_COLORS[c.status],
                            }}
                          />
                          <span style={{ fontSize: "0.85rem" }}>
                            {c.status.replace("_", " ")}
                          </span>
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "16px",
                          color: "var(--clr-text-faint)",
                          fontSize: "0.85rem",
                        }}
                      >
                        {new Date(c.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td style={{ padding: "16px" }}>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <Link
                            to={`/police/complaints/${c.id}`}
                            className="btn btn-primary btn-sm"
                          >
                            Full Case File →
                          </Link>
                          <Link
                            to={`/police/map?id=${c.id}`}
                            className="btn btn-ghost btn-sm"
                            title="View on map"
                          >
                            📍
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="6"
                      style={{
                        padding: "48px",
                        textAlign: "center",
                        color: "var(--clr-text-muted)",
                      }}
                    >
                      No complaints found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {total > 15 && (
          <div
            style={{
              marginTop: "24px",
              display: "flex",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <button
              className="btn btn-ghost btn-sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                px: "16px",
                fontSize: "0.9rem",
              }}
            >
              Page {page} of {Math.ceil(total / 15)}
            </div>
            <button
              className="btn btn-ghost btn-sm"
              disabled={page >= Math.ceil(total / 15)}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        )}
      </main>

      <style>{`
        .table-row-hover:hover {
          background: rgba(255,255,255,0.03);
        }
      `}</style>
    </div>
  );
}

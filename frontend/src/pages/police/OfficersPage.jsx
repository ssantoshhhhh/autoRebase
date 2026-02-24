import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import toast from "react-hot-toast";

export default function OfficersPage() {
  const { policeUser } = useAuth();
  const navigate = useNavigate();
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "OFFICER",
  });
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem("reva_police_token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!["STATION_ADMIN", "SUPER_ADMIN"].includes(policeUser?.role)) {
      navigate("/police/dashboard");
      return;
    }
    fetchOfficers();
  }, []);

  const fetchOfficers = async () => {
    try {
      const res = await api.get("/api/police/officers", { headers });
      setOfficers(res.data.officers);
    } catch (err) {
      toast.error("Failed to load officers");
    } finally {
      setLoading(false);
    }
  };

  const addOfficer = async () => {
    if (!form.name || !form.email || !form.password) {
      toast.error("All fields required");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(
        "/api/police/auth/register",
        {
          ...form,
          stationId: policeUser.station.id,
        },
        { headers },
      );
      toast.success("Officer registered successfully");
      setShowAddForm(false);
      setForm({ name: "", email: "", password: "", role: "OFFICER" });
      fetchOfficers();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to register");
    } finally {
      setSubmitting(false);
    }
  };

  const ROLE_COLORS = {
    SUPER_ADMIN: { bg: "rgba(139,92,246,0.15)", color: "#a78bfa" },
    STATION_ADMIN: { bg: "rgba(59,130,246,0.15)", color: "#60a5fa" },
    OFFICER: { bg: "rgba(16,185,129,0.15)", color: "#34d399" },
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--clr-bg)",
        padding: "24px",
      }}
    >
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "28px",
          }}
        >
          <div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate("/police/dashboard")}
              style={{ marginBottom: "8px" }}
            >
              ← Back
            </button>
            <h2>Station Officers</h2>
            <p style={{ color: "var(--clr-text-muted)", fontSize: "0.85rem" }}>
              {policeUser?.station?.stationName} — {officers.length} officers
            </p>
          </div>
          <button
            id="add-officer-btn"
            className="btn btn-primary"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? "✕ Cancel" : "+ Add Officer"}
          </button>
        </div>

        {/* Add Officer Form */}
        {showAddForm && (
          <div
            className="card"
            style={{
              marginBottom: "20px",
              animation: "fadeIn 0.3s ease",
              border: "1px solid rgba(59,130,246,0.2)",
            }}
          >
            <h4 style={{ marginBottom: "20px" }}>Register New Officer</h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
              }}
            >
              <div className="form-group">
                <label className="label">Full Name</label>
                <input
                  type="text"
                  className="input"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Officer name"
                />
              </div>
              <div className="form-group">
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="officer@police.gov.in"
                />
              </div>
              <div className="form-group">
                <label className="label">Password</label>
                <input
                  type="password"
                  className="input"
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  placeholder="Minimum 8 characters"
                />
              </div>
              <div className="form-group">
                <label className="label">Role</label>
                <select
                  className="input"
                  value={form.role}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, role: e.target.value }))
                  }
                >
                  <option value="OFFICER">Officer</option>
                  {policeUser?.role === "SUPER_ADMIN" && (
                    <option value="STATION_ADMIN">Station Admin</option>
                  )}
                </select>
              </div>
            </div>
            <button
              id="submit-officer-btn"
              className="btn btn-primary"
              onClick={addOfficer}
              disabled={submitting}
            >
              {submitting ? "Registering..." : "Register Officer"}
            </button>
          </div>
        )}

        {/* Officers List */}
        {loading ? (
          <div style={{ display: "grid", gap: "12px" }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="skeleton"
                style={{ height: "80px", borderRadius: "12px" }}
              />
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {officers.map((officer) => {
              const roleStyle =
                ROLE_COLORS[officer.role] || ROLE_COLORS.OFFICER;
              return (
                <div
                  key={officer.id}
                  className="card"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    padding: "16px 20px",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: "var(--grad-primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "18px",
                      flexShrink: 0,
                    }}
                  >
                    👮
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: "2px" }}>
                      {officer.name}
                    </div>
                    <div
                      style={{
                        fontSize: "0.82rem",
                        color: "var(--clr-text-muted)",
                      }}
                    >
                      {officer.email}
                    </div>
                    {officer.station && (
                      <div
                        style={{
                          fontSize: "0.78rem",
                          color: "var(--clr-text-faint)",
                        }}
                      >
                        {officer.station.stationName}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        padding: "4px 10px",
                        borderRadius: "12px",
                        background: roleStyle.bg,
                        color: roleStyle.color,
                      }}
                    >
                      {officer.role.replace("_", " ")}
                    </span>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          color: "var(--clr-primary-light)",
                        }}
                      >
                        {officer._count?.assignedComplaints || 0}
                      </div>
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--clr-text-faint)",
                        }}
                      >
                        cases
                      </div>
                    </div>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: officer.isActive ? "#10b981" : "#475569",
                        flexShrink: 0,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

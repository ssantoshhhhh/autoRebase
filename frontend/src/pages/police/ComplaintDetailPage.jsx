import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import toast from "react-hot-toast";

const PRIORITY_COLORS = {
  EMERGENCY: "#ff3b30",
  HIGH: "#f87171",
  MODERATE: "#fbbf24",
  INFORMATIONAL: "#34d399",
};
const STATUS_ORDER = [
  "FILED",
  "UNDER_REVIEW",
  "ASSIGNED",
  "IN_PROGRESS",
  "ESCALATED",
  "RESOLVED",
  "CLOSED",
];

export default function ComplaintDetailPage() {
  const { id } = useParams();
  const { policeUser } = useAuth();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const [selectedOfficer, setSelectedOfficer] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [activeView, setActiveView] = useState("transcript");

  const token = localStorage.getItem("reva_police_token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [cRes, oRes] = await Promise.all([
        api.get(`/api/police/complaints/${id}`, { headers }),
        ["STATION_ADMIN", "SUPER_ADMIN"].includes(policeUser?.role)
          ? api.get("/api/police/officers", { headers })
          : Promise.resolve({ data: { officers: [] } }),
      ]);
      setComplaint(cRes.data);
      setOfficers(oRes.data.officers || []);
      setSelectedStatus(cRes.data.status);
    } catch (err) {
      toast.error("Complaint not found or access denied");
      navigate("/police/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedOfficer) return;
    try {
      await api.patch(
        `/api/police/complaints/${id}/assign`,
        { officerId: selectedOfficer },
        { headers },
      );
      toast.success("Complaint assigned successfully");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to assign");
    }
  };

  const handleStatusChange = async () => {
    if (!selectedStatus || selectedStatus === complaint.status) return;
    try {
      await api.patch(
        `/api/police/complaints/${id}/status`,
        { status: selectedStatus },
        { headers },
      );
      toast.success("Status updated");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update status");
    }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    setSubmittingNote(true);
    try {
      await api.post(
        `/api/police/complaints/${id}/notes`,
        { note },
        { headers },
      );
      toast.success("Note added");
      setNote("");
      fetchData();
    } catch (err) {
      toast.error("Failed to add note");
    } finally {
      setSubmittingNote(false);
    }
  };

  if (loading)
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--clr-bg)",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: "3px solid var(--clr-border)",
            borderTopColor: "var(--clr-primary)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
      </div>
    );

  if (!complaint) return null;

  const pColor = PRIORITY_COLORS[complaint.priorityLevel] || "#94a3b8";
  const structured = complaint.structuredJson || {};

  return (
    <div style={{ minHeight: "100vh", background: "var(--clr-bg)" }}>
      {/* Header */}
      <div
        style={{
          background: "rgba(8,12,20,0.9)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--clr-border)",
          padding: "0 24px",
          height: "60px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => navigate("/police/dashboard")}
        >
          ← Back
        </button>
        <div
          style={{
            fontFamily: "monospace",
            fontWeight: 700,
            color: "var(--clr-primary-light)",
          }}
        >
          {complaint.trackingId}
        </div>
        <div
          style={{
            height: "20px",
            width: "1px",
            background: "var(--clr-border)",
          }}
        />
        <span
          style={{
            padding: "3px 10px",
            borderRadius: "12px",
            fontSize: "0.75rem",
            fontWeight: 600,
            background: `${pColor}20`,
            color: pColor,
          }}
        >
          {complaint.priorityLevel}
        </span>
        {complaint.isEmergency && (
          <span
            style={{
              padding: "3px 10px",
              borderRadius: "12px",
              fontSize: "0.75rem",
              fontWeight: 700,
              background: "rgba(255,59,48,0.2)",
              color: "#ff3b30",
              animation: "pulse 1s infinite",
            }}
          >
            🚨 EMERGENCY
          </span>
        )}
        <div style={{ flex: 1 }} />
        {/* Risk score */}
        {complaint.priorityScore > 0 && (
          <div style={{ fontSize: "0.8rem", color: "var(--clr-text-muted)" }}>
            Risk Score:{" "}
            <span
              style={{
                fontWeight: 700,
                color:
                  complaint.priorityScore >= 80
                    ? "#ff3b30"
                    : complaint.priorityScore >= 50
                      ? "#fbbf24"
                      : "#34d399",
              }}
            >
              {complaint.priorityScore}/100
            </span>
          </div>
        )}
      </div>

      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "24px",
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: "24px",
        }}
      >
        {/* Main column */}
        <div>
          {/* Tabs */}
          <div
            style={{
              display: "flex",
              gap: "0",
              borderBottom: "1px solid var(--clr-border)",
              marginBottom: "20px",
            }}
          >
            {[
              { id: "transcript", label: "Transcript" },
              { id: "extraction", label: "Structured Data" },
              { id: "timeline", label: "Timeline" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                style={{
                  padding: "10px 16px",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.85rem",
                  fontWeight: activeView === tab.id ? 600 : 400,
                  color:
                    activeView === tab.id
                      ? "var(--clr-text)"
                      : "var(--clr-text-muted)",
                  borderBottom:
                    activeView === tab.id
                      ? "2px solid var(--clr-primary)"
                      : "2px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Summary */}
          {complaint.summaryText && (
            <div className="card" style={{ marginBottom: "16px" }}>
              <h4
                style={{
                  marginBottom: "10px",
                  fontSize: "0.95rem",
                  color: "var(--clr-text-muted)",
                  fontWeight: 500,
                }}
              >
                FIR Summary
              </h4>
              <p
                style={{
                  fontSize: "0.9rem",
                  lineHeight: 1.7,
                  color: "var(--clr-text)",
                }}
              >
                {complaint.summaryText}
              </p>
            </div>
          )}

          {activeView === "transcript" && (
            <div className="card">
              <h4 style={{ marginBottom: "12px", fontSize: "0.95rem" }}>
                Full Transcript
              </h4>
              <div
                style={{
                  background: "var(--clr-bg-3)",
                  borderRadius: "8px",
                  padding: "16px",
                  fontFamily: "monospace",
                  fontSize: "0.82rem",
                  lineHeight: 1.8,
                  color: "var(--clr-text-muted)",
                  maxHeight: "400px",
                  overflowY: "auto",
                  whiteSpace: "pre-wrap",
                }}
              >
                {complaint.transcript || "No transcript available"}
              </div>
            </div>
          )}

          {activeView === "extraction" && (
            <div className="card">
              <h4 style={{ marginBottom: "16px", fontSize: "0.95rem" }}>
                Extracted Information
              </h4>
              <div style={{ display: "grid", gap: "12px" }}>
                {Object.entries(structured).map(
                  ([key, value]) =>
                    value && (
                      <div
                        key={key}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "160px 1fr",
                          gap: "12px",
                          paddingBottom: "12px",
                          borderBottom: "1px solid var(--clr-border)",
                        }}
                      >
                        <span
                          style={{
                            color: "var(--clr-text-faint)",
                            fontSize: "0.82rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {key.replace(/_/g, " ")}
                        </span>
                        <span
                          style={{
                            fontSize: "0.88rem",
                            color: "var(--clr-text)",
                          }}
                        >
                          {typeof value === "object"
                            ? JSON.stringify(value, null, 2)
                            : String(value)}
                        </span>
                      </div>
                    ),
                )}
                {Object.keys(structured).length === 0 && (
                  <p
                    style={{
                      color: "var(--clr-text-muted)",
                      fontSize: "0.88rem",
                    }}
                  >
                    No structured data extracted
                  </p>
                )}
              </div>
            </div>
          )}

          {activeView === "timeline" && (
            <div className="card">
              <h4 style={{ marginBottom: "16px", fontSize: "0.95rem" }}>
                Activity Timeline
              </h4>
              <div style={{ position: "relative", paddingLeft: "20px" }}>
                <div
                  style={{
                    position: "absolute",
                    left: "7px",
                    top: 0,
                    bottom: 0,
                    width: "2px",
                    background: "var(--clr-border)",
                  }}
                />
                {[
                  {
                    content: "Complaint filed by citizen",
                    createdAt: complaint.createdAt,
                    type: "FILED",
                  },
                  ...(complaint.updates || []),
                ].map((u, i) => (
                  <div
                    key={i}
                    style={{ marginBottom: "20px", position: "relative" }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: "-17px",
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        background:
                          u.type === "EMERGENCY_FLAG"
                            ? "#ff3b30"
                            : "var(--clr-primary)",
                        top: "4px",
                        boxShadow: `0 0 0 2px var(--clr-bg)`,
                      }}
                    />
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--clr-text-faint)",
                        marginBottom: "3px",
                      }}
                    >
                      {new Date(u.createdAt).toLocaleString("en-IN")}
                      {u.updateType && (
                        <span
                          style={{
                            marginLeft: "8px",
                            background: "rgba(255,255,255,0.06)",
                            padding: "1px 6px",
                            borderRadius: "4px",
                            fontSize: "0.7rem",
                          }}
                        >
                          {u.updateType}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: "0.88rem",
                        color: "var(--clr-text)",
                        lineHeight: 1.5,
                      }}
                    >
                      {u.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Note */}
          <div className="card" style={{ marginTop: "16px" }}>
            <h4 style={{ marginBottom: "12px", fontSize: "0.95rem" }}>
              Add Internal Note
            </h4>
            <textarea
              id="note-input"
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add investigation notes, observations..."
              rows={3}
              style={{ resize: "vertical", marginBottom: "10px" }}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={addNote}
              disabled={submittingNote || !note.trim()}
            >
              {submittingNote ? "Adding..." : "Add Note"}
            </button>
          </div>
        </div>

        {/* Right panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Complaint Info */}
          <div className="card">
            <h4 style={{ marginBottom: "16px", fontSize: "0.95rem" }}>
              Details
            </h4>
            <div style={{ display: "grid", gap: "10px", fontSize: "0.85rem" }}>
              <InfoRow
                label="Incident Type"
                value={complaint.incidentType || "General"}
              />
              <InfoRow
                label="Location"
                value={
                  complaint.locationAddress ||
                  `${complaint.locationLat?.toFixed(4)}, ${complaint.locationLng?.toFixed(4)}` ||
                  "N/A"
                }
              />
              <InfoRow
                label="Filed"
                value={new Date(complaint.createdAt).toLocaleString("en-IN")}
              />
              <InfoRow label="Station" value={complaint.station?.stationName} />
              <InfoRow
                label="Anonymous"
                value={complaint.isAnonymous ? "Yes" : "No"}
              />
            </div>
          </div>

          {/* Citizen Info */}
          {!complaint.isAnonymous && complaint.user && (
            <div className="card">
              <h4 style={{ marginBottom: "12px", fontSize: "0.95rem" }}>
                Complainant
              </h4>
              <div style={{ display: "grid", gap: "8px", fontSize: "0.85rem" }}>
                <InfoRow label="Name" value={complaint.user.name || "N/A"} />
                <InfoRow label="Mobile" value={complaint.user.mobileNumber} />
                <InfoRow
                  label="Aadhaar"
                  value={complaint.user.aadhaarMasked || "N/A"}
                />
                <InfoRow
                  label="Total Complaints"
                  value={complaint.user.complaintCount}
                />
                <InfoRow
                  label="Risk Flags"
                  value={complaint.user.riskFlagCount}
                />
              </div>
            </div>
          )}

          {/* Status Update */}
          <div className="card">
            <h4 style={{ marginBottom: "12px", fontSize: "0.95rem" }}>
              Update Status
            </h4>
            <select
              id="status-select"
              className="input"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{ marginBottom: "10px" }}
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
            <button
              className="btn btn-primary btn-sm w-full"
              onClick={handleStatusChange}
              disabled={selectedStatus === complaint.status}
            >
              Update Status
            </button>
          </div>

          {/* Officer Assignment */}
          {["STATION_ADMIN", "SUPER_ADMIN"].includes(policeUser?.role) &&
            officers.length > 0 && (
              <div className="card">
                <h4 style={{ marginBottom: "12px", fontSize: "0.95rem" }}>
                  Assign Officer
                </h4>
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--clr-text-muted)",
                    marginBottom: "10px",
                  }}
                >
                  Currently: {complaint.assignedOfficer?.name || "Unassigned"}
                </p>
                <select
                  id="officer-select"
                  className="input"
                  value={selectedOfficer}
                  onChange={(e) => setSelectedOfficer(e.target.value)}
                  style={{ marginBottom: "10px" }}
                >
                  <option value="">Select Officer</option>
                  {officers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o._count?.assignedComplaints || 0} cases)
                    </option>
                  ))}
                </select>
                <button
                  className="btn btn-primary btn-sm w-full"
                  onClick={handleAssign}
                  disabled={!selectedOfficer}
                >
                  Assign
                </button>
              </div>
            )}

          {/* Evidence */}
          {complaint.evidence?.length > 0 && (
            <div className="card">
              <h4 style={{ marginBottom: "12px", fontSize: "0.95rem" }}>
                Evidence ({complaint.evidence.length})
              </h4>
              {complaint.evidence.map((e, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: "1px solid var(--clr-border)",
                    fontSize: "0.82rem",
                  }}
                >
                  <span style={{ color: "var(--clr-text-muted)" }}>
                    {e.fileType}
                  </span>
                  <span style={{ color: "var(--clr-text-faint)" }}>
                    {new Date(e.uploadedAt).toLocaleDateString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div
      style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}
    >
      <span style={{ color: "var(--clr-text-faint)", flexShrink: 0 }}>
        {label}
      </span>
      <span
        style={{
          color: "var(--clr-text)",
          textAlign: "right",
          wordBreak: "break-word",
        }}
      >
        {value || "—"}
      </span>
    </div>
  );
}

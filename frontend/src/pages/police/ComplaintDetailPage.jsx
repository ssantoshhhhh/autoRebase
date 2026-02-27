import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  const [activeView, setActiveView] = useState("case_file");
  const [stations, setStations] = useState([]);
  const [selectedTargetStation, setSelectedTargetStation] = useState("");
  const [migrationReason, setMigrationReason] = useState("");
  const [isMigrating, setIsMigrating] = useState(false);

  const token = localStorage.getItem("reva_police_token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [cRes, oRes, sRes] = await Promise.all([
        api.get(`/api/police/complaints/${id}`, { headers }),
        ["STATION_ADMIN", "SUPER_ADMIN"].includes(policeUser?.role)
          ? api.get("/api/police/officers", { headers })
          : Promise.resolve({ data: { officers: [] } }),
        api.get("/api/stations"),
      ]);
      setComplaint(cRes.data);
      setOfficers(oRes.data.officers || []);
      setStations(sRes.data.stations || []);
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

  const handleMigrate = async () => {
    if (!selectedTargetStation) return toast.error("Select target station");
    setIsMigrating(true);
    try {
      await api.patch(
        `/api/police/complaints/${id}/migrate`,
        { targetStationId: selectedTargetStation, reason: migrationReason },
        { headers },
      );
      toast.success("Complaint migrated and transferred");
      navigate("/police/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.error || "Migration failed");
    } finally {
      setIsMigrating(false);
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
              { id: "case_file", label: "Full Case File (Transcript + FIR)" },
              { id: "extraction", label: "Ai Analytics" },
              { id: "timeline", label: "Audit Timeline" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                style={{
                  padding: "12px 20px",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.85rem",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  fontWeight: activeView === tab.id ? 700 : 500,
                  color:
                    activeView === tab.id
                      ? "var(--clr-primary-light)"
                      : "var(--clr-text-faint)",
                  borderBottom:
                    activeView === tab.id
                      ? "3px solid var(--clr-primary)"
                      : "3px solid transparent",
                  transition: "all 0.2s ease",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeView === "case_file" && (
            <div
              className="animate-fade-in"
              style={{ display: "grid", gap: "32px" }}
            >
              {/* SECTION 1: TRANSCRIPT */}
              <div
                className="card"
                style={{ border: "1px solid var(--clr-border-hover)" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "20px",
                  }}
                >
                  <h4
                    style={{
                      fontSize: "1.1rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span style={{ color: "var(--clr-primary)" }}>●</span> AI
                    Intake Conversation
                  </h4>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--clr-text-faint)",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                    }}
                  >
                    Digital Audio Transcript
                  </div>
                </div>

                <div
                  style={{
                    background: "var(--clr-bg-3)",
                    borderRadius: "12px",
                    padding: "24px",
                    fontFamily: "monospace",
                    fontSize: "0.88rem",
                    lineHeight: 1.9,
                    color: "var(--clr-text-muted)",
                    maxHeight: "450px",
                    overflowY: "auto",
                    border: "1px solid rgba(255,255,255,0.03)",
                    boxShadow: "inset 0 4px 12px rgba(0,0,0,0.2)",
                    marginBottom: "16px",
                  }}
                >
                  {complaint.transcript ? (
                    complaint.transcript.split("\n").map((line, i) => {
                      const isAi = line.startsWith("REVA:");
                      const isUser = line.startsWith("USER:");
                      return (
                        <div
                          key={i}
                          style={{
                            marginBottom: "10px",
                            padding: "8px 12px",
                            borderRadius: "6px",
                            background: isAi
                              ? "rgba(59, 130, 246, 0.03)"
                              : isUser
                                ? "rgba(255,255,255,0.02)"
                                : "transparent",
                            borderLeft: isAi
                              ? "3px solid var(--clr-primary)"
                              : isUser
                                ? "3px solid #8b5cf6"
                                : "none",
                          }}
                        >
                          <span
                            style={{
                              color: isAi
                                ? "var(--clr-primary-light)"
                                : isUser
                                  ? "#a78bfa"
                                  : "inherit",
                              fontWeight: 700,
                              marginRight: "8px",
                              fontSize: "0.75rem",
                            }}
                          >
                            {line.split(":")[0]}:
                          </span>
                          <span style={{ color: "var(--clr-text)" }}>
                            {line.split(":").slice(1).join(":")}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "40px",
                        color: "var(--clr-text-faint)",
                      }}
                    >
                      No transcript data available.
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 2: FORMAL FIR REPORT */}
              <div
                className="card"
                style={{
                  background: "#fff",
                  color: "#1a1a1a",
                  padding: "50px",
                  boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
                  fontFamily: '"Times New Roman", Times, serif',
                }}
              >
                <div
                  style={{
                    textAlign: "center",
                    marginBottom: "40px",
                    borderBottom: "2px solid #000",
                    paddingBottom: "20px",
                  }}
                >
                  <h2
                    style={{
                      fontSize: "1.6rem",
                      color: "#000",
                      marginBottom: "8px",
                      textTransform: "uppercase",
                    }}
                  >
                    First Information Report (AI-Generated)
                  </h2>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                    (Computer Form as per State Police Standards)
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "30px",
                    marginBottom: "30px",
                  }}
                >
                  <div style={{ border: "1px solid #ddd", padding: "10px" }}>
                    <div style={{ fontWeight: 700 }}>
                      FIR No:{" "}
                      <span style={{ fontWeight: 400 }}>
                        {complaint.trackingId}
                      </span>
                    </div>
                    <div style={{ fontWeight: 700 }}>
                      Status:{" "}
                      <span style={{ fontWeight: 400 }}>
                        {complaint.status}
                      </span>
                    </div>
                    <div style={{ fontWeight: 700 }}>
                      Station:{" "}
                      <span style={{ fontWeight: 400 }}>
                        {complaint.station?.stationName}
                      </span>
                    </div>
                  </div>
                  <div style={{ border: "1px solid #ddd", padding: "10px" }}>
                    <div style={{ fontWeight: 700 }}>
                      Date/Time Filed:{" "}
                      <span style={{ fontWeight: 400 }}>
                        {new Date(complaint.createdAt).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div style={{ fontWeight: 700 }}>
                      Incident Type:{" "}
                      <span style={{ fontWeight: 400 }}>
                        {complaint.incidentType}
                      </span>
                    </div>
                    <div style={{ fontWeight: 700 }}>
                      Priority:{" "}
                      <span style={{ fontWeight: 400 }}>
                        {complaint.priorityLevel}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: "25px" }}>
                  <h5
                    style={{
                      borderBottom: "1px solid #000",
                      marginBottom: "10px",
                      textTransform: "uppercase",
                      fontSize: "0.9rem",
                    }}
                  >
                    1. Complainant Details
                  </h5>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "20px",
                      fontSize: "0.95rem",
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700 }}>Name:</span>{" "}
                      {complaint.isAnonymous
                        ? "UNDER PROTECTED IDENTITY (ANONYMOUS)"
                        : complaint.user?.name || "N/A"}
                    </div>
                    <div>
                      <span style={{ fontWeight: 700 }}>Mobile:</span>{" "}
                      {complaint.user?.mobileNumber || "N/A"}
                    </div>
                    <div>
                      <span style={{ fontWeight: 700 }}>Identification:</span>{" "}
                      {complaint.user?.aadhaarMasked
                        ? `Aadhaar (${complaint.user.aadhaarMasked})`
                        : "NOT PROVIDED"}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: "25px" }}>
                  <h5
                    style={{
                      borderBottom: "1px solid #000",
                      marginBottom: "10px",
                      textTransform: "uppercase",
                      fontSize: "0.9rem",
                    }}
                  >
                    2. Brief Facts / Summary
                  </h5>
                  <div
                    style={{
                      padding: "10px",
                      background: "#f9f9f9",
                      border: "1px solid #eee",
                      fontSize: "0.95rem",
                      lineHeight: 1.6,
                    }}
                  >
                    {complaint.summaryText || "Extracted summary pending..."}
                  </div>
                </div>

                <div style={{ marginBottom: "25px" }}>
                  <h5
                    style={{
                      borderBottom: "1px solid #000",
                      marginBottom: "10px",
                      textTransform: "uppercase",
                      fontSize: "0.9rem",
                    }}
                  >
                    3. Extracted Key Information
                  </h5>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "10px",
                      fontSize: "0.9rem",
                    }}
                  >
                    {Object.entries(structured)
                      .slice(0, 10)
                      .map(
                        ([k, v]) =>
                          k !== "integrity_envelope" &&
                          typeof v !== "object" && (
                            <div key={k}>
                              <span
                                style={{
                                  fontWeight: 600,
                                  textTransform: "capitalize",
                                }}
                              >
                                {k.replace(/_/g, " ")}:
                              </span>{" "}
                              {String(v)}
                            </div>
                          ),
                      )}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "60px",
                  }}
                >
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        width: "150px",
                        borderBottom: "1px solid #000",
                        marginBottom: "5px",
                      }}
                    ></div>
                    <div style={{ fontSize: "0.7rem" }}>
                      Authorized Digital Signature
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        width: "150px",
                        borderBottom: "1px solid #000",
                        marginBottom: "5px",
                      }}
                    ></div>
                    <div style={{ fontSize: "0.7rem" }}>
                      Investigating Officer
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: "center", marginTop: "30px" }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => window.print()}
                  >
                    🖨️ Print Final FIR
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeView === "extraction" && (
            <div className="card animate-fade-in">
              <h4 style={{ marginBottom: "16px", fontSize: "0.95rem" }}>
                AI Forensic JSON Extraction
              </h4>
              <div style={{ display: "grid", gap: "12px" }}>
                {Object.entries(structured).map(
                  ([key, value]) =>
                    value && (
                      <div
                        key={key}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "180px 1fr",
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
                            fontWeight: 600,
                          }}
                        >
                          {key.replace(/_/g, " ")}
                        </span>
                        <div
                          style={{
                            fontSize: "0.88rem",
                            color: "var(--clr-text)",
                            wordBreak: "break-all",
                            fontFamily:
                              typeof value === "object"
                                ? "monospace"
                                : "inherit",
                          }}
                        >
                          {typeof value === "object" ? (
                            <pre
                              style={{
                                margin: 0,
                                padding: "8px",
                                background: "rgba(255,255,255,0.02)",
                                borderRadius: "4px",
                                overflowX: "auto",
                              }}
                            >
                              {JSON.stringify(value, null, 2)}
                            </pre>
                          ) : (
                            String(value)
                          )}
                        </div>
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

          {/* Jurisdiction Transfer (Migration) */}
          {["STATION_ADMIN", "SUPER_ADMIN"].includes(policeUser?.role) && (
            <div
              className="card"
              style={{ border: "1px solid rgba(139, 92, 246, 0.2)" }}
            >
              <h4
                style={{
                  marginBottom: "12px",
                  fontSize: "0.95rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span style={{ color: "var(--clr-primary)" }}>⇄</span>{" "}
                Jurisdiction Transfer
              </h4>
              <p
                style={{
                  fontSize: "0.78rem",
                  color: "var(--clr-text-muted)",
                  marginBottom: "12px",
                }}
              >
                Transfer this case to another police station if it falls outside
                current jurisdiction.
              </p>

              <div style={{ display: "grid", gap: "10px" }}>
                <select
                  className="input sm"
                  value={selectedTargetStation}
                  onChange={(e) => setSelectedTargetStation(e.target.value)}
                  style={{ fontSize: "0.85rem" }}
                >
                  <option value="">Select Target Station</option>
                  {stations
                    .filter((s) => s.id !== complaint.stationId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.stationName} ({s.district})
                      </option>
                    ))}
                </select>

                <input
                  type="text"
                  className="input sm"
                  placeholder="Reason for transfer..."
                  value={migrationReason}
                  onChange={(e) => setMigrationReason(e.target.value)}
                  style={{ fontSize: "0.85rem" }}
                />

                <button
                  className="btn btn-ghost btn-sm w-full"
                  style={{
                    borderColor: "var(--clr-primary)",
                    color: "var(--clr-primary-light)",
                    marginTop: "4px",
                  }}
                  onClick={handleMigrate}
                  disabled={!selectedTargetStation || isMigrating}
                >
                  {isMigrating ? "Processing..." : "Transfer Case →"}
                </button>
              </div>
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
                    {e.mediaCategory}
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

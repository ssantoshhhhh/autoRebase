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
  // Face detection state: keyed by evidenceId
  // { [evidenceId]: { loading, results, error } }
  const [faceSearchState, setFaceSearchState] = useState({});

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

  // ── Face detection ────────────────────────────────────────────────────────
  const searchFaces = async (evidenceId) => {
    setFaceSearchState((prev) => ({
      ...prev,
      [evidenceId]: { loading: true, results: null, error: null },
    }));
    try {
      const res = await api.post(
        `/api/police/evidence/${evidenceId}/detect-faces`,
        {},
        { headers },
      );
      setFaceSearchState((prev) => ({
        ...prev,
        [evidenceId]: { loading: false, results: res.data, error: null },
      }));
      if (res.data.facesFound === 0) {
        toast("No faces detected in this image", { icon: "🔍" });
      } else {
        toast.success(
          `${res.data.facesFound} face(s) detected, ${res.data.matchesFound} matched`,
        );
      }
    } catch (err) {
      const msg = err.response?.data?.error || "Face search failed";
      setFaceSearchState((prev) => ({
        ...prev,
        [evidenceId]: { loading: false, results: null, error: msg },
      }));
      toast.error(msg);
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
              <h4 style={{ marginBottom: "16px", fontSize: "0.95rem" }}>
                Evidence ({complaint.evidence.length})
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {complaint.evidence.map((ev) => {
                  const isImage = ev.mediaCategory === "IMAGE";
                  const faceState = faceSearchState[ev.id] || {};
                  // Use saved detectedFaces from DB if no in-session search yet
                  const savedFaces = ev.detectedFaces || [];
                  const results = faceState.results;
                  const displayFaces = results
                    ? results.results
                    : savedFaces.map((df) => ({
                      bbox: df.boundingBoxJson,
                      confidence: df.confidence,
                      matchedPerson: df.personOfInterest,
                    }));

                  return (
                    <div
                      key={ev.id}
                      style={{
                        border: "1px solid var(--clr-border)",
                        borderRadius: "10px",
                        overflow: "hidden",
                        background: "var(--clr-bg-3)",
                      }}
                    >
                      {/* Evidence header */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 14px",
                          borderBottom: "1px solid var(--clr-border)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "1.1rem" }}>
                            {isImage ? "🖼️" : ev.mediaCategory === "VIDEO" ? "🎥" : ev.mediaCategory === "AUDIO" ? "🎵" : "📄"}
                          </span>
                          <span style={{ fontSize: "0.82rem", color: "var(--clr-text-muted)" }}>
                            {ev.fileName || ev.mediaCategory}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "0.75rem", color: "var(--clr-text-faint)" }}>
                            {new Date(ev.uploadedAt).toLocaleDateString("en-IN")}
                          </span>
                          {/* Face Search Button — only for images */}
                          {isImage && (
                            <button
                              className="btn btn-sm"
                              onClick={() => searchFaces(ev.id)}
                              disabled={faceState.loading}
                              style={{
                                background: faceState.loading
                                  ? "rgba(99,102,241,0.15)"
                                  : "rgba(99,102,241,0.2)",
                                color: "#818cf8",
                                border: "1px solid rgba(99,102,241,0.3)",
                                borderRadius: "6px",
                                padding: "4px 10px",
                                fontSize: "0.75rem",
                                cursor: faceState.loading ? "not-allowed" : "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "5px",
                                transition: "all 0.2s",
                              }}
                            >
                              {faceState.loading ? (
                                <>
                                  <span
                                    style={{
                                      width: "10px",
                                      height: "10px",
                                      border: "2px solid rgba(129,140,248,0.4)",
                                      borderTopColor: "#818cf8",
                                      borderRadius: "50%",
                                      animation: "spin 0.8s linear infinite",
                                      display: "inline-block",
                                    }}
                                  />
                                  Scanning...
                                </>
                              ) : (
                                <>
                                  🔍 Search Faces
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Image preview with bounding boxes */}
                      {isImage && ev.cdnUrl && (
                        <div style={{ position: "relative", textAlign: "center", background: "#000", maxHeight: "260px", overflow: "hidden" }}>
                          <img
                            src={ev.cdnUrl}
                            alt="Evidence"
                            style={{ maxWidth: "100%", maxHeight: "260px", objectFit: "contain", display: "block", margin: "0 auto" }}
                          />
                          {/* Bounding box labels */}
                          {displayFaces.map((face, fi) => (
                            face.bbox && face.matchedPerson && (
                              <div
                                key={fi}
                                style={{
                                  position: "absolute",
                                  top: "6px",
                                  left: "6px",
                                  background: "rgba(239,68,68,0.85)",
                                  color: "#fff",
                                  fontSize: "0.65rem",
                                  fontWeight: 700,
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  pointerEvents: "none",
                                }}
                              >
                                FACE {fi + 1} MATCHED
                              </div>
                            )
                          ))}
                        </div>
                      )}

                      {/* Face results panel */}
                      {(displayFaces.length > 0 || faceState.error) && (
                        <div style={{ padding: "12px 14px" }}>
                          {faceState.error && (
                            <p style={{ fontSize: "0.8rem", color: "#f87171", margin: 0 }}>
                              ⚠️ {faceState.error}
                            </p>
                          )}

                          {displayFaces.length === 0 && !faceState.error && (
                            <p style={{ fontSize: "0.8rem", color: "var(--clr-text-faint)", margin: 0, textAlign: "center" }}>
                              🔍 No faces detected in this image
                            </p>
                          )}

                          {displayFaces.map((face, fi) => (
                            <div
                              key={fi}
                              style={{
                                marginBottom: fi < displayFaces.length - 1 ? "10px" : 0,
                                padding: "10px",
                                borderRadius: "8px",
                                background: face.matchedPerson
                                  ? "rgba(239,68,68,0.08)"
                                  : "rgba(255,255,255,0.03)",
                                border: face.matchedPerson
                                  ? "1px solid rgba(239,68,68,0.25)"
                                  : "1px solid var(--clr-border)",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: face.matchedPerson ? "8px" : 0 }}>
                                <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--clr-text-muted)" }}>
                                  Face {fi + 1}
                                </span>
                                {face.bbox && (
                                  <span style={{ fontSize: "0.68rem", color: "var(--clr-text-faint)" }}>
                                    [{Math.round(face.bbox.x1)},{Math.round(face.bbox.y1)}] → [{Math.round(face.bbox.x2)},{Math.round(face.bbox.y2)}]
                                  </span>
                                )}
                              </div>

                              {face.matchedPerson ? (
                                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                                  {/* Category badge */}
                                  <div
                                    style={{
                                      minWidth: "56px",
                                      textAlign: "center",
                                      padding: "4px 8px",
                                      borderRadius: "6px",
                                      fontSize: "0.62rem",
                                      fontWeight: 800,
                                      letterSpacing: "0.05em",
                                      background:
                                        face.matchedPerson.category === "WANTED"
                                          ? "rgba(239,68,68,0.2)"
                                          : face.matchedPerson.category === "MISSING"
                                            ? "rgba(251,191,36,0.2)"
                                            : "rgba(99,102,241,0.2)",
                                      color:
                                        face.matchedPerson.category === "WANTED"
                                          ? "#f87171"
                                          : face.matchedPerson.category === "MISSING"
                                            ? "#fbbf24"
                                            : "#818cf8",
                                    }}
                                  >
                                    {face.matchedPerson.category}
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--clr-text)", marginBottom: "2px" }}>
                                      {face.matchedPerson.name}
                                    </div>
                                    {face.matchedPerson.notes && (
                                      <div style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)", lineHeight: 1.4 }}>
                                        {face.matchedPerson.notes}
                                      </div>
                                    )}
                                    <div style={{ marginTop: "4px", fontSize: "0.7rem", color: "var(--clr-text-faint)" }}>
                                      Confidence: {(face.confidence * 100).toFixed(1)}%
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ fontSize: "0.75rem", color: "var(--clr-text-faint)", marginTop: "2px" }}>
                                  No match found in database
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../utils/api";
import toast from "react-hot-toast";

const STATUS_COLORS = {
  FILED: { bg: "rgba(59,130,246,0.15)", color: "#60a5fa" },
  UNDER_REVIEW: { bg: "rgba(245,158,11,0.15)", color: "#fbbf24" },
  ASSIGNED: { bg: "rgba(139,92,246,0.15)", color: "#a78bfa" },
  IN_PROGRESS: { bg: "rgba(16,185,129,0.15)", color: "#34d399" },
  ESCALATED: { bg: "rgba(239,68,68,0.15)", color: "#f87171" },
  RESOLVED: { bg: "rgba(16,185,129,0.2)", color: "#10b981" },
  CLOSED: { bg: "rgba(71,85,105,0.3)", color: "#94a3b8" },
};

export default function TrackingPage() {
  const { trackingId: paramId } = useParams();
  const navigate = useNavigate();
  const [trackingId, setTrackingId] = useState(paramId || "");
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(!!paramId);

  useState(() => {
    if (paramId) fetchComplaint(paramId);
  });

  async function fetchComplaint(id) {
    setLoading(true);
    try {
      const res = await api.get(`/api/complaints/track/${id}`);
      setComplaint(res.data);
    } catch (err) {
      toast.error("Complaint not found. Check your tracking ID.");
      setComplaint(null);
    } finally {
      setLoading(false);
    }
  }

  const statusStyle = complaint
    ? STATUS_COLORS[complaint.status] || STATUS_COLORS.FILED
    : {};

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--clr-bg)",
        padding: "24px",
      }}
    >
      {/* Floating Back Button */}
      <button
        onClick={() => navigate(-1)}
        style={{
          position: "fixed",
          top: "18px",
          left: "20px",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "linear-gradient(135deg, rgba(139,92,246,0.55), rgba(37,99,235,0.45))",
          border: "1px solid rgba(167,139,250,0.6)",
          color: "#f3f0ff",
          cursor: "pointer",
          padding: "9px 18px",
          borderRadius: "14px",
          fontSize: "13px",
          fontWeight: "800",
          letterSpacing: "0.4px",
          backdropFilter: "blur(12px)",
          boxShadow: "0 4px 20px rgba(139,92,246,0.35)",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "linear-gradient(135deg, rgba(139,92,246,0.8), rgba(37,99,235,0.7))";
          e.currentTarget.style.boxShadow = "0 6px 28px rgba(139,92,246,0.55)";
          e.currentTarget.style.transform = "translateX(-3px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "linear-gradient(135deg, rgba(139,92,246,0.55), rgba(37,99,235,0.45))";
          e.currentTarget.style.boxShadow = "0 4px 20px rgba(139,92,246,0.35)";
          e.currentTarget.style.transform = "translateX(0)";
        }}
      >
        &#8592; Back
      </button>
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>
        <h1 style={{ marginBottom: "8px", fontSize: "1.75rem" }}>
          Track Complaint
        </h1>
        <p
          style={{
            color: "var(--clr-text-muted)",
            marginBottom: "32px",
            fontSize: "0.9rem",
          }}
        >
          Enter your tracking ID to check the status of your complaint
        </p>

        <div style={{ display: "flex", gap: "12px", marginBottom: "32px" }}>
          <input
            id="tracking-input"
            type="text"
            className="input"
            value={trackingId}
            onChange={(e) => setTrackingId(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && fetchComplaint(trackingId)}
            placeholder="REVA-2024-XXXXXXXX"
            style={{ fontFamily: "monospace", flex: 1 }}
          />
          <button
            id="track-btn"
            className="btn btn-primary"
            onClick={() => fetchComplaint(trackingId)}
            disabled={loading || !trackingId}
          >
            {loading ? "..." : "Track"}
          </button>
        </div>

        {complaint && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            {/* Status Card */}
            <div className="card" style={{ marginBottom: "16px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontWeight: 700,
                      color: "var(--clr-primary-light)",
                      fontSize: "1.1rem",
                      marginBottom: "4px",
                    }}
                  >
                    {complaint.trackingId}
                  </div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--clr-text-muted)",
                    }}
                  >
                    Filed{" "}
                    {new Date(complaint.createdAt).toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                </div>
                <span
                  style={{
                    padding: "6px 14px",
                    borderRadius: "20px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    background: statusStyle.bg,
                    color: statusStyle.color,
                  }}
                >
                  {complaint.status?.replace("_", " ")}
                </span>
              </div>

              <div className="divider" />

              <div style={{ display: "grid", gap: "12px", fontSize: "0.9rem" }}>
                <Row
                  label="Incident Type"
                  value={complaint.incidentType || "General"}
                />
                <Row label="Station" value={complaint.station?.stationName} />
                <Row label="District" value={complaint.station?.district} />
                <Row label="Priority" value={complaint.priorityLevel} />
                {complaint.locationAddress && (
                  <Row label="Location" value={complaint.locationAddress} />
                )}
                <Row
                  label="Last Updated"
                  value={new Date(complaint.updatedAt).toLocaleString("en-IN")}
                />
              </div>
            </div>

            {/* Timeline */}
            {complaint.updates?.length > 0 && (
              <div className="card">
                <h4 style={{ marginBottom: "16px", fontSize: "1rem" }}>
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
                  {complaint.updates.map((update, i) => (
                    <div
                      key={i}
                      style={{ marginBottom: "16px", position: "relative" }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: "-17px",
                          width: "10px",
                          height: "10px",
                          borderRadius: "50%",
                          background: "var(--clr-primary)",
                          top: "4px",
                        }}
                      />
                      <div
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--clr-text-faint)",
                          marginBottom: "2px",
                        }}
                      >
                        {new Date(update.createdAt).toLocaleString("en-IN")}
                      </div>
                      <div
                        style={{ fontSize: "0.9rem", color: "var(--clr-text)" }}
                      >
                        {update.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "var(--clr-text-muted)" }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value || "—"}</span>
    </div>
  );
}

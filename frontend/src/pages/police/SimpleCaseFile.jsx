import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../utils/api";
import toast from "react-hot-toast";

export default function SimpleCaseFile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stations, setStations] = useState([]);
  const [selectedTargetStation, setSelectedTargetStation] = useState("");
  const [migrationReason, setMigrationReason] = useState("");
  const [isMigrating, setIsMigrating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cRes, sRes] = await Promise.all([
          api.get(`/api/police/complaints/${id}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("reva_police_token")}`,
            },
          }),
          api.get("/api/stations"),
        ]);
        setComplaint(cRes.data);
        setStations(sRes.data.stations || []);
      } catch (err) {
        console.error("Simple View Error:", err.response?.data || err.message);
        toast.error(err.response?.data?.error || "Access Denied / Not Found");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleMigrate = async () => {
    if (!selectedTargetStation) return toast.error("Select target station");
    setIsMigrating(true);
    try {
      await api.patch(
        `/api/police/complaints/${id}/migrate`,
        { targetStationId: selectedTargetStation, reason: migrationReason },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("reva_police_token")}`,
          },
        },
      );
      toast.success("Complaint migrated successfully");
      navigate("/police/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.error || "Migration failed");
    } finally {
      setIsMigrating(false);
    }
  };

  if (loading)
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#fff" }}>
        Loading Case Data...
      </div>
    );
  if (!complaint)
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#fff" }}>
        <h3>Error loading case data.</h3>
        <button
          className="btn btn-primary"
          onClick={() => navigate("/police/dashboard")}
        >
          Back to Dashboard
        </button>
      </div>
    );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0c10",
        color: "#fff",
        padding: "40px",
      }}
    >
      <button
        className="btn btn-ghost"
        onClick={() => navigate("/police/dashboard")}
        style={{ marginBottom: "20px" }}
      >
        ← Dashboard
      </button>

      <div
        className="card"
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "30px",
          border: "1px solid #1e293b",
        }}
      >
        <h2 style={{ color: "var(--clr-primary-light)", marginBottom: "20px" }}>
          Case: {complaint.trackingId}
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "150px 1fr",
            gap: "15px",
            marginBottom: "30px",
          }}
        >
          <span style={{ color: "#94a3b8" }}>Status:</span>
          <span style={{ fontWeight: 700 }}>{complaint.status}</span>

          <span style={{ color: "#94a3b8" }}>Type:</span>
          <span>{complaint.incidentType}</span>

          <span style={{ color: "#94a3b8" }}>Priority:</span>
          <span
            style={{ color: complaint.isEmergency ? "#f87171" : "inherit" }}
          >
            {complaint.priorityLevel}
          </span>

          <span style={{ color: "#94a3b8" }}>Date:</span>
          <span>{new Date(complaint.createdAt).toLocaleString()}</span>

          <span style={{ color: "#94a3b8" }}>Station:</span>
          <span>{complaint.station?.stationName}</span>
        </div>

        <h3
          style={{
            borderBottom: "1px solid #1e293b",
            paddingBottom: "10px",
            marginBottom: "15px",
          }}
        >
          Summary
        </h3>
        <p style={{ lineHeight: 1.6, color: "#cbd5e1" }}>
          {complaint.summaryText}
        </p>

        {(complaint.linksAsA?.length > 0 || complaint.linksAsB?.length > 0) && (
          <div
            style={{
              marginTop: "30px",
              padding: "15px",
              background: "rgba(139, 92, 246, 0.1)",
              border: "1px solid rgba(139, 92, 246, 0.2)",
              borderRadius: "8px",
            }}
          >
            <h3 style={{ fontSize: "1.1rem", marginBottom: "12px" }}>
              🔗 Linked Cases
            </h3>
            <div style={{ display: "grid", gap: "10px" }}>
              {[
                ...complaint.linksAsA.map((l) => ({
                  ...l.complaintB,
                  reason: l.linkReason,
                })),
                ...complaint.linksAsB.map((l) => ({
                  ...l.complaintA,
                  reason: l.linkReason,
                })),
              ].map((c, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "#0f172a",
                    padding: "10px",
                    borderRadius: "6px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: "var(--clr-primary-light)",
                      }}
                    >
                      {c.trackingId}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                      {c.incidentType} • {c.status}
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => navigate(`/police/view/${c.id}`)}
                  >
                    View Case
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {complaint.transcript && (
          <>
            <h3
              style={{
                borderBottom: "1px solid #1e293b",
                paddingBottom: "10px",
                marginBottom: "15px",
                marginTop: "30px",
              }}
            >
              Transcript
            </h3>
            <pre
              style={{
                background: "#0f172a",
                padding: "15px",
                borderRadius: "8px",
                fontSize: "0.85rem",
                whiteSpace: "pre-wrap",
                color: "#94a3b8",
                fontFamily: "monospace",
              }}
            >
              {complaint.transcript}
            </pre>
          </>
        )}

        {complaint.evidence?.length > 0 && (
          <>
            <h3
              style={{
                borderBottom: "1px solid #1e293b",
                paddingBottom: "10px",
                marginBottom: "15px",
                marginTop: "30px",
              }}
            >
              Evidence Attachments
            </h3>
            <div style={{ display: "grid", gap: "10px" }}>
              {complaint.evidence.map((ev) => (
                <div
                  key={ev.id}
                  style={{
                    background: "#0f172a",
                    padding: "12px",
                    borderRadius: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                      {ev.fileName}
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--clr-text-faint)",
                      }}
                    >
                      {ev.mediaCategory} •{" "}
                      {(ev.fileSizeBytes / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={async () => {
                      try {
                        const res = await api.get(
                          `/api/evidence/${ev.id}/url`,
                          {
                            headers: {
                              Authorization: `Bearer ${localStorage.getItem("reva_police_token")}`,
                            },
                          },
                        );
                        window.open(res.data.url, "_blank");
                      } catch (e) {
                        toast.error("Failed to load evidence URL");
                      }
                    }}
                  >
                    View File
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <div
          style={{
            marginTop: "40px",
            paddingTop: "20px",
            borderTop: "1px solid #1e293b",
          }}
        >
          <h3 style={{ marginBottom: "15px" }}>Jurisdiction Transfer</h3>
          <p
            style={{
              fontSize: "0.85rem",
              color: "#94a3b8",
              marginBottom: "15px",
            }}
          >
            Transfer this case to another station if it falls outside your
            jurisdiction.
          </p>
          <div style={{ display: "grid", gap: "10px", maxWidth: "400px" }}>
            <select
              style={{
                background: "#0f172a",
                border: "1px solid #1e293b",
                color: "#fff",
                padding: "8px",
                borderRadius: "4px",
              }}
              value={selectedTargetStation}
              onChange={(e) => setSelectedTargetStation(e.target.value)}
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
              placeholder="Reason for transfer..."
              style={{
                background: "#0f172a",
                border: "1px solid #1e293b",
                color: "#fff",
                padding: "8px",
                borderRadius: "4px",
              }}
              value={migrationReason}
              onChange={(e) => setMigrationReason(e.target.value)}
            />
            <button
              className="btn btn-primary"
              onClick={handleMigrate}
              disabled={!selectedTargetStation || isMigrating}
            >
              {isMigrating ? "Transferring..." : "Transfer Case"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

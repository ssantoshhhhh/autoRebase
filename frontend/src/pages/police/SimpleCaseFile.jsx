import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../utils/api";
import toast from "react-hot-toast";

export default function SimpleCaseFile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/api/police/complaints/${id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("reva_police_token")}`,
          },
        });
        setComplaint(res.data);
      } catch (err) {
        console.error("Simple View Error:", err.response?.data || err.message);
        toast.error(err.response?.data?.error || "Access Denied / Not Found");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

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
      </div>
    </div>
  );
}

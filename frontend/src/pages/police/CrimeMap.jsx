import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function CrimeMap() {
  const { policeUser } = useAuth();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersGroup = useRef(null);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const token = localStorage.getItem("reva_police_token");
      const res = await api.get("/api/police/complaints?limit=250", {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`Fetched ${res.data.complaints?.length} complaints for map`);
      setComplaints(res.data.complaints || []);
    } catch (err) {
      console.error("Map Data Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && mapRef.current && !mapInstance.current) {
      // Fix icons for standard Leaflet markers if needed elsewhere
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      });

      // Initialize map oriented to India
      const map = L.map(mapRef.current).setView([22.5937, 78.9629], 5);

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution: "&copy; OpenStreetMap &copy; CARTO",
          subdomains: "abcd",
          maxZoom: 20,
        },
      ).addTo(map);

      markersGroup.current = L.layerGroup().addTo(map);
      mapInstance.current = map;
    }

    if (mapInstance.current && markersGroup.current) {
      // Clear existing markers before adding new ones
      markersGroup.current.clearLayers();

      const bounds = [];

      complaints.forEach((c) => {
        // Robust coordinate check (ensure they are numbers and not null/undefined)
        const lat = parseFloat(c.locationLat);
        const lng = parseFloat(c.locationLng);

        if (!isNaN(lat) && !isNaN(lng)) {
          const isEmergency = c.isEmergency || c.priorityLevel === "EMERGENCY";
          const color = isEmergency ? "#ff3b30" : "#3b82f6";

          const icon = L.divIcon({
            className: "custom-div-icon",
            html: `<div style="
              background-color: ${color}; 
              width: 14px; 
              height: 14px; 
              border-radius: 50%; 
              border: 2px solid white; 
              box-shadow: 0 0 12px ${color}, inset 0 0 4px rgba(0,0,0,0.3);
              ${isEmergency ? "animation: pulse-red 1.5s infinite;" : ""}
            "></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          });

          L.marker([lat, lng], { icon })
            .bindPopup(
              `
              <div style="font-family: var(--font-sans); color: #1a1a1a; min-width: 180px; padding: 5px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                  <span style="font-family: monospace; font-weight: 700; color: var(--clr-primary); font-size: 0.8rem;">${c.trackingId}</span>
                  <span style="font-size: 0.65rem; padding: 2px 6px; border-radius: 10px; background: ${color}20; color: ${color}; font-weight: 700;">${c.priorityLevel}</span>
                </div>
                <div style="font-weight: 600; font-size: 0.9rem; margin-bottom: 4px;">${c.incidentType || "General Incident"}</div>
                <div style="font-size: 0.75rem; color: #666; margin-bottom: 12px; line-height: 1.4;">${c.locationAddress || "Address not specified"}</div>
                <div style={{ borderTop: '1px solid #eee', paddingTop: '8px' }}>
                   <a href="/police/complaints/${c.id}" style="color: #3b82f6; text-decoration: none; font-size: 0.8rem; font-weight: 700; display: block; text-align: center;">View Full Case File →</a>
                </div>
              </div>
            `,
            )
            .addTo(markersGroup.current);

          bounds.push([lat, lng]);
        }
      });

      if (bounds.length > 0 && mapInstance.current) {
        mapInstance.current.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 12,
        });
      }
    }
  }, [loading, complaints]);

  return (
    <div
      style={{
        height: "100vh",
        background: "#0c0c0c",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`
        @keyframes pulse-red {
          0% { box-shadow: 0 0 0 0px rgba(255, 59, 48, 0.7); }
          70% { box-shadow: 0 0 0 15px rgba(255, 59, 48, 0); }
          100% { box-shadow: 0 0 0 0px rgba(255, 59, 48, 0); }
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          background: #fff;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        }
        .leaflet-popup-tip {
          background: #fff;
        }
      `}</style>

      <div
        style={{
          padding: "12px 24px",
          background: "rgba(10, 10, 10, 0.95)",
          borderBottom: "1px solid var(--clr-border)",
          display: "flex",
          alignItems: "center",
          gap: "20px",
          zIndex: 1000,
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
        }}
      >
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => navigate("/police/dashboard")}
          style={{ padding: "6px 12px" }}
        >
          ← Dashboard
        </button>
        <div>
          <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#fff" }}>
            Live Intelligence Map
          </h3>
          <div style={{ fontSize: "0.7rem", color: "var(--clr-text-faint)" }}>
            Real-time Incident Monitoring — {complaints.length} Cases Loaded
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: "0.75rem", display: "flex", gap: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#ff3b30",
                boxShadow: "0 0 8px #ff3b30",
                border: "2px solid white",
              }}
            />
            <span style={{ color: "#eee", fontWeight: 600 }}>
              Critical / Emergency
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#3b82f6",
                boxShadow: "0 0 8px #3b82f6",
                border: "2px solid white",
              }}
            />
            <span style={{ color: "#eee", fontWeight: 600 }}>
              Standard Dispatch
            </span>
          </div>
        </div>
      </div>

      <div ref={mapRef} style={{ flex: 1, zIndex: 1 }} />
    </div>
  );
}

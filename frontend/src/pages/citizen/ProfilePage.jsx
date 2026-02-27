import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import toast from "react-hot-toast";
import { User, Phone, MapPin, Globe, Save, LogOut } from "lucide-react";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, loginCitizen, logoutCitizen } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    mobileNumber: user?.mobileNumber || "",
    language: user?.language || "en",
    latitude: user?.latitude || "",
    longitude: user?.longitude || "",
  });

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.patch("/api/users/profile", formData);
      loginCitizen(res.data.user, localStorage.getItem("reva_token"));
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error(err.response?.data?.error || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const setLocation = () => {
    if (!navigator.geolocation) {
      return toast.error("Geolocation not supported");
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }));
        toast.success("Location captured!");
      },
      () => toast.error("Location permission denied"),
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--clr-bg)" }}>
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
      {/* Header */}
      <div
        style={{
          background: "rgba(8,12,20,0.9)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--clr-border)",
          padding: "0 24px",
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>
          My Profile
        </div>
        <button className="btn btn-ghost btn-sm" onClick={logoutCitizen}>
          <LogOut size={16} style={{ marginRight: "8px" }} /> Logout
        </button>
      </div>

      <div
        style={{ maxWidth: "600px", margin: "40px auto", padding: "0 24px" }}
      >
        <div className="card" style={{ padding: "32px" }}>
          <form
            style={{ display: "grid", gap: "24px" }}
            onSubmit={handleUpdate}
          >
            <div className="form-group">
              <label className="label">
                <User
                  size={14}
                  style={{ marginRight: "8px", verticalAlign: "middle" }}
                />
                Full Name
              </label>
              <input
                type="text"
                className="input"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter your name"
              />
            </div>

            <div className="form-group">
              <label className="label">
                <Phone
                  size={14}
                  style={{ marginRight: "8px", verticalAlign: "middle" }}
                />
                Mobile Number
              </label>
              <input
                type="text"
                className="input"
                value={formData.mobileNumber}
                onChange={(e) =>
                  setFormData({ ...formData, mobileNumber: e.target.value })
                }
                placeholder="Enter 10-digit mobile"
              />
            </div>

            <div className="form-group">
              <label className="label">
                <Globe
                  size={14}
                  style={{ marginRight: "8px", verticalAlign: "middle" }}
                />
                Preferred Language
              </label>
              <select
                className="input"
                value={formData.language}
                onChange={(e) =>
                  setFormData({ ...formData, language: e.target.value })
                }
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="ta">Tamil</option>
                <option value="te">Telugu</option>
                <option value="kn">Kannada</option>
                <option value="mr">Marathi</option>
                <option value="bn">Bengali</option>
                <option value="gu">Gujarati</option>
              </select>
            </div>

            <div className="form-group">
              <label className="label">
                <MapPin
                  size={14}
                  style={{ marginRight: "8px", verticalAlign: "middle" }}
                />
                Current Location
              </label>
              <div style={{ display: "flex", gap: "12px" }}>
                <input
                  type="text"
                  className="input"
                  style={{ flex: 1 }}
                  value={
                    formData.latitude
                      ? `${formData.latitude}, ${formData.longitude}`
                      : ""
                  }
                  readOnly
                  placeholder="No location set"
                />
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={setLocation}
                >
                  Get GPS
                </button>
              </div>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--clr-text-faint)",
                  marginTop: "8px",
                }}
              >
                * Used for routing complaints to the nearest police station.
              </p>
            </div>

            {user?.policeStation && (
              <div
                style={{
                  padding: "16px",
                  background: "rgba(59,130,246,0.1)",
                  borderRadius: "12px",
                  border: "1px solid rgba(59,130,246,0.2)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--clr-primary-light)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    marginBottom: "4px",
                  }}
                >
                  Assigned Station
                </div>
                <div style={{ fontWeight: 600 }}>
                  {user.policeStation.stationName}
                </div>
                <div
                  style={{ fontSize: "0.8rem", color: "var(--clr-text-muted)" }}
                >
                  {user.policeStation.district} District
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ marginTop: "12px" }}
            >
              <Save size={18} style={{ marginRight: "10px" }} />
              {loading ? "Updating..." : "Save Profile Details"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

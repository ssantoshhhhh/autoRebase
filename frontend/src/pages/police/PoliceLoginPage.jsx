import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import toast from "react-hot-toast";

export default function PoliceLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { loginPolice } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error("Email and password required");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/api/police/auth/login", { email, password });
      loginPolice(res.data.officer, res.data.accessToken);
      toast.success(`Welcome, ${res.data.officer.name}`);
      navigate("/police/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.error || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--clr-bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-150px",
          right: "-150px",
          width: "400px",
          height: "400px",
          background:
            "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)",
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          animation: "fadeIn 0.5s ease",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div
            style={{
              width: 64,
              height: 64,
              background: "linear-gradient(135deg, #1e40af, #3b82f6)",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              margin: "0 auto 16px",
              boxShadow: "0 8px 32px rgba(59,130,246,0.3)",
            }}
          >
            👮
          </div>
          <h1 style={{ fontSize: "1.75rem", marginBottom: "6px" }}>
            Police Station Portal
          </h1>
          <p style={{ color: "var(--clr-text-muted)", fontSize: "0.9rem" }}>
            Restricted access — Authorized personnel only
          </p>
        </div>

        <div
          className="card"
          style={{ padding: "32px", border: "1px solid rgba(59,130,246,0.2)" }}
        >
          <div
            style={{
              background: "rgba(59,130,246,0.08)",
              border: "1px solid rgba(59,130,246,0.15)",
              borderRadius: "8px",
              padding: "10px 14px",
              marginBottom: "24px",
              fontSize: "0.8rem",
              color: "#94a3b8",
              display: "flex",
              gap: "8px",
              alignItems: "center",
            }}
          >
            🔒 Secured by JWT · All access logged and audited
          </div>

          <div className="form-group">
            <label className="label" htmlFor="police-email">
              Official Email
            </label>
            <input
              id="police-email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="officer@police.gov.in"
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="police-password">
              Password
            </label>
            <input
              id="police-password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="••••••••"
            />
          </div>

          <button
            id="police-login-btn"
            className="btn btn-primary btn-lg w-full"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In to Dashboard →"}
          </button>
        </div>

        <p
          style={{
            textAlign: "center",
            marginTop: "20px",
            fontSize: "0.8rem",
            color: "var(--clr-text-faint)",
          }}
        >
          Citizen? <Link to="/login">File a complaint →</Link>
        </p>

        {/* Demo credentials */}
        <div
          style={{
            marginTop: "16px",
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.2)",
            borderRadius: "10px",
            padding: "12px 16px",
            fontSize: "0.78rem",
            color: "#fbbf24",
          }}
        >
          🔧 <strong>Demo:</strong> admin@station.gov.in / Admin@123
        </div>
      </div>
    </div>
  );
}

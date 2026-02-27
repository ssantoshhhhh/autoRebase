import { Link } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";

const STATS_VALUES = ["2.4M+", "98%", "11", "< 2.5s"];
const STATS_KEYS = [
  "stats.complaintsLabel",
  "stats.resolutionLabel",
  "stats.languagesLabel",
  "stats.responseLabel",
];

const FEATURES_ICONS = ["🎙️", "🛡️", "📍", "⚡", "📋", "🔒"];
const FEATURES_KEYS = ["voice", "aadhaar", "geofence", "risk", "fir", "security"];

const LANGUAGES = [
  { label: "English", code: "en" },
  { label: "हिंदी", code: "hi" },
  { label: "தமிழ்", code: "ta" },
  { label: "తెలుగు", code: "te" },
  { label: "ಕನ್ನಡ", code: "kn" },
  { label: "मराठी", code: "mr" },
  { label: "বাংলা", code: "bn" },
  { label: "ગુજરાતી", code: "gu" },
  { label: "ਪੰਜਾਬੀ", code: "pa" },
  { label: "ଓଡ଼ିଆ", code: "or" },
  { label: "മലയാളം", code: "ml" },
];

export default function LandingPage() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [activeLang, setActiveLang] = useState(i18n.language || "en");

  function handleLangChange(code) {
    i18n.changeLanguage(code);
    localStorage.setItem("reva_language", code);
    setActiveLang(code);
  }

  return (
    <div style={{ background: "var(--clr-bg)", minHeight: "100vh" }}>
      {/* Navbar */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(8, 12, 20, 0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--clr-border)",
          padding: "0 24px",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "64px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: 36,
                height: 36,
                background: "var(--grad-primary)",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
              }}
            >
              🛡️
            </div>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "1.2rem",
              }}
            >
              REVA AI
            </span>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <Link to="/track" className="btn btn-ghost btn-sm">
              {t("nav.track")}
            </Link>
            {user ? (
              <>
                <Link to="/profile" className="btn btn-ghost btn-sm">
                  {t("nav.profile")}
                </Link>
                <Link to="/my-complaints" className="btn btn-ghost btn-sm">
                  {t("nav.myCases")}
                </Link>
                <Link
                  to="/complaint"
                  className="btn btn-primary btn-sm"
                  id="file-complaint-nav"
                >
                  {t("nav.fileComplaint")}
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="btn btn-outline btn-sm"
                  id="login-nav"
                >
                  {t("nav.signIn")}
                </Link>
                <Link
                  to="/police/login"
                  className="btn btn-ghost btn-sm"
                  id="police-login-nav"
                >
                  {t("nav.policePortal")}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section
        style={{
          minHeight: "90vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "80px 24px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Gradient orbs */}
        <div
          style={{
            position: "absolute",
            top: "10%",
            left: "15%",
            width: "500px",
            height: "500px",
            background:
              "radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)",
            pointerEvents: "none",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "10%",
            right: "15%",
            width: "400px",
            height: "400px",
            background:
              "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)",
            pointerEvents: "none",
            borderRadius: "50%",
          }}
        />

        <div style={{ maxWidth: "860px", animation: "fadeIn 0.7s ease" }}>
          {/* Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 16px",
              background: "rgba(59,130,246,0.1)",
              border: "1px solid rgba(59,130,246,0.2)",
              borderRadius: "9999px",
              marginBottom: "28px",
              fontSize: "0.8rem",
              color: "var(--clr-primary-light)",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#10b981",
                animation: "pulse 2s infinite",
                display: "inline-block",
              }}
            />
            {t("hero.badge")}
          </div>

          <h1
            style={{
              fontSize: "clamp(2.5rem, 6vw, 4rem)",
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              lineHeight: 1.1,
              marginBottom: "24px",
              background: "linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {t("hero.title1")}
            <br />
            <span
              style={{
                background: "var(--grad-primary)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {t("hero.title2")}
            </span>
          </h1>

          <p
            style={{
              fontSize: "1.15rem",
              color: "var(--clr-text-muted)",
              maxWidth: "600px",
              margin: "0 auto 40px",
              lineHeight: 1.7,
            }}
          >
            {t("hero.subtitle")}
          </p>

          <div
            style={{
              display: "flex",
              gap: "16px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link
              to={user ? "/complaint" : "/login"}
              className="btn btn-primary btn-lg"
              id="hero-file-btn"
            >
              {t("hero.fileBtn")}
            </Link>
            <Link
              to="/track"
              className="btn btn-outline btn-lg"
              id="hero-track-btn"
            >
              {t("hero.trackBtn")}
            </Link>
          </div>

          {/* Language pills */}
          <div
            style={{
              marginTop: "48px",
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              justifyContent: "center",
            }}
          >
            {LANGUAGES.map(({ label, code }) => (
              <button
                key={code}
                onClick={() => handleLangChange(code)}
                style={{
                  padding: "4px 12px",
                  background: activeLang === code ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.04)",
                  border: activeLang === code ? "1px solid rgba(59,130,246,0.5)" : "1px solid var(--clr-border)",
                  borderRadius: "9999px",
                  fontSize: "0.8rem",
                  color: activeLang === code ? "var(--clr-primary-light)" : "var(--clr-text-muted)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  fontFamily: "inherit",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section
        style={{
          padding: "32px 24px",
          borderTop: "1px solid var(--clr-border)",
          borderBottom: "1px solid var(--clr-border)",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "24px",
            textAlign: "center",
          }}
        >
          {STATS_VALUES.map((value, i) => (
            <div key={STATS_KEYS[i]}>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "2.2rem",
                  fontWeight: 800,
                  background: "var(--grad-primary)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {value}
              </div>
              <div
                style={{
                  color: "var(--clr-text-muted)",
                  fontSize: "0.9rem",
                  marginTop: "4px",
                }}
              >
                {t(STATS_KEYS[i])}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <h2>{t("features.heading")}</h2>
            <p
              style={{
                marginTop: "12px",
                fontSize: "1rem",
                maxWidth: "500px",
                margin: "12px auto 0",
              }}
            >
              {t("features.subheading")}
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "20px",
            }}
          >
            {FEATURES_KEYS.map((key, i) => (
              <div
                key={key}
                className="card"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div style={{ fontSize: "2rem", marginBottom: "12px" }}>
                  {FEATURES_ICONS[i]}
                </div>
                <h4 style={{ marginBottom: "8px", fontSize: "1.05rem" }}>
                  {t(`features.${key}.title`)}
                </h4>
                <p style={{ fontSize: "0.88rem", lineHeight: 1.6 }}>
                  {t(`features.${key}.desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Emergency CTA */}
      <section style={{ padding: "40px 24px" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div
            className="emergency-banner"
            style={{ textAlign: "center", padding: "32px" }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>🚨</div>
            <h3 style={{ color: "#ff3b30", marginBottom: "8px" }}>
              {t("emergency.title")}
            </h3>
            <p
              style={{
                color: "var(--clr-text-muted)",
                marginBottom: "20px",
                fontSize: "0.9rem",
              }}
            >
              {t("emergency.subtitle")}
            </p>
            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <a
                href="tel:112"
                className="btn btn-danger btn-lg"
                id="emergency-call-112"
              >
                {t("emergency.call112")}
              </a>
              <a
                href="tel:100"
                className="btn btn-outline btn-lg"
                id="emergency-call-100"
              >
                {t("emergency.call100")}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--clr-border)",
          padding: "40px 24px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              justifyContent: "center",
              marginBottom: "16px",
            }}
          >
            <span style={{ fontSize: "1.5rem" }}>🛡️</span>
            <span
              style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
            >
              REVA AI
            </span>
          </div>
          <p style={{ fontSize: "0.8rem", color: "var(--clr-text-faint)" }}>
            {t("footer.copyright")}
          </p>
          <div
            style={{
              display: "flex",
              gap: "24px",
              justifyContent: "center",
              marginTop: "16px",
            }}
          >
            <Link
              to="/police/login"
              style={{
                fontSize: "0.8rem",
                color: "var(--clr-text-faint)",
                textDecoration: "none",
              }}
            >
              {t("footer.policePortal")}
            </Link>
            <Link
              to="/track"
              style={{
                fontSize: "0.8rem",
                color: "var(--clr-text-faint)",
                textDecoration: "none",
              }}
            >
              {t("footer.track")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

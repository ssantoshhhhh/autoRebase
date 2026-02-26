import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const STATS = [
  { value: '2.4M+', label: 'Complaints Filed' },
  { value: '98%', label: 'Resolution Rate' },
  { value: '11', label: 'Languages' },
  { value: '< 2.5s', label: 'AI Response Time' },
];

const FEATURES = [
  {
    icon: '🎙️',
    title: 'Voice-First AI Agent',
    desc: 'Speak your complaint in your language. Our AI conducts a structured interview like a trained intake officer.',
  },
  {
    icon: '🛡️',
    title: 'Aadhar-Verified Identity',
    desc: 'Secure OTP login with masked Aadhaar storage. Your privacy is our priority.',
  },
  {
    icon: '📍',
    title: 'Geofence Routing',
    desc: 'Automatically routes your complaint to the correct police station based on your GPS location.',
  },
  {
    icon: '⚡',
    title: 'Real-Time Risk Assessment',
    desc: 'AI scores threat levels 0-100. Emergencies trigger instant escalation to on-duty officers.',
  },
  {
    icon: '📋',
    title: 'FIR-Style Summary',
    desc: 'AI generates structured legal summaries ready for official filing, with all mandatory fields.',
  },
  {
    icon: '🔒',
    title: 'End-to-End Security',
    desc: 'Row-level database security, encrypted evidence, audit trails, and tamper-proof logs.',
  },
];

const LANGUAGES = [
  'English',
  'हिंदी',
  'தமிழ்',
  'తెలుగు',
  'ಕನ್ನಡ',
  'मराठी',
  'বাংলা',
  'ગુજરાતી',
  'ਪੰਜਾਬੀ',
  'ଓଡ଼ିଆ',
  'മലയാളം',
];

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div style={{ background: 'var(--clr-bg)', minHeight: '100vh' }}>
      {/* Navbar */}
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(8, 12, 20, 0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--clr-border)',
          padding: '0 24px',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '64px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: 36,
                height: 36,
                background: 'var(--grad-primary)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
              }}
            >
              🛡️
            </div>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '1.2rem',
              }}
            >
              REVA AI
            </span>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Link to="/track" className="btn btn-ghost btn-sm">
              Track Complaint
            </Link>
            {user ? (
              <>
                <Link to="/profile" className="btn btn-ghost btn-sm">
                  Profile
                </Link>
                <Link to="/my-complaints" className="btn btn-ghost btn-sm">
                  My Cases
                </Link>
                <Link to="/complaint" className="btn btn-primary btn-sm" id="file-complaint-nav">
                  File Complaint
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-outline btn-sm" id="login-nav">
                  Sign In
                </Link>
                <Link to="/police/login" className="btn btn-ghost btn-sm" id="police-login-nav">
                  Police Portal
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section
        style={{
          minHeight: '90vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '80px 24px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Gradient orbs */}
        <div
          style={{
            position: 'absolute',
            top: '10%',
            left: '15%',
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)',
            pointerEvents: 'none',
            borderRadius: '50%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            right: '15%',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
            borderRadius: '50%',
          }}
        />

        <div style={{ maxWidth: '860px', animation: 'fadeIn 0.7s ease' }}>
          {/* Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              background: 'rgba(59,130,246,0.1)',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: '9999px',
              marginBottom: '28px',
              fontSize: '0.8rem',
              color: 'var(--clr-primary-light)',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#10b981',
                animation: 'pulse 2s infinite',
                display: 'inline-block',
              }}
            />
            Powered by Azure AI · Government of India Initiative
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.5rem, 6vw, 4rem)',
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              lineHeight: 1.1,
              marginBottom: '24px',
              background: 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Your Voice.
            <br />
            <span
              style={{
                background: 'var(--grad-primary)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Their Action.
            </span>
          </h1>

          <p
            style={{
              fontSize: '1.15rem',
              color: 'var(--clr-text-muted)',
              maxWidth: '600px',
              margin: '0 auto 40px',
              lineHeight: 1.7,
            }}
          >
            India's first AI-powered multilingual complaint portal. Speak your complaint in your
            language — our AI structures, prioritizes, and routes it to the right police station
            instantly.
          </p>

          <div
            style={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Link
              to={user ? '/complaint' : '/login'}
              className="btn btn-primary btn-lg"
              id="hero-file-btn"
            >
              🎙️ File a Complaint
            </Link>
            <Link to="/track" className="btn btn-outline btn-lg" id="hero-track-btn">
              📋 Track Complaint
            </Link>
          </div>

          {/* Language pills */}
          <div
            style={{
              marginTop: '48px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              justifyContent: 'center',
            }}
          >
            {LANGUAGES.map((lang) => (
              <span
                key={lang}
                style={{
                  padding: '4px 12px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--clr-border)',
                  borderRadius: '9999px',
                  fontSize: '0.8rem',
                  color: 'var(--clr-text-muted)',
                }}
              >
                {lang}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section
        style={{
          padding: '32px 24px',
          borderTop: '1px solid var(--clr-border)',
          borderBottom: '1px solid var(--clr-border)',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '24px',
            textAlign: 'center',
          }}
        >
          {STATS.map((stat) => (
            <div key={stat.label}>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '2.2rem',
                  fontWeight: 800,
                  background: 'var(--grad-primary)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  color: 'var(--clr-text-muted)',
                  fontSize: '0.9rem',
                  marginTop: '4px',
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2>Enterprise-Grade Features</h2>
            <p
              style={{
                marginTop: '12px',
                fontSize: '1rem',
                maxWidth: '500px',
                margin: '12px auto 0',
              }}
            >
              Built for the scale and security demands of national law enforcement
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '20px',
            }}
          >
            {FEATURES.map((feat, i) => (
              <div key={feat.title} className="card" style={{ animationDelay: `${i * 0.1}s` }}>
                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>{feat.icon}</div>
                <h4 style={{ marginBottom: '8px', fontSize: '1.05rem' }}>{feat.title}</h4>
                <p style={{ fontSize: '0.88rem', lineHeight: 1.6 }}>{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Emergency CTA */}
      <section style={{ padding: '40px 24px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="emergency-banner" style={{ textAlign: 'center', padding: '32px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🚨</div>
            <h3 style={{ color: '#ff3b30', marginBottom: '8px' }}>Emergency? Don't wait.</h3>
            <p
              style={{
                color: 'var(--clr-text-muted)',
                marginBottom: '20px',
                fontSize: '0.9rem',
              }}
            >
              Call 112 (Emergency) or 100 (Police) immediately for life-threatening situations.
            </p>
            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <a href="tel:112" className="btn btn-danger btn-lg" id="emergency-call-112">
                📞 Call 112
              </a>
              <a href="tel:100" className="btn btn-outline btn-lg" id="emergency-call-100">
                📞 Call 100
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--clr-border)',
          padding: '40px 24px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>🛡️</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>REVA AI</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--clr-text-faint)' }}>
            © 2024 REVA AI. Powered by Azure OpenAI & Azure Speech Services. All data encrypted and
            stored securely.
          </p>
          <div
            style={{
              display: 'flex',
              gap: '24px',
              justifyContent: 'center',
              marginTop: '16px',
            }}
          >
            <Link
              to="/police/login"
              style={{
                fontSize: '0.8rem',
                color: 'var(--clr-text-faint)',
                textDecoration: 'none',
              }}
            >
              Police Portal
            </Link>
            <Link
              to="/track"
              style={{
                fontSize: '0.8rem',
                color: 'var(--clr-text-faint)',
                textDecoration: 'none',
              }}
            >
              Track Complaint
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Citizen Pages
import LandingPage from "./pages/citizen/LandingPage";
import LoginPage from "./pages/citizen/LoginPage";
import ComplaintPage from "./pages/citizen/ComplaintPage";
import TrackingPage from "./pages/citizen/TrackingPage";
import MyComplaintsPage from "./pages/citizen/MyComplaintsPage";
import ProfilePage from "./pages/citizen/ProfilePage";

// Police Pages
import PoliceLoginPage from "./pages/police/PoliceLoginPage";
import PoliceDashboard from "./pages/police/PoliceDashboard";
import ComplaintDetailPage from "./pages/police/ComplaintDetailPage";
import OfficersPage from "./pages/police/OfficersPage";
import AnalyticsPage from "./pages/police/AnalyticsPage";
import StationManagement from "./pages/police/StationManagement";
import CrimeMap from "./pages/police/CrimeMap";
import ComplaintsListPage from "./pages/police/ComplaintsListPage";

function CitizenRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? children : <Navigate to="/login" replace />;
}

function PoliceRoute({ children }) {
  const { policeUser, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return policeUser ? children : <Navigate to="/police/login" replace />;
}

function LoadingScreen() {
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
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 48,
            height: 48,
            border: "3px solid var(--clr-border)",
            borderTopColor: "var(--clr-primary)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 16px",
          }}
        />
        <p style={{ color: "var(--clr-text-muted)", fontFamily: "var(--font-sans)" }}>
          Loading REVA AI...
        </p>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public — Citizen */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/track/:trackingId?" element={<TrackingPage />} />

      {/* Protected — Citizen */}
      <Route
        path="/complaint"
        element={
          <CitizenRoute>
            <ComplaintPage />
          </CitizenRoute>
        }
      />
      <Route
        path="/my-complaints"
        element={
          <CitizenRoute>
            <MyComplaintsPage />
          </CitizenRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <CitizenRoute>
            <ProfilePage />
          </CitizenRoute>
        }
      />

      {/* Public — Police */}
      <Route path="/police/login" element={<PoliceLoginPage />} />

      {/* Protected — Police */}
      <Route
        path="/police/dashboard"
        element={
          <PoliceRoute>
            <PoliceDashboard />
          </PoliceRoute>
        }
      />
      <Route
        path="/police/complaints/:id"
        element={
          <PoliceRoute>
            <ComplaintDetailPage />
          </PoliceRoute>
        }
      />
      <Route
        path="/police/officers"
        element={
          <PoliceRoute>
            <OfficersPage />
          </PoliceRoute>
        }
      />
      <Route
        path="/police/analytics"
        element={
          <PoliceRoute>
            <AnalyticsPage />
          </PoliceRoute>
        }
      />
      <Route
        path="/police/stations"
        element={
          <PoliceRoute>
            <StationManagement />
          </PoliceRoute>
        }
      />
      <Route
        path="/police/complaints"
        element={
          <PoliceRoute>
            <ComplaintsListPage />
          </PoliceRoute>
        }
      />
      <Route
        path="/police/map"
        element={
          <PoliceRoute>
            <CrimeMap />
          </PoliceRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "var(--clr-surface-2)",
              color: "var(--clr-text)",
              border: "1px solid var(--clr-border)",
              fontFamily: "var(--font-sans)",
            },
          }}
        />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

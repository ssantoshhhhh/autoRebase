import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import toast from "react-hot-toast";
import termsPdf from "../../assets/terms.pdf";

const LANGUAGES = [
  { code: "en", native: "English" },
  { code: "hi", native: "हिंदी" },
  { code: "ta", native: "தமிழ்" },
  { code: "te", native: "తెలుగు" },
  { code: "kn", native: "ಕನ್ನಡ" },
  { code: "mr", native: "ಮರಾठी" },
  { code: "bn", native: "বাংলা" },
  { code: "gu", native: "ગુજરાતી" },
  { code: "pa", native: "ਪੰਜਾਬੀ" },
  { code: "or", native: "ଓଡ଼ିଆ" },
  { code: "ml", native: "മലയാളം" },
];

export default function LoginPage() {
  const [loginType, setLoginType] = useState("aadhaar"); // 'aadhaar' | 'pan' | 'mobile'
  const [step, setStep] = useState("form"); // 'form' | 'otp' | 'pan_details'
  const [aadhaar, setAadhaar] = useState("");
  const [pan, setPan] = useState("");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [language, setLanguage] = useState("en");
  const [loading, setLoading] = useState(false);
  const [masked, setMasked] = useState("");
  const [otpCells, setOtpCells] = useState(["", "", "", "", "", ""]);
  const [verifiedDetails, setVerifiedDetails] = useState(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const navigate = useNavigate();
  const { loginCitizen, user, loading: authLoading } = useAuth();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/complaint", { replace: true });
    }
  }, [user, authLoading, navigate]);

  if (authLoading) return null;

  const formatAadhaar = (val) => {
    const digits = val.replace(/\D/g, "").slice(0, 12);
    return digits.replace(/(\d{4})(\d{0,4})(\d{0,4})/, (_, a, b, c) =>
      [a, b, c].filter(Boolean).join("-"),
    );
  };
  const rawAadhaar = () => aadhaar.replace(/-/g, "");

  const handleOtpCell = (i, val) => {
    const v = val.replace(/\D/g, "").slice(-1);
    const cells = [...otpCells];
    cells[i] = v;
    setOtpCells(cells);
    setOtp(cells.join(""));
    if (v && i < 5) document.getElementById(`otp-cell-${i + 1}`)?.focus();
  };

  const handleOtpKeyDown = (i, e) => {
    if (e.key === "Backspace" && !otpCells[i] && i > 0) {
      document.getElementById(`otp-cell-${i - 1}`)?.focus();
    }
  };

  const sendAadhaarOtp = async () => {
    const digits = rawAadhaar();
    if (digits.length !== 12) {
      toast.error("Enter valid 12-digit Aadhaar");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/api/auth/send-otp", {
        aadhaar: digits,
        language,
      });
      setMasked(res.data.aadhaarMasked);
      setStep("otp");
      setOtpCells(["", "", "", "", "", ""]);
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to send Aadhaar OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyAadhaarOtp = async () => {
    const fullOtp = otpCells.join("");
    if (fullOtp.length !== 6) return toast.error("Enter 6-digit OTP");
    setLoading(true);
    try {
      const res = await api.post("/api/auth/verify-otp", {
        aadhaar: rawAadhaar(),
        otp: fullOtp,
        language,
      });
      loginCitizen(res.data.user, res.data.accessToken);
      toast.success("Identity Verified Successfully");
      navigate("/complaint");
    } catch (err) {
      toast.error(err.response?.data?.error || "OTP Verification Failed");
    } finally {
      setLoading(false);
    }
  };

  const getPanDetails = async () => {
    if (pan.length !== 10) return toast.error("Enter valid 10-character PAN");
    setLoading(true);
    try {
      const res = await api.post("/api/auth/pan/details", { pan });
      setVerifiedDetails(res.data);
      setStep("pan_details");
    } catch (err) {
      toast.error(err.response?.data?.error || "PAN verification failed");
    } finally {
      setLoading(false);
    }
  };

  const sendMobileOtpForPan = async () => {
    if (mobile.length !== 10)
      return toast.error("Enter valid 10-digit mobile number");
    setLoading(true);
    try {
      const res = await api.post("/api/auth/send-mobile-otp", { mobile });
      setStep("otp");
      setMasked(`+91 ${mobile.slice(0, 2)}******${mobile.slice(-2)}`);
      toast.success(res.data.message || "OTP sent to your mobile");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to send SMS OTP");
    } finally {
      setLoading(false);
    }
  };

  const loginWithPan = async () => {
    const fullOtp = otpCells.join("");
    if (fullOtp.length !== 6) return toast.error("Enter 6-digit OTP");
    setLoading(true);
    try {
      const res = await api.post("/api/auth/pan/login", {
        pan,
        mobile,
        otp: fullOtp,
        name: verifiedDetails?.name,
        language,
      });
      loginCitizen(res.data.user, res.data.accessToken);
      toast.success("Login Successful");
      navigate("/complaint");
    } catch (err) {
      toast.error(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const sendOnlyMobileOtp = async () => {
    if (mobile.length !== 10)
      return toast.error("Enter valid 10-digit mobile number");
    setLoading(true);
    try {
      const res = await api.post("/api/auth/send-mobile-otp", { mobile });
      setStep("otp");
      setMasked(`+91 ${mobile.slice(0, 2)}******${mobile.slice(-2)}`);
      toast.success(res.data.message || "OTP sent to your mobile");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const loginWithMobile = async () => {
    const fullOtp = otpCells.join("");
    if (fullOtp.length !== 6) return toast.error("Enter 6-digit OTP");
    setLoading(true);
    try {
      const res = await api.post("/api/auth/mobile/login", {
        mobile,
        otp: fullOtp,
        language,
      });
      loginCitizen(res.data.user, res.data.accessToken);
      toast.success("Login Successful");
      navigate("/complaint");
    } catch (err) {
      toast.error(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const continueAnonymous = async () => {
    setLoading(true);
    try {
      const res = await api.post("/api/auth/anonymous", { language });
      loginCitizen(res.data.user, res.data.accessToken);
      toast.success("Entering as Anonymous");
      navigate("/complaint");
    } catch {
      toast.error("Failed to create anonymous session");
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
      <div style={{ width: "100%", maxWidth: "480px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                background: "var(--grad-primary)",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
              }}
            >
              🛡️
            </div>
            <span
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "white",
                letterSpacing: "0.5px",
              }}
            >
              REVA AI
            </span>
          </div>
          <h1
            style={{ fontSize: "1.75rem", color: "white", marginBottom: "8px" }}
          >
            {step === "otp" ? t("login.verifyOtp") : t("login.heading")}
          </h1>
          <p style={{ color: "var(--clr-text-muted)", fontSize: "0.9rem" }}>
            {step === "form"
              ? t("login.subheading")
              : step === "pan_details"
                ? "Confirm your identity details"
                : `${t("login.otpSentTo")} ${masked}`}
          </p>
        </div>

        <div className="card" style={{ padding: "32px" }}>
          {step === "form" && (
            <>
              {/* Login Tabs */}
              <div
                style={{
                  display: "flex",
                  background: "var(--clr-bg-3)",
                  padding: "4px",
                  borderRadius: "10px",
                  marginBottom: "24px",
                }}
              >
                <button
                  onClick={() => setLoginType("aadhaar")}
                  style={{
                    flex: 1,
                    padding: "10px",
                    border: "none",
                    background:
                      loginType === "aadhaar"
                        ? "var(--clr-surface-1)"
                        : "transparent",
                    color:
                      loginType === "aadhaar"
                        ? "white"
                        : "var(--clr-text-muted)",
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                  }}
                >
                  {t("login.aadhaarTab")}
                </button>
                <button
                  onClick={() => setLoginType("pan")}
                  style={{
                    flex: 1,
                    padding: "10px",
                    border: "none",
                    background:
                      loginType === "pan"
                        ? "var(--clr-surface-1)"
                        : "transparent",
                    color:
                      loginType === "pan" ? "white" : "var(--clr-text-muted)",
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                  }}
                >
                  {t("login.panTab")}
                </button>
                <button
                  onClick={() => setLoginType("mobile")}
                  style={{
                    flex: 1,
                    padding: "10px",
                    border: "none",
                    background:
                      loginType === "mobile"
                        ? "var(--clr-surface-1)"
                        : "transparent",
                    color:
                      loginType === "mobile"
                        ? "white"
                        : "var(--clr-text-muted)",
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                  }}
                >
                  {t("login.mobileTab")}
                </button>
              </div>

              {loginType === "aadhaar" ? (
                <div>
                  <div className="form-group" style={{ marginBottom: "20px" }}>
                    <label className="label">Aadhaar Number</label>
                    <input
                      type="text"
                      className="input"
                      style={{
                        textAlign: "center",
                        letterSpacing: "0.15em",
                        fontSize: "1.2rem",
                        fontFamily: "monospace",
                      }}
                      value={aadhaar}
                      onChange={(e) =>
                        setAadhaar(formatAadhaar(e.target.value))
                      }
                      placeholder="XXXX-XXXX-XXXX"
                      maxLength={14}
                    />
                  </div>

                  {/* T&C Checkbox */}
                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      alignItems: "flex-start",
                      marginBottom: "20px",
                    }}
                  >
                    <input
                      type="checkbox"
                      id="acceptedTermsAadhaar"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      style={{
                        marginTop: "3px",
                        width: "16px",
                        height: "16px",
                        cursor: "pointer",
                      }}
                    />
                    <label
                      htmlFor="acceptedTermsAadhaar"
                      style={{
                        color: "var(--clr-text-muted)",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                      }}
                    >
                      {t("login.termsAgree")}{" "}
                      <a
                        href={termsPdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "var(--clr-primary-light)",
                          textDecoration: "underline",
                        }}
                      >
                        {t("login.termsLink")}
                      </a>
                    </label>
                  </div>

                  <button
                    className="btn btn-primary w-full"
                    style={{ height: "50px" }}
                    onClick={sendAadhaarOtp}
                    disabled={
                      loading || rawAadhaar().length !== 12 || !acceptedTerms
                    }
                  >
                    {loading
                      ? t("login.requestingOtp")
                      : t("login.getAadhaarOtp")}
                  </button>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--clr-text-faint)",
                      textAlign: "center",
                      marginTop: "12px",
                    }}
                  >
                    {t("login.otpNote")}
                  </p>
                </div>
              ) : loginType === "pan" ? (
                <div>
                  <div className="form-group" style={{ marginBottom: "20px" }}>
                    <label className="label">PAN Number</label>
                    <input
                      type="text"
                      className="input"
                      style={{
                        textAlign: "center",
                        letterSpacing: "0.2em",
                        fontSize: "1.2rem",
                        fontFamily: "monospace",
                        textTransform: "uppercase",
                      }}
                      value={pan}
                      onChange={(e) =>
                        setPan(e.target.value.toUpperCase().slice(0, 10))
                      }
                      placeholder="ABCDE1234F"
                      maxLength={10}
                    />
                  </div>

                  {/* T&C Checkbox */}
                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      alignItems: "flex-start",
                      marginBottom: "20px",
                    }}
                  >
                    <input
                      type="checkbox"
                      id="acceptedTermsPan"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      style={{
                        marginTop: "3px",
                        width: "16px",
                        height: "16px",
                        cursor: "pointer",
                      }}
                    />
                    <label
                      htmlFor="acceptedTermsPan"
                      style={{
                        color: "var(--clr-text-muted)",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                      }}
                    >
                      {t("login.termsAgree")}{" "}
                      <a
                        href={termsPdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "var(--clr-primary-light)",
                          textDecoration: "underline",
                        }}
                      >
                        {t("login.termsLink")}
                      </a>
                    </label>
                  </div>

                  <button
                    className="btn btn-primary w-full"
                    style={{ height: "50px" }}
                    onClick={getPanDetails}
                    disabled={loading || pan.length !== 10 || !acceptedTerms}
                  >
                    {loading ? t("login.verifyingRecord") : t("login.verifyPan")}
                  </button>
                </div>
              ) : (
                <div>
                  <div className="form-group" style={{ marginBottom: "20px" }}>
                    <label className="label">Mobile Number</label>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <div
                        style={{
                          padding: "0 12px",
                          background: "var(--clr-bg-3)",
                          display: "flex",
                          alignItems: "center",
                          borderRadius: "8px",
                          fontSize: "0.9rem",
                          border: "1px solid var(--clr-border)",
                        }}
                      >
                        +91
                      </div>
                      <input
                        type="text"
                        className="input"
                        value={mobile}
                        onChange={(e) =>
                          setMobile(
                            e.target.value.replace(/\D/g, "").slice(0, 10),
                          )
                        }
                        placeholder="Enter 10-digit mobile"
                        style={{ flex: 1 }}
                      />
                    </div>
                  </div>

                  {/* T&C Checkbox */}
                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      alignItems: "flex-start",
                      marginBottom: "20px",
                    }}
                  >
                    <input
                      type="checkbox"
                      id="acceptedTermsMobile"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      style={{
                        marginTop: "3px",
                        width: "16px",
                        height: "16px",
                        cursor: "pointer",
                      }}
                    />
                    <label
                      htmlFor="acceptedTermsMobile"
                      style={{
                        color: "var(--clr-text-muted)",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                      }}
                    >
                      {t("login.termsAgree")}{" "}
                      <a
                        href={termsPdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "var(--clr-primary-light)",
                          textDecoration: "underline",
                        }}
                      >
                        {t("login.termsLink")}
                      </a>
                    </label>
                  </div>

                  <button
                    className="btn btn-primary w-full"
                    style={{ height: "50px" }}
                    onClick={sendOnlyMobileOtp}
                    disabled={loading || mobile.length !== 10 || !acceptedTerms}
                  >
                    {loading ? t("login.loading") : t("login.getMobileOtp")}
                  </button>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  margin: "24px 0",
                  gap: "16px",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    height: "1px",
                    background: "var(--clr-border)",
                  }}
                />
                <span
                  style={{ fontSize: "0.8rem", color: "var(--clr-text-faint)" }}
                >
                  OR
                </span>
                <div
                  style={{
                    flex: 1,
                    height: "1px",
                    background: "var(--clr-border)",
                  }}
                />
              </div>

              <button
                className="btn btn-ghost w-full"
                onClick={continueAnonymous}
                disabled={!acceptedTerms}
                style={{ opacity: !acceptedTerms ? 0.5 : 1 }}
              >
                {t("login.fileAnonymously")}
              </button>
            </>
          )}

          {step === "pan_details" && verifiedDetails && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              <div
                style={{
                  background: "var(--clr-bg-3)",
                  padding: "20px",
                  borderRadius: "12px",
                  marginBottom: "24px",
                  border: "1px solid var(--clr-border)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--clr-text-faint)",
                    textTransform: "uppercase",
                    marginBottom: "12px",
                    fontWeight: 700,
                  }}
                >
                  Verified Identity Found
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--clr-text-muted)",
                    }}
                  >
                    Full Name
                  </div>
                  <div style={{ fontWeight: 600, color: "white" }}>
                    {verifiedDetails.name}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--clr-text-muted)",
                    }}
                  >
                    Relative Name
                  </div>
                  <div style={{ fontWeight: 600, color: "white" }}>
                    {verifiedDetails.fathersName || "---"}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="label">Verify your Contact Number</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <div
                    style={{
                      padding: "0 12px",
                      background: "var(--clr-bg-3)",
                      display: "flex",
                      alignItems: "center",
                      borderRadius: "8px",
                      fontSize: "0.9rem",
                      border: "1px solid var(--clr-border)",
                    }}
                  >
                    +91
                  </div>
                  <input
                    type="text"
                    className="input"
                    value={mobile}
                    onChange={(e) =>
                      setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
                    }
                    placeholder="Enter 10-digit mobile"
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
              <button
                className="btn btn-primary w-full"
                style={{ marginTop: "24px", height: "50px" }}
                onClick={sendMobileOtpForPan}
                disabled={loading || mobile.length !== 10}
              >
                {loading ? t("login.sendingVerification") : t("login.verifyMobile")}
              </button>
              <button
                className="btn btn-ghost w-full"
                style={{ marginTop: "12px" }}
                onClick={() => setStep("form")}
              >
                {t("login.switchAccount")}
              </button>
            </div>
          )}

          {step === "otp" && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              <div className="form-group">
                <label
                  className="label"
                  style={{ textAlign: "center", display: "block" }}
                >
                  {t("login.enterOtp")}
                </label>
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    justifyContent: "center",
                    marginTop: "12px",
                  }}
                >
                  {otpCells.map((cell, i) => (
                    <input
                      key={i}
                      id={`otp-cell-${i}`}
                      type="text"
                      className="input"
                      style={{
                        width: "46px",
                        height: "56px",
                        textAlign: "center",
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        background: cell
                          ? "rgba(59,130,246,0.1)"
                          : "var(--clr-bg-3)",
                        borderColor: cell
                          ? "var(--clr-primary)"
                          : "var(--clr-border)",
                      }}
                      value={cell}
                      onChange={(e) => handleOtpCell(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    />
                  ))}
                </div>
              </div>
              <button
                className="btn btn-primary w-full"
                style={{ marginTop: "24px", height: "50px" }}
                onClick={
                  loginType === "aadhaar"
                    ? verifyAadhaarOtp
                    : loginType === "pan"
                      ? loginWithPan
                      : loginWithMobile
                }
                disabled={loading || otpCells.join("").length !== 6}
              >
                    {loading ? t("login.verifying") : t("login.verifyOtp")}
              </button>
              <button
                className="btn btn-ghost w-full"
                style={{ marginTop: "12px" }}
                onClick={() => setStep("form")}
              >
                ← Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

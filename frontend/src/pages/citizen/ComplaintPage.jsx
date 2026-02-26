import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import toast from "react-hot-toast";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "../../hooks/useSpeechSynthesis";
import { getAIResponse } from "../../utils/ai";
import {
  Mic,
  MicOff,
  Settings,
  Globe,
  Square,
  Send,
  Siren,
  CheckCircle2,
  Bot,
  User,
  Volume2,
  X,
  Shield,
  Clock,
  MapPin,
  AlertCircle,
  Navigation,
  ChevronRight,
  Search,
} from "lucide-react";

export default function ComplaintPage() {
  const { user, logoutCitizen } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([
    {
      id: "1",
      text: `Hello! I'm REVA, your AI Police Assistant. How can I help you today?`,
      role: "ai",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState("");
  const [autoStop, setAutoStop] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [language, setLanguage] = useState(
    user?.language === "hi" ? "hi" : "en",
  );

  const [location, setLocation] = useState(null);
  const [activeStation, setActiveStation] = useState(null);
  const [isWithinGeofence, setIsWithinGeofence] = useState(false);
  const [isCheckingGeofence, setIsCheckingGeofence] = useState(false);
  const [showStationPicker, setShowStationPicker] = useState(false);
  const [availableStations, setAvailableStations] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const messagesEndRef = useRef(null);
  const shouldProcessRef = useRef(false);

  // Initialize Voice Hooks
  const {
    isListening,
    isInitializing,
    transcript: sttTranscript,
    interimTranscript,
    startListening: startSTT,
    stopListening: stopSTT,
    resetTranscript,
  } = useSpeechRecognition(language === "hi" ? "hi-IN" : "en-IN", autoStop);

  const {
    speak,
    cancel: cancelSpeech,
    speaking: isSpeaking,
    voices,
  } = useSpeechSynthesis();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages, interimTranscript, isLoading]);

  const handleToggleListening = () => {
    if (isListening) {
      shouldProcessRef.current = true;
      stopSTT();
    } else {
      cancelSpeech();
      resetTranscript();
      startSTT();
      shouldProcessRef.current = false;
    }
  };

  useEffect(() => {
    const fetchLocationAndGeofence = async () => {
      setIsCheckingGeofence(true);
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            setLocation({ latitude, longitude });
            try {
              const res = await api.get(
                `/api/stations/nearest?lat=${latitude}&lng=${longitude}`,
              );
              if (res.data.withinGeofence) {
                setActiveStation(res.data.station);
                setIsWithinGeofence(true);
              } else {
                setActiveStation(null);
                setIsWithinGeofence(false);
              }
            } catch (err) {
              console.error("Geofence check failed", err);
            } finally {
              setIsCheckingGeofence(false);
            }
          },
          (err) => {
            console.error("Location access denied", err);
            setIsCheckingGeofence(false);
          },
          { enableHighAccuracy: true },
        );
      } else {
        setIsCheckingGeofence(false);
      }
    };

    fetchLocationAndGeofence();
  }, []);

  const fetchAllStations = async () => {
    try {
      const res = await api.get("/api/stations");
      setAvailableStations(res.data.stations);
    } catch (err) {
      toast.error("Failed to load police stations");
    }
  };

  const handleManualStationSelect = (station) => {
    setActiveStation(station);
    setShowStationPicker(false);
    toast.success(`Selected Station: ${station.stationName}`);
  };

  const finalizeComplaint = async (aiData = null) => {
    if (!activeStation) {
      await fetchAllStations();
      setShowStationPicker(true);
      toast("Please select a police station to file your complaint");
      return;
    }

    setIsSubmitting(true);
    try {
      const transcript = messages
        .map((m) => `${m.role === "ai" ? "REVA" : "USER"}: ${m.text}`)
        .join("\n");

      const response = await api.post("/api/complaints/submit", {
        transcript,
        latitude: location?.latitude,
        longitude: location?.longitude,
        locationAddress: activeStation
          ? `Near ${activeStation.stationName}, ${activeStation.district}`
          : "Unknown",
        legalConfirmed: true,
        structuredJson: {
          stationId: activeStation.id,
          incidentType: aiData?.incidentType || "AI Assistant Report",
          incidentLocation: aiData?.location || "Detected",
          incidentDescription: aiData?.description || "See transcript",
          incidentDateTime: aiData?.dateTime || new Date().toISOString(),
        },
      });

      toast.success("Complaint filed successfully!");
      navigate(`/citizen/my-complaints`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (
      !isListening &&
      (shouldProcessRef.current || (autoStop && sttTranscript.trim()))
    ) {
      if (sttTranscript.trim()) {
        sendMessage(sttTranscript);
      }
      shouldProcessRef.current = false;
      resetTranscript();
    }
  }, [isListening, sttTranscript, autoStop]);

  const sendMessage = async (text) => {
    if (!text?.trim() || isLoading) return;

    const userMsg = {
      id: Date.now().toString(),
      text: text,
      role: "user",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.role === "ai" ? "assistant" : "user",
        content: m.text,
      }));

      const context = {
        userName: user?.name,
        mobile: user?.mobileNumber,
        location: user?.policeStation?.stationName
          ? `${user.policeStation.stationName}, ${user.policeStation.district}`
          : "Unknown",
        history: history.slice(-5), // Send last 5 messages for context
      };

      const aiResponseRaw = await getAIResponse(text, language, context);

      // Parse [[SUBMIT: {json}]] signal
      let aiText = aiResponseRaw;
      let aiData = null;
      const submitMatch = aiResponseRaw.match(/\[\[SUBMIT:\s*(\{.*?\})\]\]/);

      if (submitMatch) {
        try {
          aiData = JSON.parse(submitMatch[1]);
          aiText = aiResponseRaw.replace(submitMatch[0], "").trim();
        } catch (e) {
          console.error("Failed to parse AI submission data", e);
        }
      }

      const aiMsg = {
        id: (Date.now() + 1).toString(),
        text: aiText,
        role: "ai",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsLoading(false);

      const langMap = {
        en: "en-IN",
        hi: "hi-IN",
        te: "te-IN",
        ta: "ta-IN",
        kn: "kn-IN",
      };
      const voicePrefix = langMap[language] || "en-IN";
      const voice =
        voices.find((v) => v.lang.startsWith(voicePrefix)) ||
        voices.find((v) => v.lang.startsWith("en-IN"));
      speak(aiText, voice);

      // Trigger automatic submission if signal detected
      if (aiData) {
        setTimeout(() => {
          finalizeComplaint(aiData);
        }, 2000); // Small delay to let user hear the "filing" message
      }
    } catch (err) {
      toast.error("AI Error");
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        backgroundColor: "#080c14",
        color: "white",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        fontFamily: "sans-serif",
      }}
    >
      {/* Background Blobs (Premium Look) */}
      <div
        style={{
          position: "absolute",
          top: "-10%",
          left: "-10%",
          width: "60%",
          height: "60%",
          backgroundColor: "rgba(30, 58, 138, 0.15)",
          borderRadius: "50%",
          filter: "blur(120px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-10%",
          right: "-10%",
          width: "50%",
          height: "50%",
          backgroundColor: "rgba(76, 29, 149, 0.15)",
          borderRadius: "50%",
          filter: "blur(120px)",
          pointerEvents: "none",
        }}
      />

      {/* Header */}
      <header
        style={{
          position: "relative",
          zIndex: 10,
          padding: "12px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          backgroundColor: "rgba(255,255,255,0.02)",
          backdropFilter: "blur(10px)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              backgroundColor: "#2563eb",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px rgba(37, 99, 235, 0.4)",
            }}
          >
            <Shield size={24} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: "700", fontSize: "1.1rem" }}>REVA AI</div>
            <div
              style={{
                fontSize: "0.65rem",
                color: "#60a5fa",
                letterSpacing: "1.5px",
                textTransform: "uppercase",
              }}
            >
              Police Assistant
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              fontSize: "10px",
              fontWeight: "700",
              padding: "4px 10px",
              borderRadius: "20px",
              border: "1px solid " + (isListening ? "#ef4444" : "#3b82f6"),
              color: isListening ? "#ef4444" : "#60a5fa",
              backgroundColor: isListening
                ? "rgba(239, 68, 68, 0.1)"
                : "rgba(59, 130, 246, 0.1)",
            }}
          >
            {isInitializing
              ? "CONNECTING..."
              : isListening
                ? "LISTENING..."
                : isLoading
                  ? "THINKING..."
                  : "READY"}
          </div>

          <div
            style={{
              fontSize: "10px",
              fontWeight: "700",
              padding: "4px 10px",
              borderRadius: "20px",
              border: activeStation ? "1px solid #10b981" : "1px solid #f59e0b",
              color: activeStation ? "#10b981" : "#f59e0b",
              backgroundColor: activeStation
                ? "rgba(16, 185, 129, 0.1)"
                : "rgba(245, 158, 11, 0.1)",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            {activeStation ? (
              <>
                <Shield size={10} /> {activeStation.stationName}
              </>
            ) : isCheckingGeofence ? (
              "Locating..."
            ) : (
              <>
                <AlertCircle size={10} /> Select Station
              </>
            )}
          </div>
          <button
            onClick={logoutCitizen}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.5)",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Messages */}
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px",
          paddingBottom: "150px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            maxWidth: "700px",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                width: "100%",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: msg.role === "user" ? "row-reverse" : "row",
                  alignItems: "flex-end",
                  gap: "12px",
                  maxWidth: "85%",
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor:
                      msg.role === "user" ? "#4f46e5" : "rgba(255,255,255,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {msg.role === "user" ? (
                    <User size={16} />
                  ) : (
                    <Bot size={16} color="#60a5fa" />
                  )}
                </div>
                <div
                  style={{
                    padding: "12px 18px",
                    borderRadius:
                      msg.role === "user"
                        ? "20px 20px 4px 20px"
                        : "20px 20px 20px 4px",
                    backgroundColor:
                      msg.role === "user"
                        ? "#4f46e5"
                        : "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    fontSize: "0.95rem",
                    lineHeight: "1.5",
                  }}
                >
                  {msg.text}
                  <div
                    style={{
                      fontSize: "10px",
                      color: "rgba(255,255,255,0.3)",
                      textAlign: "right",
                      marginTop: "4px",
                    }}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div style={{ display: "flex", gap: "8px", padding: "10px" }}>
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  backgroundColor: "#3b82f6",
                  borderRadius: "50%",
                  animation: "pulse 1.5s infinite",
                }}
              />
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  backgroundColor: "#3b82f6",
                  borderRadius: "50%",
                  animation: "pulse 1.5s infinite 0.2s",
                }}
              />
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  backgroundColor: "#3b82f6",
                  borderRadius: "50%",
                  animation: "pulse 1.5s infinite 0.4s",
                }}
              />
            </div>
          )}
          {(isListening || sttTranscript) &&
            (sttTranscript || interimTranscript) && (
              <div
                style={{
                  alignSelf: "flex-end",
                  padding: "10px 16px",
                  backgroundColor: "rgba(79, 70, 229, 0.1)",
                  borderRadius: "15px",
                  border: "1px dashed rgba(79, 70, 229, 0.4)",
                  color: "#93c5fd",
                  fontSize: "0.9rem",
                  maxWidth: "80%",
                  wordBreak: "break-word",
                }}
              >
                {sttTranscript}
                {interimTranscript
                  ? sttTranscript
                    ? " " + interimTranscript
                    : interimTranscript
                  : ""}
                ...
              </div>
            )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Controls Hub */}
      <div
        style={{
          position: "fixed",
          bottom: "32px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          gap: "16px",
          backgroundColor: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(20px)",
          padding: "10px 24px",
          borderRadius: "50px",
          border: "1px solid rgba(255,255,255,0.15)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
        }}
      >
        <button
          onClick={() => setIsSettingsOpen(true)}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.6)",
            cursor: "pointer",
            padding: "8px",
          }}
        >
          <Settings size={22} />
        </button>

        <button
          onClick={finalizeComplaint}
          disabled={isSubmitting}
          style={{
            background: isSubmitting ? "rgba(255,255,255,0.05)" : "#10b981",
            border: "none",
            color: "white",
            cursor: "pointer",
            padding: "8px 16px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: activeStation
              ? "0 0 15px rgba(16, 185, 129, 0.3)"
              : "none",
            transition: "all 0.3s",
          }}
        >
          {isSubmitting ? "FILING..." : "FILE COMPLAINT"}
          <ChevronRight size={16} />
        </button>

        <div
          style={{
            width: "1px",
            height: "24px",
            backgroundColor: "rgba(255,255,255,0.1)",
          }}
        />

        <button
          onClick={() => {
            cancelSpeech();
            stopSTT();
          }}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.6)",
            cursor: "pointer",
            padding: "8px",
          }}
        >
          <Square size={22} />
        </button>

        <button
          onClick={handleToggleListening}
          disabled={isInitializing}
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            border: "none",
            cursor: isInitializing ? "not-allowed" : "pointer",
            backgroundColor: isInitializing
              ? "#4b5563"
              : isListening
                ? "#ef4444"
                : "#2563eb",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow:
              "0 0 30px " +
              (isInitializing
                ? "rgba(75, 85, 99, 0.5)"
                : isListening
                  ? "rgba(239, 68, 68, 0.5)"
                  : "rgba(37, 99, 235, 0.5)"),
            transition: "all 0.3s",
            opacity: isInitializing ? 0.7 : 1,
          }}
        >
          {isInitializing ? (
            <div
              style={{
                width: "24px",
                height: "24px",
                border: "3px solid white",
                borderTop: "3px solid transparent",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
          ) : isListening ? (
            <MicOff size={32} />
          ) : (
            <Mic size={32} />
          )}
        </button>

        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            backgroundColor: "rgba(255,255,255,0.05)",
            borderRadius: "20px",
            padding: "0 12px",
          }}
        >
          <Globe size={14} color="rgba(255,255,255,0.5)" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{
              background: "none",
              border: "none",
              color: "white",
              padding: "8px 4px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "700",
              outline: "none",
            }}
          >
            <option value="en" style={{ backgroundColor: "#1e293b" }}>
              EN
            </option>
            <option value="hi" style={{ backgroundColor: "#1e293b" }}>
              HI
            </option>
          </select>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            backgroundColor: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "#1e293b",
              borderRadius: "24px",
              width: "100%",
              maxWidth: "380px",
              padding: "24px",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "24px",
              }}
            >
              <h3 style={{ margin: 0 }}>Voice Settings</h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                <X size={20} />
              </button>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px",
                backgroundColor: "rgba(255,255,255,0.05)",
                borderRadius: "16px",
              }}
            >
              <div>
                <div style={{ fontWeight: "600" }}>Auto-Stop Listening</div>
                <div
                  style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}
                >
                  Detects when you finish speaking
                </div>
              </div>
              <button
                onClick={() => setAutoStop(!autoStop)}
                style={{
                  width: "48px",
                  height: "24px",
                  borderRadius: "20px",
                  border: "none",
                  position: "relative",
                  cursor: "pointer",
                  backgroundColor: autoStop
                    ? "#2563eb"
                    : "rgba(255,255,255,0.1)",
                  transition: "0.3s",
                }}
              >
                <div
                  style={{
                    width: "18px",
                    height: "18px",
                    backgroundColor: "white",
                    borderRadius: "50%",
                    position: "absolute",
                    top: "3px",
                    left: autoStop ? "27px" : "3px",
                    transition: "0.3s",
                  }}
                />
              </button>
            </div>
            <button
              onClick={() => setIsSettingsOpen(false)}
              style={{
                width: "100%",
                marginTop: "24px",
                padding: "14px",
                backgroundColor: "#2563eb",
                border: "none",
                borderRadius: "12px",
                color: "white",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              Save & Close
            </button>
          </div>
        </div>
      )}
      {/* Station Picker Modal */}
      {showStationPicker && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            backgroundColor: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "#111827",
              borderRadius: "24px",
              width: "100%",
              maxWidth: "500px",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "24px",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "1.25rem" }}>
                  Select Police Station
                </h3>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: "0.8rem",
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  We couldn't detect your local station. Please choose one
                  manually.
                </p>
              </div>
              <button
                onClick={() => setShowStationPicker(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div
              style={{
                padding: "16px",
                backgroundColor: "rgba(255,255,255,0.02)",
              }}
            >
              <div style={{ position: "relative" }}>
                <Search
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "rgba(255,255,255,0.4)",
                  }}
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search station or district..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 12px 12px 40px",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "white",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
              {availableStations
                .filter(
                  (s) =>
                    s.stationName
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()) ||
                    s.district
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()),
                )
                .map((station) => (
                  <button
                    key={station.id}
                    onClick={() => handleManualStationSelect(station)}
                    style={{
                      width: "100%",
                      padding: "16px",
                      marginBottom: "12px",
                      backgroundColor:
                        activeStation?.id === station.id
                          ? "rgba(37, 99, 235, 0.2)"
                          : "rgba(255,255,255,0.03)",
                      border: `1px solid ${activeStation?.id === station.id ? "#3b82f6" : "rgba(255,255,255,0.1)"}`,
                      borderRadius: "16px",
                      textAlign: "left",
                      cursor: "pointer",
                      color: "white",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      transition: "all 0.2s",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: "600", fontSize: "1rem" }}>
                        {station.stationName}
                      </div>
                      <div
                        style={{
                          fontSize: "0.8rem",
                          color: "rgba(255,255,255,0.4)",
                        }}
                      >
                        {station.district}, {station.state}
                      </div>
                    </div>
                    <ChevronRight size={20} color="rgba(255,255,255,0.2)" />
                  </button>
                ))}
              {availableStations.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "rgba(255,255,255,0.4)",
                  }}
                >
                  Loading stations...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

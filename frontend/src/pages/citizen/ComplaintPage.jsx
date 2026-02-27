import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import toast from "react-hot-toast";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "../../hooks/useSpeechSynthesis";
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
  ImageIcon,
  Loader2,
  AlertTriangle,
  ShieldAlert,
  Camera,
  FolderOpen,
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
  const [autoResumeMic, setAutoResumeMic] = useState(true);
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
  const [isMediaUploading, setIsMediaUploading] = useState(false);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraMode, setCameraMode] = useState("photo"); // "photo" | "video"
  const [isRecording, setIsRecording] = useState(false);
  const [isTextChatEnabled, setIsTextChatEnabled] = useState(false);
  const [textInput, setTextInput] = useState("");

  // ── Age-adaptive state ─────────────────────────────────────────────────
  const [isGreetingResponded, setIsGreetingResponded] = useState(false);
  const [isAgeCollected, setIsAgeCollected] = useState(false);
  const [userAge, setUserAge] = useState(null);
  const [userCategory, setUserCategory] = useState(null); // "child" | "adult" | "senior"

  // ── Edit message state ────────────────────────────────────────────────
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editedText, setEditedText] = useState("");

  const messagesEndRef = useRef(null);
  const shouldProcessRef = useRef(false);
  const imageFileRef = useRef(null);
  const cameraPhotoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const cameraVideoElRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  const getLocale = (lang) => {
    const locales = {
      en: "en-IN",
      hi: "hi-IN",
      te: "te-IN",
      ta: "ta-IN",
      kn: "kn-IN",
      mr: "mr-IN",
      bn: "bn-IN",
      gu: "gu-IN",
      ml: "ml-IN",
      pa: "pa-IN",
    };
    return locales[lang] || "en-IN";
  };

  // Initialize Voice Hooks
  const {
    isListening,
    isInitializing,
    transcript: sttTranscript,
    interimTranscript,
    startListening: startSTT,
    stopListening: stopSTT,
    resetTranscript,
  } = useSpeechRecognition(getLocale(language), autoStop);

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

  // Auto-enable mic after AI finishes speaking (Hands-free mode)
  const prevSpeakingRef = useRef(false);
  useEffect(() => {
    if (
      autoResumeMic &&
      prevSpeakingRef.current === true &&
      isSpeaking === false
    ) {
      const timer = setTimeout(() => {
        if (!isListening && !isSpeaking && !isLoading && !isSubmitting) {
          resetTranscript();
          startSTT();
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
    prevSpeakingRef.current = isSpeaking;
  }, [
    isSpeaking,
    isListening,
    isLoading,
    isSubmitting,
    startSTT,
    resetTranscript,
  ]);

  const [isSecureHandshakeComplete, setIsSecureHandshakeComplete] =
    useState(false);
  const [handshakeStep, setHandshakeStep] = useState(0);

  useEffect(() => {
    const steps = [
      "ESTABLISHING E2EE CHANNEL...",
      "SCANNING FOR VPN LEAKS...",
      "VERIFYING DEVICE INTEGRITY...",
      "CYBER-SEC PROTOCOL ACTIVE",
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length - 1) {
        currentStep++;
        setHandshakeStep(currentStep);
      } else {
        clearInterval(interval);
        setTimeout(() => setIsSecureHandshakeComplete(true), 800);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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

    // helper: speak a text message
    const speakReply = (replyText) => {
      const voicePrefix = getLocale(language);
      const voice =
        voices.find((v) => v.lang.startsWith(voicePrefix)) ||
        voices.find((v) => v.lang.startsWith("en-IN"));
      stopSTT();
      speak(replyText, voice);
    };

    // helper: add AI message bubble
    const addAIMsg = (replyText) => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: replyText,
          role: "ai",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    };

    // ── STEP 1: First user reply → ask for age ─────────────────────────────
    if (!isGreetingResponded) {
      setIsGreetingResponded(true);
      const q = "Before we continue, may I know your age?";
      addAIMsg(q);
      speakReply(q);
      return;
    }

    // ── STEP 2: Collect and validate age ───────────────────────────────
    if (!isAgeCollected) {
      const ageMatch = text.match(/\d+/);
      const age = ageMatch ? parseInt(ageMatch[0], 10) : null;

      if (!age || age < 1 || age > 120) {
        const retry = "I didn't catch a valid age. Could you please tell me your age? (1–120)";
        addAIMsg(retry);
        speakReply(retry);
        return;
      }

      const category = age < 18 ? "child" : age <= 60 ? "adult" : "senior";
      setUserAge(age);
      setUserCategory(category);
      setIsAgeCollected(true);

      const confirmations = {
        child: "Thank you, dear. I will guide you in a simple and safe way. Now, how can I help you today, dear?",
        adult: "Thank you. Let's proceed with your complaint. How can I help you today?",
        senior: "Thank you. I will guide you step by step. How can I help you today?",
      };
      const confirm = confirmations[category];
      addAIMsg(confirm);
      speakReply(confirm);
      return;
    }

    // ── STEP 3: Normal AI conversation ────────────────────────────────
    setIsLoading(true);

    try {
      // Only include plain text messages in history — skip image/video/result bubbles
      const history = messages
        .filter((m) => !m.type && m.text)
        .map((m) => ({
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
        userAge: userAge,
        userCategory: userCategory, // "child" | "adult" | "senior"
      };

      // Call backend chat API instead of direct OpenAI call
      const response = await api.post('/api/chat', {
        message: text,
        languageCode: language,
        context: context,
      });

      const aiResponseRaw = response.data.reply;

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

      const voicePrefix = getLocale(language);
      const voice =
        voices.find((v) => v.lang.startsWith(voicePrefix)) ||
        voices.find((v) => v.lang.startsWith("en-IN"));

      // Ensure mic is off while AI starts to speak
      stopSTT();
      speak(aiText, voice);

      // Trigger automatic submission if signal detected
      if (aiData) {
        // --- CYBER SECURITY: REAL-TIME THREAT MONITORING ---
        const cyberKeywords = [
          "phishing",
          "fraud",
          "hacker",
          "scam",
          "otp",
          "link",
          "bullying",
          "harassment",
          "financial",
          "bank",
        ];
        const isCyberRelated = cyberKeywords.some(
          (k) =>
            aiData.incidentType?.toLowerCase().includes(k) ||
            aiData.description?.toLowerCase().includes(k),
        );

        if (isCyberRelated) {
          toast(
            (t) => (
              <span
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <Shield size={20} color="#60a5fa" />
                <div>
                  <b>Cyber-Security Protocol Activated</b>
                  <div style={{ fontSize: "12px" }}>
                    Incident classified in Cyber-Domain. Advising 1930
                    reporting.
                  </div>
                </div>
              </span>
            ),
            { duration: 6000, position: "top-center" },
          );
        }
        // ----------------------------------------------------

        setTimeout(() => {
          finalizeComplaint(aiData);
        }, 2000); // Small delay to let user hear the "filing" message
      }
    } catch (err) {
      toast.error("AI Error");
      setIsLoading(false);
    }
  };

  // ── Save edited message ───────────────────────────────────────────────
  const handleSaveEdit = async (msgId) => {
    const trimmed = editedText.trim();
    if (!trimmed) return;

    // 1. Update the user message in-place
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, text: trimmed } : m))
    );

    // 2. Remove the AI reply that immediately follows this message
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === msgId);
      if (idx !== -1 && idx + 1 < prev.length && prev[idx + 1].role === "ai") {
        return [...prev.slice(0, idx + 1), ...prev.slice(idx + 2)];
      }
      return prev;
    });

    setEditingMessageId(null);
    setIsLoading(true);

    try {
      const history = messages
        .filter((m) => !m.type && m.text)
        .map((m) => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text }));

      const context = {
        userName: user?.name,
        mobile: user?.mobileNumber,
        location: user?.policeStation?.stationName
          ? `${user.policeStation.stationName}, ${user.policeStation.district}`
          : "Unknown",
        history: history.slice(-5),
        userAge,
        userCategory,
      };

      const response = await api.post("/api/chat", {
        message: trimmed,
        languageCode: language,
        context,
      });

      const aiText = response.data.reply || "";
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: aiText,
          role: "ai",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);

      const voicePrefix = getLocale(language);
      const voice =
        voices.find((v) => v.lang.startsWith(voicePrefix)) ||
        voices.find((v) => v.lang.startsWith("en-IN"));
      stopSTT();
      speak(aiText, voice);
    } catch (err) {
      toast.error("Failed to get AI response.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Camera Modal ────────────────────────────────────────────────────────────
  const openCameraModal = async () => {
    setShowMediaMenu(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      cameraStreamRef.current = stream;
      setShowCameraModal(true);
      // Wait for modal to render then attach stream
      setTimeout(() => {
        if (cameraVideoElRef.current) {
          cameraVideoElRef.current.srcObject = stream;
          cameraVideoElRef.current.play();
        }
      }, 80);
    } catch (err) {
      toast.error("Camera access denied or unavailable.");
    }
  };

  const closeCameraModal = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    setIsRecording(false);
    setShowCameraModal(false);
    setCameraMode("photo");
  };

  const capturePhoto = () => {
    const video = cameraVideoElRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });
      closeCameraModal();
      handleCapturedFile(file);
    }, "image/jpeg", 0.92);
  };

  const startRecording = () => {
    if (!cameraStreamRef.current) return;
    recordedChunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    const recorder = new MediaRecorder(cameraStreamRef.current, { mimeType });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      const file = new File([blob], `video_${Date.now()}.webm`, { type: "video/webm" });
      closeCameraModal();
      handleCapturedFile(file);
    };
    mediaRecorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleCapturedFile = async (file) => {
    const previewUrl = URL.createObjectURL(file);
    const mediaId = Date.now().toString();
    const isVideo = file.type.startsWith("video/");
    setMessages((prev) => [
      ...prev,
      {
        id: mediaId,
        role: "user",
        type: isVideo ? "video" : "image",
        imageUrl: previewUrl,
        fileName: file.name,
        loading: true,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setIsMediaUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/image-analysis/analyze`,
        { method: "POST", body: formData }
      );
      const result = await response.json();
      console.log("[Media Analysis Result]", JSON.stringify(result, null, 2));
      setMessages((prev) => prev.map((m) => m.id === mediaId ? { ...m, loading: false } : m));
      if (result.success && result.module1?.status === "completed") {
        toast.success("Analysis complete — check server console for result.");
      } else {
        toast.error(result.module1?.error || "Analysis failed.");
      }
    } catch (err) {
      console.error("[Media Analysis Error]", err);
      setMessages((prev) => prev.map((m) => m.id === mediaId ? { ...m, loading: false } : m));
      toast.error("Failed to connect to analysis service.");
    } finally {
      setIsMediaUploading(false);
    }
  };

  // ── Media Upload & Analysis (file-picker path) ──────────────────────────────
  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset all file inputs so the same file can be re-selected
    [imageFileRef, cameraPhotoRef].forEach((r) => {
      if (r.current) r.current.value = "";
    });

    const previewUrl = URL.createObjectURL(file);
    const mediaId = Date.now().toString();
    const isVideo = file.type.startsWith("video/");

    // Show media bubble immediately with loading=true
    setMessages((prev) => [
      ...prev,
      {
        id: mediaId,
        role: "user",
        type: isVideo ? "video" : "image",
        imageUrl: previewUrl,
        fileName: file.name,
        loading: true,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);

    setIsMediaUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/image-analysis/analyze`,
        { method: "POST", body: formData },
      );
      const result = await response.json();

      console.log("[Media Analysis Result]", JSON.stringify(result, null, 2));

      // Mark image as done loading
      setMessages((prev) =>
        prev.map((m) => (m.id === mediaId ? { ...m, loading: false } : m)),
      );

      if (result.success && result.module1?.status === "completed") {
        toast.success("Analysis complete — check server logs for full report.");
      } else {
        toast.error(result.module1?.error || "Analysis failed.");
      }
    } catch (err) {
      console.error("[Media Analysis Error]", err);
      setMessages((prev) =>
        prev.map((m) => (m.id === mediaId ? { ...m, loading: false } : m)),
      );
      toast.error("Failed to connect to analysis service.");
    } finally {
      setIsMediaUploading(false);
    }
  };

  return (
    <>
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
      {/* HANDSHAKE OVERLAY (Hackathon-winning Cyber Security feature) */}
      {!isSecureHandshakeComplete && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "#080c14",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "24px",
          }}
        >
          {/* Animated Tech Ring */}
          <div
            style={{
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              border: "2px solid rgba(59, 130, 246, 0.1)",
              borderTop: "3px solid #3b82f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "spin 1s linear infinite",
              boxShadow: "0 0 20px rgba(59, 130, 246, 0.2)",
            }}
          >
            <Shield size={64} className="animate-pulse" color="#3b82f6" />
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: "monospace",
                color: "#60a5fa",
                fontSize: "12px",
                letterSpacing: "2px",
                marginBottom: "8px",
              }}
            >
              {
                [
                  "ESTABLISHING E2EE CHANNEL...",
                  "SCANNING FOR VPN LEAKS...",
                  "VERIFYING DEVICE INTEGRITY...",
                  "CYBER-SEC PROTOCOL ACTIVE",
                ][handshakeStep]
              }
            </div>
            <div
              style={{
                width: "200px",
                height: "2px",
                backgroundColor: "rgba(255,255,255,0.05)",
                borderRadius: "10px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${(handshakeStep + 1) * 25}%`,
                  backgroundColor: "#3b82f6",
                  transition: "width 0.5s ease",
                }}
              />
            </div>
          </div>
        </div>
      )}

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

      {/* Rotating AI Orb (Visible when speaking) */}
      <div
        className="ai-orb-container"
        style={{
          opacity: isSpeaking ? 1 : 0,
          visibility: isSpeaking ? "visible" : "hidden",
          transition: "opacity 0.8s ease-in-out, visibility 0.8s",
        }}
      >
        <div className="ai-orb-ring ai-orb-ring-1"></div>
        <div className="ai-orb-ring ai-orb-ring-2"></div>
        <div className="ai-orb-ring ai-orb-ring-3"></div>
        <div className="ai-orb-core"></div>
      </div>

      {/* ── Floating Back Button ── always visible top-left */}
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
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "linear-gradient(135deg, rgba(139,92,246,0.18), rgba(37,99,235,0.18))",
              border: "1px solid rgba(139,92,246,0.45)",
              color: "#c4b5fd",
              cursor: "pointer",
              padding: "7px 14px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: "700",
              letterSpacing: "0.5px",
              backdropFilter: "blur(8px)",
              boxShadow: "0 2px 12px rgba(139,92,246,0.2)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, rgba(139,92,246,0.35), rgba(37,99,235,0.3))";
              e.currentTarget.style.boxShadow = "0 4px 20px rgba(139,92,246,0.4)";
              e.currentTarget.style.transform = "translateX(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, rgba(139,92,246,0.18), rgba(37,99,235,0.18))";
              e.currentTarget.style.boxShadow = "0 2px 12px rgba(139,92,246,0.2)";
              e.currentTarget.style.transform = "translateX(0)";
            }}
          >
            <span style={{
              fontSize: "18px",
              fontWeight: "900",
              lineHeight: 1,
              color: "#a78bfa",
              marginRight: "2px",
              display: "inline-block",
            }}>&#8592;</span>
            Back
          </button>

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

                {/* --- Image Message Bubble (with loading overlay) --- */}
                {msg.type === "image" && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <div
                      style={{ position: "relative", display: "inline-block" }}
                    >
                      <img
                        src={msg.imageUrl}
                        alt={msg.fileName}
                        style={{
                          maxWidth: "240px",
                          maxHeight: "240px",
                          borderRadius: "16px 16px 4px 16px",
                          border: "2px solid rgba(79, 70, 229, 0.5)",
                          objectFit: "cover",
                          display: "block",
                          filter: msg.loading ? "brightness(0.4)" : "none",
                          transition: "filter 0.3s",
                        }}
                      />
                      {msg.loading && (
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                          }}
                        >
                          <Loader2
                            size={28}
                            color="#a78bfa"
                            style={{ animation: "spin 1s linear infinite" }}
                          />
                          <span
                            style={{
                              fontSize: "10px",
                              color: "#c4b5fd",
                              fontWeight: 600,
                              letterSpacing: "1px",
                            }}
                          >
                            ANALYZING...
                          </span>
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: "10px",
                        color: "rgba(255,255,255,0.3)",
                        textAlign: "right",
                      }}
                    >
                      {msg.fileName} · {msg.timestamp}
                    </div>
                  </div>
                )}

                {/* --- Analyzing Bubble --- REMOVED (result goes only to server console) */}
                {/* --- Analysis Result/Error Bubbles --- REMOVED (result goes only to server console) */}

                {/* --- Analysis Result Bubble --- */}
                {msg.type === "imageResult" && msg.analysisData && (
                  <div
                    style={{
                      padding: "14px 18px",
                      borderRadius: "20px 20px 20px 4px",
                      backgroundColor: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      fontSize: "0.85rem",
                      maxWidth: "340px",
                    }}
                  >
                    {/* Risk Badge */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "10px",
                      }}
                    >
                      <div
                        style={{
                          padding: "3px 10px",
                          borderRadius: "20px",
                          fontSize: "10px",
                          fontWeight: "700",
                          letterSpacing: "1px",
                          backgroundColor:
                            msg.analysisData.forensicAnalysis?.analysis
                              ?.riskLevel === "Critical"
                              ? "rgba(239,68,68,0.2)"
                              : msg.analysisData.forensicAnalysis?.analysis
                                    ?.riskLevel === "High"
                                ? "rgba(245,158,11,0.2)"
                                : msg.analysisData.forensicAnalysis?.analysis
                                      ?.riskLevel === "Medium"
                                  ? "rgba(234,179,8,0.15)"
                                  : "rgba(16,185,129,0.15)",
                          color:
                            msg.analysisData.forensicAnalysis?.analysis
                              ?.riskLevel === "Critical"
                              ? "#ef4444"
                              : msg.analysisData.forensicAnalysis?.analysis
                                    ?.riskLevel === "High"
                                ? "#f59e0b"
                                : msg.analysisData.forensicAnalysis?.analysis
                                      ?.riskLevel === "Medium"
                                  ? "#eab308"
                                  : "#10b981",
                          border: "1px solid currentColor",
                        }}
                      >
                        {msg.analysisData.isAiGenerated
                          ? "🤖 AI GENERATED"
                          : `⚠ ${msg.analysisData.forensicAnalysis?.analysis?.riskLevel?.toUpperCase() || "UNKNOWN"} RISK`}
                      </div>
                      <div
                        style={{
                          fontSize: "10px",
                          color: "rgba(255,255,255,0.3)",
                        }}
                      >
                        Forensic Analysis
                      </div>
                    </div>

                    {/* Overview */}
                    {msg.analysisData.forensicAnalysis?.overview && (
                      <p
                        style={{
                          color: "rgba(255,255,255,0.8)",
                          lineHeight: "1.5",
                          margin: "0 0 8px",
                        }}
                      >
                        {msg.analysisData.forensicAnalysis.overview}
                      </p>
                    )}

                    {/* AI Detection reason */}
                    {msg.analysisData.isAiGenerated && (
                      <p
                        style={{
                          color: "#f87171",
                          fontSize: "0.8rem",
                          margin: 0,
                        }}
                      >
                        {msg.analysisData.reason}
                      </p>
                    )}

                    {/* Risk reason */}
                    {!msg.analysisData.isAiGenerated &&
                      msg.analysisData.forensicAnalysis?.analysis
                        ?.riskReason && (
                        <p
                          style={{
                            color: "rgba(255,255,255,0.45)",
                            fontSize: "0.78rem",
                            margin: "4px 0 0",
                            borderTop: "1px solid rgba(255,255,255,0.07)",
                            paddingTop: "8px",
                          }}
                        >
                          {
                            msg.analysisData.forensicAnalysis.analysis
                              .riskReason
                          }
                        </p>
                      )}

                    <div
                      style={{
                        fontSize: "10px",
                        color: "rgba(255,255,255,0.2)",
                        marginTop: "8px",
                      }}
                    >
                      {msg.timestamp} · {msg.analysisData.processingTimeMs}ms
                    </div>
                  </div>
                )}

                {/* --- Analysis Error Bubble --- */}
                {msg.type === "imageError" && (
                  <div
                    style={{
                      padding: "12px 18px",
                      borderRadius: "20px 20px 20px 4px",
                      backgroundColor: "rgba(239, 68, 68, 0.08)",
                      border: "1px solid rgba(239, 68, 68, 0.25)",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      fontSize: "0.85rem",
                      color: "#fca5a5",
                      maxWidth: "300px",
                    }}
                  >
                    <AlertTriangle
                      size={16}
                      color="#ef4444"
                      style={{ flexShrink: 0 }}
                    />
                    <span>
                      Analysis failed: {msg.errorMsg || "Unknown error"}
                    </span>
                  </div>
                )}

                {/* --- Normal Text Bubble --- */}
                {!msg.type && (
                  <div style={{ position: "relative" }}>
                    {/* Edit button — only for user messages */}
                    {msg.role === "user" && editingMessageId !== msg.id && (
                      <button
                        onClick={() => { setEditingMessageId(msg.id); setEditedText(msg.text); }}
                        title="Edit message"
                        style={{
                          position: "absolute", top: "-8px", right: "-8px",
                          background: "rgba(139,92,246,0.25)",
                          border: "1px solid rgba(139,92,246,0.5)",
                          borderRadius: "8px", color: "#c4b5fd",
                          cursor: "pointer", padding: "3px 7px",
                          fontSize: "10px", fontWeight: "700",
                          zIndex: 5,
                        }}
                      >
                        ✏ Edit
                      </button>
                    )}

                    {/* Editing mode */}
                    {editingMessageId === msg.id ? (
                      <div style={{
                        padding: "10px 14px",
                        borderRadius: "20px 20px 4px 20px",
                        backgroundColor: "rgba(79,70,229,0.2)",
                        border: "1px solid rgba(139,92,246,0.6)",
                        minWidth: "200px",
                      }}>
                        <textarea
                          value={editedText}
                          onChange={(e) => setEditedText(e.target.value)}
                          rows={3}
                          style={{
                            width: "100%", background: "transparent",
                            border: "none", outline: "none", color: "white",
                            fontSize: "0.9rem", lineHeight: "1.5", resize: "none",
                          }}
                        />
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "6px" }}>
                          <button
                            onClick={() => setEditingMessageId(null)}
                            style={{
                              background: "rgba(255,255,255,0.1)", border: "none",
                              color: "rgba(255,255,255,0.6)", cursor: "pointer",
                              padding: "4px 12px", borderRadius: "8px", fontSize: "11px",
                            }}
                          >Cancel</button>
                          <button
                            onClick={() => handleSaveEdit(msg.id)}
                            style={{
                              background: "#4f46e5", border: "none",
                              color: "white", cursor: "pointer",
                              padding: "4px 12px", borderRadius: "8px",
                              fontSize: "11px", fontWeight: "700",
                            }}
                          >Save</button>
                        </div>
                      </div>
                    ) : (
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
                    )}
                  </div>
                )}
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
        {/* Hidden inputs — gallery (image+video), camera photo, camera video */}
        <input
          ref={imageFileRef}
          type="file"
          accept="image/*,video/*"
          style={{ display: "none" }}
          onChange={handleMediaUpload}
        />
        <input
          ref={cameraPhotoRef}
          type="file"
          accept="image/*,video/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={handleMediaUpload}
        />

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

        {/* Single Evidence Button + popup menu */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowMediaMenu((v) => !v)}
            disabled={isMediaUploading}
            title="Add evidence"
            style={{
              background: isMediaUploading ? "rgba(255,255,255,0.05)" : "rgba(139,92,246,0.15)",
              border: "1px solid rgba(139,92,246,0.4)",
              color: isMediaUploading ? "rgba(255,255,255,0.3)" : "#a78bfa",
              cursor: isMediaUploading ? "not-allowed" : "pointer",
              padding: "8px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
            }}
          >
            {isMediaUploading
              ? <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
              : <ImageIcon size={20} />}
          </button>

          {showMediaMenu && !isMediaUploading && (
            <>
              {/* Backdrop — clicking outside closes menu */}
              <div
                onClick={() => setShowMediaMenu(false)}
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 40,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 10px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "rgba(20,10,40,0.97)",
                  border: "1px solid rgba(139,92,246,0.4)",
                  borderRadius: "14px",
                  padding: "8px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  minWidth: "170px",
                  zIndex: 50,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                }}
              >
                {/* Camera — opens live camera modal */}
                <button
                  onClick={openCameraModal}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    background: "none", border: "none", color: "#e2d9f3",
                    cursor: "pointer", padding: "10px 14px", borderRadius: "10px",
                    fontSize: "13px", fontWeight: "500", textAlign: "left",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(139,92,246,0.2)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                >
                  <Camera size={17} color="#a78bfa" />
                  Camera
                </button>

                {/* Divider */}
                <div style={{ height: "1px", background: "rgba(139,92,246,0.2)", margin: "2px 8px" }} />

                {/* Choose from device */}
                <button
                  onClick={() => { setShowMediaMenu(false); imageFileRef.current?.click(); }}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    background: "none", border: "none", color: "#e2d9f3",
                    cursor: "pointer", padding: "10px 14px", borderRadius: "10px",
                    fontSize: "13px", fontWeight: "500", textAlign: "left",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(139,92,246,0.2)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                >
                  <FolderOpen size={17} color="#a78bfa" />
                  From Device
                </button>
              </div>
            </>
          )}
        </div>

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
          disabled={isInitializing || isSpeaking || isMediaUploading}
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            border: "none",
            cursor: isInitializing || isSpeaking || isMediaUploading ? "not-allowed" : "pointer",
            backgroundColor: isMediaUploading
              ? "#4b5563"
              : isInitializing
                ? "#4b5563"
                : isSpeaking
                  ? "#94a3b8"
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
                : isSpeaking
                  ? "rgba(148, 163, 184, 0.3)"
                  : isListening
                    ? "rgba(239, 68, 68, 0.5)"
                    : "rgba(37, 99, 235, 0.5)"),
            transition: "all 0.3s",
            opacity: isInitializing || isSpeaking ? 0.7 : 1,
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
          ) : isSpeaking ? (
            <Volume2 size={32} />
          ) : isListening ? (
            <MicOff size={32} />
          ) : (
            <Mic size={32} />
          )}
        </button>

        {/* Text Input Section - Conditionally Rendered */}
        {isTextChatEnabled && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "rgba(255,255,255,0.05)",
              borderRadius: "24px",
              padding: "4px 8px 4px 16px",
              border: "1px solid rgba(255,255,255,0.15)",
              minWidth: "280px",
            }}
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && textInput.trim() && !isLoading) {
                  sendMessage(textInput);
                  setTextInput("");
                }
              }}
              placeholder="Type a message..."
              disabled={isLoading}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "white",
                fontSize: "14px",
                padding: "8px 0",
              }}
            />
            <button
              onClick={() => {
                if (textInput.trim() && !isLoading) {
                  sendMessage(textInput);
                  setTextInput("");
                }
              }}
              disabled={!textInput.trim() || isLoading}
              style={{
                background: textInput.trim() && !isLoading ? "#2563eb" : "rgba(255,255,255,0.1)",
                border: "none",
                color: "white",
                cursor: textInput.trim() && !isLoading ? "pointer" : "not-allowed",
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
                opacity: textInput.trim() && !isLoading ? 1 : 0.5,
              }}
            >
              <Send size={18} />
            </button>
          </div>
        )}

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
              EN (English)
            </option>
            <option value="hi" style={{ backgroundColor: "#1e293b" }}>
              HI (Hindi)
            </option>
            <option value="te" style={{ backgroundColor: "#1e293b" }}>
              TE (Telugu)
            </option>
            <option value="ta" style={{ backgroundColor: "#1e293b" }}>
              TA (Tamil)
            </option>
            <option value="kn" style={{ backgroundColor: "#1e293b" }}>
              KN (Kannada)
            </option>
            <option value="mr" style={{ backgroundColor: "#1e293b" }}>
              MR (Marathi)
            </option>
            <option value="bn" style={{ backgroundColor: "#1e293b" }}>
              BN (Bengali)
            </option>
            <option value="gu" style={{ backgroundColor: "#1e293b" }}>
              GU (Gujarati)
            </option>
            <option value="ml" style={{ backgroundColor: "#1e293b" }}>
              ML (Malayalam)
            </option>
            <option value="pa" style={{ backgroundColor: "#1e293b" }}>
              PA (Punjabi)
            </option>
          </select>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "10px",
              color: "#60a5fa",
              opacity: 0.8,
              borderLeft: "1px solid rgba(255,255,255,0.1)",
              paddingLeft: "12px",
            }}
          >
            <Shield size={12} />
            <b>ENCRYPTED & HASHED</b>
          </div>
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

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px",
                backgroundColor: "rgba(255,255,255,0.05)",
                borderRadius: "16px",
                marginTop: "12px",
              }}
            >
              <div>
                <div style={{ fontWeight: "600" }}>Auto-Handsfree Mode</div>
                <div
                  style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}
                >
                  Mic turns on after REVA finishes
                </div>
              </div>
              <button
                onClick={() => setAutoResumeMic(!autoResumeMic)}
                style={{
                  width: "48px",
                  height: "24px",
                  borderRadius: "20px",
                  border: "none",
                  position: "relative",
                  cursor: "pointer",
                  backgroundColor: autoResumeMic
                    ? "#10b981"
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
                    left: autoResumeMic ? "27px" : "3px",
                    transition: "0.3s",
                  }}
                />
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
                marginTop: "12px",
              }}
            >
              <div>
                <div style={{ fontWeight: "600" }}>Enable Text Chatbot</div>
                <div
                  style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}
                >
                  Show text input for typing messages
                </div>
              </div>
              <button
                onClick={() => setIsTextChatEnabled(!isTextChatEnabled)}
                style={{
                  width: "48px",
                  height: "24px",
                  borderRadius: "20px",
                  border: "none",
                  position: "relative",
                  cursor: "pointer",
                  backgroundColor: isTextChatEnabled
                    ? "#8b5cf6"
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
                    left: isTextChatEnabled ? "27px" : "3px",
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

      {/* ── In-browser Camera Modal ─────────────────────────────────────── */}
      {showCameraModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "#000",
          display: "flex", flexDirection: "column",
        }}>
          {/* Live camera feed */}
          <video
            ref={cameraVideoElRef}
            autoPlay
            muted
            playsInline
            style={{ flex: 1, width: "100%", objectFit: "cover" }}
          />

          {/* Top bar — mode tabs + close */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0,
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "16px 20px",
            background: "linear-gradient(to bottom, rgba(0,0,0,0.65), transparent)",
          }}>
            <div style={{ display: "flex", gap: "8px" }}>
              {["photo", "video"].map((mode) => (
                <button
                  key={mode}
                  onClick={() => !isRecording && setCameraMode(mode)}
                  style={{
                    background: cameraMode === mode ? "rgba(139,92,246,0.85)" : "rgba(255,255,255,0.18)",
                    border: "none", color: "white",
                    cursor: isRecording ? "not-allowed" : "pointer",
                    padding: "6px 16px", borderRadius: "20px",
                    fontSize: "12px", fontWeight: "600", textTransform: "capitalize",
                    transition: "background 0.2s",
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
            <button
              onClick={closeCameraModal}
              style={{
                background: "rgba(255,255,255,0.18)", border: "none", color: "white",
                cursor: "pointer", width: "36px", height: "36px", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Recording indicator */}
          {isRecording && (
            <div style={{
              position: "absolute", top: "68px", left: "50%", transform: "translateX(-50%)",
              display: "flex", alignItems: "center", gap: "8px",
              background: "rgba(239,68,68,0.85)", borderRadius: "20px",
              padding: "5px 14px",
            }}>
              <div style={{
                width: "8px", height: "8px", borderRadius: "50%", background: "white",
                animation: "pulse 1s infinite",
              }} />
              <span style={{ color: "white", fontSize: "12px", fontWeight: "700" }}>REC</span>
            </div>
          )}

          {/* Bottom controls */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            display: "flex", justifyContent: "center", alignItems: "center",
            padding: "32px 20px 52px",
            background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
          }}>
            {cameraMode === "photo" ? (
              /* Shutter button */
              <button
                onClick={capturePhoto}
                style={{
                  width: "72px", height: "72px", borderRadius: "50%",
                  background: "white", border: "5px solid rgba(255,255,255,0.4)",
                  cursor: "pointer", boxShadow: "0 0 24px rgba(255,255,255,0.35)",
                }}
              />
            ) : (
              /* Record / Stop button */
              <button
                onClick={isRecording ? stopRecording : startRecording}
                style={{
                  width: "72px", height: "72px", borderRadius: "50%",
                  background: isRecording ? "#ef4444" : "white",
                  border: `5px solid ${isRecording ? "rgba(239,68,68,0.45)" : "rgba(255,255,255,0.4)"}`,
                  cursor: "pointer",
                  boxShadow: isRecording
                    ? "0 0 28px rgba(239,68,68,0.7)"
                    : "0 0 24px rgba(255,255,255,0.35)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s",
                }}
              >
                {isRecording
                  ? <div style={{ width: "22px", height: "22px", borderRadius: "4px", background: "white" }} />
                  : <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#ef4444" }} />}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

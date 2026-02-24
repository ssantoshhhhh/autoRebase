import { useState, useEffect, useCallback, useRef } from 'react';
import * as speechsdk from 'microsoft-cognitiveservices-speech-sdk';

export const useSpeechRecognition = (language = 'en-US', autoStop = false) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognizerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (recognizerRef.current) {
        recognizerRef.current.close();
        recognizerRef.current = null;
      }
    };
  }, []);

  const stopListening = useCallback(() => {
    if (recognizerRef.current) {
      recognizerRef.current.stopContinuousRecognitionAsync(() => {
        recognizerRef.current?.close();
        recognizerRef.current = null;
        setIsListening(false);
      }, (err) => {
        console.error(err);
        setIsListening(false);
      });
    } else {
      setIsListening(false);
    }
  }, []);

  const startListening = useCallback(() => {
    if (isListening) return;

    try {
      const speechConfig = speechsdk.SpeechConfig.fromSubscription(
        import.meta.env.VITE_AZURE_SPEECH_KEY,
        import.meta.env.VITE_AZURE_SPEECH_REGION
      );
      speechConfig.speechRecognitionLanguage = language;

      const audioConfig = speechsdk.AudioConfig.fromDefaultMicrophoneInput();
      const recognizer = new speechsdk.SpeechRecognizer(speechConfig, audioConfig);

      recognizer.recognizing = (s, e) => {
        setInterimTranscript(e.result.text);
      };

      recognizer.recognized = (s, e) => {
        if (e.result.reason === speechsdk.ResultReason.RecognizedSpeech) {
          setTranscript(prev => {
            const newTranscript = prev ? `${prev} ${e.result.text}` : e.result.text;
            return newTranscript;
          });
          setInterimTranscript('');
          
          if (autoStop) {
            console.log("Auto-stopping...");
            recognizer.stopContinuousRecognitionAsync(() => {
              recognizer.close();
              recognizerRef.current = null;
              setIsListening(false);
            });
          }
        }
      };

      recognizer.canceled = (s, e) => {
        console.error(`CANCELED: Reason=${e.reason}`);
        stopListening();
      };

      recognizer.sessionStopped = (s, e) => {
        console.log("Session stopped.");
        stopListening();
      };

      recognizer.startContinuousRecognitionAsync(() => {
        setIsListening(true);
        recognizerRef.current = recognizer;
      }, (err) => {
        console.error("Start Error: " + err);
        setIsListening(false);
      });

    } catch (error) {
      console.error("Error starting recognition:", error);
      setIsListening(false);
    }
  }, [isListening, language, autoStop, stopListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    hasRecognitionSupport: true,
  };
};

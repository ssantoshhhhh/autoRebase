import { useState, useEffect, useCallback, useRef } from 'react';
import * as speechsdk from 'microsoft-cognitiveservices-speech-sdk';

export const useSpeechSynthesis = () => {
  const [voices, setVoices] = useState([]);
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);
  const synthesizerRef = useRef(null);

  useEffect(() => {
    const loadVoices = async () => {
      try {
        const speechConfig = speechsdk.SpeechConfig.fromSubscription(
          import.meta.env.VITE_AZURE_SPEECH_KEY,
          import.meta.env.VITE_AZURE_SPEECH_REGION
        );
        const synthesizer = new speechsdk.SpeechSynthesizer(speechConfig);
        const result = await synthesizer.getVoicesAsync();

        if (result.voices) {
          const mappedVoices = result.voices.map((v) => ({
            default: false,
            lang: v.locale,
            localService: false,
            name: v.shortName,
            voiceURI: v.name,
          }));
          setVoices(mappedVoices);
        }
        synthesizer.close();
      } catch (e) {
        console.error('Failed to load voices', e);
      }
    };
    loadVoices();

    return () => {
      if (synthesizerRef.current) {
        synthesizerRef.current.close();
        synthesizerRef.current = null;
      }
    };
  }, []);

  const cancel = useCallback(() => {
    if (synthesizerRef.current) {
      try {
        synthesizerRef.current.close();
        synthesizerRef.current = null;
      } catch (e) {
        console.error('Error closing synthesizer', e);
      }
    }
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text, voice) => {
      cancel();

      try {
        const speechConfig = speechsdk.SpeechConfig.fromSubscription(
          import.meta.env.VITE_AZURE_SPEECH_KEY,
          import.meta.env.VITE_AZURE_SPEECH_REGION
        );

        if (voice) {
          speechConfig.speechSynthesisVoiceName = voice.name;
        } else {
          // Default to a common voice if none provided
          speechConfig.speechSynthesisVoiceName = 'en-IN-NeerjaNeural';
        }

        const audioConfig = speechsdk.AudioConfig.fromDefaultSpeakerOutput();
        const synthesizer = new speechsdk.SpeechSynthesizer(speechConfig, audioConfig);
        synthesizerRef.current = synthesizer;

        setSpeaking(true);

        synthesizer.speakTextAsync(
          text,
          (result) => {
            if (result.reason === speechsdk.ResultReason.SynthesizingAudioCompleted) {
              console.log('synthesis finished.');
            } else {
              console.error('Speech synthesis canceled, ' + result.errorDetails);
            }
            setSpeaking(false);
            synthesizer.close();
            synthesizerRef.current = null;
          },
          (err) => {
            console.error('Synthesis Error: ' + err);
            setSpeaking(false);
            synthesizer.close();
            synthesizerRef.current = null;
          }
        );
      } catch (e) {
        console.error('Error starting synthesis', e);
        setSpeaking(false);
      }
    },
    [cancel]
  );

  return {
    speak,
    cancel,
    speaking,
    supported,
    voices,
  };
};

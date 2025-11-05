import { useState, useEffect, useRef, useCallback } from 'react';

// FIX: Add type definitions for the Web Speech API and extend the Window interface.
// This is necessary because these APIs are not part of the standard TypeScript DOM library.
// This resolves TypeScript errors about missing properties on `window` and name conflicts.
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionEvent extends Event {
  results: {
    [key: number]: {
      [key: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: () => void;
  onend: () => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onresult: (event: SpeechRecognitionEvent) => void;
}

interface SpeechRecognitionStatic {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionStatic;
    webkitSpeechRecognition: SpeechRecognitionStatic;
  }
}

interface SpeechRecognitionHook {
  onStart?: () => void;
  onEnd?: () => void;
  onResult: (result: string) => void;
  onError?: (error: string) => void;
}

// FIX: Renamed variable to avoid shadowing the `SpeechRecognition` type interface.
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

export const useSpeechRecognition = ({ onStart, onEnd, onResult, onError }: SpeechRecognitionHook) => {
  const [isListening, setIsListening] = useState(false);
  // FIX: The type `SpeechRecognition` now correctly refers to the interface defined above.
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // FIX: Check for the renamed API constructor variable.
    if (!SpeechRecognitionAPI) {
      onError?.("Speech recognition is not supported in this browser.");
      return;
    }

    // FIX: Use the renamed API constructor variable.
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      onStart?.();
    };

    recognition.onend = () => {
      setIsListening(false);
      onEnd?.();
    };

    recognition.onerror = (event) => {
      onError?.(event.error);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };
    
    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [onStart, onEnd, onResult, onError]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // May fail if already started
        console.error("Could not start listening", e)
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  return { isListening, startListening, stopListening };
};

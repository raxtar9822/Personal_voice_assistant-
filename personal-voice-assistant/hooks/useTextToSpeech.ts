
import { useState, useEffect, useCallback } from 'react';

interface TextToSpeechHook {
  onStart?: () => void;
  onEnd?: () => void;
}

export const useTextToSpeech = ({ onStart, onEnd }: TextToSpeechHook) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  const loadVoices = useCallback(() => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      setAvailableVoices(voices);
      // Prefer a "Google" or "Microsoft" voice if available
      const preferredVoice = 
        voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
        voices.find(v => v.name.includes('David') && v.lang.startsWith('en')) ||
        voices.find(v => v.lang.startsWith('en-US')) ||
        voices[0];
      setSelectedVoice(preferredVoice || voices[0]);
    }
  }, []);

  useEffect(() => {
    loadVoices();
    // Some browsers load voices asynchronously.
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
    };
  }, [loadVoices]);

  const speak = useCallback((text: string, voice: SpeechSynthesisVoice | null) => {
    if (!text || !window.speechSynthesis) return;

    window.speechSynthesis.cancel(); // Cancel any ongoing speech
    
    const utterance = new SpeechSynthesisUtterance(text);
    if (voice) {
        utterance.voice = voice;
    }
    
    utterance.onstart = () => {
      setIsSpeaking(true);
      onStart?.();
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      onEnd?.();
    };
    
    utterance.onerror = (event) => {
      console.error('SpeechSynthesisUtterance.onerror', event);
      setIsSpeaking(false);
      onEnd?.(); // Ensure state is reset on error
    };

    window.speechSynthesis.speak(utterance);
  }, [onStart, onEnd]);

  return { isSpeaking, speak, availableVoices, selectedVoice, setSelectedVoice };
};

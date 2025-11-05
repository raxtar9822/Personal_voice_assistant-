import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useTextToSpeech } from './hooks/useTextToSpeech';
import { getAssistantResponse } from './services/geminiService';
import { AssistantStatus, TranscriptItem } from './types';
import VoiceVisualizer from './components/VoiceVisualizer';
import { SettingsIcon, MicIcon, MicOffIcon } from './components/Icons';

const App: React.FC = () => {
  const [assistantStatus, setAssistantStatus] = useState<AssistantStatus>(AssistantStatus.IDLE);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAssistantActive, setIsAssistantActive] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const { availableVoices, speak, isSpeaking, selectedVoice, setSelectedVoice } = useTextToSpeech({
    onStart: () => setAssistantStatus(AssistantStatus.SPEAKING),
    onEnd: () => {
      if (isAssistantActive) {
        startListening();
      } else {
        setAssistantStatus(AssistantStatus.IDLE);
      }
    },
  });

  const processUserCommand = useCallback(async (text: string) => {
    setTranscript(prev => [...prev, { speaker: 'user', text }]);
    setAssistantStatus(AssistantStatus.THINKING);
    setError(null);

    // Client-side command handling
    const lowerCaseText = text.toLowerCase();
    if (lowerCaseText.includes("what time is it")) {
        const time = new Date().toLocaleTimeString();
        const responseText = `The current time is ${time}.`;
        setTranscript(prev => [...prev, { speaker: 'assistant', text: responseText }]);
        speak(responseText, selectedVoice);
        return;
    }
    if (lowerCaseText.includes("what's the date")) {
        const date = new Date().toLocaleDateString();
        const responseText = `Today's date is ${date}.`;
        setTranscript(prev => [...prev, { speaker: 'assistant', text: responseText }]);
        speak(responseText, selectedVoice);
        return;
    }

    // AI command handling
    try {
      const response = await getAssistantResponse(text);
      
      if (response.functionCall) {
        let responseText = '';
        switch(response.functionCall.name) {
          case 'get_weather':
            const location = response.functionCall.args.location;
            // In a real app, you would call a weather API here.
            // For this demo, we'll just mock the response.
            responseText = `The weather in ${location} is currently sunny with a high of 75 degrees.`;
            break;
          case 'send_email':
            const { recipient, subject, body } = response.functionCall.args;
            const mailtoLink = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            window.location.href = mailtoLink;
            responseText = `I'm opening your email client to send a message to ${recipient}.`;
            break;
          case 'create_calendar_event':
            const { title, start_time, end_time, description } = response.functionCall.args;
            const startTime = new Date(start_time).toLocaleString();
            const endTime = new Date(end_time).toLocaleString();
            responseText = `I've scheduled "${title}" for you from ${startTime} to ${endTime}.`;
            if (description) {
              responseText += ` I've added the note: "${description}".`;
            }
            break;
          default:
            responseText = "I'm sorry, I don't know how to do that.";
        }
        setTranscript(prev => [...prev, { speaker: 'assistant', text: responseText }]);
        speak(responseText, selectedVoice);
      } else if (response.text) {
        setTranscript(prev => [...prev, { speaker: 'assistant', text: response.text, sources: response.sources }]);
        speak(response.text, selectedVoice);
      } else {
         throw new Error("No response from assistant");
      }
    } catch (err) {
      console.error(err);
      const errorMessage = "I'm sorry, I encountered an error. Please try again.";
      setError(errorMessage);
      setTranscript(prev => [...prev, { speaker: 'assistant', text: errorMessage }]);
      speak(errorMessage, selectedVoice);
      setIsAssistantActive(false);
    }
  }, [speak, selectedVoice]);

  const { startListening, stopListening, isListening } = useSpeechRecognition({
    onStart: () => setAssistantStatus(AssistantStatus.LISTENING),
    onResult: processUserCommand,
    onEnd: () => {},
    onError: (err) => {
        setError(`Speech recognition error: ${err}`);
        setAssistantStatus(AssistantStatus.IDLE);
        setIsAssistantActive(false);
    }
  });

  const toggleAssistant = () => {
    setError(null);
    if (isAssistantActive || isListening) {
      stopListening();
      setIsAssistantActive(false);
      setAssistantStatus(AssistantStatus.IDLE);
    } else {
      setIsAssistantActive(true);
      startListening();
    }
  };

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  return (
    <div className="bg-[#0A0A1A] text-gray-200 min-h-screen flex flex-col font-sans">
      <header className="w-full p-4 flex justify-between items-center text-gray-400">
        <h1 className="text-xl font-bold tracking-wider">Personal Assistant</h1>
        <button onClick={() => setShowSettings(!showSettings)} className="hover:text-cyan-400 transition-colors">
          <SettingsIcon />
        </button>
      </header>

      {showSettings && (
         <div className="absolute top-16 right-4 bg-[#121224] p-4 rounded-lg shadow-2xl z-10 border border-cyan-700/50">
           <h3 className="text-lg font-semibold mb-2 text-cyan-400">Voice Settings</h3>
           <select 
             value={selectedVoice?.name}
             onChange={(e) => {
               const voice = availableVoices.find(v => v.name === e.target.value);
               if(voice) setSelectedVoice(voice);
             }}
             className="bg-[#0A0A1A] border border-cyan-600 rounded p-2 w-full"
           >
             {availableVoices.map(voice => (
               <option key={voice.name} value={voice.name}>
                 {voice.name} ({voice.lang})
               </option>
             ))}
           </select>
         </div>
      )}

      <main className="flex-grow flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-4xl h-[50vh] bg-[#0A0A1A]/50 border border-cyan-700/30 rounded-lg overflow-y-auto p-4 mb-8 shadow-inner" style={{backdropFilter: 'blur(5px)'}}>
          {transcript.length === 0 && <p className="text-gray-500 text-center mt-4">Assistant is idle. Press the button to start.</p>}
          {transcript.map((item, index) => (
            <div key={index} className={`mb-4 ${item.speaker === 'user' ? 'text-right' : 'text-left'}`}>
              <div className={`inline-block p-3 rounded-lg max-w-[80%] ${item.speaker === 'user' ? 'bg-cyan-900/50 text-cyan-200' : 'bg-gray-800/50 text-gray-300'}`}>
                <p className="whitespace-pre-wrap">{item.text}</p>
                {item.sources && item.sources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-cyan-700/50">
                    <p className="text-xs text-cyan-400 mb-1">Sources:</p>
                    <ul className="text-left text-xs list-disc pl-4">
                      {item.sources.map((source, i) => (
                        <li key={i}>
                          <a href={source.uri} target="_blank" rel="noopener noreferrer" className="hover:underline text-cyan-300">
                            {source.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={transcriptEndRef} />
        </div>

        <VoiceVisualizer status={assistantStatus} />

        {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
      </main>

      <footer className="w-full p-6 flex justify-center items-center">
        <button
          onClick={toggleAssistant}
          className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
            isAssistantActive ? 'bg-cyan-500 shadow-cyan-500/50' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {isAssistantActive ? <MicIcon /> : <MicOffIcon />}
           <div className={`absolute inset-0 rounded-full border-2 ${
               isAssistantActive ? 'border-cyan-400 animate-pulse' : 'border-gray-500'
           }`}></div>
        </button>
      </footer>
    </div>
  );
};

export default App;
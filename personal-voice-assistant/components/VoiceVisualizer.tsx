
import React from 'react';
import { AssistantStatus } from '../types';

interface VoiceVisualizerProps {
  status: AssistantStatus;
}

const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({ status }) => {
  const getStatusText = () => {
    switch (status) {
      case AssistantStatus.LISTENING:
        return 'Listening...';
      case AssistantStatus.THINKING:
        return 'Thinking...';
      case AssistantStatus.SPEAKING:
        return 'Speaking...';
      default:
        return 'Idle';
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center h-48 w-48 relative mb-4">
      <svg viewBox="0 0 200 200" className="w-full h-full absolute">
        {/* Base circle */}
        <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(0, 255, 255, 0.1)" strokeWidth="2" />

        {/* Listening Pulse */}
        {status === AssistantStatus.LISTENING && (
          <circle 
            cx="100" cy="100" r="80" 
            fill="none" 
            stroke="rgba(0, 255, 255, 0.7)" 
            strokeWidth="3"
            className="animate-pulse"
          />
        )}
        
        {/* Thinking Spinner */}
        {status === AssistantStatus.THINKING && (
          <circle 
            cx="100" cy="100" r="80" 
            fill="none" 
            stroke="rgba(0, 255, 255, 1)" 
            strokeWidth="4" 
            strokeDasharray="251.2"
            strokeDashoffset="188.4" /* 3/4 circle */
            className="animate-spin"
            style={{ transformOrigin: '50% 50%' }}
          />
        )}

        {/* Speaking Wave */}
        {status === AssistantStatus.SPEAKING && (
            <>
              <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(0, 255, 255, 0.5)" strokeWidth="2" style={{ animation: 'wave 2s ease-in-out infinite' }}/>
              <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(0, 255, 255, 0.3)" strokeWidth="1" style={{ animation: 'wave 2s ease-in-out infinite 0.5s' }}/>
            </>
        )}
        
        {/* Central Core */}
        <circle cx="100" cy="100" r="60" fill="rgba(0, 255, 255, 0.1)" />
        <circle cx="100" cy="100" r="30" fill="rgba(0, 255, 255, 0.2)" />
      </svg>
      <p className="z-10 text-cyan-300 font-mono tracking-widest">{getStatusText()}</p>
      <style>{`
        @keyframes wave {
          0%, 100% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default VoiceVisualizer;

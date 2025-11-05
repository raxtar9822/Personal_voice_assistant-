
export enum AssistantStatus {
  IDLE = 'idle',
  LISTENING = 'listening',
  THINKING = 'thinking',
  SPEAKING = 'speaking',
}

export interface Source {
  uri: string;
  title: string;
}

export interface TranscriptItem {
  speaker: 'user' | 'assistant';
  text: string;
  sources?: Source[];
}

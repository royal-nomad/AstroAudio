export enum AppMode {
  DASHBOARD = 'DASHBOARD',
  MIDI = 'MIDI',
  LIVE_JAM = 'LIVE_JAM',
  SEARCH = 'SEARCH',
  STUDIO = 'STUDIO'
}

export interface MidiMessage {
  command: number;
  note: number;
  velocity: number;
  channel: number;
  timestamp: number;
  type: 'noteon' | 'noteoff' | 'cc' | 'other';
}

export interface Scale {
  name: string;
  notes?: string[];
  intervals: number[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  sources?: string[];
}

export enum ConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}
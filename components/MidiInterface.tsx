import React, { useEffect, useState, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { MidiMessage, Scale } from '../types';
import { NOTES, SCALES } from '../constants';
import { SyncService } from '../services/syncService';
import Knob from './Knob';

interface ChordStep {
  id: string;
  degree: number; // 0-6 (I-VII)
  duration: number; // beats
  active: boolean;
}

const GENRES = ['Lo-Fi', 'Neo-Soul', 'Cinematic', 'Deep House', 'Jazz', 'Pop'];
const PATTERNS = ['BLOCK', 'PULSE', 'ARP_UP', 'ARP_DOWN', 'RANDOM'];

const MidiInterface: React.FC = () => {
  const [midiAccess, setMidiAccess] = useState<any>(null);
  const [inputs, setInputs] = useState<any[]>([]);
  const [outputs, setOutputs] = useState<any[]>([]);
  const [lastMessage, setLastMessage] = useState<MidiMessage | null>(null);
  const [logs, setLogs] = useState<MidiMessage[]>([]);
  const [selectedScale, setSelectedScale] = useState<Scale>(SCALES[0]);
  const [rootNote, setRootNote] = useState<string>('C');
  const [chordMode, setChordMode] = useState(false);

  // Sync State
  const [syncService] = useState(() => new SyncService());
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [syncConnected, setSyncConnected] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);

  // Sequencer State
  const [sequencerEnabled, setSequencerEnabled] = useState(false);
  const [progression, setProgression] = useState<ChordStep[]>([
    { id: '1', degree: 0, duration: 4, active: true }, // I
    { id: '2', degree: 4, duration: 4, active: true }, // V
    { id: '3', degree: 5, duration: 4, active: true }, // vi
    { id: '4', degree: 3, duration: 4, active: true }, // IV
  ]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  
  // Generator & Advanced State
  const [genre, setGenre] = useState(GENRES[0]);
  const [playPattern, setPlayPattern] = useState<string>('BLOCK');
  const [isGenerating, setIsGenerating] = useState(false);

  // Refs for audio thread access
  const progressionRef = useRef(progression);
  const sequencerEnabledRef = useRef(sequencerEnabled);
  const playPatternRef = useRef(playPattern);
  const activeNotesRef = useRef<number[]>([]);
  const loopTickRef = useRef(0);
  const midiAccessRef = useRef<any>(null);
  const rootNoteRef = useRef(rootNote);
  const scaleRef = useRef(selectedScale);

  // Keep refs synced with state
  useEffect(() => { progressionRef.current = progression; }, [progression]);
  useEffect(() => { sequencerEnabledRef.current = sequencerEnabled; }, [sequencerEnabled]);
  useEffect(() => { playPatternRef.current = playPattern; }, [playPattern]);
  useEffect(() => { midiAccessRef.current = midiAccess; }, [midiAccess]);
  useEffect(() => { rootNoteRef.current = rootNote; }, [rootNote]);
  useEffect(() => { scaleRef.current = selectedScale; }, [selectedScale]);

  useEffect(() => {
    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
    }

    // Setup Sync Service
    syncService.onTick = (pulse) => {
        // Update Visuals on Beat (every 24 pulses)
        if (pulse % 24 === 0) {
            setCurrentBeat((prev) => (prev % 4) + 1);
        }
        
        // Handle Sequencer Logic
        handleSequencerTick(pulse);

        // Send MIDI Clock (0xF8)
        sendMidiClock();
    };

    syncService.onStart = () => {
        setIsPlaying(true);
        loopTickRef.current = 0;
        sendMidiStart();
    };

    syncService.onStop = () => {
        setIsPlaying(false);
        sendMidiStop();
        setCurrentBeat(0);
        setCurrentStepIndex(-1);
        stopActiveNotes(); // Kill any hanging notes
        loopTickRef.current = 0;
    };

    return () => {
        syncService.stop();
        stopActiveNotes();
    };
  }, []);

  const handleSequencerTick = (globalPulse: number) => {
      if (!sequencerEnabledRef.current) return;

      const steps = progressionRef.current;
      const pattern = playPatternRef.current;
      if (steps.length === 0) return;

      // Calculate total loop length in ticks (24 ticks per beat)
      const totalTicks = steps.reduce((acc, step) => acc + (step.duration * 24), 0);
      
      // Current position in loop
      const currentTick = loopTickRef.current % totalTicks;
      
      // Find which step this tick belongs to
      let tickSum = 0;
      let activeStepIndex = -1;
      let stepStartTick = 0;

      for (let i = 0; i < steps.length; i++) {
          const stepTicks = steps[i].duration * 24;
          if (currentTick >= tickSum && currentTick < tickSum + stepTicks) {
              activeStepIndex = i;
              stepStartTick = tickSum;
              break;
          }
          tickSum += stepTicks;
      }

      const relativeTick = currentTick - stepStartTick;

      if (activeStepIndex !== -1) {
          const step = steps[activeStepIndex];
          
          // Pattern Logic
          if (pattern === 'BLOCK') {
             if (relativeTick === 0) {
                 stopActiveNotes();
                 if (step.active) playChord(step.degree);
                 setCurrentStepIndex(activeStepIndex);
             }
          } 
          else if (pattern === 'PULSE') {
             // Pulse every beat (24 ticks)
             const beatTick = relativeTick % 24;
             if (beatTick === 0) {
                 stopActiveNotes();
                 if (step.active) playChord(step.degree);
             } else if (beatTick === 20) { // slightly before next beat
                 stopActiveNotes();
             }
             if (relativeTick === 0) setCurrentStepIndex(activeStepIndex);
          }
          else if (pattern === 'ARP_UP' || pattern === 'ARP_DOWN' || pattern === 'RANDOM') {
             // 16th notes (6 ticks)
             const noteDuration = 6;
             const arpTick = relativeTick % noteDuration;
             
             if (arpTick === 0) {
                 stopActiveNotes();
                 if (step.active) {
                    const notes = getChordNotes(step.degree);
                    if (notes.length > 0) {
                        // Determine Note Index
                        const noteCount = notes.length;
                        const stepIndex = Math.floor(relativeTick / noteDuration);
                        
                        let noteToPlay = notes[0];
                        if (pattern === 'ARP_UP') {
                            noteToPlay = notes[stepIndex % noteCount];
                        } else if (pattern === 'ARP_DOWN') {
                            noteToPlay = notes[(noteCount - 1) - (stepIndex % noteCount)];
                        } else {
                            noteToPlay = notes[Math.floor(Math.random() * noteCount)];
                        }
                        
                        // Play single note
                        const output = midiAccessRef.current?.outputs;
                        if (output) {
                            output.forEach((port: any) => {
                                port.send([0x90, noteToPlay, 0x64]);
                            });
                            activeNotesRef.current = [noteToPlay];
                        }
                    }
                 }
             } else if (arpTick === 4) { // Cutoff before next 16th
                 stopActiveNotes();
             }
             if (relativeTick === 0) setCurrentStepIndex(activeStepIndex);
          }
      }

      // Advance loop tick
      loopTickRef.current++;
  };

  const getChordNotes = (degree: number): number[] => {
      // 1. Find Root MIDI Note (Octave 3: ~48-59)
      const rootIndex = NOTES.indexOf(rootNoteRef.current);
      const rootMidi = 48 + rootIndex; 

      // 2. Get Scale Intervals
      const intervals = scaleRef.current.intervals;
      
      // 3. Generate Full Scale MIDI Map (2 octaves)
      const scaleNotes = [];
      for (let oct = 0; oct < 2; oct++) {
          for (let i = 0; i < intervals.length; i++) {
              scaleNotes.push(rootMidi + (oct * 12) + intervals[i]);
          }
      }

      if (degree >= intervals.length) return []; // Safety

      // Basic Triad
      const n1 = scaleNotes[degree];
      const n2 = scaleNotes[degree + 2];
      const n3 = scaleNotes[degree + 4];
      
      return [n1, n2, n3];
  };

  const playChord = (degree: number) => {
      const notes = getChordNotes(degree);
      const output = midiAccessRef.current?.outputs;
      if (!output) return;
      
      // Velocity 100
      const velocity = 0x64; 
      
      notes.forEach(note => {
          output.forEach((port: any) => {
              port.send([0x90, note, velocity]); // Note On Channel 1
          });
      });
      
      activeNotesRef.current = notes;
  };

  const stopActiveNotes = () => {
      const notes = activeNotesRef.current;
      const output = midiAccessRef.current?.outputs;
      if (output && notes.length > 0) {
          notes.forEach(note => {
              output.forEach((port: any) => {
                  port.send([0x80, note, 0]); // Note Off
              });
          });
      }
      activeNotesRef.current = [];
  };

  const onMIDISuccess = (midi: any) => {
    setMidiAccess(midi);
    updatePorts(midi);
    midi.onstatechange = (e: any) => updatePorts(e.target);
  };

  const updatePorts = (midi: any) => {
    const inputList: any[] = [];
    midi.inputs.forEach((input: any) => {
      inputList.push(input);
      input.onmidimessage = handleMidiMessage;
    });
    setInputs(inputList);

    const outputList: any[] = [];
    midi.outputs.forEach((output: any) => {
        outputList.push(output);
    });
    setOutputs(outputList);
  };

  const onMIDIFailure = () => {
    console.error("Could not access your MIDI devices.");
  };

  const handleMidiMessage = (message: any) => {
    const [command, note, velocity] = message.data;
    if (command === 0xF8) return;
    const msg: MidiMessage = {
      command,
      note,
      velocity,
      channel: command & 0xf,
      timestamp: Date.now(),
      type: (command & 0xf0) === 144 ? 'noteon' : (command & 0xf0) === 128 ? 'noteoff' : (command & 0xf0) === 176 ? 'cc' : 'other'
    };
    setLastMessage(msg);
    setLogs(prev => [msg, ...prev].slice(0, 20));
  };

  const sendMidiClock = () => {
    if (!midiAccess) return;
    const clockMsg = [0xF8];
    midiAccess.outputs.forEach((output: any) => output.send(clockMsg));
  };

  const sendMidiStart = () => {
    if (!midiAccess) return;
    midiAccess.outputs.forEach((output: any) => output.send([0xFA]));
  };

  const sendMidiStop = () => {
    if (!midiAccess) return;
    midiAccess.outputs.forEach((output: any) => output.send([0xFC]));
  };

  const togglePlayback = () => {
      if (isPlaying) syncService.stop();
      else syncService.start();
  };

  const handleBpmChange = (val: number) => {
      setBpm(val);
      syncService.setBpm(val);
  };

  const toggleCloudSync = () => {
      if (!syncConnected) {
          setSyncConnected(true);
      } else {
          setSyncConnected(false);
          syncService.stop();
      }
  };

  const generateAiProgression = async () => {
      setIsGenerating(true);
      try {
          const apiKey = process.env.API_KEY || '';
          const ai = new GoogleGenAI({ apiKey });
          
          const prompt = `Generate a creative 4-step chord progression for a ${genre} track in ${rootNote} ${selectedScale.name}. 
          Return ONLY a JSON array of objects with keys: "degree" (integer 0-6 representing scale degree), "duration" (integer beats 1-4). 
          Example: [{"degree": 0, "duration": 4}, {"degree": 4, "duration": 4}]`;

          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
              config: { responseMimeType: 'application/json' }
          });
          
          if (response.text) {
              const data = JSON.parse(response.text);
              const newProgression = data.map((item: any, idx: number) => ({
                  id: Date.now().toString() + idx,
                  degree: Math.min(6, Math.max(0, parseInt(item.degree))),
                  duration: Math.min(8, Math.max(1, parseInt(item.duration))),
                  active: true
              }));
              setProgression(newProgression);
          }
      } catch (err) {
          console.error("AI Generation failed", err);
          alert("Failed to generate progression. Check API Key.");
      } finally {
          setIsGenerating(false);
      }
  };

  // Sequencer Edits
  const addStep = () => {
      const newId = Date.now().toString();
      setProgression([...progression, { id: newId, degree: 0, duration: 4, active: true }]);
  };

  const removeStep = (index: number) => {
      const newProg = [...progression];
      newProg.splice(index, 1);
      setProgression(newProg);
  };

  const updateStep = (index: number, field: keyof ChordStep, value: any) => {
      const newProg = [...progression];
      newProg[index] = { ...newProg[index], [field]: value };
      setProgression(newProg);
  };

  const getRomanNumeral = (degree: number) => {
      const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
      return numerals[degree] || '?';
  };

  const getScaleNotes = (root: string, scale: Scale) => {
    const rootIndex = NOTES.indexOf(root);
    return scale.intervals.map(interval => NOTES[(rootIndex + interval) % 12]);
  };

  const activeScaleNotes = getScaleNotes(rootNote, selectedScale);

  const isNoteInScale = (midiNote: number) => {
    const noteName = NOTES[midiNote % 12];
    return activeScaleNotes.includes(noteName);
  };

  return (
    <div className="flex flex-col h-full gap-6 p-6 max-w-6xl mx-auto w-full overflow-y-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
          MIDI Controller Setup
        </h2>
        <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-full border border-slate-800">
                <span className={`h-2 w-2 rounded-full ${inputs.length > 0 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-xs font-medium text-slate-400">IN: {inputs.length}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-full border border-slate-800">
                <span className={`h-2 w-2 rounded-full ${outputs.length > 0 ? 'bg-blue-500' : 'bg-slate-600'}`}></span>
                <span className="text-xs font-medium text-slate-400">OUT: {outputs.length}</span>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Cloud Sync Panel */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 backdrop-blur-sm relative overflow-hidden group">
            <div className={`absolute top-0 left-0 w-1 h-full transition-colors ${syncConnected ? 'bg-green-500' : 'bg-slate-700'}`}></div>
            
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
                        Cloud Sync
                        {syncConnected && <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded border border-green-500/30">ONLINE</span>}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Master Clock & Transport</p>
                </div>
                <button 
                    onClick={toggleCloudSync}
                    className={`text-xs px-3 py-1.5 rounded-md border transition-all ${
                        syncConnected 
                        ? 'bg-green-900/30 border-green-500/50 text-green-400 hover:bg-green-900/50' 
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                >
                    {syncConnected ? 'DISCONNECT' : 'CONNECT'}
                </button>
            </div>

            <div className={`space-y-6 transition-opacity duration-300 ${syncConnected ? 'opacity-100' : 'opacity-50 pointer-events-none filter blur-[1px]'}`}>
                <div className="flex justify-center py-4">
                     <div className="flex gap-4">
                        {[1, 2, 3, 4].map(beat => (
                            <div key={beat} className={`w-4 h-4 rounded-full transition-all duration-75 ${
                                isPlaying && currentBeat === beat 
                                ? 'bg-cyan-400 shadow-[0_0_15px_#22d3ee] scale-125' 
                                : 'bg-slate-800'
                            }`}></div>
                        ))}
                     </div>
                </div>

                <div className="flex items-center justify-around">
                     <Knob label="BPM" value={bpm} min={40} max={240} onChange={handleBpmChange} size={70} color="cyan" />
                     
                     <button 
                        onClick={togglePlayback}
                        className={`w-16 h-16 rounded-full flex items-center justify-center border-4 transition-all shadow-lg active:scale-95 ${
                            isPlaying 
                            ? 'bg-slate-800 border-red-500 text-red-500 hover:bg-red-500/10 shadow-red-900/20' 
                            : 'bg-slate-800 border-green-500 text-green-500 hover:bg-green-500/10 shadow-green-900/20'
                        }`}
                     >
                        {isPlaying ? (
                            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                        ) : (
                            <svg className="w-8 h-8 fill-current translate-x-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        )}
                     </button>
                </div>
            </div>
            {!syncConnected && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                     <button onClick={toggleCloudSync} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-full font-bold shadow-xl border border-blue-400/50">
                        Connect to Start
                     </button>
                </div>
            )}
        </div>

        {/* Chord Sequencer Panel */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 backdrop-blur-sm lg:col-span-2 flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                     <h3 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
                        Advanced Generator
                        <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/30">AI</span>
                     </h3>
                     <p className="text-xs text-slate-500 mt-1">Generate MIDI progressions & patterns</p>
                </div>
                <div className="flex items-center gap-4">
                     <select 
                        value={playPattern} 
                        onChange={(e) => setPlayPattern(e.target.value)}
                        className="bg-slate-950 text-xs border border-slate-700 rounded-md px-2 py-1.5 focus:outline-none"
                     >
                        {PATTERNS.map(p => <option key={p} value={p}>{p}</option>)}
                     </select>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <span className="text-sm font-medium text-slate-400">{sequencerEnabled ? 'ON' : 'OFF'}</span>
                        <div className="relative">
                            <input type="checkbox" className="sr-only" checked={sequencerEnabled} onChange={(e) => setSequencerEnabled(e.target.checked)} />
                            <div className={`block w-10 h-6 rounded-full transition-colors ${sequencerEnabled ? 'bg-purple-600' : 'bg-slate-700'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${sequencerEnabled ? 'translate-x-4' : ''}`}></div>
                        </div>
                    </label>
                </div>
            </div>

            {/* AI Controls */}
            <div className="flex items-center gap-4 mb-6 p-4 bg-slate-950/50 rounded-lg border border-slate-800/50">
                 <select 
                    value={genre} 
                    onChange={(e) => setGenre(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none"
                 >
                    {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                 </select>
                 <button 
                    onClick={generateAiProgression}
                    disabled={isGenerating}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-sm font-bold py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2"
                 >
                    {isGenerating ? (
                        <>
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Creating...
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                            Generate Progression
                        </>
                    )}
                 </button>
            </div>

            <div className="flex items-center gap-4 overflow-x-auto pb-4 custom-scrollbar">
                {progression.map((step, idx) => (
                    <div 
                        key={step.id} 
                        className={`relative flex-shrink-0 w-24 h-32 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-2 group ${
                            idx === currentStepIndex && isPlaying 
                            ? 'border-purple-400 bg-purple-900/20 shadow-[0_0_15px_rgba(168,85,247,0.3)] scale-105' 
                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-500'
                        }`}
                    >
                         {/* Remove Button */}
                         <button 
                            onClick={() => removeStep(idx)}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-slate-700 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                         >
                             ×
                         </button>

                         <span className="text-2xl font-black text-slate-200">{getRomanNumeral(step.degree)}</span>
                         
                         <div className="w-full px-2">
                             <select 
                                value={step.degree} 
                                onChange={(e) => updateStep(idx, 'degree', parseInt(e.target.value))}
                                className="w-full bg-slate-900 text-xs border border-slate-700 rounded px-1 py-1 focus:outline-none"
                             >
                                 {[0,1,2,3,4,5,6].map(d => (
                                     <option key={d} value={d}>{getRomanNumeral(d)}</option>
                                 ))}
                             </select>
                         </div>
                         <div className="w-full px-2">
                             <select 
                                value={step.duration} 
                                onChange={(e) => updateStep(idx, 'duration', parseInt(e.target.value))}
                                className="w-full bg-slate-900 text-xs border border-slate-700 rounded px-1 py-1 focus:outline-none"
                             >
                                 {[1,2,3,4,8].map(d => (
                                     <option key={d} value={d}>{d} Beats</option>
                                 ))}
                             </select>
                         </div>
                    </div>
                ))}

                {/* Add Button */}
                <button 
                    onClick={addStep}
                    className="flex-shrink-0 w-12 h-32 rounded-lg border-2 border-dashed border-slate-700 hover:border-slate-500 hover:bg-slate-800/50 transition-colors flex items-center justify-center text-slate-500"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                </button>
            </div>
            <div className="mt-2 text-xs text-slate-500 text-center">
                Progression loops automatically. Use 'Generate' to create new ideas.
            </div>
        </div>

        {/* Theory Mapping (Existing) */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
          <h3 className="text-xl font-semibold mb-4 text-slate-100">Theory Mapping</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Root Note</label>
              <select 
                value={rootNote} 
                onChange={(e) => setRootNote(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {NOTES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Scale</label>
              <select 
                value={selectedScale.name} 
                onChange={(e) => setSelectedScale(SCALES.find(s => s.name === e.target.value) || SCALES[0])}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {SCALES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
            </div>
          </div>
          
          <div className="mt-6">
            <h4 className="text-sm font-medium text-slate-400 mb-2">Active Notes</h4>
            <div className="flex flex-wrap gap-2">
                {activeScaleNotes.map((n, i) => (
                    <span key={i} className="px-3 py-1 bg-slate-800 rounded-full text-xs font-mono text-cyan-300 border border-slate-700">
                        {n}
                    </span>
                ))}
            </div>
          </div>
        </div>

        {/* MIDI Monitor (Existing) */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm flex flex-col h-[400px] lg:col-span-2">
            <h3 className="text-xl font-semibold mb-4 text-slate-100">Event Monitor</h3>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 font-mono text-sm">
                {logs.length === 0 && <div className="text-slate-600 text-center mt-10">Waiting for MIDI input...</div>}
                {logs.map((log, i) => {
                    const noteName = NOTES[log.note % 12];
                    const inScale = isNoteInScale(log.note);
                    return (
                        <div key={i} className={`flex items-center justify-between p-2 rounded border ${
                            i === 0 ? 'bg-slate-800 border-slate-600' : 'bg-transparent border-slate-800/50 text-slate-500'
                        }`}>
                            <span className={log.type === 'noteon' ? 'text-green-400' : 'text-slate-400'}>
                                {log.type.toUpperCase()}
                            </span>
                            <span className="text-purple-300">CH:{log.channel + 1}</span>
                            <span>
                                {log.type.includes('note') ? (
                                    <span className={inScale ? 'text-blue-400 font-bold' : 'text-yellow-600'}>
                                        {noteName}{Math.floor(log.note / 12) - 1}
                                    </span>
                                ) : `CC:${log.note}`}
                            </span>
                            <span className="text-slate-400 w-8 text-right">{log.velocity}</span>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>
      
      {/* Visualizer Helper (Existing) */}
      <div className="bg-slate-900 border border-slate-800 h-24 rounded-xl flex items-end justify-center px-4 pb-0 overflow-hidden relative shrink-0">
          <div className="absolute top-2 left-4 text-xs text-slate-500 uppercase tracking-widest">Input Visualization</div>
          <div className="flex gap-1 h-full items-end w-full justify-center">
            {Array.from({length: 88}).map((_, i) => {
                const isActive = logs.length > 0 && logs[0].type === 'noteon' && (logs[0].note - 21) === i;
                const isScale = isNoteInScale(i + 21);
                return (
                    <div 
                        key={i} 
                        className={`flex-1 max-w-[8px] rounded-t-sm transition-all duration-75 ${
                            isActive ? 'bg-cyan-400 h-full shadow-[0_0_15px_#22d3ee]' : 
                            isScale ? 'bg-slate-700 h-8' : 'bg-slate-800 h-4'
                        }`}
                    />
                );
            })}
          </div>
      </div>
    </div>
  );
};

export default MidiInterface;
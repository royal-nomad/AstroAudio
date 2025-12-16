import React, { useState, useEffect } from 'react';
import Knob from './Knob';
import Fader from './Fader';

type ViewMode = 'PEDALBOARD' | 'SYNTH';

interface Preset {
  name: string;
  timestamp: number;
  data: {
    pedals: any;
    synthParams: any;
  };
}

const StudioInterface: React.FC = () => {
  const [view, setView] = useState<ViewMode>('PEDALBOARD');

  // Synth State
  const [synthParams, setSynthParams] = useState({
    cutoff: 65,
    resonance: 30,
    drive: 15,
    osc1Wave: 1, // 0-3
    osc1Tune: 0,
    osc2Tune: 7,
    syncMode: 'OFF', // 'OFF', 'HARD', 'SOFT'
    attack: 10,
    decay: 45,
    sustain: 70,
    release: 30,
    lfoRate: 40,
    lfoDepth: 20
  });

  // Pedal State
  const [pedals, setPedals] = useState({
    overdrive: { drive: 75, tone: 60, level: 80, active: true },
    chorus: { rate: 45, depth: 80, mix: 50, active: true },
    delay: { time: 55, feedback: 40, mix: 35, active: false },
    reverb: { decay: 70, mix: 40, tone: 50, active: true }
  });

  // Preset Management State
  const [presets, setPresets] = useState<Preset[]>([]);
  const [isLoadOpen, setIsLoadOpen] = useState(false);
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [presetName, setPresetName] = useState('');

  // Load presets from localStorage on mount
  useEffect(() => {
    const savedPresets = localStorage.getItem('astro_studio_presets');
    if (savedPresets) {
      try {
        setPresets(JSON.parse(savedPresets));
      } catch (err) {
        console.error('Failed to parse presets', err);
      }
    }
  }, []);

  const handleSavePreset = () => {
    if (!presetName.trim()) return;

    const newPreset: Preset = {
      name: presetName,
      timestamp: Date.now(),
      data: {
        pedals,
        synthParams
      }
    };

    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    localStorage.setItem('astro_studio_presets', JSON.stringify(updatedPresets));
    setPresetName('');
    setIsSaveOpen(false);
  };

  const handleLoadPreset = (preset: Preset) => {
    if (preset.data.pedals) setPedals(preset.data.pedals);
    if (preset.data.synthParams) setSynthParams(preset.data.synthParams);
    setIsLoadOpen(false);
  };

  const handleDeletePreset = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const updatedPresets = presets.filter((_, i) => i !== index);
    setPresets(updatedPresets);
    localStorage.setItem('astro_studio_presets', JSON.stringify(updatedPresets));
  };

  const updateSynth = (key: keyof typeof synthParams, val: any) => {
    setSynthParams(prev => ({ ...prev, [key]: val }));
  };

  const updatePedal = (pedal: keyof typeof pedals, param: string, val: number | boolean) => {
    setPedals(prev => ({
      ...prev,
      [pedal]: { ...prev[pedal], [param]: val }
    }));
  };

  return (
    <div className="flex flex-col h-full bg-slate-950" onClick={() => { setIsLoadOpen(false); }}>
      {/* Studio Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur z-20 relative">
        <div className="flex gap-4 items-center">
            <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
            <button 
                onClick={() => setView('PEDALBOARD')}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                view === 'PEDALBOARD' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
            >
                FX CHAIN
            </button>
            <button 
                onClick={() => setView('SYNTH')}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                view === 'SYNTH' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
            >
                SYNTH RACK
            </button>
            </div>

            {/* Preset Controls */}
            <div className="flex items-center gap-2 relative" onClick={(e) => e.stopPropagation()}>
                <button 
                    onClick={() => setIsLoadOpen(!isLoadOpen)}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-sm text-slate-200 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
                    </svg>
                    Presets
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-3 h-3 transition-transform ${isLoadOpen ? 'rotate-180' : ''}`}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                </button>
                <button 
                    onClick={() => setIsSaveOpen(true)}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-md text-sm text-white transition-colors font-medium shadow-lg shadow-blue-900/20"
                >
                    Save
                </button>

                {/* Load Dropdown */}
                {isLoadOpen && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-100">
                        <div className="p-3 border-b border-slate-700 bg-slate-900/50">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saved Presets</h4>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                            {presets.length === 0 ? (
                                <div className="p-4 text-center text-sm text-slate-500 italic">No presets saved</div>
                            ) : (
                                presets.map((preset, idx) => (
                                    <div key={idx} className="group flex items-center justify-between p-3 hover:bg-slate-700/50 cursor-pointer transition-colors border-b border-slate-700/50 last:border-0" onClick={() => handleLoadPreset(preset)}>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-slate-200">{preset.name}</span>
                                            <span className="text-[10px] text-slate-500">{new Date(preset.timestamp).toLocaleDateString()}</span>
                                        </div>
                                        <button 
                                            onClick={(e) => handleDeletePreset(e, idx)}
                                            className="p-1.5 rounded-full hover:bg-red-500/20 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                            title="Delete Preset"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                            </svg>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="text-xs text-slate-500 font-mono">OUTPUT: MAIN L/R</div>
           <div className="h-3 w-3 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></div>
        </div>
      </div>
      
      {/* Save Modal */}
      {isSaveOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-sm shadow-2xl transform scale-100 transition-all">
                <h3 className="text-lg font-bold text-white mb-4">Save Configuration</h3>
                <input 
                    type="text" 
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder="Enter preset name..."
                    autoFocus
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6"
                    onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                />
                <div className="flex justify-end gap-3">
                    <button 
                        onClick={() => setIsSaveOpen(false)}
                        className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSavePreset}
                        disabled={!presetName.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                    >
                        Save Preset
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Main Studio Area */}
      <div className="flex-1 overflow-auto p-8 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black pointer-events-none -z-10"></div>
        
        {view === 'SYNTH' && (
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* OSCILLATOR SECTION */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-500"></div>
                <h3 className="text-sm font-bold text-slate-400 tracking-widest mb-6">OSCILLATORS</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col items-center gap-4 p-4 bg-slate-950/50 rounded-lg border border-slate-800/50">
                        <span className="text-xs font-mono text-cyan-400">OSC 1</span>
                        <Knob label="Shape" value={synthParams.osc1Wave * 33} onChange={(v) => updateSynth('osc1Wave', v/33)} color="cyan" />
                        <Knob label="Tune" value={synthParams.osc1Tune} min={-12} max={12} onChange={(v) => updateSynth('osc1Tune', v)} color="cyan" size={50} />
                    </div>
                    <div className="flex flex-col items-center gap-4 p-4 bg-slate-950/50 rounded-lg border border-slate-800/50 relative">
                        <span className="text-xs font-mono text-purple-400">OSC 2</span>
                        {/* Sync Toggle */}
                        <div className="absolute top-2 right-2">
                             <button 
                                onClick={() => {
                                    const modes = ['OFF', 'HARD', 'SOFT'];
                                    const nextIndex = (modes.indexOf(synthParams.syncMode) + 1) % modes.length;
                                    updateSynth('syncMode', modes[nextIndex]);
                                }}
                                className={`text-[9px] px-1.5 py-0.5 rounded border transition-all font-mono ${
                                    synthParams.syncMode !== 'OFF' 
                                    ? 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.3)]' 
                                    : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-slate-300'
                                }`}
                                title="Oscillator Sync Mode"
                            >
                                SYNC: {synthParams.syncMode}
                            </button>
                        </div>
                        <Knob label="Fine" value={synthParams.osc2Tune} min={-12} max={12} onChange={(v) => updateSynth('osc2Tune', v)} color="purple" />
                        <Knob label="Mix" value={50} onChange={() => {}} color="purple" size={50} />
                    </div>
                </div>
            </div>

            {/* FILTER SECTION */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden flex flex-col items-center">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-red-500"></div>
                <h3 className="text-sm font-bold text-slate-400 tracking-widest mb-8">VCF FILTER</h3>
                <div className="flex items-center justify-center gap-8 mb-4">
                    <Knob label="Cutoff" value={synthParams.cutoff} onChange={(v) => updateSynth('cutoff', v)} size={90} color="pink" />
                    <Knob label="Res" value={synthParams.resonance} onChange={(v) => updateSynth('resonance', v)} color="pink" />
                </div>
                <div className="w-full flex justify-between px-8 mt-4">
                     <Knob label="Drive" value={synthParams.drive} onChange={(v) => updateSynth('drive', v)} size={50} color="pink" />
                     <Knob label="Env" value={60} onChange={() => {}} size={50} color="pink" />
                </div>
            </div>

            {/* ENVELOPE SECTION */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 to-orange-500"></div>
                <h3 className="text-sm font-bold text-slate-400 tracking-widest mb-6">AMPLIFIER ADSR</h3>
                <div className="flex justify-between items-end h-48 px-2">
                    <Fader label="A" value={synthParams.attack} onChange={(v) => updateSynth('attack', v)} color="purple" />
                    <Fader label="D" value={synthParams.decay} onChange={(v) => updateSynth('decay', v)} color="purple" />
                    <Fader label="S" value={synthParams.sustain} onChange={(v) => updateSynth('sustain', v)} color="purple" />
                    <Fader label="R" value={synthParams.release} onChange={(v) => updateSynth('release', v)} color="purple" />
                </div>
            </div>
            
            {/* LFO & UTILS */}
            <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-1 bg-slate-700"></div>
                 <div className="flex gap-12 items-center">
                    <h3 className="text-sm font-bold text-slate-400 tracking-widest">LFO MOD</h3>
                    <div className="flex gap-6">
                        <Knob label="Rate" value={synthParams.lfoRate} onChange={(v) => updateSynth('lfoRate', v)} size={50} />
                        <Knob label="Depth" value={synthParams.lfoDepth} onChange={(v) => updateSynth('lfoDepth', v)} size={50} />
                    </div>
                    <div className="h-10 w-px bg-slate-800 mx-4"></div>
                     <h3 className="text-sm font-bold text-slate-400 tracking-widest">MASTER</h3>
                    <div className="flex gap-6 items-center">
                         <Fader label="Vol" value={85} height={80} onChange={()=>{}} />
                         <div className="flex flex-col gap-2">
                            <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 w-[70%] shadow-[0_0_10px_#22c55e]"></div>
                            </div>
                            <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 w-[65%] shadow-[0_0_10px_#22c55e]"></div>
                            </div>
                         </div>
                    </div>
                 </div>
            </div>
          </div>
        )}

        {view === 'PEDALBOARD' && (
          <div className="flex gap-6 items-center h-full min-w-max px-4 pb-12 overflow-x-auto custom-scrollbar">
            
            {/* INPUT */}
            <div className="flex flex-col items-center justify-center gap-2 text-slate-500 opacity-50">
                 <div className="w-16 h-16 rounded-full border-4 border-slate-700 border-dashed"></div>
                 <span className="font-bold text-xs tracking-widest">IN</span>
            </div>
            
            <div className="h-1 w-8 bg-slate-800 rounded"></div>

            {/* PEDAL: OVERDRIVE */}
            <div className={`relative w-48 h-80 bg-gradient-to-br from-yellow-700 to-yellow-900 rounded-lg border-2 shadow-2xl flex flex-col p-4 transition-transform hover:scale-105 ${pedals.overdrive.active ? 'border-yellow-400 shadow-yellow-900/40' : 'border-slate-800 opacity-80 grayscale-[0.5]'}`}>
               <div className="flex-1 flex flex-col items-center justify-start pt-4 gap-6">
                  <Knob label="DRIVE" value={pedals.overdrive.drive} onChange={(v) => updatePedal('overdrive', 'drive', v)} size={55} color="cyan" />
                  <div className="flex gap-2">
                     <Knob label="TONE" value={pedals.overdrive.tone} onChange={(v) => updatePedal('overdrive', 'tone', v)} size={45} color="cyan" />
                     <Knob label="VOL" value={pedals.overdrive.level} onChange={(v) => updatePedal('overdrive', 'level', v)} size={45} color="cyan" />
                  </div>
               </div>
               <div className="mt-auto flex flex-col items-center gap-3">
                   <div className="text-yellow-100 font-black font-serif tracking-tighter text-2xl drop-shadow-md">SCREAMER</div>
                   <button 
                    onClick={() => updatePedal('overdrive', 'active', !pedals.overdrive.active)}
                    className="w-full bg-slate-300 h-12 rounded-sm border-b-4 border-slate-500 active:border-b-0 active:translate-y-1 transition-all shadow-lg mx-2"
                   ></button>
                   <div className={`w-2 h-2 rounded-full ${pedals.overdrive.active ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : 'bg-red-900'}`}></div>
               </div>
            </div>

            <div className="h-1 w-8 bg-slate-800 rounded"></div>

            {/* PEDAL: CHORUS */}
            <div className={`relative w-48 h-80 bg-gradient-to-br from-blue-700 to-blue-900 rounded-lg border-2 shadow-2xl flex flex-col p-4 transition-transform hover:scale-105 ${pedals.chorus.active ? 'border-blue-400 shadow-blue-900/40' : 'border-slate-800 opacity-80 grayscale-[0.5]'}`}>
               <div className="flex-1 flex flex-col items-center justify-start pt-8 gap-6">
                  <Knob label="RATE" value={pedals.chorus.rate} onChange={(v) => updatePedal('chorus', 'rate', v)} size={55} color="purple" />
                  <div className="flex gap-2">
                     <Knob label="DEPTH" value={pedals.chorus.depth} onChange={(v) => updatePedal('chorus', 'depth', v)} size={45} color="purple" />
                     <Knob label="MIX" value={pedals.chorus.mix} onChange={(v) => updatePedal('chorus', 'mix', v)} size={45} color="purple" />
                  </div>
               </div>
               <div className="mt-auto flex flex-col items-center gap-3">
                   <div className="text-blue-100 font-sans font-bold tracking-widest text-lg drop-shadow-md border-2 border-blue-200 px-2">DIMENSION</div>
                   <button 
                    onClick={() => updatePedal('chorus', 'active', !pedals.chorus.active)}
                    className="w-full bg-slate-300 h-12 rounded-sm border-b-4 border-slate-500 active:border-b-0 active:translate-y-1 transition-all shadow-lg mx-2"
                   ></button>
                   <div className={`w-2 h-2 rounded-full ${pedals.chorus.active ? 'bg-blue-300 shadow-[0_0_10px_#93c5fd]' : 'bg-blue-900'}`}></div>
               </div>
            </div>

            <div className="h-1 w-8 bg-slate-800 rounded"></div>

            {/* PEDAL: DELAY */}
            <div className={`relative w-56 h-80 bg-gradient-to-br from-gray-200 to-gray-400 rounded-lg border-2 shadow-2xl flex flex-col p-4 transition-transform hover:scale-105 ${pedals.delay.active ? 'border-white shadow-white/20' : 'border-slate-600 opacity-80 grayscale-[0.5]'}`}>
               <div className="flex-1 flex flex-col items-center justify-start pt-6 gap-6">
                  <div className="flex justify-between w-full px-2">
                    <Knob label="TIME" value={pedals.delay.time} onChange={(v) => updatePedal('delay', 'time', v)} size={50} color="cyan" />
                    <Knob label="F.BACK" value={pedals.delay.feedback} onChange={(v) => updatePedal('delay', 'feedback', v)} size={50} color="cyan" />
                  </div>
                  <Knob label="MIX" value={pedals.delay.mix} onChange={(v) => updatePedal('delay', 'mix', v)} size={60} color="cyan" />
               </div>
               <div className="mt-auto flex flex-col items-center gap-3">
                   <div className="text-slate-800 font-mono font-bold tracking-tighter text-xl drop-shadow-sm">DIGITAL DELAY</div>
                   <button 
                    onClick={() => updatePedal('delay', 'active', !pedals.delay.active)}
                    className="w-full bg-black h-12 rounded-sm border-b-4 border-slate-700 active:border-b-0 active:translate-y-1 transition-all shadow-lg mx-2"
                   ></button>
                   <div className={`w-2 h-2 rounded-full ${pedals.delay.active ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-green-900'}`}></div>
               </div>
            </div>

            <div className="h-1 w-8 bg-slate-800 rounded"></div>

             {/* PEDAL: REVERB */}
             <div className={`relative w-48 h-80 bg-gradient-to-br from-indigo-800 to-purple-900 rounded-lg border-2 shadow-2xl flex flex-col p-4 transition-transform hover:scale-105 ${pedals.reverb.active ? 'border-purple-400 shadow-purple-900/40' : 'border-slate-800 opacity-80 grayscale-[0.5]'}`}>
               <div className="flex-1 flex flex-col items-center justify-start pt-6 gap-6">
                  <Knob label="DECAY" value={pedals.reverb.decay} onChange={(v) => updatePedal('reverb', 'decay', v)} size={55} color="pink" />
                  <div className="flex gap-2">
                     <Knob label="TONE" value={pedals.reverb.tone} onChange={(v) => updatePedal('reverb', 'tone', v)} size={45} color="pink" />
                     <Knob label="MIX" value={pedals.reverb.mix} onChange={(v) => updatePedal('reverb', 'mix', v)} size={45} color="pink" />
                  </div>
               </div>
               <div className="mt-auto flex flex-col items-center gap-3">
                   <div className="text-purple-100 font-serif italic font-bold tracking-widest text-lg drop-shadow-md">Cathedral</div>
                   <button 
                    onClick={() => updatePedal('reverb', 'active', !pedals.reverb.active)}
                    className="w-full bg-slate-300 h-12 rounded-sm border-b-4 border-slate-500 active:border-b-0 active:translate-y-1 transition-all shadow-lg mx-2"
                   ></button>
                   <div className={`w-2 h-2 rounded-full ${pedals.reverb.active ? 'bg-blue-400 shadow-[0_0_10px_#60a5fa]' : 'bg-blue-900'}`}></div>
               </div>
            </div>

            <div className="h-1 w-8 bg-slate-800 rounded"></div>
             {/* OUTPUT */}
            <div className="flex flex-col items-center justify-center gap-2 text-slate-500 opacity-50">
                 <div className="w-16 h-16 rounded-full border-4 border-slate-700 border-dashed"></div>
                 <span className="font-bold text-xs tracking-widest">AMP</span>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default StudioInterface;
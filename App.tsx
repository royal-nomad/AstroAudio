import React, { useState } from 'react';
import { AppMode } from './types';
import MidiInterface from './components/MidiInterface';
import LiveInterface from './components/LiveInterface';
import SearchInterface from './components/SearchInterface';
import StudioInterface from './components/StudioInterface';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.DASHBOARD);

  const renderContent = () => {
    switch (mode) {
      case AppMode.DASHBOARD:
        return (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-8 p-6 animate-fade-in">
                <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur opacity-50"></div>
                    <div className="relative bg-slate-900 rounded-full p-6 ring-1 ring-slate-800">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-blue-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75l3 3m0 0l3-3m-3 3v-7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                </div>
                <div>
                    <h1 className="text-5xl font-extrabold tracking-tight text-white mb-4">
                        Astro<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Audio</span>
                    </h1>
                    <p className="text-xl text-slate-400 max-w-lg mx-auto">
                        Your intelligent music theory companion. Connect instruments, ask questions, and jam with AI.
                    </p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-4xl mt-12">
                    <button 
                        onClick={() => setMode(AppMode.MIDI)}
                        className="group p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:border-blue-500/50 transition-all hover:bg-slate-800 flex flex-col items-center"
                    >
                        <div className="h-10 w-10 bg-blue-900/30 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-blue-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">MIDI Setup</h3>
                        <p className="text-sm text-slate-400">Configure inputs and map scales.</p>
                    </button>

                    <button 
                         onClick={() => setMode(AppMode.LIVE_JAM)}
                         className="group p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:border-purple-500/50 transition-all hover:bg-slate-800 flex flex-col items-center"
                    >
                        <div className="h-10 w-10 bg-purple-900/30 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-purple-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">Live Jam</h3>
                        <p className="text-sm text-slate-400">Real-time voice conversation.</p>
                    </button>

                    <button 
                         onClick={() => setMode(AppMode.STUDIO)}
                         className="group p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:border-pink-500/50 transition-all hover:bg-slate-800 flex flex-col items-center"
                    >
                        <div className="h-10 w-10 bg-pink-900/30 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-pink-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 13.5V3.75m0 9.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 3.75V16.5m12-3V3.75m0 9.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 3.75V16.5m-6-9V3.75m0 3.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 9.75V10.5" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">Studio</h3>
                        <p className="text-sm text-slate-400">Pedalboard and Synth design.</p>
                    </button>

                    <button 
                        onClick={() => setMode(AppMode.SEARCH)}
                        className="group p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:border-cyan-500/50 transition-all hover:bg-slate-800 flex flex-col items-center"
                    >
                        <div className="h-10 w-10 bg-cyan-900/30 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-cyan-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">Search</h3>
                        <p className="text-sm text-slate-400">Knowledge Base & Theory.</p>
                    </button>
                </div>
            </div>
        );
      case AppMode.MIDI:
        return <MidiInterface />;
      case AppMode.LIVE_JAM:
        return <LiveInterface />;
      case AppMode.SEARCH:
        return <SearchInterface />;
      case AppMode.STUDIO:
        return <StudioInterface />;
      default:
        return <div>Unknown Mode</div>;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200">
        {/* Navigation Bar */}
        <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => setMode(AppMode.DASHBOARD)}>
                         <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center">
                            <span className="font-bold text-white text-xs">A</span>
                         </div>
                         <span className="font-bold text-lg tracking-tight">AstroAudio</span>
                    </div>
                    <div className="flex items-center space-x-1 md:space-x-2">
                        {[
                            { id: AppMode.MIDI, label: 'MIDI' },
                            { id: AppMode.LIVE_JAM, label: 'Live' },
                            { id: AppMode.STUDIO, label: 'Studio' },
                            { id: AppMode.SEARCH, label: 'Search' },
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setMode(item.id as AppMode)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                    mode === item.id 
                                    ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700' 
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden relative">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-3xl"></div>
            </div>
            {renderContent()}
        </main>
    </div>
  );
};

export default App;

import React, { useEffect, useState, useRef } from 'react';
import { LiveClient } from '../services/liveClient';
import { ConnectionStatus } from '../types';

const LiveInterface: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [volume, setVolume] = useState(0);
  const clientRef = useRef<LiveClient | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const toggleConnection = async () => {
    if (status === ConnectionStatus.CONNECTED || status === ConnectionStatus.CONNECTING) {
      clientRef.current?.disconnect();
      setStatus(ConnectionStatus.DISCONNECTED);
      setVolume(0);
    } else {
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        alert('API Key missing');
        return;
      }
      
      const client = new LiveClient(apiKey);
      clientRef.current = client;

      client.onStatusChange = (s) => {
        // Map string status to enum
        if (s === 'CONNECTED') setStatus(ConnectionStatus.CONNECTED);
        else if (s === 'CONNECTING') setStatus(ConnectionStatus.CONNECTING);
        else if (s === 'ERROR') setStatus(ConnectionStatus.ERROR);
        else setStatus(ConnectionStatus.DISCONNECTED);
      };

      client.onAudioLevel = (level) => {
        // Smooth dampening
        setVolume(prev => prev * 0.8 + level * 0.2);
      };

      await client.connect();
    }
  };

  // Visualizer Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);
      
      // Draw idle or active state
      if (status === ConnectionStatus.CONNECTED) {
        const radiusBase = 50;
        const radiusVar = volume * 200; // amplify level for visual
        
        ctx.beginPath();
        const gradient = ctx.createRadialGradient(centerX, centerY, radiusBase * 0.5, centerX, centerY, radiusBase + radiusVar);
        gradient.addColorStop(0, '#60a5fa'); // blue-400
        gradient.addColorStop(0.5, '#a78bfa'); // purple-400
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.arc(centerX, centerY, radiusBase + radiusVar, 0, Math.PI * 2);
        ctx.fill();

        // Rings
        ctx.strokeStyle = `rgba(147, 197, 253, ${0.1 + volume})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radiusBase + radiusVar + 10, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(167, 139, 250, ${0.1 + volume * 0.8})`;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radiusBase + radiusVar + 25, 0, Math.PI * 2);
        ctx.stroke();

      } else {
        // Idle pulse
        const pulse = Math.sin(time * 0.05) * 5;
        ctx.beginPath();
        ctx.fillStyle = '#1e293b'; // slate-800
        ctx.arc(centerX, centerY, 40 + pulse, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#475569';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("Ready", centerX, centerY + 5);
      }

      time++;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
  }, [status, volume]);


  return (
    <div className="flex flex-col items-center justify-center h-full p-6">
      <div className="relative mb-8">
        <canvas 
            ref={canvasRef} 
            width={400} 
            height={400} 
            className="w-[300px] h-[300px] md:w-[400px] md:h-[400px]"
        />
        {status === ConnectionStatus.CONNECTED && (
             <div className="absolute bottom-10 left-0 right-0 text-center animate-pulse text-cyan-400 font-mono text-sm tracking-widest">
                LISTENING
            </div>
        )}
      </div>

      <div className="max-w-md text-center space-y-6">
        <h2 className="text-3xl font-bold text-white">
            {status === ConnectionStatus.CONNECTED ? 'Live Jam Session' : 'Start a Session'}
        </h2>
        <p className="text-slate-400">
            {status === ConnectionStatus.CONNECTED 
                ? "Talk naturally. Ask about chord changes, harmonies, or theory concepts while you play."
                : "Connect to AstroAudio Live to have a real-time voice conversation about your music theory questions."
            }
        </p>

        <button
            onClick={toggleConnection}
            disabled={status === ConnectionStatus.CONNECTING}
            className={`px-8 py-4 rounded-full font-bold text-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 ${
                status === ConnectionStatus.CONNECTED
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20'
                : status === ConnectionStatus.CONNECTING
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-cyan-500/20'
            }`}
        >
            {status === ConnectionStatus.CONNECTED ? 'End Session' : status === ConnectionStatus.CONNECTING ? 'Connecting...' : 'Start Conversation'}
        </button>

        {status === ConnectionStatus.ERROR && (
             <p className="text-red-400 text-sm mt-4">Connection failed. Please check your API key and microphone permissions.</p>
        )}
      </div>
    </div>
  );
};

export default LiveInterface;
import React, { useState, useEffect, useRef } from 'react';

interface FaderProps {
  value: number;
  min?: number;
  max?: number;
  height?: number;
  label?: string;
  onChange: (value: number) => void;
  color?: string;
}

const Fader: React.FC<FaderProps> = ({ 
  value, 
  min = 0, 
  max = 100, 
  height = 150, 
  label, 
  onChange,
  color = 'cyan'
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const faderRef = useRef<HTMLDivElement>(null);

  const activeColor = color === 'cyan' ? 'bg-cyan-400' : color === 'purple' ? 'bg-purple-400' : 'bg-pink-400';
  const shadowColor = color === 'cyan' ? 'shadow-cyan-500/50' : color === 'purple' ? 'shadow-purple-500/50' : 'shadow-pink-500/50';

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !faderRef.current) return;
      
      const rect = faderRef.current.getBoundingClientRect();
      const bottom = rect.bottom;
      const top = rect.top;
      const height = bottom - top;
      
      // Calculate value based on Y position relative to track
      // Mouse Y grows downwards, so we invert logic: (bottom - mouseY) / height
      let relativeY = bottom - e.clientY;
      let percentage = relativeY / height;
      
      percentage = Math.max(0, Math.min(1, percentage));
      
      const newValue = min + (percentage * (max - min));
      onChange(newValue);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = 'default';
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, min, max, onChange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
  };

  const percentage = (value - min) / (max - min);

  return (
    <div className="flex flex-col items-center gap-3 select-none group h-full justify-end">
      <div 
        ref={faderRef}
        className="relative w-8 bg-slate-900 rounded-full border border-slate-700 hover:border-slate-500 transition-colors cursor-ns-resize overflow-hidden"
        style={{ height }}
        onMouseDown={handleMouseDown}
      >
        {/* Track Line */}
        <div className="absolute top-2 bottom-2 left-1/2 -translate-x-1/2 w-0.5 bg-slate-800"></div>
        
        {/* Fill Level */}
        <div 
          className={`absolute bottom-0 left-0 right-0 opacity-20 ${activeColor}`}
          style={{ height: `${percentage * 100}%` }}
        ></div>

        {/* Handle */}
        <div 
          className={`absolute left-1 right-1 h-6 rounded shadow-lg border border-slate-600 flex items-center justify-center transition-all duration-75 ease-out ${
            isDragging ? `bg-slate-200 ${shadowColor} shadow-[0_0_15px]` : 'bg-slate-300'
          }`}
          style={{ 
            bottom: `calc(${percentage * 100}% - 12px)`
          }}
        >
          <div className="w-4 h-0.5 bg-slate-400"></div>
        </div>
      </div>
      
      {label && (
        <div className="text-center">
           <div className="text-xs font-mono text-slate-200 mb-0.5">{Math.round(value)}</div>
           <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</div>
        </div>
      )}
    </div>
  );
};

export default Fader;

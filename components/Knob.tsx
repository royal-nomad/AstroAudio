import React, { useState, useEffect, useRef } from 'react';

interface KnobProps {
  value: number;
  min?: number;
  max?: number;
  size?: number;
  label?: string;
  onChange: (value: number) => void;
  color?: string;
}

const Knob: React.FC<KnobProps> = ({ 
  value, 
  min = 0, 
  max = 100, 
  size = 60, 
  label, 
  onChange,
  color = 'cyan' 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef<number>(0);
  const startValue = useRef<number>(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaY = startY.current - e.clientY;
      const range = max - min;
      // Sensitivity: 200px drag = full range
      const change = (deltaY / 200) * range; 
      let newValue = startValue.current + change;
      newValue = Math.max(min, Math.min(max, newValue));
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
    startY.current = e.clientY;
    startValue.current = value;
  };

  // Calculate rotation: map value to -135deg to +135deg
  const percentage = (value - min) / (max - min);
  const angle = -135 + (percentage * 270);

  // Color mapping
  const activeColor = color === 'cyan' ? '#22d3ee' : color === 'purple' ? '#a78bfa' : '#f472b6';

  return (
    <div className="flex flex-col items-center gap-2 select-none group">
      <div 
        className="relative cursor-ns-resize"
        style={{ width: size, height: size }}
        onMouseDown={handleMouseDown}
      >
        {/* Background Arc */}
        <svg width={size} height={size} viewBox="0 0 100 100" className="overflow-visible">
          <circle 
            cx="50" cy="50" r="40" 
            fill="none" 
            stroke="#1e293b" 
            strokeWidth="10" 
            strokeLinecap="round"
            strokeDasharray="251.2" // 2 * pi * 40
            strokeDashoffset="62.8" // Leave gap at bottom
            transform="rotate(135 50 50)"
          />
          {/* Active Value Arc */}
          <circle 
            cx="50" cy="50" r="40" 
            fill="none" 
            stroke={activeColor} 
            strokeWidth="10" 
            strokeLinecap="round"
            strokeDasharray="251.2"
            strokeDashoffset={251.2 - (percentage * (251.2 * 0.75))} // 0.75 is the 270 degree portion
            transform="rotate(135 50 50)"
            className={`transition-all duration-75 ${isDragging ? 'filter drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]' : ''}`}
          />
          
          {/* Knob Body */}
          <g transform={`rotate(${angle} 50 50)`} className="transition-transform duration-75 ease-out">
            <circle cx="50" cy="50" r="32" fill="#0f172a" stroke="#334155" strokeWidth="2" className="group-hover:stroke-slate-400 transition-colors" />
            {/* Indicator */}
            <line x1="50" y1="50" x2="50" y2="20" stroke="white" strokeWidth="3" strokeLinecap="round" />
          </g>
        </svg>
      </div>
      {label && (
        <div className="text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</div>
          <div className="text-xs font-mono text-slate-200">{Math.round(value)}</div>
        </div>
      )}
    </div>
  );
};

export default Knob;

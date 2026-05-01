import React, { useEffect, useState, useRef } from 'react';
import { MousePointer2 } from 'lucide-react';

const GuidedCursor = ({ step, isVisible }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [message, setMessage] = useState('');
  const [isFound, setIsFound] = useState(false);
  const requestRef = useRef();

  const stepConfig = {
    0: { selector: '#agent-toggle', msg: 'Enable Agent Mode' },
    1: { selector: '#agent-loop-btn', msg: 'Click to start AI Analysis' },
    2: { selector: '.animate-pulse', msg: 'AI is thinking...' },
    4: { selector: '#apply-fix-btn', msg: 'Apply the AI Fix' },
    5: { selector: '#github-login-btn', msg: 'Connect to GitHub' },
    7: { selector: '#repo-input', msg: 'Paste demo repository URL' },
    11: { selector: '#create-pr-btn', msg: 'Create Pull Request' }
  };

  useEffect(() => {
    if (!isVisible || stepConfig[step] === undefined) {
      setIsFound(false);
      return;
    }

    const updatePosition = () => {
      const config = stepConfig[step];
      const el = document.querySelector(config.selector);
      
      if (el) {
        const rect = el.getBoundingClientRect();
        const newX = rect.left + rect.width / 2;
        const newY = rect.top + rect.height / 2;
        
        // Only update if visible in viewport and coordinates are valid
        if (newX > 0 && newY > 0) {
          setPosition({ x: newX, y: newY });
          setMessage(config.msg);
          setIsFound(true);
        } else {
          setIsFound(false);
        }
      } else {
        setIsFound(false);
      }
      
      requestRef.current = requestAnimationFrame(updatePosition);
    };

    requestRef.current = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(requestRef.current);
  }, [step, isVisible]);

  if (!isVisible || !isFound || position.x === 0) return null;

  return (
    <div 
      className="fixed z-[9999] pointer-events-none transition-all duration-500 ease-in-out flex flex-col items-center"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`, 
        transform: 'translate(-50%, -50%)',
        opacity: isFound ? 1 : 0
      }}
    >
      <div className="relative">
        <MousePointer2 
          size={28} 
          className="text-cyan-400 fill-cyan-400/20 drop-shadow-[0_0_15px_#22d3ee] animate-bounce" 
          style={{ filter: 'drop-shadow(0 0 8px rgba(34,211,238,0.8))' }}
        />
        <div className="absolute -top-14 left-1/2 -translate-x-1/2 whitespace-nowrap bg-cyan-500 text-black text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-[0_10px_30px_rgba(34,211,238,0.4)] animate-fade-in border-2 border-white/20">
          {message}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-cyan-500 rotate-45 border-r border-b border-white/10" />
        </div>
      </div>
      {/* Pulse effect */}
      <div className="w-16 h-16 rounded-full border-4 border-cyan-400/20 animate-ping absolute top-0 left-0 -translate-x-1/4 -translate-y-1/4" />
    </div>
  );
};

export default GuidedCursor;

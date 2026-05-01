import React, { useEffect, useState, useRef } from 'react';
import { MousePointer2, Info, Type } from 'lucide-react';

const TYPING_STEPS = ['paste_repo_url'];

const GuidedCursor = ({ config, isVisible, currentStep }) => {
  const [position, setPosition] = useState({ x: -200, y: -200 });
  const [isFound, setIsFound] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const requestRef = useRef();

  // Track element position via rAF loop
  useEffect(() => {
    if (!isVisible || !config?.selector) {
      setIsFound(false);
      return;
    }

    const updatePosition = () => {
      const el = document.querySelector(config.selector);
      if (el) {
        const rect = el.getBoundingClientRect();
        // For input fields, position cursor at the left edge of the field
        const isInput = el.tagName === 'INPUT';
        const newX = isInput ? rect.left + 16 : rect.left + rect.width / 2;
        const newY = rect.top + rect.height / 2;
        if (newX > 0 && newY > 0) {
          setPosition({ x: newX, y: newY });
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
  }, [config, isVisible]);

  // Trigger click ripple for auto-click steps
  useEffect(() => {
    if (isVisible && config?.autoClick && isFound) {
      const delay = config.autoClickDelay ?? 2000;
      const timer = setTimeout(() => {
        setIsClicking(true);
        setTimeout(() => setIsClicking(false), 400);
      }, delay - 400); // show ripple just before actual click
      return () => clearTimeout(timer);
    }
  }, [config, isVisible, isFound]);

  // Show typing indicator for text-input steps
  useEffect(() => {
    const isTypingStep = currentStep === 'paste_repo_url';
    if (isTypingStep && isFound) {
      const t = setTimeout(() => setIsTyping(true), 1400);
      return () => { clearTimeout(t); setIsTyping(false); };
    } else {
      setIsTyping(false);
    }
  }, [currentStep, isFound]);

  if (!isVisible || !config) return null;

  return (
    <div
      className="fixed z-[9999] pointer-events-none flex flex-col items-center"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: `translate(-50%, -50%) scale(${isClicking ? 0.75 : 1})`,
        opacity: isFound ? 1 : 0,
        transition: 'left 0.7s cubic-bezier(0.34,1.56,0.64,1), top 0.7s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease, transform 0.15s ease'
      }}
    >
      <div className="relative">
        {/* Cursor Icon — switches to I-beam when typing */}
        {isTyping ? (
          <div className="text-cyan-400 font-black text-2xl animate-pulse select-none"
            style={{ filter: 'drop-shadow(0 0 10px rgba(34,211,238,0.9))' }}>
            |
          </div>
        ) : (
          <MousePointer2
            size={32}
            className={`text-cyan-400 fill-cyan-400/20 ${isClicking ? 'scale-90' : 'animate-bounce'}`}
            style={{ filter: 'drop-shadow(0 0 12px rgba(34,211,238,0.9))' }}
          />
        )}

        {/* Tooltip */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-2xl shadow-[0_10px_40px_rgba(34,211,238,0.3)] border border-cyan-500/30 flex items-center gap-3 animate-fade-in">
          <div className="w-5 h-5 rounded-lg bg-cyan-500/20 flex items-center justify-center border border-cyan-500/40 shrink-0">
            {isTyping ? <Type size={11} className="text-cyan-400" /> : <Info size={12} className="text-cyan-400" />}
          </div>
          {config.message}
          {isTyping && <span className="inline-block w-1 h-3 bg-cyan-400 animate-pulse ml-1" />}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-black/90 rotate-45 border-r border-b border-white/10" />
        </div>

        {/* Click ripple */}
        {isClicking && (
          <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-4 border-cyan-400 animate-ping" />
        )}
      </div>

      {/* Ambient glow */}
      <div className="w-24 h-24 rounded-full bg-cyan-400/5 blur-2xl absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
    </div>
  );
};

export default GuidedCursor;

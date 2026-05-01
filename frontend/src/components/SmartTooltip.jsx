import React, { useState, useEffect } from 'react';

/**
 * SmartTooltip Component
 * 
 * A premium, interactive tooltip that follows the cursor, 
 * features a gradual typing reveal, and a high-end gradient glow.
 * 
 * @param {string} message - The text content to display in the tooltip
 * @param {React.ReactNode} children - The trigger element for the tooltip
 */
const SmartTooltip = ({ message = "DevAgent: Logical fix ready", children }) => {
  // Step 1: Cursor Position State
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  
  // Step 2: Typing Effect State
  const [typed, setTyped] = useState("");

  // Track mouse position on move
  const handleMouseMove = (e) => {
    setPos({ x: e.clientX, y: e.clientY });
  };

  // Typing Effect Logic
  useEffect(() => {
    if (!visible) {
      setTyped("");
      return;
    }

    let i = 0;
    setTyped("");
    const interval = setInterval(() => {
      if (i < message.length) {
        setTyped(message.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 20); // 20ms delay as requested

    return () => clearInterval(interval);
  }, [visible, message]);

  return (
    <div 
      className="smart-tooltip-trigger"
      style={{ display: 'inline-block', position: 'relative' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onMouseMove={handleMouseMove}
    >
      {children}

      {visible && (
        <div
          className="smart-tooltip-portal"
          style={{
            position: 'fixed',
            // Position near cursor (Step 1)
            top: pos.y + 15,
            left: pos.x + 15,
            zIndex: 10000,
            pointerEvents: 'none',
            padding: '12px 20px',
            borderRadius: '16px',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: '600',
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            whiteSpace: 'nowrap',
            
            // Gradient Glow & Background (Step 3)
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(168, 85, 247, 0.2))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 0 10px rgba(59, 130, 246, 0.4), 0 0 25px rgba(168, 85, 247, 0.3)',
            
            // Smooth Animation (Step 4)
            transition: 'all 0.15s ease',
            transform: visible ? 'scale(1)' : 'scale(0.95)',
            opacity: visible ? 1 : 0,
            animation: 'glow-cycle 3s infinite alternate',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Status Dot */}
            <div style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: '#3b82f6', 
              boxShadow: '0 0 12px #3b82f6',
              animation: 'dot-pulse 2s infinite' 
            }} />
            
            {/* Typed Text content (Step 2) */}
            <span style={{ letterSpacing: '0.02em' }}>{typed}</span>
            
            {/* Blinking Cursor for effect */}
            {typed.length < message.length && (
              <div style={{ 
                width: '2px', 
                height: '14px', 
                background: 'rgba(255, 255, 255, 0.6)', 
                animation: 'cursor-blink 0.8s infinite' 
              }} />
            )}
          </div>

          <style>
            {`
              @keyframes glow-cycle {
                from { box-shadow: 0 0 10px rgba(59, 130, 246, 0.4), 0 0 25px rgba(168, 85, 247, 0.3); }
                to { box-shadow: 0 0 20px rgba(59, 130, 246, 0.7), 0 0 45px rgba(168, 85, 247, 0.5); }
              }
              @keyframes dot-pulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.3); opacity: 0.6; }
              }
              @keyframes cursor-blink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0; }
              }
            `}
          </style>
        </div>
      )}
    </div>
  );
};

export default SmartTooltip;

import React, { useEffect, useState } from 'react';

export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    // Show splash screen for 2.2 - 2.4 seconds then trigger smooth fade-out
    const fadeTimer = setTimeout(() => {
      setFadingOut(true);
    }, 2300);

    // Completely unmount after fade-out transition finishes (600ms)
    const removeTimer = setTimeout(() => {
      setVisible(false);
    }, 2950);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      id="matchzone-splash"
      className={`mz-splash-screen ${fadingOut ? 'mz-splash-fade-out' : ''}`}
      aria-hidden="true"
    >
      {/* Background Ambient Stadium Glow */}
      <div className="mz-splash-ambient-bg" />

      {/* Center Content Wrapper */}
      <div className="mz-splash-content">
        {/* Ripple / Pulse Expanding Waves Container */}
        <div className="mz-splash-logo-container">
          {/* 3 Concentric Ripple/Pulse Waves */}
          <div className="mz-splash-ripple mz-splash-ripple-1" />
          <div className="mz-splash-ripple mz-splash-ripple-2" />
          <div className="mz-splash-ripple mz-splash-ripple-3" />

          {/* Central Logo Box */}
          <div className="mz-splash-logo-box">
            <svg
              className="mz-splash-logo-svg"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="splash-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0a0f16" />
                  <stop offset="100%" stopColor="#070a0f" />
                </linearGradient>
                <linearGradient id="splash-neon" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a3ff20" />
                  <stop offset="100%" stopColor="#6beb00" />
                </linearGradient>
                <filter id="splash-drop-glow" x="-25%" y="-25%" width="150%" height="150%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Pitch Card Background */}
              <rect width="64" height="64" rx="16" fill="url(#splash-bg)" />
              <rect
                x="1"
                y="1"
                width="62"
                height="62"
                rx="15"
                fill="none"
                stroke="#223344"
                strokeWidth="0.8"
                strokeOpacity="0.4"
              />

              {/* Glowing Squircle & Target Core */}
              <g filter="url(#splash-drop-glow)">
                <rect
                  x="13.5"
                  y="13.5"
                  width="37"
                  height="37"
                  rx="11.5"
                  fill="none"
                  stroke="url(#splash-neon)"
                  strokeWidth="4.5"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="8.2"
                  fill="none"
                  stroke="url(#splash-neon)"
                  strokeWidth="3.2"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="3.5"
                  fill="#d4ff70"
                />
              </g>
            </svg>
          </div>
        </div>

        {/* Brand App Name */}
        <div className="mz-splash-brand">
          <h1 className="mz-splash-title">
            Match<span className="mz-splash-title-highlight">Zone</span>
          </h1>
        </div>

        {/* Arabic Slogan */}
        <p className="mz-splash-slogan">عالم كرة القدم بين يديك</p>

        {/* Sleek Neon Loading Progress Bar */}
        <div className="mz-splash-progress-track">
          <div className="mz-splash-progress-bar" />
        </div>
      </div>
    </div>
  );
}
export default SplashScreen;

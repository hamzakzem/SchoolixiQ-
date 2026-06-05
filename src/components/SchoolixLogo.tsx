import React from 'react';

interface SchoolixLogoProps {
  className?: string;
  size?: number;
  withText?: boolean;
}

export default function SchoolixLogo({ className = "", size = 42, withText = false }: SchoolixLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div 
        className="relative flex items-center justify-center shrink-0"
        style={{ width: size, height: size }}
      >
        <svg 
          width="100%" 
          height="100%" 
          viewBox="0 0 500 500" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-md transition-transform duration-300 hover:scale-105"
        >
          <defs>
            {/* Elegant Deep Navy Royal Blue Gradient */}
            <linearGradient id="schoolix-navy-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0B2345" />
              <stop offset="50%" stopColor="#07172E" />
              <stop offset="100%" stopColor="#020914" />
            </linearGradient>
            
            {/* Rich Premium Golden Metallic Gradient */}
            <linearGradient id="schoolix-gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F5C453" />
              <stop offset="50%" stopColor="#D4A64A" />
              <stop offset="100%" stopColor="#AC7E2D" />
            </linearGradient>
          </defs>

          {/* Symmetrical Outer Soft Hexagon Grid containing the Logo Components */}
          {/* Main S-Shape (Navy Blue Body) conforming to standard layout */}
          <path 
            d="M 250,35
               L 415,130
               C 423,135 428,144 428,154
               L 428,346
               C 428,356 423,365 415,370
               L 250,465
               C 242,470 232,470 224,465
               L 59,370
               C 51,365 46,356 46,346
               L 46,154
               C 46,144 51,135 59,130
               L 224,35
               C 232,30 242,30 250,35
               Z" 
            fill="url(#schoolix-navy-grad)" 
          />

          {/* Elegant negative-space clean white channel defining the stylized S */}
          <path 
            d="M 46,154 
               L 224,256 
               L 224,346 
               L 312,295 
               L 312,205 
               L 188,133 
               L 428,272" 
            stroke="#FFFFFF" 
            strokeWidth="24" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="hidden"
          />

          {/* The Stylized S Negative Gaps & Shapes representing the uploaded hexagon custom logo */}
          {/* Top-Right Golden Wing Segment */}
          <path 
            d="M 292,52
               L 410,120
               C 416,124 420,131 420,138
               L 420,224
               C 420,230 412,233 408,229
               L 290,161
               C 284,157 280,150 280,143
               L 280,57
               C 280,51 288,48 292,52
               Z" 
            fill="url(#schoolix-gold-grad)" 
          />

          {/* Bottom-Left Golden Wing Segment */}
          <path 
            d="M 208,448
               L 90,380
               C 84,376 80,369 80,362
               L 80,276
               C 80,270 88,267 92,271
               L 210,339
               C 216,343 220,350 220,357
               L 220,443
               C 220,449 212,452 208,448
               Z" 
            fill="url(#schoolix-gold-grad)" 
          />

          {/* The sweeping white "S" channels dividing the panels */}
          {/* S shape track Overlay to give crisp high contrast borders */}
          <path 
            d="M 76,260 
               L 240,354 
               C 246,358 254,358 260,354 
               L 424,260" 
            stroke="#FFFFFF" 
            strokeWidth="22" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          <path 
            d="M 424,240 
               L 260,146 
               C 254,142 246,142 240,146 
               L 76,240" 
            stroke="#FFFFFF" 
            strokeWidth="22" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />

          <path 
            d="M 250,148 L 250,352" 
            stroke="#FFFFFF" 
            strokeWidth="22" 
            strokeLinecap="round" 
          />
        </svg>
      </div>
      {withText && (
        <span className="font-display font-black tracking-tight text-[22px] select-none">
          <span className="text-[#0B2345] dark:text-white">Schoolix</span>
          <span className="text-[#D4A64A]">iQ</span>
        </span>
      )}
    </div>
  );
}


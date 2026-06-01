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
          viewBox="0 0 512 512" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-lg"
        >
          <defs>
            <linearGradient id="logo-navy-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#07172E" />
              <stop offset="50%" stopColor="#0B2345" />
              <stop offset="100%" stopColor="#1E3E6B" />
            </linearGradient>
            
            <linearGradient id="logo-gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#EBC475" />
              <stop offset="55%" stopColor="#D4A64A" />
              <stop offset="100%" stopColor="#A57D32" />
            </linearGradient>
          </defs>

          <path d="M 256,50 L 115,131.5 C 105,137 100,147 100,158 L 100,225 L 220,155 C 230,149 242,149 252,155 L 370,224 L 370,165 C 370,155 365,145 355,140 L 256,50 Z" fill="url(#logo-navy-grad)" />
          
          <path d="M 256,430 L 397,348.5 C 407,343 412,333 412,322 L 412,255 L 292,325 C 282,331 270,331 260,325 L 142,256 L 142,315 C 142,325 147,335 157,340 L 256,430 Z" fill="url(#logo-navy-grad)" />
          
          <path d="M 285,55 L 370,105 C 380,111 385,121 385,132 L 385,185 L 285,127 Z" fill="url(#logo-gold-grad)" />
          
          <path d="M 227,425 L 142,375 C 132,369 127,359 127,348 L 127,295 L 227,353 Z" fill="url(#logo-gold-grad)" />
          
          <path d="M 120,205 L 220,147 C 242,134 270,134 292,147 L 392,205 L 392,235 L 292,293 C 270,306 242,306 220,293 L 120,235 Z" fill="#FFFFFF" />
          
          <path d="M 152,215 L 230,170 C 246,161 266,161 282,170 L 360,215 L 292,255 C 270,268 242,268 220,255 Z" fill="url(#logo-navy-grad)" />
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

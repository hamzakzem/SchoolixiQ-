import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { prefersReducedMotion } from '../lib/motion';

export const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
    document.documentElement.classList.add('theme-transition');
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    if (newIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <button
      onClick={toggleTheme}
      id="theme-toggle"
      className="sx-btn w-11 h-11 flex items-center justify-center rounded-2xl bg-[#0B2345] hover:bg-[#D4A64A] border border-[#D4A64A]/30 hover:border-[#D4A64A] text-[#D4A64A] hover:text-[#0B2345] shadow-md shadow-[#0B2345]/10 transition-all duration-300 shrink-0 group"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={isDark ? 'dark' : 'light'}
          initial={{ y: 10, opacity: 0, rotate: -45 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: -10, opacity: 0, rotate: 45 }}
          transition={{ duration: prefersReducedMotion() ? 0.01 : 0.2 }}
        >
          {isDark ? (
            <Moon size={18} className="text-[#D4A64A] group-hover:text-[#0B2345] transition-colors duration-300" />
          ) : (
            <Sun size={18} className="text-[#D4A64A] group-hover:text-[#0B2345] transition-colors duration-300" />
          )}
        </motion.div>
      </AnimatePresence>
    </button>
  );
};

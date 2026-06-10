import React, { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'motion/react';
import { prefersReducedMotion } from '../../lib/motion';

type AnimatedCounterProps = {
  value: number;
  className?: string;
  duration?: number;
};

export function AnimatedCounter({ value, className = '', duration = 0.6 }: AnimatedCounterProps) {
  const reduced = prefersReducedMotion();
  const spring = useSpring(value, { stiffness: 120, damping: 20, duration: reduced ? 0.01 : duration * 1000 });
  const display = useTransform(spring, (v) => Math.round(v).toLocaleString());
  const [text, setText] = useState(value.toLocaleString());
  const mounted = useRef(false);

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  useEffect(() => {
    if (reduced) {
      setText(value.toLocaleString());
      return;
    }
    const unsub = display.on('change', (v) => setText(v));
    return unsub;
  }, [display, value, reduced]);

  useEffect(() => {
    mounted.current = true;
  }, []);

  if (!mounted.current && reduced) {
    return <span className={`tabular-nums ${className}`}>{value.toLocaleString()}</span>;
  }

  return (
    <motion.span className={`tabular-nums ${className}`} layout>
      {text}
    </motion.span>
  );
}

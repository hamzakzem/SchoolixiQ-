/**
 * Play a synthesized high-end crystal bubble notification chime for receipt of a new chat message.
 * Pure native Web Audio API, works offline, completely responsive, and bypasses missing file issues.
 */
export function playPremiumNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    const now = ctx.currentTime;
    
    // First Note: E5 (659.25 Hz) sliding to G5 - very swift & crisp
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.12);
    
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.25, now + 0.015);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    osc1.start(now);
    osc1.stop(now + 0.4);
    
    // Second Note: C6 (1046.50 Hz) sliding to E6 - delayed by 0.07s for a rich arpeggio chime
    const delay = 0.07;
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.50, now + delay);
    osc2.frequency.exponentialRampToValueAtTime(1318.51, now + delay + 0.12);
    
    gain2.gain.setValueAtTime(0, now + delay);
    gain2.gain.linearRampToValueAtTime(0.22, now + delay + 0.015);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.3);
    
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc2.start(now + delay);
    osc2.stop(now + delay + 0.35);
  } catch (err) {
    console.warn('Failed to synthesize notification chime:', err);
  }
}

/**
 * Play synthesized high-end notification chimes for different app events.
 * Pure native Web Audio API, works offline, completely responsive, and bypasses missing file issues.
 */

// Simple helper to get a safe AudioContext
function getAudioContext(): AudioContext | null {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  return new AudioContextClass();
}

/**
 * Normal chat message or generic notification sound.
 * Elegant crystal bubble chirp.
 */
export function playPremiumNotificationSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now); // E5
    osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.12); // G5
    
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.25, now + 0.015);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.4);
    
    const delay = 0.07;
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.50, now + delay); // C6
    osc2.frequency.exponentialRampToValueAtTime(1318.51, now + delay + 0.12); // E6
    
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

/**
 * Sound for Academic results / grades.
 * A warm, inspiring major chord arpeggio scale.
 */
export function playGradeNotificationSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const delay = index * 0.08;
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);
      
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.18, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.4);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.45);
    });
  } catch (err) {
    console.warn('Failed to synthesize grade notification sound:', err);
  }
}

/**
 * Sound for Reports (evaluation, advanced report updates).
 * Elegant dual-harmonic intellectual slide chime.
 */
export function playReportNotificationSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.linearRampToValueAtTime(880.00, now + 0.25); // A5
    
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.15, now + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.5);
    
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now + 0.05); // A5
    osc2.frequency.linearRampToValueAtTime(1174.66, now + 0.3); // D6
    
    gain2.gain.setValueAtTime(0, now + 0.05);
    gain2.gain.linearRampToValueAtTime(0.12, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.5);
  } catch (err) {
    console.warn('Failed to synthesize report notification sound:', err);
  }
}

/**
 * Sound for School Marketplace / purchases.
 * Crisp, high glass coin bell.
 */
export function playMarketplaceNotificationSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760.00, now); // A6 (very high bell)
    osc.frequency.exponentialRampToValueAtTime(2093.00, now + 0.08); // C7
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
    
    // Quick echo coin chime
    const oscEcho = ctx.createOscillator();
    const gainEcho = ctx.createGain();
    oscEcho.type = 'sine';
    oscEcho.frequency.setValueAtTime(2093.00, now + 0.06);
    
    gainEcho.gain.setValueAtTime(0, now + 0.06);
    gainEcho.gain.linearRampToValueAtTime(0.1, now + 0.07);
    gainEcho.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    
    oscEcho.connect(gainEcho);
    gainEcho.connect(ctx.destination);
    oscEcho.start(now + 0.06);
    oscEcho.stop(now + 0.3);
  } catch (err) {
    console.warn('Failed to synthesize marketplace notification sound:', err);
  }
}

/**
 * Sound for subscription / registration requests.
 * Modern uplifting corporate executive triple-tone slide.
 */
export function playSubscriptionNotificationSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    
    // Root tone
    const notes = [440.00, 554.37, 659.25, 880.00]; // A4, C#5, E5, A5
    
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + (idx * 0.06);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.linearRampToValueAtTime(freq * 1.5, start + 0.15);
      
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.15, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.45);
    });
  } catch (err) {
    console.warn('Failed to synthesize subscription notification sound:', err);
  }
}


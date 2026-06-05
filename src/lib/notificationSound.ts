/**
 * Advanced Pure Web Audio Sound Synthesizer
 * Provides professional, acoustic-grade feedback chimes.
 * Offline-first, high performance, and consistent across modern Android, iOS WebViews, and desktop browsers.
 */

export interface SoundProfile {
  name: string;
  type: 'crystal' | 'minimal' | 'relaxing' | 'modern';
  volumeMultiplier: number;
}

export type NotificationCategory = 'grade' | 'behavior' | 'attendance' | 'announcement' | 'payment' | 'homework' | 'report' | 'system' | 'message';

export interface UserSoundSettings {
  profile: 'crystal' | 'minimal' | 'relaxing' | 'modern' | 'loud_bell';
  volume: number; // 0.0 to 1.0
  mutedCategories: NotificationCategory[];
  pitchAdjust: number; // -300 to +300 Hz
}

// Get or save settings in client storage
const SETTINGS_KEY = 'schoolix_notification_sound_settings_v2';

const DEFAULT_SETTINGS: UserSoundSettings = {
  profile: 'loud_bell',
  volume: 1.0,
  mutedCategories: [],
  pitchAdjust: 0,
};

export function getSoundSettings(): UserSoundSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.error('Error fetching sound settings:', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSoundSettings(settings: UserSoundSettings) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving sound settings:', e);
  }
}

function getAudioContext(): AudioContext | null {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  return new AudioContextClass();
}

/**
 * Main sound dispatcher that plays categorized sounds based on user customization
 */
export function playCategorizedSound(category: NotificationCategory, testSettings?: UserSoundSettings) {
  const settings = testSettings || getSoundSettings();
  
  // 1. Check if category is muted
  if (settings.mutedCategories.includes(category)) {
    console.log(`Sound muted for category: ${category}`);
    return;
  }

  const ctx = getAudioContext();
  if (!ctx) return;

  // Audio Context unlock for mobile browsers (safari/chrome touch start requirement)
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const now = ctx.currentTime;
  const masterVolume = ctx.createGain();
  masterVolume.gain.setValueAtTime(0, now);
  masterVolume.gain.linearRampToValueAtTime(settings.volume, now + 0.01);
  masterVolume.connect(ctx.destination);

  const pitchShift = settings.pitchAdjust;

  switch (settings.profile) {
    case 'crystal':
      playCrystalProfile(ctx, masterVolume, category, pitchShift);
      break;
    case 'minimal':
      playMinimalProfile(ctx, masterVolume, category, pitchShift);
      break;
    case 'relaxing':
      playRelaxingProfile(ctx, masterVolume, category, pitchShift);
      break;
    case 'modern':
      playModernProfile(ctx, masterVolume, category, pitchShift);
      break;
    case 'loud_bell':
    default:
      playLoudBellProfile(ctx, masterVolume, category, pitchShift);
      break;
  }
}

/**
 * Crystallone Chime: Transparent glass-like resonant bells
 */
function playCrystalProfile(ctx: AudioContext, destination: AudioNode, category: NotificationCategory, pitchShift: number) {
  const now = ctx.currentTime;

  // Base frequencies depending on notification category
  let freqs = [523.25, 659.25, 783.99, 1046.50]; // Bright Major
  if (category === 'payment' || category === 'system') {
    freqs = [587.33, 739.99, 880.00, 1174.66]; // Golden D-Major
  } else if (category === 'behavior') {
    freqs = [440.00, 554.37, 659.25, 880.00]; // Neutral A-Major
  } else if (category === 'attendance') {
    freqs = [659.25, 880.00, 987.77, 1318.51]; // Bright E-Pentatonic
  } else if (category === 'message') {
    freqs = [783.99, 1046.50]; // Simple Double Chirp G5-C6
  }

  freqs.forEach((baseFreq, index) => {
    const osc = ctx.createOscillator();
    const subOsc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const delay = index * 0.06;

    const finalFreq = Math.max(100, baseFreq + pitchShift);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(finalFreq, now + delay);
    
    // Add glassy overtone
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(finalFreq * 2.01, now + delay); // slightly detuned octave for crystal airness

    gainNode.gain.setValueAtTime(0, now + delay);
    gainNode.gain.linearRampToValueAtTime(0.12, now + delay + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.4);

    osc.connect(gainNode);
    subOsc.connect(gainNode);
    gainNode.connect(destination);

    osc.start(now + delay);
    subOsc.start(now + delay);

    osc.stop(now + delay + 0.45);
    subOsc.stop(now + delay + 0.45);
  });
}

/**
 * Minimalist Tick: Soft hums and snappy aesthetic clicks
 */
function playMinimalProfile(ctx: AudioContext, destination: AudioNode, category: NotificationCategory, pitchShift: number) {
  const now = ctx.currentTime;
  let freq = 440; // Soft feedback

  if (category === 'message') freq = 523.25;
  else if (category === 'payment') freq = 659.25;
  else if (category === 'system') freq = 880;

  const finalFreq = Math.max(80, freq + pitchShift);

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(finalFreq, now);

  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.2, now + 0.004); // Instant snap
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.12); // Short decay

  osc.connect(gainNode);
  gainNode.connect(destination);

  osc.start(now);
  osc.stop(now + 0.15);
}

/**
 * Relaxing Water Droplet / Organic Harp: Calming, analog acoustic resonance
 */
function playRelaxingProfile(ctx: AudioContext, destination: AudioNode, category: NotificationCategory, pitchShift: number) {
  const now = ctx.currentTime;
  let baseFreq = 329.63; // E4 - deeply settling

  if (category === 'announcement' || category === 'grade' || category === 'homework') {
    baseFreq = 392.00; // G4
  } else if (category === 'payment') {
    baseFreq = 440.00; // A4
  } else if (category === 'system' || category === 'message') {
    baseFreq = 523.25; // C5
  }

  const finalFreq = Math.max(60, baseFreq + pitchShift);

  // Synthesize an analog warm decay using two sine wave oscillators
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  const gain2 = ctx.createGain();

  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(finalFreq, now);

  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(finalFreq * 1.5, now); // perfect fifth overtone

  gain1.gain.setValueAtTime(0, now);
  gain1.gain.linearRampToValueAtTime(0.15, now + 0.03); // slower rise for warmth
  gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

  gain2.gain.setValueAtTime(0, now);
  gain2.gain.linearRampToValueAtTime(0.05, now + 0.05);
  gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

  osc1.connect(gain1);
  osc2.connect(gain2);
  gain1.connect(destination);
  gain2.connect(destination);

  osc1.start(now);
  osc2.start(now);

  osc1.stop(now + 0.7);
  osc2.stop(now + 0.5);
}

/**
 * Modern High-Tech: Symmetrical geometric cyber clicks and corporate notification chimes
 */
function playModernProfile(ctx: AudioContext, destination: AudioNode, category: NotificationCategory, pitchShift: number) {
  const now = ctx.currentTime;
  let primaryFreq = 880.00; // A5
  let secondaryFreq = 1318.51; // E6

  if (category === 'behavior' || category === 'attendance') {
    primaryFreq = 659.25; // E5
    secondaryFreq = 987.77; // B5
  } else if (category === 'message') {
    primaryFreq = 1046.50; // C6
    secondaryFreq = 1567.98; // G6
  }

  const base1 = Math.max(100, primaryFreq + pitchShift);
  const base2 = Math.max(150, secondaryFreq + pitchShift);

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  const gain2 = ctx.createGain();

  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(base1, now);
  osc1.frequency.exponentialRampToValueAtTime(base1 * 1.2, now + 0.15); // futuristic pitch sweep

  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(base2, now + 0.05);
  osc2.frequency.exponentialRampToValueAtTime(base2 * 1.1, now + 0.2);

  gain1.gain.setValueAtTime(0, now);
  gain1.gain.linearRampToValueAtTime(0.12, now + 0.01);
  gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

  gain2.gain.setValueAtTime(0, now + 0.05);
  gain2.gain.linearRampToValueAtTime(0.06, now + 0.06);
  gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

  osc1.connect(gain1);
  osc2.connect(gain2);
  
  gain1.connect(destination);
  gain2.connect(destination);

  osc1.start(now);
  osc2.start(now + 0.05);

  osc1.stop(now + 0.3);
  osc2.stop(now + 0.25);
}

/**
 * Elegant High-Volume Electronic Chime with rich lingering resonance and acoustic vibrato.
 * Perfect for being heard loudly and clearly on all devices.
 */
function playLoudBellProfile(ctx: AudioContext, destination: AudioNode, category: NotificationCategory, pitchShift: number) {
  const now = ctx.currentTime;

  // Dual harmonious tones with high penetration frequency (ding-dong effect)
  let firstTone = 659.25; // E5 (bright, penetrating)
  let secondTone = 880.00; // A5 (noble, resonating)

  if (category === 'payment' || category === 'system') {
    firstTone = 587.33; // D5
    secondTone = 783.99; // G5
  } else if (category === 'behavior' || category === 'homework') {
    firstTone = 523.25; // C5
    secondTone = 659.25; // E5
  } else if (category === 'message') {
    firstTone = 783.99; // G5
    secondTone = 1046.50; // C6 (high clear chirp)
  }

  const f1 = Math.max(100, firstTone + pitchShift);
  const f2 = Math.max(120, secondTone + pitchShift);

  // Play Tone 1 (Ding)
  playBellComponent(ctx, destination, f1, now, 0.8);
  // Play Tone 2 (Dong) slightly delayed
  playBellComponent(ctx, destination, f2, now + 0.12, 1.2);
}

function playBellComponent(ctx: AudioContext, destination: AudioNode, frequency: number, startTime: number, duration: number) {
  const osc = ctx.createOscillator();
  const subOsc = ctx.createOscillator();
  const metalOsc = ctx.createOscillator();
  
  const gainNode = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();

  // Create a fast, natural shivering vibrato
  lfo.frequency.setValueAtTime(9, startTime); // 9Hz shivering ring
  lfoGain.gain.setValueAtTime(8, startTime); // 8Hz deviation
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  lfoGain.connect(subOsc.frequency);

  // Primary tone carries crisp warm energy
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(frequency, startTime);

  // Sub tone (one octave lower) gives deep majestic weight
  subOsc.type = 'sine';
  subOsc.frequency.setValueAtTime(frequency * 0.5, startTime);

  // High metallic glass chime overtone
  metalOsc.type = 'sine';
  metalOsc.frequency.setValueAtTime(frequency * 2.501, startTime); // detuned perfect fifth above octave

  // Set gain profile with powerful initial surge and long echoing decay
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(0.35, startTime + 0.012); // instant crisp strike
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration); // long ringing resonance

  osc.connect(gainNode);
  subOsc.connect(gainNode);
  metalOsc.connect(gainNode);
  
  gainNode.connect(destination);

  // Trigger sound
  lfo.start(startTime);
  osc.start(startTime);
  subOsc.start(startTime);
  metalOsc.start(startTime);

  // Stop everything neatly
  lfo.stop(startTime + duration + 0.1);
  osc.stop(startTime + duration + 0.1);
  subOsc.stop(startTime + duration + 0.1);
  metalOsc.stop(startTime + duration + 0.1);
}

// Deprecated Sound Chime APIs - Retained for backward-compatibility with other dashboard views.
export function playPremiumNotificationSound() {
  playCategorizedSound('message');
}
export function playGradeNotificationSound() {
  playCategorizedSound('grade');
}
export function playReportNotificationSound() {
  playCategorizedSound('report' as any);
}
export function playMarketplaceNotificationSound() {
  playCategorizedSound('payment');
}
export function playSubscriptionNotificationSound() {
  playCategorizedSound('system');
}

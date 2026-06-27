/** Scale presets for pre-launch load testing. */
export const PRESETS = {
  smoke: { schools: 10, students: 100, label: 'smoke-10' },
  load100: { schools: 100, students: 1000, label: 'load-100' },
  stress300: { schools: 300, students: 5000, label: 'stress-300' },
  stress500: { schools: 500, students: 10000, label: 'stress-500' },
  spike1000: { schools: 1000, students: 20000, label: 'spike-1000' },
};

export function resolvePreset(name) {
  const key = String(name || 'smoke').toLowerCase();
  const preset = PRESETS[key];
  if (!preset) {
    throw new Error(`Unknown preset "${name}". Use: ${Object.keys(PRESETS).join(', ')}`);
  }
  return { key, ...preset };
}

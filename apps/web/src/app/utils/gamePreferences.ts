export type ThemeMode = 'dark' | 'light';

const SOUND_ENABLED_KEY = 'gem_sound_enabled';
const THEME_KEY = 'gem_theme';

export function readSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;

  const stored = localStorage.getItem(SOUND_ENABLED_KEY);
  if (stored === 'false') return false;
  return true;
}

export function writeSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SOUND_ENABLED_KEY, enabled ? 'true' : 'false');
}

export function readTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';

  const stored = localStorage.getItem(THEME_KEY);
  return stored === 'light' ? 'light' : 'dark';
}

export function writeTheme(theme: ThemeMode): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_KEY, theme);
}

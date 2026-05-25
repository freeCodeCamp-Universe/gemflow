import { AnimatePresence, motion } from 'motion/react';
import { Moon, Sun, X } from 'lucide-react';
import type { ThemeMode } from '../utils/gamePreferences';
import { Button } from './ui/button';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  soundEnabled: boolean;
  onSoundEnabledChange: (enabled: boolean) => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
}

function SettingToggle({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="panel-inset flex items-center justify-between gap-4 rounded-2xl px-4 py-3 sm:px-5 sm:py-4">
      <div className="text-sm font-medium text-foreground sm:text-base">{label}</div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onCheckedChange(!checked)}
        className={[
          'relative h-7 w-12 shrink-0 rounded-full border transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50',
          checked ? 'border-primary/40 bg-primary/25' : 'border-border bg-switch-background',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-[left,right]',
            checked ? 'right-0.5 left-auto' : 'left-0.5',
          ].join(' ')}
        />
      </button>
    </div>
  );
}

export function SettingsPanel({
  isOpen,
  onClose,
  soundEnabled,
  onSoundEnabledChange,
  theme,
  onThemeChange,
}: SettingsPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="modal-scrim fixed inset-0 z-40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5 sm:pt-[max(1.25rem,env(safe-area-inset-top))] sm:pb-[max(1.25rem,env(safe-area-inset-bottom))] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex min-h-full items-center justify-center py-2 pointer-events-none">
              <motion.div
                className="modal-panel pointer-events-auto flex w-full max-w-md flex-col overflow-hidden rounded-[1.1rem] p-3 sm:rounded-[1.4rem] sm:p-5"
                initial={{ scale: 0.96 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.97 }}
              >
                <div className="panel-header-divider mb-4 flex shrink-0 items-start justify-between gap-4 pb-4">
                  <div className="font-mono text-sm tracking-[0.24em] text-primary">Settings</div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="panel-close-btn"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <SettingToggle
                    label="Sound effects"
                    checked={soundEnabled}
                    onCheckedChange={onSoundEnabledChange}
                  />

                  <div className="panel-inset rounded-2xl px-4 py-3 sm:px-5 sm:py-4">
                    <div className="mb-3 text-sm font-medium text-foreground sm:text-base">Appearance</div>
                    <div
                      className="grid grid-cols-2 gap-2 rounded-full border border-border bg-secondary/40 p-1"
                      role="group"
                      aria-label="Theme"
                    >
                      <button
                        type="button"
                        aria-pressed={theme === 'dark'}
                        onClick={() => onThemeChange('dark')}
                        className={[
                          'flex items-center justify-center gap-2 rounded-full px-3 py-2 font-mono text-xs tracking-[0.12em] transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:text-sm',
                          theme === 'dark'
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground',
                        ].join(' ')}
                      >
                        <Moon className="h-4 w-4" />
                        Dark
                      </button>
                      <button
                        type="button"
                        aria-pressed={theme === 'light'}
                        onClick={() => onThemeChange('light')}
                        className={[
                          'flex items-center justify-center gap-2 rounded-full px-3 py-2 font-mono text-xs tracking-[0.12em] transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:text-sm',
                          theme === 'light'
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground',
                        ].join(' ')}
                      >
                        <Sun className="h-4 w-4" />
                        Light
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

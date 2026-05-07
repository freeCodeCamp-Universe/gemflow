import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Button } from './ui/button';

interface GameInstructionsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GameInstructions({ isOpen, onClose }: GameInstructionsProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-[rgba(10,10,35,0.84)] backdrop-blur-sm"
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
                className="pointer-events-auto flex max-h-[min(88dvh,36rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[1.1rem] border border-border bg-card/96 p-3 shadow-[0_36px_120px_rgba(10,10,35,0.7)] backdrop-blur-xl sm:rounded-[1.4rem] sm:p-5"
                initial={{ scale: 0.96 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.97 }}
              >
                <div className="mb-4 flex shrink-0 items-start justify-between gap-4 border-b border-white/10 pb-4">
                  <div className="space-y-2">
                    <div className="font-mono text-sm tracking-[0.24em] text-primary">How to Play</div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="border border-white/10 bg-background/35 text-muted-foreground hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="space-y-4">
                    <ol className="list-decimal space-y-2.5 rounded-2xl border border-white/10 bg-background/36 p-3 pl-7 text-sm text-muted-foreground marker:text-primary/80 sm:space-y-3 sm:p-4 sm:pl-9 sm:text-base">
                      <li>Tap a vial to select it, then tap another vial to pour.</li>
                      <li>
                        Pour only into an empty vial, or onto a vial whose top layer matches the color of the layer
                        being poured.
                      </li>
                      <li>
                        When four layers of the same color stack in one vial, they become a gem. That vial clears.
                      </li>
                      <li>
                        Create every gem listed at the top of the screen. The level clears when all listed gems are
                        made and no powder layers remain anywhere on the board.
                      </li>
                    </ol>
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

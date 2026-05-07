import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { GEM_TYPES } from '../types/game';
import type { Collection, GemType } from '../types/game';
import { GemIcon } from './GemIcon';
import { Button } from './ui/button';

interface CollectionPanelProps {
  collection: Collection;
  isOpen: boolean;
  onClose: () => void;
}

export function CollectionPanel({ collection, isOpen, onClose }: CollectionPanelProps) {
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
                className="pointer-events-auto flex max-h-[min(88dvh,42rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[1.1rem] border border-border bg-card/96 p-3 shadow-[0_36px_120px_rgba(10,10,35,0.7)] backdrop-blur-xl sm:rounded-[1.4rem] sm:p-5"
                initial={{ scale: 0.96 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.97 }}
              >
                <div className="mb-4 flex shrink-0 items-start justify-between gap-4 border-b border-white/10 pb-4">
                  <div className="font-mono text-sm tracking-[0.24em] text-primary">Collection</div>

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

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                    {GEM_TYPES.map((gem) => (
                      <GemCard key={gem} gem={gem} count={collection[gem]} />
                    ))}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-background/38 px-4 py-3 text-center text-sm text-muted-foreground sm:text-base">
                    Total Collected Gems: <span className="text-white">{Object.values(collection).reduce((a, b) => a + b, 0)}</span>
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

function GemCard({ gem, count }: { gem: GemType; count: number }) {
  return (
    <motion.div
      className="relative rounded-2xl border border-white/10 bg-background/34 p-2.5 text-center sm:p-3"
      whileHover={{ y: -2 }}
    >
      <div className="mb-2 flex justify-center sm:mb-3">
        <GemIcon gem={gem} size={42} animated={count > 0} glow={count > 0} className={count > 0 ? undefined : 'opacity-50'} />
      </div>

      <div className="text-sm text-white sm:text-base">{gem}</div>
      <div className="mt-1 font-mono text-sm text-muted-foreground sm:text-base">{count}</div>
    </motion.div>
  );
}

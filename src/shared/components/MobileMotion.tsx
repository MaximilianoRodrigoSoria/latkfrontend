import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, type ReactNode } from 'react';

/** Animate route entries without remounting the outlet or reacting to query parameters. */
export function PageMotion({ path, children }: { path: string; children: ReactNode }) {
  const element = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced || !element.current?.animate) return;
    const animation = element.current.animate(
      [
        { opacity: 0, transform: 'translateY(8px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 180, easing: 'ease-out' },
    );
    return () => animation.cancel();
  }, [path, reduced]);
  return <div ref={element}>{children}</div>;
}

export function ContentMotion({
  children,
  replayKey,
}: {
  children: ReactNode;
  replayKey?: string;
}) {
  const reduced = useReducedMotion();
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reduced || replayKey === undefined || !element.current?.animate) return;
    const animation = element.current.animate(
      [
        { opacity: 0.5, transform: 'translateY(4px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 150, easing: 'ease-out' },
    );
    return () => animation.cancel();
  }, [replayKey, reduced]);
  return (
    <motion.div
      ref={element}
      initial={reduced || replayKey !== undefined ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.18 }}
      style={{ minWidth: 0 }}
    >
      {children}
    </motion.div>
  );
}

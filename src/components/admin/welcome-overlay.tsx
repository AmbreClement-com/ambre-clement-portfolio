"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.15 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 28, filter: "blur(10px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

/**
 * Animation plein écran « Bienvenue {prénom} » jouée une fois après connexion
 * (déclenchée par un drapeau sessionStorage posé par le formulaire de login),
 * puis s'efface pour révéler le site.
 */
export function WelcomeOverlay({ firstName }: { firstName: string | null }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("welcome") !== "1") return;
    sessionStorage.removeItem("welcome");
    const raf = requestAnimationFrame(() => setShow(true));
    const t = setTimeout(() => setShow(false), 2400);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, []);

  const name = firstName?.trim() ?? "";
  const letters = name ? Array.from(name) : [];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-neutral-950"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.06,
            filter: "blur(6px)",
            transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
          }}
          aria-hidden
        >
          {/* halo radial subtil */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.10),transparent_60%)]" />

          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="flex flex-col items-center gap-4 px-6 text-center"
          >
            <motion.p
              variants={item}
              className="text-xs uppercase tracking-[0.5em] text-white/50"
            >
              Bienvenue
            </motion.p>

            {letters.length > 0 ? (
              <h2 className="flex flex-wrap justify-center text-5xl font-light tracking-tight text-white sm:text-7xl">
                {letters.map((ch, i) => (
                  <motion.span
                    key={i}
                    variants={item}
                    className={ch === " " ? "w-3 sm:w-5" : ""}
                  >
                    {ch}
                  </motion.span>
                ))}
              </h2>
            ) : (
              <motion.h2
                variants={item}
                className="text-4xl font-light tracking-tight text-white sm:text-6xl"
              >
                Heureux de vous revoir
              </motion.h2>
            )}

            <motion.div
              variants={item}
              className="mt-2 h-px w-16 bg-white/30"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

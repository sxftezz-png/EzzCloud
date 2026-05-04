import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

type Phase = "preparing" | "extracting" | "shortcuts" | "registering" | "done";
type Mode = "idle" | "installing" | "done" | "error";

const APP_VERSION = "7.0.0";

const STEPS: { key: Phase; label: string }[] = [
  { key: "preparing", label: "Preparing destination" },
  { key: "extracting", label: "Extracting application" },
  { key: "shortcuts", label: "Creating shortcuts" },
  { key: "registering", label: "Registering uninstaller" },
];

const SPRING = { type: "spring" as const, stiffness: 280, damping: 32 };

export default function App() {
  const [mode, setMode] = useState<Mode>("idle");
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<Phase>("preparing");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubs: Array<() => void> = [];
    listen<{ phase: Phase; percent: number }>("install:progress", (e) => {
      setPhase(e.payload.phase);
      setProgress(e.payload.percent);
    }).then((u) => unsubs.push(u));
    listen<string>("install:error", (e) => {
      setError(e.payload);
      setMode("error");
    }).then((u) => unsubs.push(u));
    listen("install:done", () => {
      setProgress(100);
      setPhase("done");
      setMode("done");
    }).then((u) => unsubs.push(u));
    return () => {
      for (const u of unsubs) u();
    };
  }, []);

  const startInstall = async () => {
    setMode("installing");
    setError(null);
    try {
      await invoke("start_install");
    } catch (e) {
      setError(String(e));
      setMode("error");
    }
  };

  const launch = async () => {
    try {
      await invoke("launch_and_exit");
    } catch (e) {
      setError(String(e));
    }
  };

  const close = async () => {
    await getCurrentWindow().close();
  };

  return (
    <div className="shell">
      <Background />

      <div className="titlebar">
        <div className="titlebar-drag" />
        <button
          aria-label="Minimize"
          onClick={() => getCurrentWindow().minimize()}
        >
          &#x2013;
        </button>
        <button aria-label="Close" className="close" onClick={close}>
          &times;
        </button>
      </div>

      <div className="content">
        <motion.div
          className="glass"
          initial={{ opacity: 0, y: 16, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <AnimatePresence mode="wait">
            {mode === "idle" && (
              <motion.div
                key="idle"
                className="scene"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={SPRING}
              >
                <Logo pulse />
                <h1 className="title">
                  <em>EzzCloud</em>
                  <span style={{ color: "rgba(255,255,255,0.45)" }}>
                    {" — Created by Inkerov"}
                  </span>
                </h1>
                <div className="byline">A music client, reimagined</div>
                <p className="subtitle">
                  Install EzzCloud to your computer. No admin rights required —
                  takes a few seconds.
                </p>
                <div className="cta-row">
                  <button className="cta" onClick={startInstall}>
                    Install
                  </button>
                  <button className="cta ghost" onClick={close}>
                    Not now
                  </button>
                </div>
              </motion.div>
            )}

            {mode === "installing" && (
              <motion.div
                key="installing"
                className="scene"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={SPRING}
              >
                <Logo breathe />
                <h1 className="title">
                  <em>Installing EzzCloud</em>
                </h1>
                <div className="byline">Created by Inkerov</div>
                <div className="progress" aria-live="polite">
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.max(4, progress)}%` }}
                  />
                </div>
                <div className="steps">
                  {STEPS.map((s, i) => {
                    const cur = STEPS.findIndex((x) => x.key === phase);
                    const state = i < cur ? "done" : i === cur ? "active" : "";
                    return (
                      <motion.div
                        layout
                        className={`step ${state}`}
                        key={s.key}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: 0.05 * i,
                          duration: 0.45,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                      >
                        <span className="dot">
                          <AnimatePresence>
                            {state === "done" && (
                              <motion.svg
                                key="check"
                                viewBox="0 0 24 24"
                                fill="none"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                transition={{
                                  type: "spring",
                                  stiffness: 400,
                                  damping: 20,
                                }}
                              >
                                <path
                                  d="M5 12.5L10 17L19 7.5"
                                  stroke="currentColor"
                                  strokeWidth="2.6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </motion.svg>
                            )}
                          </AnimatePresence>
                        </span>
                        <span>{s.label}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {mode === "done" && (
              <motion.div
                key="done"
                className="scene"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={SPRING}
              >
                <div className="logo-wrap">
                  <motion.div
                    className="logo-halo"
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1.15 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  />
                  <motion.div
                    className="success-ring"
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 320,
                      damping: 22,
                    }}
                  >
                    <svg viewBox="0 0 24 24">
                      <path d="M5 12.5L10 17L19 7.5" />
                    </svg>
                  </motion.div>
                </div>
                <h1 className="title">
                  <em>All set</em>
                </h1>
                <div className="byline">EzzCloud — Created by Inkerov</div>
                <p className="subtitle">
                  EzzCloud has been installed and is ready to launch.
                </p>
                <div className="cta-row">
                  <button className="cta" onClick={launch}>
                    Launch EzzCloud
                  </button>
                  <button className="cta ghost" onClick={close}>
                    Close
                  </button>
                </div>
              </motion.div>
            )}

            {mode === "error" && (
              <motion.div
                key="error"
                className="scene"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={SPRING}
              >
                <Logo />
                <h1 className="title">
                  <em>Installation failed</em>
                </h1>
                <div className="byline">Created by Inkerov</div>
                <p className="error">{error ?? "Unknown error"}</p>
                <div className="cta-row">
                  <button className="cta" onClick={startInstall}>
                    Try again
                  </button>
                  <button className="cta ghost" onClick={close}>
                    Close
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <div className="footer">EzzCloud · v{APP_VERSION}</div>
    </div>
  );
}

function Background() {
  return (
    <div className="canvas">
      <motion.div
        className="orb a"
        animate={{ x: [0, 30, -10, 0], y: [0, 20, -15, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="orb b"
        animate={{ x: [0, -40, 20, 0], y: [0, -30, 10, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="orb c"
        animate={{ x: [0, 20, -30, 0], y: [0, -20, 30, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="vignette" />
      <div className="grain" />
    </div>
  );
}

function Logo({ pulse, breathe }: { pulse?: boolean; breathe?: boolean }) {
  const animate = pulse
    ? { scale: [1, 1.03, 1] }
    : breathe
      ? { scale: [1, 1.018, 1] }
      : { scale: 1 };
  const transition = pulse
    ? { duration: 3.2, repeat: Infinity, ease: "easeInOut" as const }
    : breathe
      ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" as const }
      : { duration: 0 };

  return (
    <div className="logo-wrap">
      <motion.div
        className="logo-halo"
        animate={
          pulse || breathe ? { opacity: [0.6, 1, 0.6] } : { opacity: 0.7 }
        }
        transition={
          pulse || breathe
            ? { duration: 3, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0 }
        }
      />
      <motion.div className="logo" animate={animate} transition={transition}>
        <LogoMark />
      </motion.div>
    </div>
  );
}

/**
 * Custom monogram logo: two abstract sound-wave arcs nested inside a
 * cloud-like silhouette. Pure stroke geometry, monochrome.
 */
function LogoMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id="lm-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f0f12" />
          <stop offset="100%" stopColor="#26262e" />
        </linearGradient>
      </defs>
      {/* Cloud silhouette */}
      <path
        d="M14 32c-3.86 0-7-3.14-7-7 0-3.6 2.72-6.56 6.22-6.95C13.62 13.43 17.42 10 22 10c4.06 0 7.49 2.7 8.6 6.4C34.62 16.6 38 19.93 38 24c0 4.42-3.58 8-8 8H14z"
        fill="url(#lm-fill)"
      />
      {/* Inner waveform — the "Ezz" mark */}
      <g
        stroke="#fafafa"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M16 25 Q20 20, 24 25 T32 25" />
        <path
          d="M14.5 28 Q18.5 23.5, 22.5 28 T30.5 28"
          opacity="0.4"
        />
      </g>
    </svg>
  );
}

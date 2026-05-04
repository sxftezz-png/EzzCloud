import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import logoUrl from "./assets/logo.png";

type Phase = "preparing" | "extracting" | "shortcuts" | "registering" | "done";
type Mode = "idle" | "installing" | "done" | "error";

const APP_VERSION = "7.0.0";

const STEPS: { key: Phase; label: string }[] = [
  { key: "preparing", label: "Preparing destination" },
  { key: "extracting", label: "Extracting application" },
  { key: "shortcuts", label: "Creating shortcuts" },
  { key: "registering", label: "Registering uninstaller" },
];

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
        <AnimatePresence mode="wait">
          {mode === "idle" && (
            <motion.div
              key="idle"
              className="scene"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <Logo pulse />
              <div className="brand">
                <h1>EzzCloud</h1>
                <div className="by">created by Inkerov</div>
              </div>
              <p className="subtitle">
                Install EzzCloud to your computer. No admin rights required —
                takes a few seconds.
              </p>
              <button className="cta" onClick={startInstall}>
                Install
              </button>
            </motion.div>
          )}

          {mode === "installing" && (
            <motion.div
              key="installing"
              className="scene"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <Logo breathe />
              <div className="brand">
                <h1>Installing EzzCloud</h1>
                <div className="by">created by Inkerov</div>
              </div>
              <div className="progress" aria-live="polite">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.max(4, progress)}%` }}
                />
              </div>
              <div className="steps">
                {STEPS.map((s) => {
                  const idx = STEPS.findIndex((x) => x.key === s.key);
                  const cur = STEPS.findIndex((x) => x.key === phase);
                  const state = idx < cur ? "done" : idx === cur ? "active" : "";
                  return (
                    <div className={`step ${state}`} key={s.key}>
                      <span className="dot">
                        {state === "done" && (
                          <svg viewBox="0 0 24 24" fill="none">
                            <path
                              d="M5 12.5L10 17L19 7.5"
                              stroke="currentColor"
                              strokeWidth="2.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>
                      <span>{s.label}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {mode === "done" && (
            <motion.div
              key="done"
              className="scene"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="logo-wrap">
                <motion.div
                  className="glow"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1.1 }}
                  transition={{ duration: 0.7 }}
                />
                <motion.div
                  className="success-ring"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    duration: 0.55,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M5 12.5L10 17L19 7.5" />
                  </svg>
                </motion.div>
              </div>
              <div className="brand">
                <h1>Installation complete</h1>
                <div className="by">EzzCloud · created by Inkerov</div>
              </div>
              <div className="cta-row">
                <button className="cta" onClick={launch}>
                  Launch EzzCloud
                </button>
                <button className="cta secondary" onClick={close}>
                  Close
                </button>
              </div>
            </motion.div>
          )}

          {mode === "error" && (
            <motion.div
              key="error"
              className="scene"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Logo />
              <div className="brand">
                <h1>Installation failed</h1>
                <div className="by">created by Inkerov</div>
              </div>
              <p className="error">{error ?? "Unknown error"}</p>
              <div className="cta-row">
                <button className="cta" onClick={startInstall}>
                  Try again
                </button>
                <button className="cta secondary" onClick={close}>
                  Close
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="footer">EzzCloud {APP_VERSION}</div>
    </div>
  );
}

function Logo({ pulse, breathe }: { pulse?: boolean; breathe?: boolean }) {
  const anim = pulse
    ? { scale: [1, 1.04, 1] }
    : breathe
      ? { scale: [1, 1.02, 1] }
      : { scale: 1 };
  const transition = pulse
    ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" as const }
    : breathe
      ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" as const }
      : { duration: 0 };
  return (
    <div className="logo-wrap">
      <motion.div
        className="glow"
        animate={pulse || breathe ? { opacity: [0.7, 1, 0.7] } : { opacity: 0.8 }}
        transition={
          pulse || breathe
            ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0 }
        }
      />
      <motion.div className="logo" animate={anim} transition={transition}>
        <img src={logoUrl} alt="EzzCloud" draggable={false} />
      </motion.div>
    </div>
  );
}

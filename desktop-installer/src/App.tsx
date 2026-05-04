import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

type Phase = "preparing" | "extracting" | "shortcuts" | "registering" | "done";
type Mode = "idle" | "installing" | "done" | "error";

const APP_VERSION = "7.0.0";

const STEPS: { key: Phase; label: string }[] = [
  { key: "preparing", label: "Подготовка" },
  { key: "extracting", label: "Распаковка файлов" },
  { key: "shortcuts", label: "Создание ярлыков" },
  { key: "registering", label: "Регистрация" },
];

const SPRING = { type: "spring" as const, stiffness: 280, damping: 32 };

export default function App() {
  const [mode, setMode] = useState<Mode>("idle");
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<Phase>("preparing");
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [createDesktopShortcut, setCreateDesktopShortcut] = useState(true);
  const [launchAfter, setLaunchAfter] = useState(true);

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
      await invoke("start_install", {
        opts: { desktopShortcut: createDesktopShortcut },
      });
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
    try {
      await invoke("quit");
    } catch {
      /* fallback: close window the cheap way */
      window.close();
    }
  };

  // Auto-launch when install completes if user opted in.
  useEffect(() => {
    if (mode === "done" && launchAfter) {
      const t = setTimeout(() => launch(), 1500);
      return () => clearTimeout(t);
    }
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="shell">
      <Background />

      <div className="content">
        <AnimatePresence mode="wait">
          {mode === "idle" && (
            <motion.div
              key="idle"
              className="scene"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={SPRING}
            >
              <Logo pulse />
              <h1 className="title">EzzCloud</h1>
              <div className="title-sub">
                Версия {APP_VERSION} · by <b>@inkerov</b>
              </div>
              <p className="subtitle">
                Минималистичный установщик · клик — и готово
              </p>
              <div className="cta-row">
                <button
                  className="cta ghost"
                  onClick={() => setShowSettings((v) => !v)}
                >
                  Параметры
                </button>
                <button className="cta" onClick={startInstall}>
                  Установить
                </button>
              </div>

              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    className="settings"
                    initial={{ opacity: 0, y: -6, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -6, height: 0 }}
                    transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                    style={{ overflow: "hidden" }}
                  >
                    <div className="opt">
                      <div>
                        Ярлык на рабочем столе
                        <small>Создать иконку EzzCloud на рабочем столе</small>
                      </div>
                      <input
                        className="toggle"
                        type="checkbox"
                        checked={createDesktopShortcut}
                        onChange={(e) =>
                          setCreateDesktopShortcut(e.target.checked)
                        }
                      />
                    </div>
                    <div className="opt">
                      <div>
                        Запустить после установки
                        <small>Открыть EzzCloud сразу как закончим</small>
                      </div>
                      <input
                        className="toggle"
                        type="checkbox"
                        checked={launchAfter}
                        onChange={(e) => setLaunchAfter(e.target.checked)}
                      />
                    </div>
                    <div className="opt" style={{ alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        Папка установки
                        <div className="path">
                          %LOCALAPPDATA%\Programs\EzzCloud
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {mode === "installing" && (
            <motion.div
              key="installing"
              className="scene"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={SPRING}
            >
              <Logo breathe small />
              <h1 className="title" style={{ fontSize: 22 }}>
                Устанавливаем EzzCloud
              </h1>
              <div className="title-sub">{phaseLabel(phase)}…</div>
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
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: 0.04 * i,
                        duration: 0.4,
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
                                damping: 22,
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
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={SPRING}
            >
              <div className="logo-wrap">
                <motion.div
                  className="logo-halo"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1.18 }}
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
              <h1 className="title">Готово</h1>
              <div className="title-sub">
                EzzCloud установлен и готов к запуску
              </div>
              <div className="cta-row">
                <button className="cta ghost" onClick={close}>
                  Закрыть
                </button>
                <button className="cta" onClick={launch}>
                  Запустить
                </button>
              </div>
            </motion.div>
          )}

          {mode === "error" && (
            <motion.div
              key="error"
              className="scene"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={SPRING}
            >
              <Logo />
              <h1 className="title">Не удалось установить</h1>
              <p className="error">{error ?? "Неизвестная ошибка"}</p>
              <div className="cta-row">
                <button className="cta ghost" onClick={close}>
                  Закрыть
                </button>
                <button className="cta" onClick={startInstall}>
                  Повторить
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <TelegramButton />

      <div className="footer">EzzCloud — Created by Inkerov</div>
    </div>
  );
}

function TelegramButton() {
  const open = () => {
    invoke("open_url", { url: "https://t.me/inkerow" }).catch(() => {});
  };
  return (
    <button
      className="tg-fab"
      onClick={open}
      title="Telegram · @inkerow"
      aria-label="Open Telegram"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M9.78 15.71l-.39 4.16c.56 0 .8-.24 1.1-.53l2.63-2.5 5.46 4c1 .55 1.72.26 1.98-.93L21.93 4.5c.32-1.46-.53-2.04-1.5-1.68L2.96 9.96c-1.43.55-1.4 1.34-.24 1.7l4.5 1.4 10.45-6.6c.5-.31.94-.14.58.18"
        />
      </svg>
    </button>
  );
}

function phaseLabel(p: Phase): string {
  switch (p) {
    case "preparing":
      return "Подготовка";
    case "extracting":
      return "Распаковка файлов";
    case "shortcuts":
      return "Создание ярлыков";
    case "registering":
      return "Регистрация";
    case "done":
      return "Готово";
  }
}

/* ──────────────────────────────────────────────────────────
   Background — holographic aurora + spinning conic disc +
   chromatic sweep + sparse twinkling starfield
   ────────────────────────────────────────────────────────── */

type Star = { id: number; left: number; top: number; size: number; delay: number };

function Background() {
  const stars = useMemo<Star[]>(() => {
    const out: Star[] = [];
    for (let i = 0; i < 60; i++) {
      out.push({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() < 0.9 ? 1 : 2,
        delay: Math.random() * 4,
      });
    }
    return out;
  }, []);

  return (
    <div className="canvas">
      {/* Holographic conic disc — slowly rotating iridescent palette */}
      <div className="holo-disc" />

      {/* Aurora blobs — drifting cyan/violet/pink/teal */}
      <motion.div
        className="aurora-blob cyan"
        animate={{ x: [0, 60, -20, 0], y: [0, 40, -30, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="aurora-blob violet"
        animate={{ x: [0, -50, 30, 0], y: [0, -40, 20, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="aurora-blob pink"
        animate={{ x: [0, 40, -30, 0], y: [0, -25, 35, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="aurora-blob teal"
        animate={{ x: [0, -35, 25, 0], y: [0, 30, -40, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Chromatic prism sweep — periodic horizontal pass */}
      <div className="chroma-sweep" />

      {/* Sparse twinkling starfield (depth) */}
      <div className="starfield">
        {stars.map((s) => (
          <motion.span
            key={s.id}
            className="star"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
            }}
            animate={{ opacity: [0.15, 0.7, 0.15] }}
            transition={{
              duration: 3 + s.delay,
              repeat: Infinity,
              ease: "easeInOut",
              delay: s.delay,
            }}
          />
        ))}
      </div>

      {/* Subtle film grain + vignette */}
      <div className="grain" />
      <div className="vignette" />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Logo — dark rounded square with white cloud silhouette
   ────────────────────────────────────────────────────────── */

function Logo({
  pulse,
  breathe,
  small,
}: {
  pulse?: boolean;
  breathe?: boolean;
  small?: boolean;
}) {
  const animate = pulse
    ? { scale: [1, 1.025, 1] }
    : breathe
      ? { scale: [1, 1.012, 1] }
      : { scale: 1 };
  const transition = pulse
    ? { duration: 3.4, repeat: Infinity, ease: "easeInOut" as const }
    : breathe
      ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" as const }
      : { duration: 0 };

  return (
    <div
      className="logo-wrap"
      style={small ? { width: 96, height: 96 } : undefined}
    >
      <motion.div
        className="logo-halo"
        animate={
          pulse || breathe ? { opacity: [0.55, 1, 0.55] } : { opacity: 0.7 }
        }
        transition={
          pulse || breathe
            ? { duration: 3, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0 }
        }
      />
      <motion.div
        className="logo"
        animate={animate}
        transition={transition}
        style={small ? { width: 68, height: 68, borderRadius: 16 } : undefined}
      >
        <CloudGlyph />
      </motion.div>
    </div>
  );
}

function CloudGlyph() {
  // Filled white cloud silhouette inside the dark square.
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path
        fill="currentColor"
        d="M19 46c-5.52 0-10-4.48-10-10 0-5.18 3.95-9.45 9-9.95C19.66 19.62 25.27 15 32 15c5.96 0 11.07 3.94 12.7 9.36C50.97 24.86 56 29.85 56 36c0 5.52-4.48 10-10 10H19z"
      />
    </svg>
  );
}

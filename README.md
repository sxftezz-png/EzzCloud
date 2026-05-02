<p align="center">
  <a href="https://github.com/inkerov/EzzCloud/releases/latest">
    <img src="https://raw.githubusercontent.com/inkerov/EzzCloud/main/desktop/src-tauri/icons/icon.png" width="170" alt="EzzCloud" />
  </a>
</p>

<h1 align="center">EzzCloud</h1>

<p align="center">
  Нативный десктопный клиент SoundCloud на Tauri v2 для Windows, Linux и macOS<br/>
  Без рекламы · Без капчи · Удобный плеер · Открытый код
</p>

<p align="center">
  <a href="https://github.com/inkerov/EzzCloud/releases/latest">
    <img src="https://img.shields.io/badge/Скачать-Последнюю_версию-FF5500?style=for-the-badge" alt="Download"/>
  </a>
</p>

---

## Что это

**EzzCloud** — десктопный клиент SoundCloud с упором на качество воспроизведения и удобный UX.

- Нативная оболочка: **Tauri v2 + Rust**
- Интерфейс: **React 19 + Vite + Tailwind**
- Поддержка: **Windows / Linux / macOS**
- Автообновления через GitHub Releases

---

## Возможности

### Интерфейс и playback UX

- **HQ/LQ badge** в mini player и fullscreen-панелях.
- Плавные fullscreen-режимы lyrics/artwork и переходы обложек (low-res → high-res).
- Стабильный прогресс трека без визуальных «дёрганий».
- Корректная громкость при **crossfade** (без скачков на стыках).

### Fullscreen, lyrics, визуал

- Оптимизированные fullscreen-панели и фоновые эффекты.
- Минимум лишних re-render/DOM-конфликтов на прогресс-баре.
- Плавное отображение прогресса и переключение треков.

### Рекомендации

- Векторизация треков (**Qdrant 96D**).
- **Hybrid recommend / search / rerank** pipeline.
- **Региональные тренды** (Apple/Deezer) в пул discovery.
- **LLM rerank** (через настраиваемый endpoint/model).

### Импорт и локализация

- Импорт плейлистов из **Spotify** и **YouTube Music**.
- Локализация: русский, английский, украинский, турецкий.

### Release / Updater

- Чёткая линейка версий и стабильный pipeline релизов.
- Подписанные `latest.json` и `.sig` для проверки подлинности обновлений.

---

## Скачать

Релизы: https://github.com/inkerov/EzzCloud/releases/latest

### Windows
- `*.exe` (рекомендуется)
- `*.msi`

### Linux
- `.deb` (amd64/arm64)
- `.rpm` (x86_64/aarch64)
- `.AppImage` (amd64/aarch64)
- `.flatpak`

### macOS
- `*_x64.dmg` (Intel)
- `*_aarch64.dmg` (Apple Silicon)

---

## Backend

Приложение использует BFF-сервер из каталога [`backend/`](./backend) для проксирования SoundCloud API и OAuth-авторизации. Подробная инструкция по локальному запуску — в [`backend/README.md`](./backend/README.md).

Если вы хотите, чтобы клиент работал с публичным backend, в настройках приложения переключите режим API в `auto`. Для собственного backend — режим `custom` и адрес `http://localhost:3000`.

---

## Разработка

### Требования

- Node.js 22+
- pnpm 10+
- Rust stable

### Запуск desktop

```bash
git clone https://github.com/inkerov/EzzCloud.git
cd EzzCloud/desktop
pnpm install
pnpm tauri dev
```

### Проверки

```bash
npx tsc --noEmit
npx biome check src/
cargo check
```

---

## Лицензия

MIT, см. файл `LICENSE`.

SoundCloud — торговая марка SoundCloud Ltd. Проект не аффилирован с SoundCloud.

---

## Теги

`soundcloud` `soundcloud-client` `desktop-app` `tauri` `react` `typescript` `rust` `cross-platform` `music-player` `music-streaming` `windows` `linux` `macos`

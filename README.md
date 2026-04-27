<h1 align="center">EzzCloud</h1>

<p align="center">
<b>Десктоп-клиент для SoundCloud</b><br>
Без рекламы · Без капчи · Без цензуры · Доступно в России
</p>

<p align="center">
<a href="https://github.com/sxftezz-png/EzzCloud/releases/latest">
<img src="https://img.shields.io/github/v/release/sxftezz-png/EzzCloud?style=for-the-badge&logo=github&color=FF5500&label=VERSION" alt="Version"/>
</a>
<a href="https://github.com/sxftezz-png/EzzCloud/releases">
<img src="https://img.shields.io/github/downloads/sxftezz-png/EzzCloud/total?style=for-the-badge&logo=download&color=FF5500&label=Downloads" alt="Downloads"/>
</a>
<a href="https://t.me/inkerow">
<img src="https://img.shields.io/badge/Telegram-@inkerow-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram"/>
</a>
</p>

---

## Что это?

**EzzCloud** — кастомная десктоп-сборка нативного клиента SoundCloud (форк [SoundCloud Desktop](https://github.com/zxcloli666/SoundCloud-Desktop) v6.8.0). Всё то же самое — Tauri 2 + React 19, минимум памяти, мгновенный запуск, обход блокировок, Discord RPC, медиа-кнопки — только под бренд **EzzCloud** и моим именем.

Автор сборки: **Telegram [@inkerow](https://t.me/inkerow)**

---

## Скачать

Перейди на [страницу релизов](https://github.com/sxftezz-png/EzzCloud/releases/latest) и скачай:

- **`.exe`** (NSIS-установщик) — рекомендуется для Windows
- **`.msi`** — альтернативный установщик
- **`EzzCloud-portable.exe`** — портативная версия, без установки

Требования: Windows 10 (1809+) или Windows 11.

Билды Linux (`.deb`, `.AppImage`) тоже собираются автоматически.

---

## Сборка из исходников

```bash
# Зависимости: Node 22+, pnpm 10+, Rust stable
cd desktop
pnpm install
pnpm tauri build
```

Готовые установщики появятся в `desktop/src-tauri/target/release/bundle/`.

---

## Кредиты

- Оригинальный проект — [SoundCloud Desktop](https://github.com/zxcloli666/SoundCloud-Desktop) от [@zxcloli666](https://github.com/zxcloli666). Вся техническая работа и архитектура — его.
- Эта сборка — только ребрендинг под EzzCloud / [@inkerow](https://t.me/inkerow).

## Лицензия

[MIT](LICENSE) — как в оригинале.

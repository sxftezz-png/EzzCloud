use std::path::PathBuf;

use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tokio::io::AsyncWriteExt;

use crate::InstallOpts;

#[derive(Serialize, Clone)]
struct Progress {
    phase: &'static str,
    percent: u8,
}

fn emit(app: &AppHandle, phase: &'static str, percent: u8) {
    let _ = app.emit("install:progress", Progress { phase, percent });
}

pub async fn run(
    app: AppHandle,
    payload: &'static [u8],
    opts: InstallOpts,
) -> Result<(), Box<dyn std::error::Error>> {
    if payload.is_empty() {
        return Err("Installer payload missing — please re-download the setup file.".into());
    }

    // ── Phase 1: prepare destination ─────────────────────────
    emit(&app, "preparing", 5);
    tokio::time::sleep(std::time::Duration::from_millis(220)).await;

    let install_dir = install_dir()?;
    if install_dir.exists() {
        // Best-effort cleanup of an existing install. Ignore errors since the
        // app may be running — overwrite below will clobber the .exe directly.
        let _ = tokio::fs::remove_dir_all(&install_dir).await;
    }
    tokio::fs::create_dir_all(&install_dir).await?;
    emit(&app, "preparing", 25);
    tokio::time::sleep(std::time::Duration::from_millis(180)).await;

    // ── Phase 2: extract application files ───────────────────
    emit(&app, "extracting", 30);
    let exe_path = install_dir.join("EzzCloud.exe");
    write_with_progress(&app, &exe_path, payload, 30, 80).await?;
    emit(&app, "extracting", 80);
    tokio::time::sleep(std::time::Duration::from_millis(160)).await;

    // ── Phase 3: shortcuts ───────────────────────────────────
    emit(&app, "shortcuts", 82);
    let make_desktop = opts.desktop_shortcut;
    tokio::task::spawn_blocking({
        let exe_path = exe_path.clone();
        move || -> Result<(), String> {
            create_start_menu_shortcut(&exe_path).map_err(|e| e.to_string())?;
            if make_desktop {
                create_desktop_shortcut(&exe_path).map_err(|e| e.to_string())?;
            }
            Ok(())
        }
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| -> Box<dyn std::error::Error> { e.into() })?;
    emit(&app, "shortcuts", 92);
    tokio::time::sleep(std::time::Duration::from_millis(140)).await;

    // ── Phase 4: registry — uninstall entry + uri scheme ─────
    emit(&app, "registering", 94);
    let install_dir_clone = install_dir.clone();
    tokio::task::spawn_blocking(move || -> Result<(), String> {
        register_uninstaller(&install_dir_clone).map_err(|e| e.to_string())?;
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| -> Box<dyn std::error::Error> { e.into() })?;
    emit(&app, "registering", 100);
    tokio::time::sleep(std::time::Duration::from_millis(120)).await;

    let _ = app.emit("install:done", ());
    Ok(())
}

async fn write_with_progress(
    app: &AppHandle,
    path: &std::path::Path,
    payload: &'static [u8],
    from: u8,
    to: u8,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut f = tokio::fs::File::create(path).await?;
    let total = payload.len();
    let chunk = (total / 24).max(1024 * 256);
    let mut written = 0usize;
    while written < total {
        let end = (written + chunk).min(total);
        f.write_all(&payload[written..end]).await?;
        written = end;
        let pct =
            from as f32 + (to as f32 - from as f32) * (written as f32 / total as f32);
        emit(app, "extracting", pct.round() as u8);
    }
    f.flush().await?;
    f.sync_all().await?;
    Ok(())
}

fn install_dir() -> Result<PathBuf, std::io::Error> {
    let local = std::env::var("LOCALAPPDATA").map_err(|_| {
        std::io::Error::new(std::io::ErrorKind::NotFound, "LOCALAPPDATA not set")
    })?;
    Ok(PathBuf::from(local).join("Programs").join("EzzCloud"))
}

fn start_menu_dir() -> Result<PathBuf, std::io::Error> {
    let appdata = std::env::var("APPDATA").map_err(|_| {
        std::io::Error::new(std::io::ErrorKind::NotFound, "APPDATA not set")
    })?;
    Ok(PathBuf::from(appdata)
        .join("Microsoft")
        .join("Windows")
        .join("Start Menu")
        .join("Programs"))
}

fn desktop_dir() -> Result<PathBuf, std::io::Error> {
    let user = std::env::var("USERPROFILE").map_err(|_| {
        std::io::Error::new(std::io::ErrorKind::NotFound, "USERPROFILE not set")
    })?;
    Ok(PathBuf::from(user).join("Desktop"))
}

fn create_start_menu_shortcut(exe: &std::path::Path) -> Result<(), Box<dyn std::error::Error>> {
    let dir = start_menu_dir()?;
    std::fs::create_dir_all(&dir)?;
    let lnk_path = dir.join("EzzCloud.lnk");
    let mut lnk = mslnk::ShellLink::new(exe)?;
    lnk.set_name(Some("EzzCloud".into()));
    lnk.set_icon_location(Some(exe.to_string_lossy().to_string()));
    lnk.create_lnk(&lnk_path)?;
    Ok(())
}

fn create_desktop_shortcut(exe: &std::path::Path) -> Result<(), Box<dyn std::error::Error>> {
    let dir = desktop_dir()?;
    std::fs::create_dir_all(&dir)?;
    let lnk_path = dir.join("EzzCloud.lnk");
    let mut lnk = mslnk::ShellLink::new(exe)?;
    lnk.set_name(Some("EzzCloud".into()));
    lnk.set_icon_location(Some(exe.to_string_lossy().to_string()));
    lnk.create_lnk(&lnk_path)?;
    Ok(())
}

fn register_uninstaller(install_dir: &std::path::Path) -> Result<(), Box<dyn std::error::Error>> {
    use winreg::enums::*;
    use winreg::RegKey;

    let exe = install_dir.join("EzzCloud.exe");

    // Drop a tiny uninstaller helper batch that nukes the install dir +
    // shortcuts + registry. Real uninstaller would be a separate exe; for a
    // current-user install a script is fine and keeps the binary small.
    let uninstall_script = install_dir.join("Uninstall-EzzCloud.cmd");
    let script = format!(
        "@echo off\r\n\
         setlocal enabledelayedexpansion\r\n\
         echo Uninstalling EzzCloud...\r\n\
         taskkill /im EzzCloud.exe /f >nul 2>&1\r\n\
         timeout /t 1 /nobreak >nul\r\n\
         del \"%USERPROFILE%\\Desktop\\EzzCloud.lnk\" >nul 2>&1\r\n\
         del \"%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\EzzCloud.lnk\" >nul 2>&1\r\n\
         reg delete \"HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\EzzCloud\" /f >nul 2>&1\r\n\
         start \"\" cmd /c \"timeout /t 1 /nobreak >nul && rmdir /s /q \"{install}\"\"\r\n\
         exit\r\n",
        install = install_dir.display()
    );
    std::fs::write(&uninstall_script, script)?;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let (key, _) = hkcu.create_subkey(
        r"Software\Microsoft\Windows\CurrentVersion\Uninstall\EzzCloud",
    )?;
    key.set_value("DisplayName", &"EzzCloud")?;
    key.set_value("DisplayVersion", &"7.0.0")?;
    key.set_value("Publisher", &"Inkerov")?;
    key.set_value("DisplayIcon", &exe.to_string_lossy().to_string())?;
    key.set_value("InstallLocation", &install_dir.to_string_lossy().to_string())?;
    key.set_value(
        "UninstallString",
        &format!("cmd /c \"{}\"", uninstall_script.display()),
    )?;
    key.set_value("NoModify", &1u32)?;
    key.set_value("NoRepair", &1u32)?;
    let size_kb: u32 = install_dir_size(install_dir) / 1024;
    key.set_value("EstimatedSize", &size_kb)?;

    Ok(())
}

fn install_dir_size(path: &std::path::Path) -> u32 {
    let mut total: u64 = 0;
    if let Ok(rd) = std::fs::read_dir(path) {
        for entry in rd.flatten() {
            if let Ok(meta) = entry.metadata() {
                if meta.is_file() {
                    total += meta.len();
                }
            }
        }
    }
    total.min(u32::MAX as u64) as u32
}

pub fn launch_app(_app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let install_dir = install_dir()?;
    let exe = install_dir.join("EzzCloud.exe");
    if !exe.exists() {
        return Err(format!("EzzCloud not installed at {}", exe.display()).into());
    }
    std::process::Command::new(&exe).spawn()?;
    Ok(())
}

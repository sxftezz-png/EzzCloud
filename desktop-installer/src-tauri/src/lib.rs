use tauri::Manager;

#[cfg(windows)]
mod install;

#[cfg(windows)]
const PAYLOAD: &[u8] = include_bytes!("../payload/EzzCloud.exe");

#[cfg(not(windows))]
const PAYLOAD: &[u8] = b"";

#[tauri::command]
async fn start_install(app: tauri::AppHandle) -> Result<(), String> {
    #[cfg(windows)]
    {
        install::run(app, PAYLOAD).await.map_err(|e| e.to_string())
    }
    #[cfg(not(windows))]
    {
        let _ = app;
        Err("This installer only runs on Windows".into())
    }
}

#[tauri::command]
async fn launch_and_exit(app: tauri::AppHandle) -> Result<(), String> {
    #[cfg(windows)]
    {
        install::launch_app(&app).map_err(|e| e.to_string())?;
        app.exit(0);
        Ok(())
    }
    #[cfg(not(windows))]
    {
        let _ = app;
        Err("not supported".into())
    }
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![start_install, launch_and_exit])
        .setup(|app| {
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.set_focus();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

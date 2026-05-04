use serde::Deserialize;
use tauri::Manager;

#[cfg(windows)]
mod install;

#[cfg(windows)]
const PAYLOAD: &[u8] = include_bytes!("../payload/EzzCloud.exe");

#[cfg(not(windows))]
const PAYLOAD: &[u8] = b"";

#[derive(Deserialize, Default, Clone, Copy)]
#[serde(rename_all = "camelCase")]
pub struct InstallOpts {
    #[serde(default = "default_true")]
    pub desktop_shortcut: bool,
}

fn default_true() -> bool {
    true
}

#[tauri::command]
async fn start_install(
    app: tauri::AppHandle,
    opts: Option<InstallOpts>,
) -> Result<(), String> {
    #[cfg(windows)]
    {
        let opts = opts.unwrap_or_default();
        install::run(app, PAYLOAD, opts)
            .await
            .map_err(|e| e.to_string())
    }
    #[cfg(not(windows))]
    {
        let _ = (app, opts);
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

#[tauri::command]
fn quit(app: tauri::AppHandle) {
    app.exit(0);
}

#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::os::windows::ffi::OsStrExt;
        use std::ffi::OsStr;
        use windows_sys::Win32::UI::Shell::ShellExecuteW;

        let op: Vec<u16> = OsStr::new("open").encode_wide().chain(Some(0)).collect();
        let target: Vec<u16> = OsStr::new(&url).encode_wide().chain(Some(0)).collect();
        // SAFETY: pointers point to valid null-terminated wide strings owned for the call's duration.
        let result = unsafe {
            ShellExecuteW(
                std::ptr::null_mut(),
                op.as_ptr(),
                target.as_ptr(),
                std::ptr::null(),
                std::ptr::null(),
                windows_sys::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL,
            )
        };
        if (result as isize) <= 32 {
            return Err(format!("ShellExecute failed: {}", result as isize));
        }
        Ok(())
    }
    #[cfg(not(windows))]
    {
        let _ = url;
        Err("not supported".into())
    }
}

#[cfg(windows)]
fn enable_dark_titlebar(win: &tauri::WebviewWindow) {
    use windows_sys::Win32::Foundation::HWND;
    use windows_sys::Win32::Graphics::Dwm::{
        DwmSetWindowAttribute, DWMWA_BORDER_COLOR, DWMWA_CAPTION_COLOR, DWMWA_TEXT_COLOR,
        DWMWA_USE_IMMERSIVE_DARK_MODE,
    };

    if let Ok(handle) = win.hwnd() {
        // See cast notes in earlier commit; this works whether `windows`
        // wraps an isize or a *mut c_void.
        let hwnd: HWND = handle.0 as HWND;

        // SAFETY: hwnd is a valid handle owned by the window we hold a reference to;
        // the values we point at outlive the call.
        unsafe {
            // 1. Dark mode for title chrome (also tints sysmenu icons white).
            let dark: i32 = 1;
            let _ = DwmSetWindowAttribute(
                hwnd,
                DWMWA_USE_IMMERSIVE_DARK_MODE as u32,
                &dark as *const _ as *const _,
                std::mem::size_of::<i32>() as u32,
            );

            // 2. Caption + border colored to match the installer body (#050507).
            //    COLORREF format = 0x00BBGGRR, so #050507 → 0x00070505.
            //    Requires Windows 11 22H2+. Older OS silently ignore it.
            let caption: u32 = 0x0007_0505;
            let _ = DwmSetWindowAttribute(
                hwnd,
                DWMWA_CAPTION_COLOR as u32,
                &caption as *const _ as *const _,
                std::mem::size_of::<u32>() as u32,
            );
            let _ = DwmSetWindowAttribute(
                hwnd,
                DWMWA_BORDER_COLOR as u32,
                &caption as *const _ as *const _,
                std::mem::size_of::<u32>() as u32,
            );

            // 3. Title text in soft white.
            let text: u32 = 0x00FA_FAFA;
            let _ = DwmSetWindowAttribute(
                hwnd,
                DWMWA_TEXT_COLOR as u32,
                &text as *const _ as *const _,
                std::mem::size_of::<u32>() as u32,
            );
        }
    }
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            start_install,
            launch_and_exit,
            quit,
            open_url
        ])
        .setup(|app| {
            if let Some(win) = app.get_webview_window("main") {
                #[cfg(windows)]
                enable_dark_titlebar(&win);
                let _ = win.set_focus();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

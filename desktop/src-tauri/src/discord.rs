use std::sync::{Arc, Mutex};

use discord_rich_presence::{
    activity::{Activity, ActivityType, Assets, Button, StatusDisplayType, Timestamps},
    DiscordIpc, DiscordIpcClient,
};

use crate::constants::DISCORD_CLIENT_ID;

pub struct DiscordState {
    pub client: Mutex<Option<DiscordIpcClient>>,
}

#[derive(serde::Deserialize)]
pub struct DiscordTrackInfo {
    title: String,
    artist: String,
    artwork_url: Option<String>,
    track_url: Option<String>,
    app_url: Option<String>,
    duration_secs: Option<i64>,
    elapsed_secs: Option<i64>,
    is_playing: Option<bool>,
    mode: Option<DiscordRpcMode>,
    show_button: Option<bool>,
    button_mode: Option<DiscordRpcButtonMode>,
    lyric_line: Option<String>,
}

#[derive(Clone, Copy, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DiscordRpcMode {
    Text,
    Track,
    Artist,
    Activity,
}

#[derive(Clone, Copy, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DiscordRpcButtonMode {
    Soundcloud,
    App,
    Both,
}

#[tauri::command]
pub fn discord_connect(state: tauri::State<'_, Arc<DiscordState>>) -> Result<bool, String> {
    let mut guard = state.client.lock().map_err(|e| e.to_string())?;
    if guard.is_some() {
        return Ok(true);
    }
    let mut client = DiscordIpcClient::new(DISCORD_CLIENT_ID);
    match client.connect() {
        Ok(_) => {
            println!("[Discord] Connected");
            *guard = Some(client);
            Ok(true)
        }
        Err(e) => {
            println!("[Discord] Connection failed: {e}");
            Err(format!("Connection failed: {e}"))
        }
    }
}

#[tauri::command]
pub fn discord_disconnect(state: tauri::State<'_, Arc<DiscordState>>) {
    let Ok(mut guard) = state.client.lock() else {
        return;
    };
    if let Some(ref mut client) = *guard {
        let _ = client.close();
        println!("[Discord] Disconnected");
    }
    *guard = None;
}

#[tauri::command]
pub fn discord_set_activity(
    state: tauri::State<'_, Arc<DiscordState>>,
    track: DiscordTrackInfo,
) -> Result<(), String> {
    let mut guard = state.client.lock().map_err(|e| e.to_string())?;
    let client = guard.as_mut().ok_or("Discord not connected")?;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    let elapsed = track.elapsed_secs.unwrap_or(0);
    let start = now - elapsed;
    let is_playing = track.is_playing.unwrap_or(true);
    let mode = track.mode.unwrap_or(DiscordRpcMode::Artist);
    let show_button = track.show_button.unwrap_or(true);
    let button_mode = track
        .button_mode
        .unwrap_or(DiscordRpcButtonMode::Soundcloud);
    let text_mode_details = if matches!(mode, DiscordRpcMode::Text) {
        Some(format!("{} - {}", track.title, track.artist))
    } else {
        None
    };

    let mut timestamps = Timestamps::new().start(start);
    if let Some(dur) = track.duration_secs.filter(|d| *d > 0) {
        timestamps = timestamps.end(start + dur);
    }

    let large_image = track
        .artwork_url
        .as_deref()
        .filter(|s| !s.is_empty())
        .unwrap_or("soundcloud_logo");
    let large_text = format!("{} \u{2014} {}", track.title, track.artist);

    let assets = Assets::new()
        .large_image(large_image)
        .large_text(large_text.as_str());

    let mut activity = Activity::new()
        .activity_type(ActivityType::Listening)
        .assets(assets);

    if !is_playing {
        activity = activity
            .status_display_type(StatusDisplayType::Name)
            .details("EzzCloud");
    } else {
        activity = match mode {
            DiscordRpcMode::Text => {
                let state_text = track.lyric_line.as_deref().unwrap_or(track.artist.as_str());
                activity
                    .status_display_type(StatusDisplayType::Details)
                    .details(text_mode_details.as_deref().unwrap_or(track.title.as_str()))
                    .state(state_text)
            }
            DiscordRpcMode::Track => activity
                .status_display_type(StatusDisplayType::Details)
                .details(&track.title)
                .state(track.artist.as_str()),
            // "Listening to <artist>" header + title (large) + artist (state) + progress bar.
            DiscordRpcMode::Artist => activity
                .status_display_type(StatusDisplayType::State)
                .details(&track.title)
                .state(track.artist.as_str()),
            DiscordRpcMode::Activity => activity
                .status_display_type(StatusDisplayType::Name)
                .details("Listening on SoundCloud"),
        };
    }

    if is_playing {
        activity = activity.timestamps(timestamps);
    }

    if show_button {
        let mut buttons = Vec::with_capacity(2);

        if matches!(
            button_mode,
            DiscordRpcButtonMode::Soundcloud | DiscordRpcButtonMode::Both
        ) {
            if let Some(ref url) = track.track_url {
                buttons.push(Button::new("Listen on SoundCloud", url));
            }
        }

        if matches!(
            button_mode,
            DiscordRpcButtonMode::App | DiscordRpcButtonMode::Both
        ) {
            if let Some(ref url) = track.app_url {
                buttons.push(Button::new("Listen in App", url));
            }
        }

        if !buttons.is_empty() {
            activity = activity.buttons(buttons);
        }
    }

    let result = client.set_activity(activity);

    if result.is_err() {
        *guard = None;
    }

    result.map_err(|e| format!("set_activity: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn discord_clear_activity(state: tauri::State<'_, Arc<DiscordState>>) -> Result<(), String> {
    let mut guard = state.client.lock().map_err(|e| e.to_string())?;
    if let Some(ref mut client) = *guard {
        client
            .clear_activity()
            .map_err(|e| format!("clear_activity: {e}"))?;
    }
    Ok(())
}

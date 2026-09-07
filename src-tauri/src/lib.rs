use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition};

#[derive(Clone, Copy, Default, Serialize, Deserialize)]
struct HitRect {
    x: f64,
    y: f64,
    w: f64,
    h: f64,
}

#[derive(Clone, Copy, Default, Serialize, Deserialize)]
struct HitRegions {
    character: Option<HitRect>,
    bubble: Option<HitRect>,
}

struct HitState {
    regions: Mutex<HitRegions>,
}

fn contains(rect: HitRect, x: f64, y: f64) -> bool {
    x >= rect.x && y >= rect.y && x <= rect.x + rect.w && y <= rect.y + rect.h
}

fn over_hit(regions: HitRegions, x: f64, y: f64) -> bool {
    regions.character.is_some_and(|r| contains(r, x, y))
        || regions.bubble.is_some_and(|r| contains(r, x, y))
}

fn position_bottom_right(window: &tauri::WebviewWindow) {
    let Ok(Some(monitor)) = window.primary_monitor() else {
        return;
    };
    let Ok(size) = window.inner_size() else {
        return;
    };
    let screen = monitor.size();
    let x = screen.width.saturating_sub(size.width).saturating_sub(20) as i32;
    let y = screen.height.saturating_sub(size.height).saturating_sub(56) as i32;
    let _ = window.set_position(PhysicalPosition::new(x, y));
}

#[tauri::command]
fn set_clickthrough(app: AppHandle, enabled: bool) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_ignore_cursor_events(enabled);
    }
}

#[tauri::command]
fn update_hit_regions(app: AppHandle, character: Option<HitRect>, bubble: Option<HitRect>) {
    if let Some(state) = app.try_state::<Arc<HitState>>() {
        *state.regions.lock().expect("hit lock") = HitRegions { character, bubble };
    }
}

fn spawn_hit_poller(app: AppHandle, state: Arc<HitState>) {
    thread::spawn(move || loop {
        thread::sleep(Duration::from_millis(32));
        let Some(window) = app.get_webview_window("main") else {
            continue;
        };
        let Ok(cursor) = window.cursor_position() else {
            continue;
        };
        let Ok(outer) = window.outer_position() else {
            continue;
        };
        let Ok(scale) = window.scale_factor() else {
            continue;
        };
        let local_x = (cursor.x - f64::from(outer.x)) / scale;
        let local_y = (cursor.y - f64::from(outer.y)) / scale;
        let regions = *state.regions.lock().expect("hit lock");
        if over_hit(regions, local_x, local_y) {
            let _ = window.set_ignore_cursor_events(false);
        }
    });
}

fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "Göster", true, None::<&str>)?;
    let hide = MenuItem::with_id(app, "hide", "Gizle", true, None::<&str>)?;
    let tts_on = MenuItem::with_id(app, "tts-on", "Ses aç", true, None::<&str>)?;
    let tts_off = MenuItem::with_id(app, "tts-off", "Sesi kapat", true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let aniko = MenuItem::with_id(app, "char-aniko", "Karakter: Aniko", true, None::<&str>)?;
    let akari = MenuItem::with_id(app, "char-akari", "Karakter: Akari", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Çıkış", true, None::<&str>)?;
    let menu = Menu::with_items(
        app,
        &[&show, &hide, &tts_on, &tts_off, &sep, &aniko, &akari, &quit],
    )?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().expect("window icon").clone())
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "hide" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }
            "tts-on" => {
                let _ = app.emit("aniko://tts", true);
            }
            "tts-off" => {
                let _ = app.emit("aniko://tts", false);
            }
            "char-aniko" => {
                let _ = app.emit("aniko://character", "aniko");
            }
            "char-akari" => {
                let _ = app.emit("aniko://character", "akari");
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            set_clickthrough,
            update_hit_regions
        ])
        .setup(|app| {
            let state = Arc::new(HitState {
                regions: Mutex::new(HitRegions::default()),
            });
            app.manage(state.clone());
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_shadow(false);
                let _ = window.set_background_color(Some(tauri::window::Color(0, 0, 0, 0)));
                position_bottom_right(&window);
            }
            build_tray(app.handle())?;
            spawn_hit_poller(app.handle().clone(), state);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Aniko başlatılamadı");
}

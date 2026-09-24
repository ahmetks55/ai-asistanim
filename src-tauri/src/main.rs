#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::net::TcpStream;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::Mutex;
use std::time::Duration;
use tauri::tray::TrayIconBuilder;
use tauri::{Emitter, Manager};

const BRIDGE_PORT: u16 = 8788;
const HEALTH_URL: &str = "http://127.0.0.1:8788/health";

static BRIDGE_PID: Mutex<Option<u32>> = Mutex::new(None);

fn kill_bridge(pid: u32) {
    #[cfg(windows)]
    {
        let _ = Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status();
    }
    #[cfg(not(windows))]
    {
        let _ = Command::new("kill")
            .arg("-9")
            .arg(pid.to_string())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status();
    }
}

fn bridge_up() -> bool {
    TcpStream::connect(("127.0.0.1", BRIDGE_PORT)).is_ok()
}

fn find_bridge_dir() -> Option<PathBuf> {
    let mut candidates: Vec<PathBuf> = Vec::new();

    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            candidates.push(dir.to_path_buf());
            candidates.push(dir.join("bridge"));
            candidates.push(dir.join("resources").join("bridge"));
            candidates.push(dir.join(".."));
        }
    }
    if let Ok(cwd) = std::env::current_dir() {
        candidates.push(cwd.clone());
        candidates.push(cwd.join("bridge"));
        candidates.push(cwd.join("src-tauri").join("bridge"));
        candidates.push(cwd.join("src-tauri").join("target").join("release").join("bridge"));
    }

    for dir in candidates {
        if dir.join("server.js").is_file() {
            return Some(dir);
        }
    }
    None
}

fn node_command() -> Option<String> {
    for name in ["node", "node.exe"] {
        if Command::new(name)
            .arg("--version")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
        {
            return Some(name.to_string());
        }
    }
    let guess = r"C:\Program Files\nodejs\node.exe";
    if Path::new(guess).is_file() {
        return Some(guess.to_string());
    }
    None
}

fn start_bridge() -> Result<(), String> {
    if bridge_up() {
        return Ok(());
    }
    let dir = find_bridge_dir().ok_or_else(|| "server.js bulunamadı".to_string())?;
    let node = node_command().ok_or_else(|| "Node.js bulunamadı".to_string())?;
    let server = dir.join("server.js");

    let mut cmd = Command::new(node);
    cmd.arg(&server)
        .current_dir(&dir)
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    let child = cmd.spawn().map_err(|e| format!("köprü başlatılamadı: {e}"))?;
    if let Ok(mut pid) = BRIDGE_PID.lock() {
        *pid = Some(child.id());
    }

    for _ in 0..40 {
        if bridge_up() {
            return Ok(());
        }
        std::thread::sleep(Duration::from_millis(250));
    }
    if bridge_up() {
        Ok(())
    } else {
        Err("köprü port 8788'e bağlanamadı".into())
    }
}

fn health_ok() -> bool {
    match ureq_get(HEALTH_URL) {
        Ok(body) => body.contains("ok"),
        Err(_) => false,
    }
}

fn ureq_get(url: &str) -> Result<String, String> {
    // std only HTTP GET (Tauri penceresi açılmadan önce de kullanilir)
    let rest = url
        .strip_prefix("http://")
        .ok_or_else(|| "yalnızca http".to_string())?;
    let (host_port, path) = match rest.find('/') {
        Some(i) => (&rest[..i], &rest[i..]),
        None => (rest, "/"),
    };
    let (host, port) = match host_port.rsplit_once(':') {
        Some((h, p)) => (
            h.to_string(),
            p.parse::<u16>().map_err(|_| "port".to_string())?,
        ),
        None => (host_port.to_string(), 80),
    };
    let mut stream =
        std::net::TcpStream::connect((host.as_str(), port)).map_err(|e| e.to_string())?;
    stream
        .set_read_timeout(Some(Duration::from_secs(3)))
        .ok();
    use std::io::{Read, Write};
    let req = format!(
        "GET {path} HTTP/1.1\r\nHost: {host_port}\r\nConnection: close\r\n\r\n"
    );
    stream
        .write_all(req.as_bytes())
        .map_err(|e| e.to_string())?;
    let mut buf = String::new();
    stream
        .read_to_string(&mut buf)
        .map_err(|e| e.to_string())?;
    Ok(buf)
}

fn main() {
    let bridge_status = match start_bridge() {
        Ok(()) => "ok".to_string(),
        Err(e) => e,
    };
    let health = health_ok();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(move |app| {
            let icon = app
                .default_window_icon()
                .cloned()
                .expect("varsayılan ikon yok");

            let mut builder = TrayIconBuilder::with_id("main")
                .icon(icon)
                .tooltip("AI Asistanım")
                .show_menu_on_left_click(true)
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::DoubleClick { .. } = event {
                        let app = tray.app_handle();
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
                    }
                });

            if let Ok(menu) = tauri::menu::Menu::with_items(
                app.handle(),
                &[
                    &tauri::menu::MenuItem::with_id(app.handle(), "show", "Asistanı Göster", true, None::<&str>)?,
                    &tauri::menu::PredefinedMenuItem::separator(app.handle())?,
                    &tauri::menu::MenuItem::with_id(app.handle(), "quit", "Çıkış", true, None::<&str>)?,
                ],
            ) {
                builder = builder.menu(&menu);
                builder = builder.on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                });
            }

            builder
                .build(app)
                .map_err(|e| format!("tray: {e}"))?;

            let _ = app.emit(
                "bridge-status",
                serde_json::json!({ "status": bridge_status, "health": health }),
            );
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Kapatınca gizle (tray'de kalsın)
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .build(tauri::generate_context!())
        .expect("Tauri uygulaması başlatılamadı")
        .run(|_app, event| {
            if let tauri::RunEvent::Exit = event {
                if let Ok(pid) = BRIDGE_PID.lock() {
                    if let Some(p) = *pid {
                        kill_bridge(p);
                    }
                }
            }
        });
}

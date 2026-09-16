#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use tauri::Manager;

fn main() {
    // Köprü sunucusunu başlat
    let _ = Command::new("node")
        .arg("server.js")
        .current_dir(std::env::current_dir().unwrap_or_default())
        .spawn();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Sistem tepsisi (tray) ekle
            #[cfg(desktop)]
            {
                let _tray = app.tray_by_id("main");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Tauri uygulaması başlatılamadı");
}

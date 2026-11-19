mod files;
mod spreadsheet;
mod xlsx;

use std::path::PathBuf;
use tauri::Manager;

#[tauri::command]
fn read_spreadsheet(path: PathBuf) -> Result<Vec<spreadsheet::Sheet>, String> {
    spreadsheet::read_sheets(&path)
}

#[tauri::command]
fn read_text_file(path: PathBuf) -> Result<String, String> {
    files::read(&path)
}

#[tauri::command]
fn write_text_file(path: PathBuf, contents: String) -> Result<(), String> {
    files::write_atomic(&path, &contents)
}

#[tauri::command]
fn write_xlsx(path: PathBuf, workbook: xlsx::WorkbookSpec) -> Result<(), String> {
    xlsx::write_workbook(&path, &workbook)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;
            Ok(())
        })
        // Mit dem Hauptfenster endet das Programm, auch wenn das Beamer-Fenster noch offen ist.
        .on_window_event(|window, event| {
            if window.label() == "main" && matches!(event, tauri::WindowEvent::Destroyed) {
                window.app_handle().exit(0);
            }
        })
        .invoke_handler(tauri::generate_handler![
            read_spreadsheet,
            read_text_file,
            write_text_file,
            write_xlsx
        ])
        .run(tauri::generate_context!())
        .expect("Fehler beim Starten der Anwendung");
}

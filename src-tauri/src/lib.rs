use std::fs;
use std::path::PathBuf;

#[tauri::command]
fn save_json_next_to_exe(filename: String, content: String) -> Result<String, String> {
    let exe_path = std::env::current_exe()
        .map_err(|error| format!("Could not get exe path: {}", error))?;

    let exe_dir = exe_path
        .parent()
        .ok_or_else(|| "Could not get exe directory".to_string())?;

    let export_dir: PathBuf = exe_dir.join("e7-jsons");
    fs::create_dir_all(&export_dir)
        .map_err(|error| format!("Could not create export folder: {}", error))?;

    let safe_filename = filename
        .replace("/", "_")
        .replace("\\", "_")
        .replace(":", "_")
        .replace("*", "_")
        .replace("?", "_")
        .replace("\"", "_")
        .replace("<", "_")
        .replace(">", "_")
        .replace("|", "_");

    let target_path = export_dir.join(safe_filename);

    fs::write(&target_path, content)
        .map_err(|error| format!("Could not write JSON file: {}", error))?;

    Ok(target_path.to_string_lossy().to_string())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![save_json_next_to_exe])
        .run(tauri::generate_context!())
        .expect("error while running Epic Seven GW Tracker");
}

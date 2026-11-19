//! Speichern und Laden der Wettkampfdatei. Geschrieben wird erst in eine
//! temporäre Datei und dann umbenannt, damit bei einem Absturz nie eine halbe
//! Datei übrig bleibt. Die vorherige Fassung bleibt als `.bak` erhalten.

use std::fs;
use std::path::{Path, PathBuf};

fn with_suffix(path: &Path, suffix: &str) -> PathBuf {
    let mut name = path.as_os_str().to_owned();
    name.push(suffix);
    PathBuf::from(name)
}

pub fn write_atomic(path: &Path, contents: &str) -> Result<(), String> {
    let tmp = with_suffix(path, ".tmp");
    fs::write(&tmp, contents).map_err(|e| format!("Speichern fehlgeschlagen: {e}"))?;
    if path.exists() {
        fs::copy(path, with_suffix(path, ".bak"))
            .map_err(|e| format!("Sicherungskopie fehlgeschlagen: {e}"))?;
    }
    fs::rename(&tmp, path).map_err(|e| format!("Speichern fehlgeschlagen: {e}"))
}

pub fn read(path: &Path) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| format!("Datei konnte nicht geöffnet werden: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn schreibt_atomar_und_behaelt_sicherung() {
        let dir = std::env::temp_dir().join(format!("gvm-test-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let file = dir.join("wettkampf.gvm");
        write_atomic(&file, "eins").unwrap();
        write_atomic(&file, "zwei").unwrap();
        assert_eq!(read(&file).unwrap(), "zwei");
        assert_eq!(read(&with_suffix(&file, ".bak")).unwrap(), "eins");
        assert!(!with_suffix(&file, ".tmp").exists());
        fs::remove_dir_all(dir).unwrap();
    }
}

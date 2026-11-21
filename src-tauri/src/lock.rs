//! Sperre für die geöffnete Wettkampfdatei. Neben `foo.gvm` liegt `foo.gvm.lock`; solange der
//! Wettkampf offen ist, hält das Programm diese Datei offen. Unter Windows darf sie dabei kein
//! anderer Prozess zum Schreiben öffnen (auch nicht auf Netzlaufwerken), ein zweites Fenster mit
//! derselben Datei bekommt also eine Fehlermeldung. Stürzt das Programm ab, gibt das
//! Betriebssystem die Datei frei; die liegen gebliebene `.lock`-Datei stört dann nicht.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::{self, File, OpenOptions};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

/// Fehlertexte mit diesem Anfang bedeuten: Datei ist woanders geöffnet. Dahinter steht JSON mit [`LockOwner`].
pub const LOCKED_PREFIX: &str = "LOCKED:";

/// Wer die Datei geöffnet hat; steht in der `.lock`-Datei.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct LockOwner {
    pub host: String,
    /// Millisekunden seit 1970, das Frontend formatiert die Uhrzeit.
    pub since: u64,
    pub pid: u32,
}

/// Alle Sperren dieses Prozesses, je Wettkampfdatei die offene `.lock`-Datei.
#[derive(Default)]
pub struct Locks(Mutex<HashMap<PathBuf, File>>);

pub fn lock_path(path: &Path) -> PathBuf {
    let mut name = path.as_os_str().to_owned();
    name.push(".lock");
    PathBuf::from(name)
}

fn current_owner() -> LockOwner {
    let host = std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "unbekannt".into());
    let since = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);
    LockOwner { host, since, pid: std::process::id() }
}

fn read_owner(lock: &Path) -> Option<LockOwner> {
    let mut text = String::new();
    File::open(lock).ok()?.read_to_string(&mut text).ok()?;
    serde_json::from_str(&text).ok()
}

fn locked_error(lock: &Path) -> String {
    match read_owner(lock) {
        Some(owner) => format!("{LOCKED_PREFIX}{}", serde_json::to_string(&owner).unwrap_or_default()),
        None => format!("{LOCKED_PREFIX}{{}}"),
    }
}

#[cfg(windows)]
fn open_exclusive(lock: &Path) -> Result<File, String> {
    use std::os::windows::fs::OpenOptionsExt;
    const FILE_SHARE_READ: u32 = 1;
    const ERROR_SHARING_VIOLATION: i32 = 32;
    const ERROR_LOCK_VIOLATION: i32 = 33;
    OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .share_mode(FILE_SHARE_READ)
        .open(lock)
        .map_err(|e| match e.raw_os_error() {
            Some(ERROR_SHARING_VIOLATION) | Some(ERROR_LOCK_VIOLATION) => locked_error(lock),
            _ => format!("Sperrdatei konnte nicht angelegt werden: {e}"),
        })
}

#[cfg(not(windows))]
fn open_exclusive(lock: &Path) -> Result<File, String> {
    // Ohne Windows-Freigabemodus: beratende Sperre. Die Datei erst ohne Kürzen öffnen,
    // damit ein zweiter Prozess den Inhalt des ersten nicht löscht, bevor er scheitert.
    let file = OpenOptions::new()
        .read(true)
        .write(true)
        .create(true)
        .truncate(false)
        .open(lock)
        .map_err(|e| format!("Sperrdatei konnte nicht angelegt werden: {e}"))?;
    match file.try_lock() {
        Ok(()) => {
            file.set_len(0).map_err(|e| format!("Sperrdatei konnte nicht beschrieben werden: {e}"))?;
            Ok(file)
        }
        Err(std::fs::TryLockError::WouldBlock) => Err(locked_error(lock)),
        Err(std::fs::TryLockError::Error(e)) => Err(format!("Sperrdatei konnte nicht angelegt werden: {e}")),
    }
}

impl Locks {
    /// Sperrt `path` für diesen Prozess. Ist die Datei schon von hier gesperrt, passiert nichts.
    pub fn lock(&self, path: &Path) -> Result<(), String> {
        let mut locks = self.0.lock().map_err(|_| "Sperre nicht verfügbar".to_string())?;
        if locks.contains_key(path) {
            return Ok(());
        }
        let lock = lock_path(path);
        let mut file = open_exclusive(&lock)?;
        let owner = serde_json::to_string(&current_owner()).unwrap_or_default();
        file.write_all(owner.as_bytes())
            .and_then(|_| file.flush())
            .map_err(|e| format!("Sperrdatei konnte nicht beschrieben werden: {e}"))?;
        locks.insert(path.to_path_buf(), file);
        Ok(())
    }

    /// Gibt die Sperre frei und löscht die `.lock`-Datei.
    pub fn unlock(&self, path: &Path) {
        let Ok(mut locks) = self.0.lock() else { return };
        if let Some(file) = locks.remove(path) {
            drop(file);
            let _ = fs::remove_file(lock_path(path));
        }
    }

    /// Gibt alle Sperren frei (beim Beenden).
    pub fn unlock_all(&self) {
        let paths: Vec<PathBuf> = match self.0.lock() {
            Ok(locks) => locks.keys().cloned().collect(),
            Err(_) => return,
        };
        for path in paths {
            self.unlock(&path);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("gvm-lock-{name}-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn gleiche_datei_ist_fuer_andere_gesperrt() {
        let dir = temp_dir("gleich");
        let file = dir.join("wettkampf.gvm");
        let erstes = Locks::default();
        let zweites = Locks::default();
        erstes.lock(&file).unwrap();
        // Dasselbe Fenster darf die Datei erneut sperren.
        erstes.lock(&file).unwrap();
        let fehler = zweites.lock(&file).unwrap_err();
        assert!(fehler.starts_with(LOCKED_PREFIX), "{fehler}");
        let owner: LockOwner = serde_json::from_str(&fehler[LOCKED_PREFIX.len()..]).unwrap();
        assert_eq!(owner.pid, std::process::id());

        erstes.unlock(&file);
        assert!(!lock_path(&file).exists());
        zweites.lock(&file).unwrap();
        zweites.unlock_all();
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn verschiedene_dateien_gehen_gleichzeitig() {
        let dir = temp_dir("verschieden");
        let erstes = Locks::default();
        let zweites = Locks::default();
        erstes.lock(&dir.join("a.gvm")).unwrap();
        zweites.lock(&dir.join("b.gvm")).unwrap();
        erstes.unlock_all();
        zweites.unlock_all();
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn liegen_gebliebene_sperrdatei_stoert_nicht() {
        let dir = temp_dir("alt");
        let file = dir.join("wettkampf.gvm");
        fs::write(lock_path(&file), "{\"host\":\"alt\",\"since\":0,\"pid\":1}").unwrap();
        let locks = Locks::default();
        locks.lock(&file).unwrap();
        locks.unlock(&file);
        fs::remove_dir_all(dir).unwrap();
    }
}

//! Liest Tabellenblätter (.xls, .xlsx, .ods) als einfaches Zellraster.
//! Die fachliche Auswertung des Meldebogens passiert im TypeScript-Kern.

use calamine::{Data, Reader, open_workbook_auto};
use serde::Serialize;
use std::path::Path;

#[derive(Debug, Serialize, PartialEq)]
#[serde(untagged)]
pub enum Cell {
    Text(String),
    Number(f64),
    Bool(bool),
    Empty,
}

#[derive(Debug, Serialize)]
pub struct Sheet {
    pub name: String,
    pub rows: Vec<Vec<Cell>>,
}

fn to_cell(data: &Data) -> Cell {
    match data {
        Data::String(s) => Cell::Text(s.clone()),
        Data::Float(f) => Cell::Number(*f),
        Data::Int(i) => Cell::Number(*i as f64),
        Data::Bool(b) => Cell::Bool(*b),
        Data::DateTime(d) => Cell::Number(d.as_f64()),
        Data::DateTimeIso(s) | Data::DurationIso(s) => Cell::Text(s.clone()),
        Data::Error(_) | Data::Empty => Cell::Empty,
    }
}

pub fn read_sheets(path: &Path) -> Result<Vec<Sheet>, String> {
    let mut workbook =
        open_workbook_auto(path).map_err(|e| format!("Datei konnte nicht gelesen werden: {e}"))?;
    let mut sheets = Vec::new();
    for name in workbook.sheet_names() {
        let range = workbook
            .worksheet_range(&name)
            .map_err(|e| format!("Blatt „{name}“ konnte nicht gelesen werden: {e}"))?;
        // Das Raster beginnt immer bei A1, damit Zeilen- und Spaltennummern stimmen.
        let (start_row, start_col) = range.start().unwrap_or((0, 0));
        let mut rows: Vec<Vec<Cell>> = (0..start_row).map(|_| Vec::new()).collect();
        for row in range.rows() {
            let mut cells: Vec<Cell> = (0..start_col).map(|_| Cell::Empty).collect();
            cells.extend(row.iter().map(to_cell));
            rows.push(cells);
        }
        sheets.push(Sheet { name, rows });
    }
    Ok(sheets)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn liest_leeren_meldebogen() {
        let path = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../tests/fixtures/meldebogen-vorlage-2026.xls");
        let sheets = read_sheets(&path).expect("Vorlage lesbar");
        let first = &sheets[0];
        assert_eq!(first.name, "Tabelle1");
        assert_eq!(first.rows[7][0], Cell::Text("Name".into()));
        assert_eq!(first.rows[7][6], Cell::Text("2.Kür".into()));
    }

    /// Zahlen als f64 vergleichen, damit 2008 und 2008.0 gleich sind.
    fn normalize(value: serde_json::Value) -> serde_json::Value {
        use serde_json::Value;
        match value {
            Value::Number(n) => Value::from(n.as_f64().unwrap()),
            Value::Array(items) => Value::Array(items.into_iter().map(normalize).collect()),
            Value::Object(map) => {
                Value::Object(map.into_iter().map(|(k, v)| (k, normalize(v))).collect())
            }
            other => other,
        }
    }

    /// Das Raster muss exakt dem entsprechen, mit dem die TypeScript-Tests arbeiten.
    #[test]
    fn liefert_dasselbe_raster_wie_die_ts_fixture() {
        let fixtures = Path::new(env!("CARGO_MANIFEST_DIR")).join("../tests/fixtures");
        let sheets = read_sheets(&fixtures.join("meldebogen-beispiel.xlsx")).unwrap();
        let expected: serde_json::Value = serde_json::from_str(
            &std::fs::read_to_string(fixtures.join("meldebogen-beispiel.sheets.json")).unwrap(),
        )
        .unwrap();
        assert_eq!(
            normalize(serde_json::to_value(&sheets).unwrap()),
            normalize(expected)
        );
    }
}

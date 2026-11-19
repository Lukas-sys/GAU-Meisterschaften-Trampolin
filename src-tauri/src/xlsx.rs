//! Schreibt eine Excel-Datei (.xlsx) aus einer einfachen Tabellenbeschreibung.
//! Was in welcher Zelle steht, entscheidet die Oberfläche (src/core/workbook.ts);
//! hier geht es nur um Formatierung und das Dateiformat.

use rust_xlsxwriter::{Color, Format, FormatAlign, FormatBorder, Workbook, Worksheet, XlsxError};
use serde::Deserialize;
use std::path::Path;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkbookSpec {
    pub sheets: Vec<SheetSpec>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SheetSpec {
    pub name: String,
    /// Überschrift über der Tabelle (fett, größer); optional.
    #[serde(default)]
    pub title: Option<String>,
    pub columns: Vec<ColumnSpec>,
    pub rows: Vec<Vec<CellSpec>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ColumnSpec {
    pub header: String,
    #[serde(default)]
    pub width: Option<f64>,
    /// "points" = Punkte mit 2 (bei Bedarf 3) Nachkommastellen.
    #[serde(default)]
    pub kind: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum CellSpec {
    /// null: Zelle bleibt leer.
    Empty,
    Number(f64),
    Text(String),
    Styled(StyledCell),
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StyledCell {
    pub value: Option<Value>,
    #[serde(default)]
    pub bold: bool,
    #[serde(default)]
    pub muted: bool,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum Value {
    Number(f64),
    Text(String),
}

struct Styles {
    title: Format,
    header: Format,
    header_right: Format,
}

fn cell_format(points: bool, bold: bool, muted: bool) -> Format {
    let mut format = Format::new();
    if points {
        format = format.set_num_format("0.00#");
    }
    if bold {
        format = format.set_bold();
    }
    if muted {
        format = format.set_font_color(Color::RGB(0x7B8794));
    }
    format
}

fn write_sheet(sheet: &mut Worksheet, spec: &SheetSpec, styles: &Styles) -> Result<(), XlsxError> {
    // Excel erlaubt höchstens 31 Zeichen und keine []:*?/\ im Blattnamen.
    let name: String = spec
        .name
        .chars()
        .filter(|c| !"[]:*?/\\".contains(*c))
        .take(31)
        .collect();
    sheet.set_name(if name.is_empty() { "Tabelle" } else { &name })?;

    let mut row: u32 = 0;
    if let Some(title) = &spec.title {
        sheet.write_string_with_format(0, 0, title, &styles.title)?;
        row = 2;
    }
    let header_row = row;
    for (col, column) in spec.columns.iter().enumerate() {
        let col = col as u16;
        let points = column.kind.as_deref() == Some("points");
        let header = if points { &styles.header_right } else { &styles.header };
        sheet.write_string_with_format(header_row, col, &column.header, header)?;
        sheet.set_column_width(col, column.width.unwrap_or(12.0))?;
    }
    for cells in &spec.rows {
        row += 1;
        for (col, cell) in cells.iter().enumerate() {
            let points = spec.columns.get(col).and_then(|c| c.kind.as_deref()) == Some("points");
            let (value, bold, muted) = match cell {
                CellSpec::Empty => continue,
                CellSpec::Number(n) => (Value::Number(*n), false, false),
                CellSpec::Text(t) => (Value::Text(t.clone()), false, false),
                CellSpec::Styled(s) => match &s.value {
                    Some(Value::Number(n)) => (Value::Number(*n), s.bold, s.muted),
                    Some(Value::Text(t)) => (Value::Text(t.clone()), s.bold, s.muted),
                    None => continue,
                },
            };
            let format = cell_format(points, bold, muted);
            let col = col as u16;
            match value {
                Value::Number(n) => sheet.write_number_with_format(row, col, n, &format)?,
                Value::Text(t) => sheet.write_string_with_format(row, col, &t, &format)?,
            };
        }
    }
    let last_col = spec.columns.len().saturating_sub(1) as u16;
    sheet.set_freeze_panes(header_row + 1, 0)?;
    // Drucken: quer, alle Spalten auf einer Seitenbreite, Kopfzeile auf jeder Seite.
    sheet.set_landscape();
    sheet.set_print_fit_to_pages(1, 0);
    sheet.set_repeat_rows(header_row, header_row)?;
    if !spec.rows.is_empty() {
        sheet.autofilter(header_row, 0, row, last_col)?;
    }
    Ok(())
}

pub fn write_workbook(path: &Path, spec: &WorkbookSpec) -> Result<(), String> {
    let header = Format::new()
        .set_bold()
        .set_background_color(Color::RGB(0xE4EBF3))
        .set_border_bottom(FormatBorder::Thin);
    let styles = Styles {
        title: Format::new().set_bold().set_font_size(14),
        header_right: header.clone().set_align(FormatAlign::Right),
        header,
    };
    let mut workbook = Workbook::new();
    for sheet_spec in &spec.sheets {
        let sheet = workbook.add_worksheet();
        write_sheet(sheet, sheet_spec, &styles).map_err(|e| format!("Excel-Datei: {e}"))?;
    }
    workbook
        .save(path)
        .map_err(|e| format!("Excel-Datei konnte nicht gespeichert werden: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use calamine::{Data, Reader, Xlsx, open_workbook};

    #[test]
    fn schreibt_blaetter_und_liest_sie_wieder() {
        let spec: WorkbookSpec = serde_json::from_str(
            r#"{"sheets":[
                {"name":"OK: Ergebnis","title":"Oberklasse","columns":[
                    {"header":"Rang","width":6},{"header":"Mannschaft","width":30},{"header":"Gesamt","kind":"points"}],
                 "rows":[[1,"TV Musterdorf 1",{"value":123.45,"bold":true}],[2,"SV Beispiel",null]]},
                {"name":"Leer","columns":[{"header":"A"}],"rows":[]}
            ]}"#,
        )
        .unwrap();
        let dir = std::env::temp_dir().join(format!("gvm-xlsx-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let file = dir.join("ergebnis.xlsx");
        write_workbook(&file, &spec).unwrap();

        let mut book: Xlsx<_> = open_workbook(&file).unwrap();
        assert_eq!(book.sheet_names(), vec!["OK Ergebnis", "Leer"]);
        let range = book.worksheet_range("OK Ergebnis").unwrap();
        assert_eq!(range.get_value((0, 0)), Some(&Data::String("Oberklasse".into())));
        assert_eq!(range.get_value((2, 1)), Some(&Data::String("Mannschaft".into())));
        assert_eq!(range.get_value((3, 2)), Some(&Data::Float(123.45)));
        assert_eq!(range.get_value((4, 1)), Some(&Data::String("SV Beispiel".into())));
        std::fs::remove_dir_all(&dir).ok();
    }
}

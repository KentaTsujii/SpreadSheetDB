import {get_file, delete_file, get_or_create_dir, get_or_create_file} from 'drivefileutils';

/**
 * スプレッドシートをデータベースとして扱うためのクラス
 */
export class SpreadSheetDB {
  file_full_path: string
  file: GoogleAppsScript.Spreadsheet.Spreadsheet
  query_sheet: GoogleAppsScript.Spreadsheet.Sheet
  table_info_sheet: GoogleAppsScript.Spreadsheet.Sheet

  /**
   * コンストラクタです
   * @param {string} name データベース名
   * @param {string} path ディレクトリ（デフォルト: spreadsheet_db)
   */
  constructor(name: string, path: string = 'spreadsheet_db') {
    this.file_full_path = path + "/" + name + ".xlsx";
    this.file = get_file(this.file_full_path,
                         SpreadsheetApp) as GoogleAppsScript.Spreadsheet.Spreadsheet
    if(!this.file){
      throw "存在しないspreadsheetデータベースです。";
    }

    const query_sheet = this.file.getSheetByName('query');
    const table_info_sheet = this.file.getSheetByName('table_info');

    if(!query_sheet || !table_info_sheet){
      throw "SpreadSheetDBに必要なシートがありません。crete関数を使って作成してください";
    }

    this.query_sheet = query_sheet;
    this.table_info_sheet = table_info_sheet; 
  }

  /**
   * データベースを削除します
   */
  drop() {
    delete_file(this.file_full_path);
  }

  /**
   * テーブルを作成します
   * @param {string} name テーブル名
   * @param {string[]} columns カラム
   * @returns {SpreadSheetTable}
   */
  create_table(name: string, ...columns: string[]) {
    const sheet = this.file.insertSheet(name);
    let tmp_data = ["row"]; //行番号を特定するためのカラムを追加しておく
    for(let col of columns){
    tmp_data.push(col);
    }
    const range = sheet.getRange(1, 1, 1, arguments.length);
    range.setValues([tmp_data]);
    return new SpreadSheetTable(this, name);
  }

  /**
   * データベースからテーブルを取得します
   * @param {string} name テーブル名
   * @returns {SpreadSheetTable}
   */
  get_table(name: string) {
    return new SpreadSheetTable(this, name);
  }
}

/**
 * spreadsheet_databaseのテーブルクラス
 */
export class SpreadSheetTable {

  db: SpreadSheetDB
  sheet: GoogleAppsScript.Spreadsheet.Sheet

  /**
   * コンストラクタ
   * @param {SpreadSheetDB} db データベース
   * @param {string} name テーブル名 
   */
  constructor(db: SpreadSheetDB, name: string) {
    this.db = db;
    const sheet = this.db.file.getSheetByName(name);
    if(!sheet) throw "テーブルが存在しません。作成してください"
    this.sheet = sheet;
  }

  /**
   * データを挿入します
   * @param data 
   */
  insert(...data: {[name: string]: any}[]) {
    const last_col = this.sheet.getLastColumn();
    const header = this.sheet.getRange(1, 2, 1, last_col - 1).getValues();
    for(let d of data){
        let var_args = ["=row()"]; //行番号を特定するためのカラムを追加しておく
        for(let col of header[0]){
          var_args.push(d[col]==null?"":d[col]);
        }
        this.sheet.appendRow(var_args);
    }
  }

  /**
   * をデータを取得します
   * @param {string} query スプレッドシートのquery関数の第二引数に指定するクエリ
   * @returns 
   */
  select(query:string|null=null) {
    const last_col = this.sheet.getLastColumn();
    const header = this.sheet.getRange(1, 1, 1, last_col).getValues();
    let raw_query = query || "";

    for(let col_num = 0; col_num < header[0].length; col_num ++) {
      const column_letter = this.column_to_letter(col_num + 1);
      const replace_target_regex = `(?<=(\\s|,))${header[0][col_num]}(?=([=,]|\\s|!=|$))`;
      raw_query = raw_query.replace(new RegExp(replace_target_regex, 'gi'), column_letter);
    }

    const query_func = Utilities.formatString('=QUERY(%s!A:%s, "%s")', this.sheet.getSheetName(), this.column_to_letter(last_col), raw_query || "");
    const query_sheet = this.db.query_sheet;
    query_sheet.getRange("A1").setValue(query_func);

    Utilities.sleep(100); // 反映が若干遅れるので100ms待つ

    const query_last_row = query_sheet.getLastRow();
    const query_last_column = query_sheet.getLastColumn();

    let result = query_sheet.getRange(2, 1, query_last_row, query_last_column).getValues().slice(0, -1);
    return result;
  }

  /**
   * queryの対象を削除します。
   * queryにはwhere条件のみを指定してください。
   */
  delete(query: string|null = null) {

    if(query) {
      const select_result = this.select(`select A ${query}`);
      
      // 削除していくと行番号が更新されていってしまうため、後ろから消していく
      for(let row of select_result.reverse()) {
        this.sheet.deleteRow(row[0]);
      }
    }
    else {
      this.sheet.deleteRows(2, this.sheet.getLastColumn());
    }
  }

  /**
   * 更新関数
   * @param data 更新データ。dictで指定が必要です 
   * @param query queryにはwhere条件のみを指定してください。一致した行のみ更新します
   */
  update(data: {[name: string]: any}, query: string|null = null) {
    const last_col = this.sheet.getLastColumn();
    const header = this.sheet.getRange(1, 2, 1, last_col - 1).getValues();
    let update_data = [];
    for(let col_num = 0; col_num < header[0].length; col_num ++) {
      update_data[col_num] = data[header[0][col_num]];
    }

    if(query) {
      const select_result = this.select(`select A ${query}`);
      
      for(let row of select_result) {
        const tmp_range = this.sheet.getRange(row[0], 2, 1, last_col - 1);
        let updated_data = tmp_range.getValues();
        console.log(updated_data);
        for (let col=0; col < update_data.length; col++) {
          updated_data[0][col] = update_data[col] || updated_data[0][col];
        }
        console.log(updated_data);
        tmp_range.setValues(updated_data);
      }
    }
    else {
      const tmp_range = this.sheet.getRange(2, 2, this.sheet.getLastRow() - 1, last_col - 1);
      let updated_data = tmp_range.getValues();
      for (let row=0; row < updated_data.length; row++) {
        for (let col=0; col < update_data[row].length; col++) {
          updated_data[row][col] = update_data[col] || updated_data[row][col];
        }
      }
      tmp_range.setValues(updated_data);
    }
  }

  /**
   * カラム番号を英数字に変換します
   * @param column 
   * @returns 
   */
  private column_to_letter(column: number): string
  {
    let temp, letter = '';
    while (column > 0)
    {
      temp = (column - 1) % 26;
      letter = String.fromCharCode(temp + 65) + letter;
      column = (column - temp - 1) / 26;
    }
    return letter;
  }
}

/**
 * データベースを取得
 * @param name データベース名
 * @param path 
 * @returns 
 */
export function get_database(name: string, path: string = 'spreadsheet_db'): SpreadSheetDB{
  return new SpreadSheetDB(name, path);
}

/**
 * データベースを作成
 * @param name データベース名 
 * @param path 
 * @returns 
 */
export function create_database(name: string, path: string = 'spreadsheet_db') {
  get_or_create_dir(path);
  const file_full_path = path + "/" + name + ".xlsx";
  const file = get_or_create_file(file_full_path,
                                            SpreadsheetApp) as GoogleAppsScript.Spreadsheet.Spreadsheet

  const table_info_sheet = file.insertSheet('table_info');
  file.insertSheet('query');
  const created_at = Utilities.formatDate(new Date(), 'Asia/Tokyo', "yyyy-MM-dd'T'HH:mm:ss'Z'");

  table_info_sheet.getRange("A1").setValue("created by spread sheet db app.");
  table_info_sheet.getRange("A2").setValue("created at: " + created_at);

  return new SpreadSheetDB(name, path);
}

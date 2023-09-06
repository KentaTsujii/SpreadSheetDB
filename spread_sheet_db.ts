class SpreadSheetDB {

  file_full_path: string
  file: GoogleAppsScript.Spreadsheet.Spreadsheet
  query_sheet: GoogleAppsScript.Spreadsheet.Sheet
  table_info_sheet: GoogleAppsScript.Spreadsheet.Sheet

  constructor(name: string, path: string = 'spreadsheet_db') {
    this.file_full_path = path + "/" + name + ".xlsx";
    this.file = FileUtils.get_file(this.file_full_path,
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

  static create_database(name: string, path: string = 'spreadsheet_db') {
    FolderUtils.get_or_create_dir(path);
    const file_full_path = path + "/" + name + ".xlsx";
    const file = FileUtils.get_or_create_file(file_full_path,
                                              SpreadsheetApp) as GoogleAppsScript.Spreadsheet.Spreadsheet

    const table_info_sheet = file.insertSheet('table_info');
    file.insertSheet('query');
    const created_at = Utilities.formatDate(new Date(), 'Asia/Tokyo', "yyyy-MM-dd'T'HH:mm:ss'Z'");

    table_info_sheet.getRange("A1").setValue("created by spread sheet db app.");
    table_info_sheet.getRange("A2").setValue("created at: " + created_at);

    return new SpreadSheetDB(name, path);
  }

  drop() {
    FileUtils.delete_file(this.file_full_path);
  }

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

  get_table(name: string) {
    return new SpreadSheetTable(this, name);
  }
}

class SpreadSheetTable {

  db: SpreadSheetDB
  sheet: GoogleAppsScript.Spreadsheet.Sheet

  constructor(db: SpreadSheetDB, name: string) {
    this.db = db;
    const sheet = this.db.file.getSheetByName(name);
    if(!sheet) throw "テーブルが存在しません。作成してください"
    this.sheet = sheet;
  }

  insert(...data: {[name: string]: any}[]) {
    const last_col = this.sheet.getLastColumn();
    const header = this.sheet.getRange(1, 2, 1, last_col - 1).getValues();
    for(let d in data){
        let var_args = ["=row()"]; //行番号を特定するためのカラムを追加しておく
        for(let col of header[0]){
          var_args.push(d[col]==null?"":d[col]);
        }
        this.sheet.appendRow(var_args);
    }
  }

  select(query:string|null=null) {
    const last_col = this.sheet.getLastColumn();
    const header = this.sheet.getRange(1, 1, 1, last_col).getValues();
    let raw_query = query || "";

    for(let col_num = 0; col_num < header[0].length; col_num ++) {
      const column_letter = this.column_to_letter(col_num + 1);
      const replace_target_regex = `(?<=(\\s|,))${header[0][col_num]}(?=([=,]|\\s|$))`;
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
        for (let col=0; col < update_data[0].length; col++) {
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

  column_to_letter(column: number): string
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


function spreadsheet_db_test() {
  //SpreadSheetDB.create_database("test_db");
  
  let db = new SpreadSheetDB("test_db");
  //db.create_table("test_table", "id","name", "address", "age");

  let table = db.get_table("test_table");
  let insert_data = {
    'id': 1,
    'name': 'kenta tsujii',
    'address': 'kanagawa',
    'age': 30
  }
  let insert_data2 = {
    'id': 2,
    'name': 'hiromi suzuki',
    'address': 'kanagawa',
    'age': 38
  }

  table.delete();
  
  table.insert(insert_data);
  table.insert(insert_data);
  console.log(table.select());

  //console.log(table.select("select id, name where name = 'hiromi suzuki'"));
	
  //table.delete("where name = 'hiromi suzuki'");
  const data = {
    'id': "fuga",
    'name': "hoge",
    'hhh': 'gggg'
  }
  table.update(data, "where name = 'hiromi suzuki'");
  console.log(table.select());
  //table.update(data);
  //console.log(table.select());
}


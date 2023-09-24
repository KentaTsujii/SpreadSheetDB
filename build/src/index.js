"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create_database = exports.get_database = exports.SpreadSheetTable = exports.SpreadSheetDB = void 0;
var drivefileutils_1 = require("drivefileutils");
/**
 * スプレッドシートをデータベースとして扱うためのクラス
 */
var SpreadSheetDB = /** @class */ (function () {
    /**
     * コンストラクタです
     * @param {string} name データベース名
     * @param {string} path ディレクトリ（デフォルト: spreadsheet_db)
     */
    function SpreadSheetDB(name, path) {
        if (path === void 0) { path = 'spreadsheet_db'; }
        this.file_full_path = path + "/" + name + ".xlsx";
        this.file = (0, drivefileutils_1.get_file)(this.file_full_path, SpreadsheetApp);
        if (!this.file) {
            throw "存在しないspreadsheetデータベースです。";
        }
        var query_sheet = this.file.getSheetByName('query');
        var table_info_sheet = this.file.getSheetByName('table_info');
        if (!query_sheet || !table_info_sheet) {
            throw "SpreadSheetDBに必要なシートがありません。crete関数を使って作成してください";
        }
        this.query_sheet = query_sheet;
        this.table_info_sheet = table_info_sheet;
    }
    /**
     * データベースを削除します
     */
    SpreadSheetDB.prototype.drop = function () {
        (0, drivefileutils_1.delete_file)(this.file_full_path);
    };
    /**
     * テーブルを作成します
     * @param {string} name テーブル名
     * @param {string[]} columns カラム
     * @returns {SpreadSheetTable}
     */
    SpreadSheetDB.prototype.create_table = function (name) {
        var columns = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            columns[_i - 1] = arguments[_i];
        }
        var sheet = this.file.insertSheet(name);
        var tmp_data = ["row"]; //行番号を特定するためのカラムを追加しておく
        for (var _a = 0, columns_1 = columns; _a < columns_1.length; _a++) {
            var col = columns_1[_a];
            tmp_data.push(col);
        }
        var range = sheet.getRange(1, 1, 1, arguments.length);
        range.setValues([tmp_data]);
        return new SpreadSheetTable(this, name);
    };
    /**
     * データベースからテーブルを取得します
     * @param {string} name テーブル名
     * @returns {SpreadSheetTable}
     */
    SpreadSheetDB.prototype.get_table = function (name) {
        return new SpreadSheetTable(this, name);
    };
    return SpreadSheetDB;
}());
exports.SpreadSheetDB = SpreadSheetDB;
/**
 * spreadsheet_databaseのテーブルクラス
 */
var SpreadSheetTable = /** @class */ (function () {
    /**
     * コンストラクタ
     * @param {SpreadSheetDB} db データベース
     * @param {string} name テーブル名
     */
    function SpreadSheetTable(db, name) {
        this.db = db;
        var sheet = this.db.file.getSheetByName(name);
        if (!sheet)
            throw "テーブルが存在しません。作成してください";
        this.sheet = sheet;
    }
    /**
     * データを挿入します
     * @param data
     */
    SpreadSheetTable.prototype.insert = function () {
        var data = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            data[_i] = arguments[_i];
        }
        var last_col = this.sheet.getLastColumn();
        var header = this.sheet.getRange(1, 2, 1, last_col - 1).getValues();
        for (var _a = 0, data_1 = data; _a < data_1.length; _a++) {
            var d = data_1[_a];
            var var_args = ["=row()"]; //行番号を特定するためのカラムを追加しておく
            for (var _b = 0, _c = header[0]; _b < _c.length; _b++) {
                var col = _c[_b];
                var_args.push(d[col] == null ? "" : d[col]);
            }
            this.sheet.appendRow(var_args);
        }
    };
    /**
     * をデータを取得します
     * @param {string} query スプレッドシートのquery関数の第二引数に指定するクエリ
     * @returns
     */
    SpreadSheetTable.prototype.select = function (query) {
        if (query === void 0) { query = null; }
        var last_col = this.sheet.getLastColumn();
        var header = this.sheet.getRange(1, 1, 1, last_col).getValues();
        var raw_query = query || "";
        for (var col_num = 0; col_num < header[0].length; col_num++) {
            var column_letter = this.column_to_letter(col_num + 1);
            var replace_target_regex = "(?<=(\\s|,))".concat(header[0][col_num], "(?=([=,]|\\s|!=|$))");
            raw_query = raw_query.replace(new RegExp(replace_target_regex, 'gi'), column_letter);
        }
        var query_func = Utilities.formatString('=QUERY(%s!A:%s, "%s")', this.sheet.getSheetName(), this.column_to_letter(last_col), raw_query || "");
        var query_sheet = this.db.query_sheet;
        query_sheet.getRange("A1").setValue(query_func);
        Utilities.sleep(100); // 反映が若干遅れるので100ms待つ
        var query_last_row = query_sheet.getLastRow();
        var query_last_column = query_sheet.getLastColumn();
        var result = query_sheet.getRange(2, 1, query_last_row, query_last_column).getValues().slice(0, -1);
        return result;
    };
    /**
     * queryの対象を削除します。
     * queryにはwhere条件のみを指定してください。
     */
    SpreadSheetTable.prototype.delete = function (query) {
        if (query === void 0) { query = null; }
        if (query) {
            var select_result = this.select("select A ".concat(query));
            // 削除していくと行番号が更新されていってしまうため、後ろから消していく
            for (var _i = 0, _a = select_result.reverse(); _i < _a.length; _i++) {
                var row = _a[_i];
                this.sheet.deleteRow(row[0]);
            }
        }
        else {
            this.sheet.deleteRows(2, this.sheet.getLastColumn());
        }
    };
    /**
     * 更新関数
     * @param data 更新データ。dictで指定が必要です
     * @param query queryにはwhere条件のみを指定してください。一致した行のみ更新します
     */
    SpreadSheetTable.prototype.update = function (data, query) {
        if (query === void 0) { query = null; }
        var last_col = this.sheet.getLastColumn();
        var header = this.sheet.getRange(1, 2, 1, last_col - 1).getValues();
        var update_data = [];
        for (var col_num = 0; col_num < header[0].length; col_num++) {
            update_data[col_num] = data[header[0][col_num]];
        }
        if (query) {
            var select_result = this.select("select A ".concat(query));
            for (var _i = 0, select_result_1 = select_result; _i < select_result_1.length; _i++) {
                var row = select_result_1[_i];
                var tmp_range = this.sheet.getRange(row[0], 2, 1, last_col - 1);
                var updated_data = tmp_range.getValues();
                console.log(updated_data);
                for (var col = 0; col < update_data.length; col++) {
                    updated_data[0][col] = update_data[col] || updated_data[0][col];
                }
                console.log(updated_data);
                tmp_range.setValues(updated_data);
            }
        }
        else {
            var tmp_range = this.sheet.getRange(2, 2, this.sheet.getLastRow() - 1, last_col - 1);
            var updated_data = tmp_range.getValues();
            for (var row = 0; row < updated_data.length; row++) {
                for (var col = 0; col < update_data[row].length; col++) {
                    updated_data[row][col] = update_data[col] || updated_data[row][col];
                }
            }
            tmp_range.setValues(updated_data);
        }
    };
    /**
     * カラム番号を英数字に変換します
     * @param column
     * @returns
     */
    SpreadSheetTable.prototype.column_to_letter = function (column) {
        var temp, letter = '';
        while (column > 0) {
            temp = (column - 1) % 26;
            letter = String.fromCharCode(temp + 65) + letter;
            column = (column - temp - 1) / 26;
        }
        return letter;
    };
    return SpreadSheetTable;
}());
exports.SpreadSheetTable = SpreadSheetTable;
/**
 * データベースを取得
 * @param name データベース名
 * @param path
 * @returns
 */
function get_database(name, path) {
    if (path === void 0) { path = 'spreadsheet_db'; }
    return new SpreadSheetDB(name, path);
}
exports.get_database = get_database;
/**
 * データベースを作成
 * @param name データベース名
 * @param path
 * @returns
 */
function create_database(name, path) {
    if (path === void 0) { path = 'spreadsheet_db'; }
    (0, drivefileutils_1.get_or_create_dir)(path);
    var file_full_path = path + "/" + name + ".xlsx";
    var file = (0, drivefileutils_1.get_or_create_file)(file_full_path, SpreadsheetApp);
    var table_info_sheet = file.insertSheet('table_info');
    file.insertSheet('query');
    var created_at = Utilities.formatDate(new Date(), 'Asia/Tokyo', "yyyy-MM-dd'T'HH:mm:ss'Z'");
    table_info_sheet.getRange("A1").setValue("created by spread sheet db app.");
    table_info_sheet.getRange("A2").setValue("created at: " + created_at);
    return new SpreadSheetDB(name, path);
}
exports.create_database = create_database;
//# sourceMappingURL=index.js.map
/// <reference types="google-apps-script" />
/**
 * スプレッドシートをデータベースとして扱うためのクラス
 */
export declare class SpreadSheetDB {
    file_full_path: string;
    file: GoogleAppsScript.Spreadsheet.Spreadsheet;
    query_sheet: GoogleAppsScript.Spreadsheet.Sheet;
    table_info_sheet: GoogleAppsScript.Spreadsheet.Sheet;
    /**
     * コンストラクタです
     * @param {string} name データベース名
     * @param {string} path ディレクトリ（デフォルト: spreadsheet_db)
     */
    constructor(name: string, path?: string);
    /**
     * データベースを削除します
     */
    drop(): void;
    /**
     * テーブルを作成します
     * @param {string} name テーブル名
     * @param {string[]} columns カラム
     * @returns {SpreadSheetTable}
     */
    create_table(name: string, ...columns: string[]): SpreadSheetTable;
    /**
     * データベースからテーブルを取得します
     * @param {string} name テーブル名
     * @returns {SpreadSheetTable}
     */
    get_table(name: string): SpreadSheetTable;
}
/**
 * spreadsheet_databaseのテーブルクラス
 */
export declare class SpreadSheetTable {
    db: SpreadSheetDB;
    sheet: GoogleAppsScript.Spreadsheet.Sheet;
    /**
     * コンストラクタ
     * @param {SpreadSheetDB} db データベース
     * @param {string} name テーブル名
     */
    constructor(db: SpreadSheetDB, name: string);
    /**
     * データを挿入します
     * @param data
     */
    insert(...data: {
        [name: string]: any;
    }[]): void;
    /**
     * をデータを取得します
     * @param {string} query スプレッドシートのquery関数の第二引数に指定するクエリ
     * @returns
     */
    select(query?: string | null): any[][];
    /**
     * queryの対象を削除します。
     * queryにはwhere条件のみを指定してください。
     */
    delete(query?: string | null): void;
    /**
     * 更新関数
     * @param data 更新データ。dictで指定が必要です
     * @param query queryにはwhere条件のみを指定してください。一致した行のみ更新します
     */
    update(data: {
        [name: string]: any;
    }, query?: string | null): void;
    /**
     * カラム番号を英数字に変換します
     * @param column
     * @returns
     */
    private column_to_letter;
}
/**
 * データベースを取得
 * @param name データベース名
 * @param path
 * @returns
 */
export declare function get_database(name: string, path?: string): SpreadSheetDB;
/**
 * データベースを作成
 * @param name データベース名
 * @param path
 * @returns
 */
export declare function create_database(name: string, path?: string): SpreadSheetDB;
//# sourceMappingURL=index.d.ts.map
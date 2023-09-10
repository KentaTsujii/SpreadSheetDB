"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var index_1 = require("../src/index");
function spreadsheet_db_create_test() {
    var db = (0, index_1.create_database)("test_db");
    db.create_table("test_table", "id", "name", "address", "age");
}
function spreadsheet_db_insert_test() {
    var db = (0, index_1.get_database)("test_db");
    var table = db.get_table("test_table");
    var insert_data = {
        'id': 1,
        'name': 'kenta tsujii',
        'address': 'kanagawa',
        'age': 30
    };
    var insert_data2 = {
        'id': 2,
        'name': 'hiromi suzuki',
        'address': 'kanagawa',
        'age': 38
    };
    table.delete();
    table.insert(insert_data);
    table.insert(insert_data2);
    console.log(table.select());
    console.log(table.select("select id, name where name = 'hiromi suzuki'"));
}
function spreadsheet_db_update_test() {
    var db = (0, index_1.get_database)("test_db");
    var table = db.get_table("test_table");
    table.delete();
    var insert_data = {
        'id': 1,
        'name': 'kenta tsujii',
        'address': 'kanagawa',
        'age': 30
    };
    var insert_data2 = {
        'id': 2,
        'name': 'hiromi suzuki',
        'address': 'kanagawa',
        'age': 38
    };
    table.delete();
    table.insert(insert_data);
    table.insert(insert_data2);
    var data = {
        'id': "fuga",
        'name': "hoge",
        'hhh': 'gggg'
    };
    table.update(data, "where name = 'hiromi suzuki'");
    console.log(table.select());
    table.update(data);
    console.log(table.select());
}
function spreadsheet_db_delete_test() {
    var db = (0, index_1.get_database)("test_db");
    var table = db.get_table("test_table");
    table.delete();
    var insert_data = {
        'id': 1,
        'name': 'kenta tsujii',
        'address': 'kanagawa',
        'age': 30
    };
    var insert_data2 = {
        'id': 2,
        'name': 'hiromi suzuki',
        'address': 'kanagawa',
        'age': 38
    };
    table.delete();
    table.insert(insert_data);
    table.insert(insert_data2);
    table.delete("where name = 'hiromi suzuki'");
}
function spreadsheet_db_test_after() {
    var db = (0, index_1.get_database)("test_db");
    db.drop();
}
//# sourceMappingURL=gas_index.js.map
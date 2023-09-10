import {create_database, get_database} from '../src/index'

function spreadsheet_db_create_test(){
  let db = create_database("test_db");
  db.create_table("test_table", "id","name", "address", "age");
}

function spreadsheet_db_insert_test(){
  let db = get_database("test_db");
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
  table.insert(insert_data2);

  console.log(table.select());
  console.log(table.select("select id, name where name = 'hiromi suzuki'"));
}

function spreadsheet_db_update_test() {
  let db = get_database("test_db");
  let table = db.get_table("test_table");
  table.delete();
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
  table.insert(insert_data2);

  const data = {
      'id': "fuga",
      'name': "hoge",
      'hhh': 'gggg'
  }
  table.update(data, "where name = 'hiromi suzuki'");
  console.log(table.select());
  table.update(data);
  console.log(table.select());
}

function spreadsheet_db_delete_test() {
  let db = get_database("test_db");
  let table = db.get_table("test_table");
  table.delete();
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
  table.insert(insert_data2);

  table.delete("where name = 'hiromi suzuki'");
}

function spreadsheet_db_test_after() {
  let db = get_database("test_db");
  db.drop();
}

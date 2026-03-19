import * as SQLite from 'expo-sqlite';

import {
  CREATE_INGREDIENTS_TABLE,
  CREATE_RECIPES_TABLE,
  CREATE_BIRD_COMPANIONS_TABLE,
  CREATE_USER_EVENTS_TABLE,
  CREATE_USER_PREFERENCES_TABLE,
  INSERT_DEFAULT_USER_EVENT,
  INSERT_DEFAULT_USER_PREFERENCE,
} from './schema';

let db: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('chishenme.db');
  }
  return db;
}

/**
 * 建表并插入初始数据。
 * 使用 CREATE TABLE IF NOT EXISTS，确保重复启动不报错。
 * 在 app/_layout.tsx 中调用，保证 app 启动时数据库已就绪。
 */
export function initDatabase(): void {
  const database = getDatabase();

  database.execSync(CREATE_INGREDIENTS_TABLE);
  database.execSync(CREATE_RECIPES_TABLE);
  database.execSync(CREATE_BIRD_COMPANIONS_TABLE);
  database.execSync(CREATE_USER_EVENTS_TABLE);
  database.execSync(CREATE_USER_PREFERENCES_TABLE);

  database.execSync(INSERT_DEFAULT_USER_EVENT);
  database.execSync(INSERT_DEFAULT_USER_PREFERENCE);
}

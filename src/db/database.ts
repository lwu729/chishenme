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

  // 迁移：为已存在的数据库添加 originalQuantity 列（如果尚不存在）
  try {
    database.execSync(
      'ALTER TABLE ingredients ADD COLUMN originalQuantity REAL NOT NULL DEFAULT 0',
    );
  } catch (_) {
    // 列已存在，忽略
  }

  // 迁移：为已存在的数据库添加 imageCrop 列（如果尚不存在）
  try {
    database.execSync('ALTER TABLE ingredients ADD COLUMN imageCrop TEXT');
  } catch (_) {
    // 列已存在，忽略
  }

  // 迁移：将 originalQuantity = 0 的旧数据补填为当前 quantity，
  // 确保编辑数量上限始终锁定在最初录入时的数量。
  database.execSync(
    'UPDATE ingredients SET originalQuantity = quantity WHERE originalQuantity = 0',
  );

  // 迁移：为已存在的数据库添加 cookingAppliances 列（如果尚不存在）
  try {
    database.execSync(
      "ALTER TABLE user_preferences ADD COLUMN cookingAppliances TEXT NOT NULL DEFAULT '[]'",
    );
  } catch (_) {
    // 列已存在，忽略
  }

  // 迁移：为已存在的数据库添加 useImperialUnits 列（如果尚不存在）
  try {
    database.execSync(
      'ALTER TABLE user_preferences ADD COLUMN useImperialUnits INTEGER NOT NULL DEFAULT 0',
    );
  } catch (_) {
    // 列已存在，忽略
  }

  // 迁移：为已存在的数据库添加厨具相关列（如果尚不存在）
  try {
    database.execSync(
      "ALTER TABLE user_preferences ADD COLUMN measuringTools TEXT NOT NULL DEFAULT '[]'",
    );
  } catch (_) {
    // 列已存在，忽略
  }

  try {
    database.execSync(
      "ALTER TABLE user_preferences ADD COLUMN condiments TEXT NOT NULL DEFAULT '[]'",
    );
  } catch (_) {
    // 列已存在，忽略
  }

  try {
    database.execSync(
      "ALTER TABLE user_preferences ADD COLUMN knives TEXT NOT NULL DEFAULT '[]'",
    );
  } catch (_) {
    // 列已存在，忽略
  }

  try {
    database.execSync(
      "ALTER TABLE user_preferences ADD COLUMN assistiveTools TEXT NOT NULL DEFAULT '[]'",
    );
  } catch (_) {
    // 列已存在，忽略
  }

  // 迁移：通知设置字段
  try {
    database.execSync(
      'ALTER TABLE user_preferences ADD COLUMN notificationsEnabled INTEGER NOT NULL DEFAULT 1',
    );
  } catch (_) {}
  try {
    database.execSync(
      'ALTER TABLE user_preferences ADD COLUMN notifyOnStatusChange INTEGER NOT NULL DEFAULT 1',
    );
  } catch (_) {}
  try {
    database.execSync(
      'ALTER TABLE user_preferences ADD COLUMN notifyOnExpired INTEGER NOT NULL DEFAULT 1',
    );
  } catch (_) {}
  try {
    database.execSync(
      'ALTER TABLE user_preferences ADD COLUMN notifyOnUrgent INTEGER NOT NULL DEFAULT 1',
    );
  } catch (_) {}
  try {
    database.execSync(
      'ALTER TABLE user_preferences ADD COLUMN notifyOnWarning INTEGER NOT NULL DEFAULT 1',
    );
  } catch (_) {}
  try {
    database.execSync(
      'ALTER TABLE user_preferences ADD COLUMN notifyInactiveIngredientDays INTEGER NOT NULL DEFAULT 7',
    );
  } catch (_) {}
  try {
    database.execSync(
      'ALTER TABLE user_preferences ADD COLUMN notifyInactiveRecipeDays INTEGER NOT NULL DEFAULT 3',
    );
  } catch (_) {}
  try {
    database.execSync(
      "ALTER TABLE user_preferences ADD COLUMN notifyTimeStatusChange TEXT NOT NULL DEFAULT '09:00'",
    );
  } catch (_) {}
  try {
    database.execSync(
      "ALTER TABLE user_preferences ADD COLUMN notifyTimeExpired TEXT NOT NULL DEFAULT '09:00'",
    );
  } catch (_) {}
  try {
    database.execSync(
      "ALTER TABLE user_preferences ADD COLUMN notifyTimeDailyReminder TEXT NOT NULL DEFAULT '09:00'",
    );
  } catch (_) {}
  try {
    database.execSync(
      "ALTER TABLE user_preferences ADD COLUMN notifyTimeInactive TEXT NOT NULL DEFAULT '09:00'",
    );
  } catch (_) {}
}

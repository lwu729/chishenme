// SQLite schema definitions
// ingredients 和 steps 字段在 recipes 表中以 JSON string 存储

export const CREATE_INGREDIENTS_TABLE = `
  CREATE TABLE IF NOT EXISTS ingredients (
    id                 TEXT    PRIMARY KEY,
    name               TEXT    NOT NULL,
    quantity           REAL    NOT NULL,
    unit               TEXT    NOT NULL,
    expiryDate         TEXT    NOT NULL,
    loggedDate         TEXT    NOT NULL,
    daysUntilExpiry    INTEGER NOT NULL,
    imagePath          TEXT,
    remainingPercentage REAL   NOT NULL,
    storageLocation    TEXT    NOT NULL,
    expiryStatus       TEXT    NOT NULL,
    filterState        TEXT    NOT NULL DEFAULT 'null'
  );
`;

export const CREATE_RECIPES_TABLE = `
  CREATE TABLE IF NOT EXISTS recipes (
    id             TEXT    PRIMARY KEY,
    name           TEXT    NOT NULL,
    ingredients    TEXT    NOT NULL, -- JSON: RecipeIngredient[]
    durationMinutes INTEGER NOT NULL,
    cuisine        TEXT    NOT NULL,
    cookingMethod  TEXT    NOT NULL,
    flavor         TEXT    NOT NULL,
    totalSteps     INTEGER NOT NULL,
    steps          TEXT    NOT NULL, -- JSON: RecipeStep[]
    isFavorited    INTEGER NOT NULL DEFAULT 0,
    createdAt      TEXT    NOT NULL
  );
`;

export const CREATE_BIRD_COMPANIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS bird_companions (
    id                     TEXT    PRIMARY KEY,
    name                   TEXT    NOT NULL,
    unlockTriggerType      TEXT    NOT NULL,
    unlockTriggerValue     TEXT    NOT NULL,
    personalityDescription TEXT    NOT NULL,
    isUnlocked             INTEGER NOT NULL DEFAULT 0,
    unlockedAt             TEXT,
    imagePath              TEXT    NOT NULL
  );
`;

export const CREATE_USER_EVENTS_TABLE = `
  CREATE TABLE IF NOT EXISTS user_events (
    id                            INTEGER PRIMARY KEY DEFAULT 1,
    totalIngredientsLogged        INTEGER NOT NULL DEFAULT 0,
    totalMealsCooked              INTEGER NOT NULL DEFAULT 0,
    dailyMealsCooked              INTEGER NOT NULL DEFAULT 0,
    dailyMealsCookedDate          TEXT    NOT NULL DEFAULT '',
    cookingStreakDays              INTEGER NOT NULL DEFAULT 0,
    lastCookedDate                TEXT,
    hasFinishedWarningIngredient  INTEGER NOT NULL DEFAULT 0,
    hasFinishedUrgentIngredient   INTEGER NOT NULL DEFAULT 0,
    hasFinishedFreshIngredient    INTEGER NOT NULL DEFAULT 0,
    hasLetIngredientExpire        INTEGER NOT NULL DEFAULT 0
  );
`;

export const CREATE_USER_PREFERENCES_TABLE = `
  CREATE TABLE IF NOT EXISTS user_preferences (
    id                     INTEGER PRIMARY KEY DEFAULT 1,
    cookingTools           TEXT    NOT NULL DEFAULT '[]',
    knives                 TEXT    NOT NULL DEFAULT '[]',
    assistiveTools         TEXT    NOT NULL DEFAULT '[]',
    condiments             TEXT    NOT NULL DEFAULT '[]',
    preferredCuisines      TEXT    NOT NULL DEFAULT '[]',
    preferredCookingMethods TEXT   NOT NULL DEFAULT '[]',
    preferredFlavors       TEXT    NOT NULL DEFAULT '[]',
    activeBirdId           TEXT
  );
`;

// INSERT OR IGNORE 确保重复启动不覆盖已有数据
export const INSERT_DEFAULT_USER_EVENT = `
  INSERT OR IGNORE INTO user_events (id) VALUES (1);
`;

export const INSERT_DEFAULT_USER_PREFERENCE = `
  INSERT OR IGNORE INTO user_preferences (id) VALUES (1);
`;

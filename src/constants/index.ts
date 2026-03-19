import { ExpiryStatus, StorageLocation } from '../features/ingredient/types';

// ============ 数值常量 ============

export const MAX_FAVORITED_RECIPES = 10;
export const DAILY_RESET_HOUR = 4;           // 每天 4:00am 重置每日计数
export const DEFAULT_SERVING_SIZE = 1;
export const MAX_RECIPE_DURATION_MINUTES = 60;

// ============ 显示标签 ============

export const EXPIRY_STATUS_LABELS: Record<ExpiryStatus, string> = {
  [ExpiryStatus.EXPIRED]: '已过期',
  [ExpiryStatus.URGENT]: '即将过期',
  [ExpiryStatus.WARNING]: '快过期',
  [ExpiryStatus.FRESH]: '新鲜',
};

export const STORAGE_LOCATION_LABELS: Record<StorageLocation, string> = {
  [StorageLocation.REFRIGERATED]: '冷藏',
  [StorageLocation.FROZEN]: '冷冻',
  [StorageLocation.ROOM_TEMP]: '常温',
};

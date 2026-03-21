import { ExpiryStatus } from '../features/ingredient/types';

export interface ExpiryThresholds {
  urgentDays: number;
  urgentPercentage: number;
  urgentAbsoluteDays: number;
  warningDays: number;
  warningPercentage: number;
  warningAbsoluteDays: number;
}

export const DEFAULT_THRESHOLDS: ExpiryThresholds = {
  urgentDays: 3,
  urgentPercentage: 50,
  urgentAbsoluteDays: 1,
  warningDays: 5,
  warningPercentage: 75,
  warningAbsoluteDays: 3,
};

/**
 * 根据剩余天数和剩余百分比计算过期状态。
 *
 * 判断顺序（严格按照）：
 *   1. 已过期：daysUntilExpiry < 0
 *   2. 即将过期：daysUntilExpiry ≤ urgentDays 且 remainingPercentage ≥ urgentPercentage，
 *              OR daysUntilExpiry ≤ urgentAbsoluteDays
 *   3. 快过期：daysUntilExpiry ≤ warningDays 且 remainingPercentage ≥ warningPercentage，
 *              OR daysUntilExpiry ≤ warningAbsoluteDays
 *   4. 新鲜：其余所有情况
 *
 * @param daysUntilExpiry - 距离过期日的天数（负数表示已过期）
 * @param remainingPercentage - 还需要消耗的百分比（0–100）
 * @param thresholds - 阈值配置（默认使用 DEFAULT_THRESHOLDS）
 */
export function calculateExpiryStatus(
  daysUntilExpiry: number,
  remainingPercentage: number,
  thresholds: ExpiryThresholds = DEFAULT_THRESHOLDS,
): ExpiryStatus {
  if (daysUntilExpiry < 0) {
    return ExpiryStatus.EXPIRED;
  }

  if (
    (daysUntilExpiry <= thresholds.urgentDays && remainingPercentage >= thresholds.urgentPercentage) ||
    daysUntilExpiry <= thresholds.urgentAbsoluteDays
  ) {
    return ExpiryStatus.URGENT;
  }

  if (
    (daysUntilExpiry <= thresholds.warningDays && remainingPercentage >= thresholds.warningPercentage) ||
    daysUntilExpiry <= thresholds.warningAbsoluteDays
  ) {
    return ExpiryStatus.WARNING;
  }

  return ExpiryStatus.FRESH;
}

/**
 * 返回今天到过期日的天数。已过期返回负数。
 */
export function calculateDaysUntilExpiry(expiryDate: string): number {
  const [year, month, day] = expiryDate.split('-').map(Number);
  const expiry = new Date(year, month - 1, day); // 本地日期，避免 UTC 解析偏移
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * 返回剩余百分比（整数，0–100）。
 */
export function calculateRemainingPercentage(
  originalQuantity: number,
  currentQuantity: number,
): number {
  return Math.round((currentQuantity / originalQuantity) * 100);
}

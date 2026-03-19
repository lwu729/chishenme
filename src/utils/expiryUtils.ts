import { ExpiryStatus } from '../features/ingredient/types';

/**
 * 根据剩余天数和剩余百分比计算过期状态。
 *
 * 判断顺序（严格按照）：
 *   1. 已过期：daysUntilExpiry < 0
 *   2. 即将过期：daysUntilExpiry ≤ 3 且 remainingPercentage ≥ 50，OR daysUntilExpiry ≤ 1
 *   3. 快过期：daysUntilExpiry ≤ 5 且 remainingPercentage ≥ 75，OR daysUntilExpiry ≤ 3
 *   4. 新鲜：其余所有情况
 *
 * @param daysUntilExpiry - 距离过期日的天数（负数表示已过期）
 * @param remainingPercentage - 还需要消耗的百分比（0–100）
 */
export function calculateExpiryStatus(
  daysUntilExpiry: number,
  remainingPercentage: number,
): ExpiryStatus {
  // 1. 已过期
  if (daysUntilExpiry < 0) {
    return ExpiryStatus.EXPIRED;
  }

  // 2. 即将过期
  if (
    (daysUntilExpiry <= 3 && remainingPercentage >= 50) ||
    daysUntilExpiry <= 1
  ) {
    return ExpiryStatus.URGENT;
  }

  // 3. 快过期
  if (
    (daysUntilExpiry <= 5 && remainingPercentage >= 75) ||
    daysUntilExpiry <= 3
  ) {
    return ExpiryStatus.WARNING;
  }

  // 4. 新鲜
  return ExpiryStatus.FRESH;
}

/**
 * 返回今天到过期日的天数。已过期返回负数。
 */
export function calculateDaysUntilExpiry(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
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

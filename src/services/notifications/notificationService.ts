import * as Notifications from 'expo-notifications';
import { Ingredient, ExpiryStatus } from '../../features/ingredient/types';
import { UserPreference, UserEvent } from '../../features/user/types';
import { useBirdStore } from '../../features/bird/store';

// app 在前台时也显示通知
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

function parseTime(timeStr: string): { hour: number; minute: number } {
  const [h, m] = timeStr.split(':').map(Number);
  return { hour: h || 9, minute: m || 0 };
}

function nextOccurrence(hour: number, minute: number): Date {
  const now = new Date();
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next;
}

export async function scheduleAllNotifications(
  ingredients: Ingredient[],
  pref: UserPreference,
  userEvent: UserEvent | null,
  language: 'zh' | 'en',
): Promise<void> {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission || !pref.notificationsEnabled) {
    await cancelAllNotifications();
    return;
  }

  await cancelAllNotifications();

  const isEn = language === 'en';
  const now = new Date();

  // 1. 食材状态变化通知
  if (pref.notifyOnStatusChange) {
    const { hour, minute } = parseTime(pref.notifyTimeStatusChange);
    for (const ing of ingredients) {
      if (ing.expiryStatus === ExpiryStatus.WARNING || ing.expiryStatus === ExpiryStatus.URGENT) {
        const triggerDate = nextOccurrence(hour, minute);
        await Notifications.scheduleNotificationAsync({
          identifier: `status-change-${ing.id}`,
          content: {
            title: isEn ? '🧊 Ingredient Status Changed' : '🧊 食材状态变化',
            body: useBirdStore.getState().getExpiryAlert(ing.name),
          },
          trigger: { type: 'date', date: triggerDate } as any,
        });
      }
    }
  }

  // 2. 食材到期通知
  if (pref.notifyOnExpired) {
    const { hour, minute } = parseTime(pref.notifyTimeExpired);
    for (const ing of ingredients) {
      if (ing.daysUntilExpiry >= 0) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + ing.daysUntilExpiry);
        expiryDate.setHours(hour, minute, 0, 0);
        if (expiryDate > now) {
          await Notifications.scheduleNotificationAsync({
            identifier: `expired-${ing.id}`,
            content: {
              title: isEn ? '⏰ Ingredient Expired' : '⏰ 食材到期了',
              body: isEn ? `${ing.name} has expired today.` : `${ing.name} 今天到期了，记得处理！`,
            },
            trigger: { type: 'date', date: expiryDate } as any,
          });
        }
      }
    }
  }

  // 3. 每日即将过期/快过期汇总提醒
  const { hour: dh, minute: dm } = parseTime(pref.notifyTimeDailyReminder);
  const urgentItems = pref.notifyOnUrgent ? ingredients.filter(i => i.expiryStatus === ExpiryStatus.URGENT) : [];
  const warningItems = pref.notifyOnWarning ? ingredients.filter(i => i.expiryStatus === ExpiryStatus.WARNING) : [];
  const dailyItems = [...urgentItems, ...warningItems];

  if (dailyItems.length > 0) {
    const names = dailyItems.map(i => i.name).join(isEn ? ', ' : '、');
    const triggerDate = nextOccurrence(dh, dm);
    await Notifications.scheduleNotificationAsync({
      identifier: 'daily-expiry-reminder',
      content: {
        title: isEn ? '🥗 Ingredients Need Attention' : '🥗 有食材需要注意',
        body: isEn ? `${names} need to be used soon!` : `${names} 需要尽快使用！`,
      },
      trigger: { type: 'date', date: triggerDate } as any,
    });
  }

  // 4. 不活跃提醒：x天没有录入食材
  if (pref.notifyInactiveIngredientDays > 0) {
    const lastLogDate = ingredients.length > 0
      ? new Date(Math.max(...ingredients.map(i => new Date(i.loggedDate).getTime())))
      : null;
    const daysSinceLog = lastLogDate
      ? Math.floor((now.getTime() - lastLogDate.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    if (daysSinceLog >= pref.notifyInactiveIngredientDays) {
      const { hour, minute } = parseTime(pref.notifyTimeInactive);
      await Notifications.scheduleNotificationAsync({
        identifier: 'inactive-ingredient',
        content: {
          title: isEn ? '📦 Time to Restock?' : '📦 该补充食材了？',
          body: useBirdStore.getState().getInactiveAlert(daysSinceLog),
        },
        trigger: { type: 'date', date: nextOccurrence(hour, minute) } as any,
      });
    }
  }

  // 5. 不活跃提醒：x天没有生成菜谱
  if (pref.notifyInactiveRecipeDays > 0 && userEvent) {
    const lastCookDate = userEvent.lastCookedDate ? new Date(userEvent.lastCookedDate) : null;
    const daysSinceCook = lastCookDate
      ? Math.floor((now.getTime() - lastCookDate.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    if (daysSinceCook >= pref.notifyInactiveRecipeDays) {
      const { hour, minute } = parseTime(pref.notifyTimeInactive);
      await Notifications.scheduleNotificationAsync({
        identifier: 'inactive-recipe',
        content: {
          title: isEn ? '🍳 Cook Something Today?' : '🍳 今天做点什么吧？',
          body: isEn
            ? `You haven't cooked in ${daysSinceCook} days. Check your fridge!`
            : `你已经 ${daysSinceCook} 天没有生成菜谱了，冰箱里的食材在等你！`,
        },
        trigger: { type: 'date', date: nextOccurrence(hour, minute) } as any,
      });
    }
  }
}

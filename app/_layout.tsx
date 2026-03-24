import { useState, useEffect, useCallback } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { initDatabase } from '../src/db/database';
import { initI18n } from '../src/i18n';
import { scheduleAllNotifications } from '../src/services/notifications/notificationService';
import { useIngredientStore } from '../src/features/ingredient/store';
import { useUserStore } from '../src/features/user/store';
import { useBirdStore } from '../src/features/bird/store';
import { UnlockResult, checkAndUnlockBirds } from '../src/services/bird/unlockService';
import BirdUnlockModal from '../src/components/BirdUnlockModal';
import i18n from '../src/i18n';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [currentUnlock, setCurrentUnlock] = useState<UnlockResult | null>(null);

  // 只订阅需要的 store 字段，避免整个 store 变化都触发重渲染
  const storePendingUnlocks = useBirdStore(s => s.pendingUnlocks);
  const clearFirstPendingUnlock = useBirdStore(s => s.clearFirstPendingUnlock);
  const setActiveBird = useBirdStore(s => s.setActiveBird);

  useEffect(() => {
    Promise.all([
      (async () => { initDatabase(); })(),
      initI18n(),
    ]).then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    const { loadIngredients } = useIngredientStore.getState();
    const { loadUserPreference, loadUserEvent } = useUserStore.getState();
    const { loadBirds } = useBirdStore.getState();
    loadUserPreference();
    loadUserEvent();
    loadBirds();
    loadIngredients();
    setTimeout(() => {
      const { ingredients } = useIngredientStore.getState();
      const { userPreference, userEvent } = useUserStore.getState();
      if (userPreference) {
        scheduleAllNotifications(ingredients, userPreference, userEvent, i18n.language as 'zh' | 'en');
      }
    }, 1500);
    // 检查是否有食材已过期但未用完（触发企鹅解锁条件）
    setTimeout(() => {
      const { ingredients } = useIngredientStore.getState();
      const { userEvent, updateUserEvent } = useUserStore.getState();
      if (
        userEvent &&
        !userEvent.hasLetIngredientExpire &&
        ingredients.some(ing => ing.expiryStatus === 'expired' && ing.remainingPercentage > 0)
      ) {
        updateUserEvent({ hasLetIngredientExpire: true });
        const updated = useUserStore.getState().userEvent;
        if (updated) {
          const unlocked = checkAndUnlockBirds(updated);
          if (unlocked.length > 0) {
            useBirdStore.getState().loadBirds();
            unlocked.forEach(r => useBirdStore.getState().addPendingUnlock(r));
          }
        }
      }
    }, 2000);
  }, [ready]);

  // 当没有正在显示的弹窗且队列有新项目时，取出第一个展示
  useEffect(() => {
    if (!currentUnlock && storePendingUnlocks.length > 0) {
      setCurrentUnlock(storePendingUnlocks[0]);
      clearFirstPendingUnlock();
    }
  }, [currentUnlock, storePendingUnlocks]);

  const handleDismiss = useCallback(() => {
    setCurrentUnlock(null);
  }, []);

  const handleSetAsCurrent = useCallback(() => {
    if (currentUnlock) setActiveBird(currentUnlock.birdId);
  }, [currentUnlock, setActiveBird]);

  if (!ready) return <View style={{ flex: 1 }} />;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <BirdUnlockModal
        visible={!!currentUnlock}
        unlockResult={currentUnlock}
        onSetAsCurrent={handleSetAsCurrent}
        onDismiss={handleDismiss}
      />
    </>
  );
}

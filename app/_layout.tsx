import { useState, useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { initDatabase } from '../src/db/database';
import { initI18n } from '../src/i18n';
import { scheduleAllNotifications } from '../src/services/notifications/notificationService';
import { useIngredientStore } from '../src/features/ingredient/store';
import { useUserStore } from '../src/features/user/store';
import i18n from '../src/i18n';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([
      (async () => { initDatabase(); })(),
      initI18n(),
    ]).then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    const { loadIngredients } = useIngredientStore.getState();
    const { loadUserPreference } = useUserStore.getState();
    loadIngredients();
    loadUserPreference();
    setTimeout(() => {
      const { ingredients } = useIngredientStore.getState();
      const { userPreference, userEvent } = useUserStore.getState();
      if (userPreference) {
        scheduleAllNotifications(ingredients, userPreference, userEvent, i18n.language as 'zh' | 'en');
      }
    }, 1500);
  }, [ready]);

  if (!ready) return <View style={{ flex: 1 }} />;

  return <Stack screenOptions={{ headerShown: false }} />;
}

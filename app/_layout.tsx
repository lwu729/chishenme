import { useState, useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { initDatabase } from '../src/db/database';
import { initI18n } from '../src/i18n';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([
      (async () => { initDatabase(); })(),
      initI18n(),
    ]).then(() => setReady(true));
  }, []);

  if (!ready) return <View style={{ flex: 1 }} />;

  return <Stack screenOptions={{ headerShown: false }} />;
}

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { initDatabase } from '../src/db/database';

export default function RootLayout() {
  useEffect(() => {
    initDatabase();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}

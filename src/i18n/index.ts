import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import zh from './zh';
import en from './en';

export const LANGUAGE_KEY = 'app_language';

export async function initI18n() {
  if (i18n.isInitialized) return;
  const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
  await i18n.use(initReactI18next).init({
    resources: {
      zh: { translation: zh },
      en: { translation: en },
    },
    lng: saved ?? 'zh',
    fallbackLng: 'zh',
    interpolation: { escapeValue: false },
  });
}

export async function changeLanguage(lang: 'zh' | 'en') {
  await i18n.changeLanguage(lang);
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
}

export default i18n;

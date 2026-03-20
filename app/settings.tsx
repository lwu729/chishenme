import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../src/i18n';
import { colors, font, radius } from '../src/constants/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language as 'zh' | 'en';

  async function handleLanguageChange(lang: 'zh' | 'en') {
    await changeLanguage(lang);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 顶部栏 */}
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('settings.title')}</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* 语言设置 */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('settings.languageSection')}</Text>
        <View style={styles.langRow}>
          <TouchableOpacity
            style={[styles.langBtn, currentLang === 'zh' && styles.langBtnActive]}
            onPress={() => handleLanguageChange('zh')}
            activeOpacity={0.8}
          >
            <Text style={[styles.langBtnText, currentLang === 'zh' && styles.langBtnTextActive]}>
              🇨🇳 {t('settings.zh')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langBtn, currentLang === 'en' && styles.langBtnActive]}
            onPress={() => handleLanguageChange('en')}
            activeOpacity={0.8}
          >
            <Text style={[styles.langBtnText, currentLang === 'en' && styles.langBtnTextActive]}>
              🇺🇸 {t('settings.en')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topbar: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.g100,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.g100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 18,
    color: colors.g800,
    lineHeight: 22,
  },
  title: {
    fontSize: 17,
    fontWeight: font.medium,
    color: colors.g800,
    fontFamily: font.family,
  },
  section: {
    marginTop: 24,
    marginHorizontal: 24,
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.card,
    padding: 20,
    borderWidth: 1.5,
    borderColor: colors.g100,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: font.medium,
    color: '#AAAAAA',
    fontFamily: font.family,
    marginBottom: 14,
  },
  langRow: {
    flexDirection: 'row',
    gap: 12,
  },
  langBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.button,
    backgroundColor: colors.g50,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  langBtnActive: {
    backgroundColor: colors.g400,
    borderColor: colors.g400,
  },
  langBtnText: {
    fontSize: 15,
    fontFamily: font.family,
    fontWeight: font.medium,
    color: colors.g600,
  },
  langBtnTextActive: {
    color: '#FFFFFF',
  },
});

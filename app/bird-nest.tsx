import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ToastAndroid, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { colors, font, radius } from '../src/constants/theme';
import { useBirdStore } from '../src/features/bird/store';
import { useUserStore } from '../src/features/user/store';
import { BIRDS_DATA } from '../src/data/birds';

export default function BirdNestScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const { birds, activeBird, setActiveBird } = useBirdStore();
  const { userPreference, updateUserPreference } = useUserStore();

  useFocusEffect(
    useCallback(() => {
      useBirdStore.getState().loadBirds();
    }, [])
  );

  const isAutoMode = userPreference?.birdSelectionMode === 'auto';

  function getBirdCompanion(birdId: string) {
    return birds.find(b => b.id === birdId) ?? null;
  }

  function handleSetActiveBird(birdId: string) {
    if (isAutoMode) {
      Alert.alert(t('birdNest.autoModeHint'));
      return;
    }
    setActiveBird(birdId);
    const birdData = BIRDS_DATA.find(b => b.id === birdId);
    const name = birdData ? (isEn ? birdData.nameEn : birdData.nameZh) : birdId;
    if (Platform.OS === 'android') {
      ToastAndroid.show(t('birdNest.switched', { name }), ToastAndroid.SHORT);
    } else {
      Alert.alert(t('birdNest.switched', { name }));
    }
  }

  function handleToggleMode() {
    const newMode = isAutoMode ? 'manual' : 'auto';
    updateUserPreference({ birdSelectionMode: newMode });
  }

  const unlockedBirds = BIRDS_DATA.filter(b => {
    const companion = getBirdCompanion(b.id);
    return companion?.isUnlocked ?? b.isDefault;
  });

  const lockedBirds = BIRDS_DATA.filter(b => {
    const companion = getBirdCompanion(b.id);
    return !(companion?.isUnlocked ?? b.isDefault);
  });

  function formatUnlockedAt(dateStr: string | null): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return t('birdNest.unlockedAt', { date: `${y}-${m}-${day}` });
    } catch {
      return '';
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('birdNest.title')}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Auto/Manual mode toggle */}
        <View style={styles.modeRow}>
          <Text style={styles.modeLabel}>
            {isAutoMode ? t('birdNest.autoMode') : t('birdNest.manualMode')}
          </Text>
          <TouchableOpacity
            style={[styles.modeToggle, isAutoMode && styles.modeToggleActive]}
            onPress={handleToggleMode}
          >
            <Text style={[styles.modeToggleText, isAutoMode && styles.modeToggleTextActive]}>
              {isAutoMode ? t('birdNest.manualMode') : t('birdNest.autoMode')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* My Companions */}
        <Text style={styles.sectionTitle}>{t('birdNest.myCompanions')}</Text>
        {unlockedBirds.map(bird => {
          const companion = getBirdCompanion(bird.id);
          const isActive = activeBird?.id === bird.id;
          return (
            <TouchableOpacity
              key={bird.id}
              style={[styles.birdCard, isActive && styles.birdCardActive]}
              onPress={() => handleSetActiveBird(bird.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.birdEmoji}>{bird.emoji}</Text>
              <View style={styles.birdInfo}>
                <View style={styles.birdNameRow}>
                  <Text style={styles.birdName}>{isEn ? bird.nameEn : bird.nameZh}</Text>
                  {isActive && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>{t('birdNest.currentBadge')}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.birdBio} numberOfLines={2}>
                  {isEn ? bird.bioEn : bird.bioZh}
                </Text>
                {companion?.unlockedAt && (
                  <Text style={styles.unlockedAt}>{formatUnlockedAt(companion.unlockedAt)}</Text>
                )}
              </View>
              {!isActive && !isAutoMode && (
                <Text style={styles.setBtn}>{t('birdNest.setAsCurrent')}</Text>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Locked */}
        {lockedBirds.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t('birdNest.locked')}</Text>
            {lockedBirds.map(bird => (
              <View key={bird.id} style={styles.lockedCard}>
                <Text style={[styles.birdEmoji, styles.lockedEmoji]}>{'🔒'}</Text>
                <View style={styles.birdInfo}>
                  <Text style={styles.lockedName}>{isEn ? bird.nameEn : bird.nameZh}</Text>
                  <Text style={styles.lockedDesc}>
                    {isEn ? bird.unlockTriggerDescriptionEn : bird.unlockTriggerDescription}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.g100,
  },
  backBtn: {
    width: 40,
    alignItems: 'center',
  },
  backText: {
    fontSize: 22,
    color: colors.g600,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: font.medium,
    color: colors.g800,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 8,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 8,
  },
  modeLabel: {
    fontSize: 15,
    color: colors.g800,
    fontWeight: font.medium,
  },
  modeToggle: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.tag,
    borderWidth: 1.5,
    borderColor: colors.g400,
  },
  modeToggleActive: {
    backgroundColor: colors.g600,
    borderColor: colors.g600,
  },
  modeToggleText: {
    fontSize: 13,
    color: colors.g600,
    fontWeight: font.medium,
  },
  modeToggleTextActive: {
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: font.medium,
    color: colors.g400,
    marginBottom: 10,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  birdCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.card,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: colors.g100,
  },
  birdCardActive: {
    borderColor: colors.g600,
    backgroundColor: colors.g50,
  },
  birdEmoji: {
    fontSize: 44,
    marginRight: 14,
  },
  birdInfo: {
    flex: 1,
  },
  birdNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  birdName: {
    fontSize: 17,
    fontWeight: font.medium,
    color: colors.g800,
  },
  currentBadge: {
    backgroundColor: colors.g600,
    borderRadius: radius.badge,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  currentBadgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: font.medium,
  },
  birdBio: {
    fontSize: 13,
    color: colors.g400,
    lineHeight: 18,
  },
  unlockedAt: {
    fontSize: 11,
    color: colors.g200,
    marginTop: 4,
  },
  setBtn: {
    fontSize: 12,
    color: colors.g600,
    fontWeight: font.medium,
    marginLeft: 8,
  },
  lockedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.card,
    padding: 16,
    marginBottom: 12,
    opacity: 0.6,
    borderWidth: 1,
    borderColor: colors.g100,
  },
  lockedEmoji: {
    fontSize: 36,
  },
  lockedName: {
    fontSize: 16,
    fontWeight: font.medium,
    color: colors.g800,
    marginBottom: 4,
  },
  lockedDesc: {
    fontSize: 12,
    color: colors.g400,
  },
});

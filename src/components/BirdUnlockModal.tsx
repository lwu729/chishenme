import { useEffect, useRef } from 'react';
import { Animated, Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, font, radius } from '../constants/theme';
import { UnlockResult } from '../services/bird/unlockService';

interface Props {
  visible: boolean;
  unlockResult: UnlockResult | null;
  onSetAsCurrent: () => void;
  onDismiss: () => void;
}

export default function BirdUnlockModal({ visible, unlockResult, onSetAsCurrent, onDismiss }: Props) {
  const { t, i18n } = useTranslation();
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0);
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 7,
      }).start();
    }
  }, [visible]);

  if (!unlockResult) return null;

  const isEn = i18n.language === 'en';
  const birdName = isEn ? unlockResult.birdNameEn : unlockResult.birdNameZh;
  const unlockDesc = isEn ? unlockResult.unlockDescriptionEn : unlockResult.unlockDescriptionZh;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.title}>🎉 {t('birdNest.unlockModalTitle')}</Text>
          <Text style={styles.emoji}>{unlockResult.birdEmoji}</Text>
          <Text style={styles.birdName}>{birdName}</Text>
          <Text style={styles.unlockDesc}>{unlockDesc}</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => { onSetAsCurrent(); onDismiss(); }}
          >
            <Text style={styles.primaryBtnText}>{t('birdNest.unlockModalSetNow')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={onDismiss}>
            <Text style={styles.secondaryBtnText}>{t('birdNest.unlockModalLater')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: radius.card,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: font.medium,
    color: colors.g800,
    marginBottom: 16,
  },
  emoji: {
    fontSize: 80,
    lineHeight: 96,
    marginBottom: 12,
  },
  birdName: {
    fontSize: 22,
    fontWeight: font.medium,
    color: colors.g600,
    marginBottom: 8,
  },
  unlockDesc: {
    fontSize: 13,
    color: colors.g400,
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: colors.g600,
    borderRadius: radius.button,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: font.medium,
  },
  secondaryBtn: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: colors.g400,
    fontSize: 15,
  },
});

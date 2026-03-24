import { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  ToastAndroid,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ingredient, ExpiryStatus } from '../../src/features/ingredient/types';
import { useIngredientStore } from '../../src/features/ingredient/store';
import { useBirdStore } from '../../src/features/bird/store';
import { colors, font, radius } from '../../src/constants/theme';
import CustomScrollView from '../../src/components/CustomScrollView';

function showToast(msg: string, okText = 'OK') {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert('', msg, [{ text: okText }]);
  }
}

const { width: SW, height: SH } = Dimensions.get('window');
const BIRD_SIZE = Math.min(200, SW * 0.5);
const BIRD_SECTION_H = Math.min(270, SH * 0.32);

// 根据食材名推导展示用 emoji
const EMOJI_MAP: Record<string, string> = {
  菠菜: '🥬', 豆腐: '🫙', 番茄: '🍅', 鸡蛋: '🥚', 香菇: '🍄',
  鸡胸肉: '🍗', 大蒜: '🧄', 姜: '🌿', 猪肉: '🥩', 牛肉: '🥩',
  鱼: '🐟', 虾: '🍤', 胡萝卜: '🥕', 白菜: '🥬', 土豆: '🥔',
  洋葱: '🧅', 青椒: '🫑', 豆芽: '🌱', 牛奶: '🥛', 奶酪: '🧀',
};
const FALLBACK_EMOJIS = ['🥩', '🥕', '🥦', '🌽', '🍎', '🥛', '🍗', '🧅', '🫙', '🌿'];
function getEmoji(name: string): string {
  if (EMOJI_MAP[name]) return EMOJI_MAP[name];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h) + name.charCodeAt(i);
  return FALLBACK_EMOJIS[Math.abs(h) % FALLBACK_EMOJIS.length];
}

function IngredientRow({ item }: { item: Ingredient }) {
  const { t } = useTranslation();

  const badgeConfig = (() => {
    switch (item.expiryStatus) {
      case ExpiryStatus.EXPIRED:
      case ExpiryStatus.URGENT:
        return { bg: colors.redBg, text: colors.red, label: t('home.badgeUrgent') };
      case ExpiryStatus.WARNING:
        return { bg: colors.amberBg, text: '#C97A00', label: t('home.badgeWarning') };
      default:
        return { bg: colors.g50, text: colors.g600, label: t('home.badgeFresh') };
    }
  })();

  const expiryText =
    item.daysUntilExpiry < 0
      ? t('home.expired')
      : item.daysUntilExpiry === 0
      ? t('home.expiredToday')
      : t('home.daysExpiry', { count: item.daysUntilExpiry });

  return (
    <View style={styles.foodRow}>
      <View style={styles.foodThumb}>
        {item.imagePath ? (
          <Image source={{ uri: item.imagePath }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <Text style={styles.foodEmoji}>{getEmoji(item.name)}</Text>
        )}
      </View>
      <View style={styles.foodMeta}>
        <Text style={styles.foodName}>{item.name}</Text>
        <Text style={styles.foodExp}>{expiryText}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: badgeConfig.bg }]}>
        <Text style={[styles.badgeText, { color: badgeConfig.text }]}>{badgeConfig.label}</Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { ingredients, loadIngredients } = useIngredientStore();
  const { activeBird, getRandomGreeting } = useBirdStore();

  const birdEmoji = activeBird?.emoji ?? '🐦';
  const birdGreeting = activeBird ? getRandomGreeting() : t('home.birdQuestion');

  useEffect(() => {
    loadIngredients();
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 顶部栏 */}
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => router.push('/settings')} style={styles.gearBtn}>
          <Text style={styles.gearIcon}>⚙️</Text>
          <Text style={styles.gearLabel}>{t('home.settings')}</Text>
        </TouchableOpacity>
      </View>

      {/* 小鸟区域 */}
      <View style={[styles.birdSection, { height: BIRD_SECTION_H }]}>
        <View style={[styles.birdOuter, { width: BIRD_SIZE, height: BIRD_SIZE }]}>
          <TouchableOpacity
            onPress={() => router.push('/bird-nest' as any)}
            activeOpacity={0.85}
            style={[
              styles.birdCircle,
              { width: BIRD_SIZE, height: BIRD_SIZE, borderRadius: BIRD_SIZE / 2 },
            ]}
          >
            <Text style={[styles.birdEmoji, { fontSize: BIRD_SIZE * 0.44 }]}>{birdEmoji}</Text>
          </TouchableOpacity>
          <View style={styles.bubble}>
            <View style={styles.bubbleArrow} />
            <Text style={styles.bubbleText}>{birdGreeting}</Text>
          </View>
        </View>
        <Text style={styles.birdLabel}>{t('home.birdLabel')}</Text>
      </View>

      {/* 食材列表 */}
      <View style={styles.listContainer}>
        {ingredients.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{t('home.emptyFridge')}</Text>
          </View>
        ) : (
          <CustomScrollView contentContainerStyle={styles.listContent}>
            {ingredients.map(item => (
              <IngredientRow key={item.id} item={item} />
            ))}
          </CustomScrollView>
        )}
      </View>

      {/* 底部按钮 */}
      <View style={styles.bottomBtns}>
        <TouchableOpacity style={styles.homeBtn} onPress={() => router.push('/(tabs)/scan')}>
          <Text style={styles.homeBtnText}>{t('home.goScan')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.homeBtn} onPress={() => router.push('/(tabs)/recipes')}>
          <Text style={styles.homeBtnText}>{t('home.goRecipes')}</Text>
        </TouchableOpacity>
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
    height: 44,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  gearBtn: { alignItems: 'center' },
  gearIcon: { fontSize: 22 },
  gearLabel: {
    fontSize: 10,
    color: colors.g600,
    fontFamily: font.family,
  },

  birdSection: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  birdOuter: { position: 'relative' },
  birdCircle: {
    backgroundColor: colors.g100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.g200,
  },
  birdEmoji: {},
  bubble: {
    position: 'absolute',
    top: 20,
    right: -95,
    backgroundColor: colors.g800,
    borderRadius: 14,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  bubbleArrow: {
    position: 'absolute',
    left: -7,
    top: '50%',
    marginTop: -7,
    width: 0,
    height: 0,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderRightWidth: 7,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: colors.g800,
  },
  bubbleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: font.family,
    fontWeight: font.medium,
  },
  birdLabel: {
    fontSize: 14,
    fontWeight: font.medium,
    color: colors.g800,
    fontFamily: font.family,
    marginTop: 8,
  },

  listContainer: {
    flex: 1,
    backgroundColor: colors.g50,
    borderRadius: radius.card,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  listContent: {
    padding: 12,
    paddingRight: 4,
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.backgroundCard,
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: colors.g100,
  },
  foodThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.g50,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  foodEmoji: { fontSize: 24 },
  foodMeta: { flex: 1 },
  foodName: {
    fontSize: 14,
    fontWeight: font.medium,
    color: colors.g800,
    fontFamily: font.family,
  },
  foodExp: {
    fontSize: 12,
    color: '#AAAAAA',
    marginTop: 2,
    fontFamily: font.family,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.badge,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: font.family,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#AAAAAA',
    fontFamily: font.family,
  },

  bottomBtns: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 12,
    flexShrink: 0,
  },
  homeBtn: {
    flex: 1,
    backgroundColor: colors.g400,
    borderRadius: radius.button,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: font.medium,
    fontFamily: font.family,
  },
});

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  ToastAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ingredient, ExpiryStatus } from '../../src/features/ingredient/types';
import { useIngredientStore } from '../../src/features/ingredient/store';
import { colors, font, radius } from '../../src/constants/theme';
import CustomScrollView from '../../src/components/CustomScrollView';

function showToast(msg: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert('', msg, [{ text: '好的' }]);
  }
}

type PillType = 'urgent' | 'warning' | 'fresh' | null;

// 根据食材名推导展示用 emoji（与 index.tsx 共用相同映射）
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

const CARD_BG_PALETTE = [
  '#E8F5E9', '#FFF9E6', '#FFE8E8', '#F0FDF4',
  '#F3E5F5', '#FFF3E0', '#F5F5E8', '#EEF4FF',
];
function getCardBg(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h) + id.charCodeAt(i);
  return CARD_BG_PALETTE[Math.abs(h) % CARD_BG_PALETTE.length];
}

function getBadge(status: ExpiryStatus) {
  switch (status) {
    case ExpiryStatus.EXPIRED:
    case ExpiryStatus.URGENT:
      return { bg: colors.redBg, text: colors.red };
    case ExpiryStatus.WARNING:
      return { bg: colors.amberBg, text: '#C97A00' };
    default:
      return { bg: colors.g50, text: colors.g600 };
  }
}

function getItemPill(item: Ingredient): PillType {
  if (item.expiryStatus === ExpiryStatus.URGENT || item.expiryStatus === ExpiryStatus.EXPIRED)
    return 'urgent';
  if (item.expiryStatus === ExpiryStatus.WARNING) return 'warning';
  return 'fresh';
}

function FridgeCard({
  item,
  onDelete,
}: {
  item: Ingredient;
  onDelete: (id: string, name: string) => void;
}) {
  const badge = getBadge(item.expiryStatus);
  const expiryText =
    item.expiryStatus === ExpiryStatus.EXPIRED
      ? '已过期'
      : `还有${item.daysUntilExpiry}天到期`;

  return (
    <View style={styles.fcard}>
      <View style={[styles.fcardImg, { backgroundColor: getCardBg(item.id) }]}>
        <Text style={styles.fcardEmoji}>{getEmoji(item.name)}</Text>
        <View style={styles.fcardActs}>
          <TouchableOpacity
            style={[styles.actBtn, styles.delBtn]}
            onPress={() => onDelete(item.id, item.name)}
          >
            <Text style={{ fontSize: 16 }}>🗑</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actBtn, styles.editBtn]}
            onPress={() => showToast('编辑开发中')}
          >
            <Text style={{ fontSize: 16 }}>✏️</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.fcardInfo}>
        <View>
          <Text style={styles.fname}>{item.name}</Text>
          <Text style={styles.fused}>
            {item.quantity}
            {item.unit} · 剩余{item.remainingPercentage}%
          </Text>
        </View>
        <View style={[styles.ebadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.ebadgeText, { color: badge.text }]}>● {expiryText}</Text>
        </View>
      </View>
    </View>
  );
}

export default function FridgeScreen() {
  const [searchText, setSearchText] = useState('');
  const [activePill, setActivePill] = useState<PillType>(null);
  const { ingredients, loadIngredients, deleteIngredient } = useIngredientStore();

  useEffect(() => {
    loadIngredients();
  }, []);

  // 计算各类别数量
  const urgentCount = ingredients.filter(i => getItemPill(i) === 'urgent').length;
  const warningCount = ingredients.filter(i => getItemPill(i) === 'warning').length;
  const freshCount = ingredients.filter(i => getItemPill(i) === 'fresh').length;

  // 先搜索，再按 pill 筛选
  const displayItems = ingredients
    .filter(item => (searchText ? item.name.includes(searchText) : true))
    .filter(item => (activePill ? getItemPill(item) === activePill : true));

  function togglePill(pill: PillType) {
    setActivePill(prev => (prev === pill ? null : pill));
  }

  function handleDelete(id: string, name: string) {
    Alert.alert(
      '确认删除',
      `确定要删除「${name}」吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => deleteIngredient(id),
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 搜索栏 */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="搜索食材..."
          placeholderTextColor="#CCCCCC"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* 过期筛选 pill */}
      <View style={styles.pillRow}>
        <TouchableOpacity
          style={[styles.pill, styles.pillRed, activePill === 'urgent' && styles.pillBorderRed]}
          onPress={() => togglePill('urgent')}
        >
          <View style={[styles.dot, { backgroundColor: colors.red }]} />
          <Text style={[styles.pillText, { color: colors.red }]}>即将过期 {urgentCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pill, styles.pillAmber, activePill === 'warning' && styles.pillBorderAmber]}
          onPress={() => togglePill('warning')}
        >
          <View style={[styles.dot, { backgroundColor: colors.amber }]} />
          <Text style={[styles.pillText, { color: '#C97A00' }]}>快要过期 {warningCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pill, styles.pillGreen, activePill === 'fresh' && styles.pillBorderGreen]}
          onPress={() => togglePill('fresh')}
        >
          <View style={[styles.dot, { backgroundColor: colors.g400 }]} />
          <Text style={[styles.pillText, { color: colors.g600 }]}>新鲜 {freshCount}</Text>
        </TouchableOpacity>
      </View>

      {/* 食材卡片列表 */}
      <CustomScrollView contentContainerStyle={styles.cardList}>
        {displayItems.map(item => (
          <FridgeCard key={item.id} item={item} onDelete={handleDelete} />
        ))}
        {displayItems.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {ingredients.length === 0 ? '冰箱是空的，去添加食材吧 🛒' : '没有符合条件的食材'}
            </Text>
          </View>
        )}
      </CustomScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchBar: {
    marginHorizontal: 24,
    marginTop: 8,
    backgroundColor: colors.backgroundCard,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.g100,
    paddingVertical: 11,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  searchIcon: { fontSize: 17 },
  searchInput: {
    flex: 1,
    fontFamily: font.family,
    fontSize: 15,
    color: colors.g800,
    padding: 0,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 8,
    flexShrink: 0,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 13,
    borderRadius: radius.tag,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  pillRed: { backgroundColor: colors.redBg },
  pillAmber: { backgroundColor: colors.amberBg },
  pillGreen: { backgroundColor: colors.g50 },
  pillBorderRed: { borderColor: colors.red },
  pillBorderAmber: { borderColor: colors.amber },
  pillBorderGreen: { borderColor: colors.g400 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pillText: { fontSize: 13, fontFamily: font.family },

  cardList: {
    paddingLeft: 24,
    paddingRight: 4,
    paddingTop: 4,
    paddingBottom: 12,
  },
  fcard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.g100,
    marginBottom: 14,
  },
  fcardImg: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fcardEmoji: { fontSize: 58 },
  fcardActs: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  delBtn: { backgroundColor: 'rgba(232,85,85,0.16)' },
  editBtn: { backgroundColor: 'rgba(255,255,255,0.92)' },
  fcardInfo: {
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fname: {
    fontSize: 15,
    fontWeight: font.medium,
    color: colors.g800,
    fontFamily: font.family,
  },
  fused: {
    fontSize: 12,
    color: '#BBBBBB',
    marginTop: 3,
    fontFamily: font.family,
  },
  ebadge: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radius.badge,
  },
  ebadgeText: {
    fontSize: 13,
    fontFamily: font.family,
  },
  emptyState: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#AAAAAA',
    fontFamily: font.family,
  },
});

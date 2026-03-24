import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  ToastAndroid,
  KeyboardAvoidingView,
  Keyboard,
  Image,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { Ingredient, ExpiryStatus } from '../../src/features/ingredient/types';
import { useIngredientStore } from '../../src/features/ingredient/store';
import { colors, font, radius } from '../../src/constants/theme';
import CustomScrollView from '../../src/components/CustomScrollView';

function showToast(msg: string, okText = 'OK') {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert('', msg, [{ text: okText }]);
  }
}

type PillType = 'urgent' | 'warning' | 'fresh' | null;

const EMOJI_MAP: Record<string, string> = {
  菠菜: '🥬', 豆腐: '🫘', 番茄: '🍅', 鸡蛋: '🥚', 香菇: '🍄',
  鸡胸肉: '🍗', 鸡肉: '🍗', 大蒜: '🧄', 姜: '🌿', 猪肉: '🥩', 牛肉: '🥩',
  鱼: '🐟', 虾: '🍤', 胡萝卜: '🥕', 白菜: '🥬', 土豆: '🥔',
  洋葱: '🧅', 青椒: '🫑', 豆芽: '🌱', 牛奶: '🥛', 奶酪: '🧀',
  苹果: '🍎', 橙子: '🍊', 香蕉: '🍌', 葡萄: '🍇', 草莓: '🍓',
  西瓜: '🍉', 梨: '🍐', 桃子: '🍑', 柠檬: '🍋', 蓝莓: '🫐',
};
const FALLBACK_EMOJIS = ['🥩', '🥕', '🥦', '🌽', '🍎', '🥛', '🍗', '🧅', '🫙', '🌿'];
function getEmoji(name: string): string {
  if (EMOJI_MAP[name]) return EMOJI_MAP[name];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h) + name.charCodeAt(i);
  return FALLBACK_EMOJIS[Math.abs(h) % FALLBACK_EMOJIS.length];
}
function getPlaceholderEmoji(name: string): string {
  return EMOJI_MAP[name] ?? '🥘';
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

// ─── 编辑 Modal ───
function EditModal({
  item,
  onClose,
  onSave,
  onDelete,
}: {
  item: Ingredient;
  onClose: () => void;
  onSave: (id: string, quantity: number, remainingPercentage: number, imagePath: string | null) => void;
  onDelete: (id: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const max = item.originalQuantity;
  const [quantity, setQuantity] = useState(item.quantity);
  const [quantityText, setQuantityText] = useState(String(item.quantity));
  const [imageUri, setImageUri] = useState<string | null>(item.imagePath ?? null);
  const [kbVisible, setKbVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKbVisible(true),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKbVisible(false),
    );
    return () => { show.remove(); hide.remove(); };
  }, []);

  function adjustQuantity(delta: number) {
    const next = Math.max(0, Math.min(max, parseFloat(((quantity + delta) * 10).toFixed(0)) / 10));
    setQuantity(next);
    setQuantityText(String(next));
  }

  function onQuantityTextChange(text: string) {
    setQuantityText(text);
    const parsed = parseFloat(text);
    if (!isNaN(parsed) && parsed >= 0) setQuantity(Math.min(parsed, max));
  }

  function onQuantityBlur() {
    const parsed = parseFloat(quantityText);
    if (isNaN(parsed) || parsed < 0) {
      setQuantity(0);
      setQuantityText('0');
    } else if (parsed > max) {
      setQuantity(max);
      setQuantityText(String(max));
      showToast(t('fridge.quantityLimit', { max, unit: item.unit }), t('common.ok'));
    }
  }

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { showToast(t('fridge.needAlbum'), t('common.ok')); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  }

  function handleSave() {
    if (quantity <= 0) {
      Alert.alert(
        t('fridge.deleteTitle'),
        isEn
          ? `"${item.name}" quantity is 0. Remove it from your fridge?`
          : `「${item.name}」数量为 0，要从冰箱中移除吗？`,
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('fridge.deleteConfirm'),
            style: 'destructive',
            onPress: () => {
              onDelete(item.id);
              onClose();
              showToast(isEn ? `"${item.name}" removed ✓` : `「${item.name}」已移除 ✓`);
            },
          },
        ]
      );
      return;
    }
    const remaining = Math.round((quantity / max) * 100);
    onSave(item.id, quantity, remaining, imageUri);
  }

  const atMax = quantity >= max;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <TouchableOpacity style={editStyles.overlay} activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[editStyles.sheetWrap, kbVisible && editStyles.sheetWrapKeyboard]}
        pointerEvents="box-none"
      >
        <View style={editStyles.sheet}>
          {/* 关闭按钮 */}
          <View style={editStyles.sheetHeader}>
            <TouchableOpacity onPress={onClose} style={editStyles.closeBtn}>
              <Text style={editStyles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={editStyles.sheetBody}>
            {/* 食材数量 */}
            <Text style={editStyles.sectionTitle}>{t('fridge.quantitySection')}</Text>
            <View style={editStyles.sectionDivider} />

            <View style={editStyles.quantityRow}>
              <View style={editStyles.stepperGroup}>
                <TouchableOpacity style={editStyles.stepBtn} onPress={() => adjustQuantity(-0.5)}>
                  <Text style={editStyles.stepBtnText}>−</Text>
                </TouchableOpacity>
                <TextInput
                  style={editStyles.quantityInput}
                  value={quantityText}
                  onChangeText={onQuantityTextChange}
                  onBlur={onQuantityBlur}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                />
                <TouchableOpacity
                  style={[editStyles.stepBtn, atMax && editStyles.stepBtnDisabled]}
                  onPress={() => !atMax && adjustQuantity(0.5)}
                  disabled={atMax}
                >
                  <Text style={[editStyles.stepBtnText, atMax && editStyles.stepBtnTextDisabled]}>+</Text>
                </TouchableOpacity>
              </View>

              <View style={editStyles.quantityDivider} />

              <Text style={editStyles.unitText}>{item.unit}</Text>
            </View>

            {/* 食材信息 */}
            <Text style={[editStyles.sectionTitle, { marginTop: 24 }]}>{t('fridge.infoSection')}</Text>
            <View style={editStyles.sectionDivider} />

            <View style={editStyles.infoRow}>
              <Text style={editStyles.infoLabel}>{t('fridge.nameLabel')}</Text>
              <Text style={editStyles.infoDisabledText}>{item.name}</Text>
            </View>

            <View style={editStyles.infoRow}>
              <Text style={editStyles.infoLabel}>{t('fridge.expiryLabel')}</Text>
              <Text style={editStyles.infoDisabledText}>{item.expiryDate}</Text>
            </View>

            {/* 图片区 */}
            <TouchableOpacity style={editStyles.imgPlaceholder} onPress={pickImage} activeOpacity={0.85}>
              {imageUri ? (
                <>
                  <Image
                    source={{ uri: imageUri }}
                    style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
                    resizeMode="cover"
                  />
                  <View style={editStyles.imgChangeOverlay}>
                    <Text style={editStyles.imgChangeText}>{t('fridge.changeImage')}</Text>
                  </View>
                </>
              ) : (
                <>
                  <Text style={editStyles.imgPlaceholderEmoji}>{getPlaceholderEmoji(item.name)}</Text>
                  <Text style={editStyles.imgPlaceholderText}>{t('fridge.uploadImage')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* 按钮 */}
          <View style={editStyles.sheetFooter}>
            <TouchableOpacity style={editStyles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
              <Text style={editStyles.saveBtnText}>{t('fridge.save')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={editStyles.cancelBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={editStyles.cancelBtnText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

type BoundingBox = { x: number; y: number; width: number; height: number };

function CroppedIngredientImage({ uri, crop }: { uri: string; crop: BoundingBox | null }) {
  const [imgSize, setImgSize] = useState<{ width: number; height: number } | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    Image.getSize(uri, (w, h) => setImgSize({ width: w, height: h }), () => {});
  }, [uri]);

  function onLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    setContainerSize({ width, height });
  }

  const cropStyle = useMemo(() => {
    if (!crop || !imgSize || containerSize.width <= 0 || containerSize.height <= 0) return null;
    const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
    const x = clamp01(crop.x);
    const y = clamp01(crop.y);
    const w = Math.max(0.05, clamp01(crop.width));
    const h = Math.max(0.05, clamp01(crop.height));
    const scale = Math.max(containerSize.width / (imgSize.width * w), containerSize.height / (imgSize.height * h));
    const scaledW = imgSize.width * scale;
    const scaledH = imgSize.height * scale;
    const centerX = (x + w / 2) * imgSize.width * scale;
    const centerY = (y + h / 2) * imgSize.height * scale;
    const left = Math.min(0, Math.max(containerSize.width - scaledW, containerSize.width / 2 - centerX));
    const top = Math.min(0, Math.max(containerSize.height - scaledH, containerSize.height / 2 - centerY));
    return { width: scaledW, height: scaledH, left, top };
  }, [crop, imgSize, containerSize]);

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout}>
      {cropStyle ? (
        <Image source={{ uri }} style={[{ position: 'absolute' }, cropStyle]} resizeMode="cover" />
      ) : (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      )}
    </View>
  );
}

function FridgeCard({
  item,
  onDelete,
  onEdit,
}: {
  item: Ingredient;
  onDelete: (id: string, name: string) => void;
  onEdit: (item: Ingredient) => void;
}) {
  const { t } = useTranslation();
  const badge = getBadge(item.expiryStatus);
  const expiryText =
    item.daysUntilExpiry < 0
      ? t('fridge.expired')
      : item.daysUntilExpiry === 0
      ? t('fridge.expiredToday')
      : t('fridge.daysLeft', { count: item.daysUntilExpiry });

  return (
    <View style={styles.fcard}>
      <View style={[styles.fcardImg, !item.imagePath && { backgroundColor: getCardBg(item.id) }]}>
        {item.imagePath ? (
          <CroppedIngredientImage uri={item.imagePath} crop={item.imageCrop} />
        ) : (
          <Text style={styles.fcardEmoji}>{getEmoji(item.name)}</Text>
        )}
        <View style={styles.fcardActs}>
          <TouchableOpacity
            style={[styles.actBtn, styles.delBtn]}
            onPress={() => onDelete(item.id, item.name)}
          >
            <Text style={{ fontSize: 16 }}>🗑</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actBtn, styles.editBtn]}
            onPress={() => onEdit(item)}
          >
            <Text style={{ fontSize: 16 }}>✏️</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.fcardInfo}>
        <View>
          <Text style={styles.fname}>{item.name}</Text>
          <Text style={styles.fused}>
            {item.quantity}{item.unit} · {t('fridge.remaining', { percent: item.remainingPercentage })}
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
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState('');
  const [activePill, setActivePill] = useState<PillType>(null);
  const [editingItem, setEditingItem] = useState<Ingredient | null>(null);
  const { ingredients, loadIngredients, deleteIngredient, updateIngredient } = useIngredientStore();

  useEffect(() => {
    loadIngredients();
  }, []);

  const urgentCount = ingredients.filter(i => getItemPill(i) === 'urgent').length;
  const warningCount = ingredients.filter(i => getItemPill(i) === 'warning').length;
  const freshCount = ingredients.filter(i => getItemPill(i) === 'fresh').length;

  const displayItems = ingredients
    .filter(item => (searchText ? item.name.includes(searchText) : true))
    .filter(item => (activePill ? getItemPill(item) === activePill : true));

  function togglePill(pill: PillType) {
    setActivePill(prev => (prev === pill ? null : pill));
  }

  function handleSaveEdit(id: string, quantity: number, remainingPercentage: number, imagePath: string | null) {
    updateIngredient(id, { quantity, remainingPercentage, imagePath: imagePath ?? undefined });
    setEditingItem(null);
  }

  function handleDelete(id: string, name: string) {
    Alert.alert(
      t('fridge.deleteTitle'),
      t('fridge.deleteBody', { name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('fridge.deleteConfirm'),
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
          placeholder={t('fridge.searchPlaceholder')}
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
          <Text style={[styles.pillText, { color: colors.red }]}>{t('fridge.pillUrgent')} {urgentCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pill, styles.pillAmber, activePill === 'warning' && styles.pillBorderAmber]}
          onPress={() => togglePill('warning')}
        >
          <View style={[styles.dot, { backgroundColor: colors.amber }]} />
          <Text style={[styles.pillText, { color: '#C97A00' }]}>{t('fridge.pillWarning')} {warningCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pill, styles.pillGreen, activePill === 'fresh' && styles.pillBorderGreen]}
          onPress={() => togglePill('fresh')}
        >
          <View style={[styles.dot, { backgroundColor: colors.g400 }]} />
          <Text style={[styles.pillText, { color: colors.g600 }]}>{t('fridge.pillFresh')} {freshCount}</Text>
        </TouchableOpacity>
      </View>

      {/* 食材卡片列表 */}
      <CustomScrollView contentContainerStyle={styles.cardList}>
        {displayItems.map(item => (
          <FridgeCard key={item.id} item={item} onDelete={handleDelete} onEdit={setEditingItem} />
        ))}
        {displayItems.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {ingredients.length === 0 ? t('fridge.emptyFridge') : t('fridge.noMatch')}
            </Text>
          </View>
        )}
      </CustomScrollView>
      {editingItem && (
        <EditModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={handleSaveEdit}
          onDelete={(id) => { deleteIngredient(id); setEditingItem(null); }}
        />
      )}
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
    overflow: 'hidden',
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
  delBtn: { backgroundColor: colors.red },
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

const editStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheetWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 16,
    pointerEvents: 'box-none',
  },
  sheetWrapKeyboard: {
    justifyContent: 'flex-end',
    paddingBottom: 16,
  },
  sheet: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 24,
    overflow: 'hidden',
  },
  sheetHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    alignItems: 'flex-end',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.g50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: colors.g800,
    fontFamily: font.family,
  },
  sheetBody: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: font.family,
    fontWeight: font.medium,
    color: '#AAAAAA',
    marginBottom: 6,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.g100,
    marginBottom: 14,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  stepperGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.g50,
    borderRadius: 14,
    overflow: 'hidden',
  },
  stepBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.g100,
  },
  stepBtnDisabled: {
    backgroundColor: '#F0F0F0',
  },
  stepBtnText: {
    fontSize: 20,
    color: colors.g800,
    fontFamily: font.family,
  },
  stepBtnTextDisabled: {
    color: '#CCCCCC',
  },
  quantityInput: {
    width: 64,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: font.family,
    fontWeight: font.medium,
    color: colors.g800,
    paddingVertical: 6,
  },
  quantityDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.g100,
  },
  unitText: {
    fontSize: 15,
    fontFamily: font.family,
    color: colors.g800,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.g50,
  },
  infoLabel: {
    width: 72,
    fontSize: 14,
    fontFamily: font.family,
    color: '#AAAAAA',
  },
  infoDisabledText: {
    flex: 1,
    fontSize: 15,
    fontFamily: font.family,
    color: '#CCCCCC',
  },
  sheetFooter: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 10,
  },
  saveBtn: {
    backgroundColor: colors.g600,
    borderRadius: radius.buttonLg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: font.family,
    fontWeight: font.medium,
    color: '#FFFFFF',
  },
  cancelBtn: {
    backgroundColor: colors.g50,
    borderRadius: radius.buttonLg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontFamily: font.family,
    fontWeight: font.medium,
    color: colors.g800,
  },
  imgPlaceholder: {
    marginTop: 16,
    height: 180,
    borderRadius: 16,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  imgPlaceholderEmoji: {
    fontSize: 64,
  },
  imgPlaceholderText: {
    fontSize: 12,
    color: '#AAAAAA',
    fontFamily: font.family,
  },
  imgChangeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
  },
  imgChangeText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontFamily: font.family,
  },
});

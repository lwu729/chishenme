import { useState, useEffect, useMemo, useRef } from 'react';
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
  ActivityIndicator,
  ScrollView,
  Animated,
  Easing,
  Dimensions,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useIngredientStore, AddIngredientInput } from '../../src/features/ingredient/store';
import { scanIngredient, ScannedIngredient } from '../../src/services/ai/ingredientScan';
import { colors, font, radius } from '../../src/constants/theme';

function showToast(msg: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert('', msg, [{ text: '好的' }]);
  }
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

const EMOJI_MAP: Record<string, string> = {
  菠菜: '🥬', 豆腐: '🫘', 番茄: '🍅', 鸡蛋: '🥚', 香菇: '🍄',
  鸡胸肉: '🍗', 鸡肉: '🍗', 大蒜: '🧄', 姜: '🌿', 猪肉: '🥩', 牛肉: '🥩',
  鱼: '🐟', 虾: '🍤', 胡萝卜: '🥕', 白菜: '🥬', 土豆: '🥔',
  洋葱: '🧅', 青椒: '🫑', 豆芽: '🌱', 牛奶: '🥛', 奶酪: '🧀',
  苹果: '🍎', 橙子: '🍊', 香蕉: '🍌', 葡萄: '🍇', 草莓: '🍓',
  西瓜: '🍉', 梨: '🍐', 桃子: '🍑', 柠檬: '🍋', 蓝莓: '🫐',
};
function getPlaceholderEmoji(name: string): string {
  return EMOJI_MAP[name] ?? '🥘';
}

// ─── 拍照识别后的确认 Modal ───
function ConfirmModal({
  item,
  index,
  total,
  photoUri,
  onSave,
  onSkip,
}: {
  item: ScannedIngredient;
  index: number;
  total: number;
  photoUri: string;
  onSave: (input: AddIngredientInput & { imagePath: string; imageCrop?: { x: number; y: number; width: number; height: number } }) => void;
  onSkip: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity);
  const [quantityText, setQuantityText] = useState(String(item.quantity));
  const [unit, setUnit] = useState(item.unit);
  const [expiryDate, setExpiryDate] = useState(() => addDays(item.estimatedExpiryDays));
  const [kbVisible, setKbVisible] = useState(false);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [previewSize, setPreviewSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 180,
  });

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

  useEffect(() => {
    setName(item.name);
    setQuantity(item.quantity);
    setQuantityText(String(item.quantity));
    setUnit(item.unit);
    setExpiryDate(addDays(item.estimatedExpiryDays));
  }, [item]);

  useEffect(() => {
    Image.getSize(
      photoUri,
      (width, height) => setImageSize({ width, height }),
      () => setImageSize(null),
    );
  }, [photoUri]);

  function adjustQuantity(delta: number) {
    const next = Math.max(0, parseFloat(((quantity + delta) * 10).toFixed(0)) / 10);
    setQuantity(next);
    setQuantityText(String(next));
  }

  function onQuantityTextChange(text: string) {
    setQuantityText(text);
    const parsed = parseFloat(text);
    if (!isNaN(parsed) && parsed >= 0) setQuantity(parsed);
  }

  function onDateChange(_: DateTimePickerEvent, selected?: Date) {
    if (selected) setExpiryDate(selected);
  }

  function onPreviewLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    setPreviewSize({ width, height });
  }

  function handleSave() {
    if (!name.trim()) { showToast('请输入食材名称'); return; }
    if (quantity <= 0) { showToast('数量不能为 0'); return; }
    onSave({
      name: name.trim(),
      quantity,
      unit: unit.trim() || '份',
      expiryDate: formatDate(expiryDate),
      imagePath: photoUri,
      imageCrop: item.boundingBox,
    });
  }

  const cropStyle = useMemo(() => {
    const box = item.boundingBox;
    if (!box || !imageSize || previewSize.width <= 0 || previewSize.height <= 0) {
      return null;
    }

    const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
    const x = clamp01(box.x);
    const y = clamp01(box.y);
    const w = Math.max(0.05, clamp01(box.width));
    const h = Math.max(0.05, clamp01(box.height));

    const srcW = imageSize.width;
    const srcH = imageSize.height;
    const targetW = previewSize.width;
    const targetH = previewSize.height;

    const scale = Math.max(targetW / (srcW * w), targetH / (srcH * h));
    const scaledW = srcW * scale;
    const scaledH = srcH * scale;

    const centerX = (x + w / 2) * srcW * scale;
    const centerY = (y + h / 2) * srcH * scale;

    const minLeft = targetW - scaledW;
    const minTop = targetH - scaledH;
    const left = Math.min(0, Math.max(minLeft, targetW / 2 - centerX));
    const top = Math.min(0, Math.max(minTop, targetH / 2 - centerY));

    return { width: scaledW, height: scaledH, left, top };
  }, [item.boundingBox, imageSize, previewSize.height, previewSize.width]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <TouchableOpacity style={cStyles.overlay} activeOpacity={1} onPress={() => {}} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[cStyles.sheetWrap, kbVisible && cStyles.sheetWrapKeyboard]}
        pointerEvents="box-none"
      >
        <View style={cStyles.sheet}>
          {/* 标题行 */}
          <View style={cStyles.sheetHeader}>
            <Text style={cStyles.headerTitle}>确认食材 {index}/{total}</Text>
            <TouchableOpacity onPress={onSkip} style={cStyles.skipBtn}>
              <Text style={cStyles.skipBtnText}>跳过</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={cStyles.scrollArea}
            contentContainerStyle={cStyles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* 食材数量 */}
            <Text style={cStyles.sectionTitle}>食材数量</Text>
            <View style={cStyles.sectionDivider} />

            <View style={cStyles.quantityRow}>
              <View style={cStyles.stepperGroup}>
                <TouchableOpacity style={cStyles.stepBtn} onPress={() => adjustQuantity(-0.5)}>
                  <Text style={cStyles.stepBtnText}>−</Text>
                </TouchableOpacity>
                <TextInput
                  style={cStyles.quantityInput}
                  value={quantityText}
                  onChangeText={onQuantityTextChange}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                />
                <TouchableOpacity style={cStyles.stepBtn} onPress={() => adjustQuantity(0.5)}>
                  <Text style={cStyles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
              <View style={cStyles.quantityDivider} />
              <TextInput
                style={cStyles.unitInput}
                value={unit}
                onChangeText={setUnit}
                placeholder="单位..."
                placeholderTextColor="#CCCCCC"
              />
            </View>

            {/* 食材信息 */}
            <Text style={[cStyles.sectionTitle, { marginTop: 20 }]}>食材信息</Text>
            <View style={cStyles.sectionDivider} />

            <View style={cStyles.infoRow}>
              <Text style={cStyles.infoLabel}>食材名称</Text>
              <TextInput
                style={cStyles.infoInput}
                value={name}
                onChangeText={setName}
                placeholder="输入食材名..."
                placeholderTextColor="#CCCCCC"
              />
            </View>

            <View style={cStyles.infoRow}>
              <Text style={cStyles.infoLabel}>到期日</Text>
              <DateTimePicker
                value={expiryDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'compact' : 'default'}
                minimumDate={new Date()}
                onChange={onDateChange}
                locale="zh-CN"
                style={cStyles.datePicker}
              />
            </View>

            {/* 照片区域（有 boundingBox 时 zoom 到该食材） */}
            <View style={cStyles.photoPreview} onLayout={onPreviewLayout}>
              {cropStyle ? (
                <Image
                  source={{ uri: photoUri }}
                  style={[cStyles.photoCropImage, cropStyle]}
                  resizeMode="cover"
                />
              ) : (
                <Image source={{ uri: photoUri }} style={cStyles.photoCoverImage} resizeMode="cover" />
              )}
            </View>
          </ScrollView>

          {/* 底部按钮 */}
          <View style={cStyles.sheetFooter}>
            <TouchableOpacity style={cStyles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
              <Text style={cStyles.saveBtnText}>保存并继续</Text>
            </TouchableOpacity>
            <TouchableOpacity style={cStyles.cancelBtn} onPress={onSkip} activeOpacity={0.85}>
              <Text style={cStyles.cancelBtnText}>取消</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── 手动录入 Modal ───
function ManualInputSheet({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (input: AddIngredientInput) => void;
}) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [quantityText, setQuantityText] = useState('1');
  const [unit, setUnit] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [kbVisible, setKbVisible] = useState(false);
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  });

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
    const next = Math.max(0, parseFloat(((quantity + delta) * 10).toFixed(0)) / 10);
    setQuantity(next);
    setQuantityText(String(next));
  }

  function onQuantityTextChange(text: string) {
    setQuantityText(text);
    const parsed = parseFloat(text);
    if (!isNaN(parsed) && parsed >= 0) setQuantity(parsed);
  }

  function onDateChange(_: DateTimePickerEvent, selected?: Date) {
    if (selected) setExpiryDate(selected);
  }

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { showToast('需要相册权限才能选择图片'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  }

  function handleSave() {
    if (!name.trim()) { showToast('请输入食材名称'); return; }
    if (quantity <= 0) { showToast('数量不能为 0'); return; }
    onSave({
      name: name.trim(),
      quantity,
      unit: unit.trim() || '份',
      expiryDate: formatDate(expiryDate),
      imagePath: imageUri ?? undefined,
    });
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.sheetWrap, kbVisible && styles.sheetWrapKeyboard]}
        pointerEvents="box-none"
      >
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sheetBody}>
            <Text style={styles.sectionTitle}>食材数量</Text>
            <View style={styles.sectionDivider} />

            <View style={styles.quantityRow}>
              <View style={styles.stepperGroup}>
                <TouchableOpacity style={styles.stepBtn} onPress={() => adjustQuantity(-0.5)}>
                  <Text style={styles.stepBtnText}>−</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.quantityInput}
                  value={quantityText}
                  onChangeText={onQuantityTextChange}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                />
                <TouchableOpacity style={styles.stepBtn} onPress={() => adjustQuantity(0.5)}>
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.quantityDivider} />
              <TextInput
                style={styles.unitInput}
                value={unit}
                onChangeText={setUnit}
                placeholder="单位..."
                placeholderTextColor="#CCCCCC"
              />
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>食材信息</Text>
            <View style={styles.sectionDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>食材名称</Text>
              <TextInput
                style={styles.infoInput}
                value={name}
                onChangeText={setName}
                placeholder="输入食材名..."
                placeholderTextColor="#CCCCCC"
              />
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>到期日</Text>
              <DateTimePicker
                value={expiryDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'compact' : 'default'}
                minimumDate={new Date()}
                onChange={onDateChange}
                locale="zh-CN"
                style={styles.datePicker}
              />
            </View>

            {/* 图片区 */}
            <TouchableOpacity style={styles.imgPlaceholder} onPress={pickImage} activeOpacity={0.85}>
              {imageUri ? (
                <>
                  <Image
                    source={{ uri: imageUri }}
                    style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
                    resizeMode="cover"
                  />
                  <View style={styles.imgChangeOverlay}>
                    <Text style={styles.imgChangeText}>更换图片</Text>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.imgPlaceholderEmoji}>{getPlaceholderEmoji(name)}</Text>
                  <Text style={styles.imgPlaceholderText}>点击上传图片</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.sheetFooter}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>保存到我的冰箱</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── 主屏幕 ───
export default function ScanScreen() {
  const SCREEN_WIDTH = Dimensions.get('window').width;
  const CARD_SWITCH_DURATION = 250;
  const [modalVisible, setModalVisible] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanQueue, setScanQueue] = useState<ScannedIngredient[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [photoUri, setPhotoUri] = useState('');
  const [savedCount, setSavedCount] = useState(0);
  const slideX = useRef(new Animated.Value(0)).current;
  const addIngredient = useIngredientStore(s => s.addIngredient);

  const showingConfirm = scanQueue.length > 0 && currentIndex < scanQueue.length;

  function animateToNext(next: number) {
    Animated.timing(slideX, {
      toValue: -SCREEN_WIDTH,
      duration: CARD_SWITCH_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setCurrentIndex(next);
      slideX.setValue(SCREEN_WIDTH);
      Animated.timing(slideX, {
        toValue: 0,
        duration: CARD_SWITCH_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  }

  function finishConfirmFlow() {
    setScanQueue([]);
    setCurrentIndex(0);
    slideX.setValue(0);
  }

  async function handleScan() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showToast('需要相机权限才能拍照');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      quality: 0.7,
      base64: true,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset.base64) { showToast('无法读取图片数据'); return; }

    setPhotoUri(asset.uri);
    setScanning(true);
    setSavedCount(0);

    try {
      const mediaType = asset.mimeType ?? 'image/jpeg';
      const items = await scanIngredient(asset.base64, mediaType);
      if (items.length === 0) {
        showToast('未识别到食材，请重新拍照');
        setScanning(false);
        return;
      }
      setScanQueue(items);
      setCurrentIndex(0);
      slideX.setValue(0);
    } catch (e) {
      console.error(e);
      showToast('识别失败，请检查网络或重试');
    } finally {
      setScanning(false);
    }
  }

  function handleConfirmSave(input: AddIngredientInput & { imagePath: string }) {
    addIngredient(input);
    const next = currentIndex + 1;
    setSavedCount(c => c + 1);
    if (next >= scanQueue.length) {
      finishConfirmFlow();
      showToast(`已保存 ${savedCount + 1} 个食材 ✓`);
    } else {
      animateToNext(next);
    }
  }

  function handleSkip() {
    const next = currentIndex + 1;
    if (next >= scanQueue.length) {
      finishConfirmFlow();
      if (savedCount > 0) showToast(`已保存 ${savedCount} 个食材 ✓`);
    } else {
      animateToNext(next);
    }
  }

  function handleManualSave(input: AddIngredientInput) {
    addIngredient(input);
    setModalVisible(false);
    showToast('食材已添加到冰箱 ✓');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 顶部栏 */}
      <View style={styles.topbar}>
        <Text style={styles.title}>食材录入</Text>
        <TouchableOpacity onPress={() => showToast('扫描历史开发中')} style={styles.histBtn}>
          <Text style={styles.histBtnText}>我的扫描历史</Text>
        </TouchableOpacity>
      </View>

      {/* 扫描区域 */}
      <View style={styles.middle}>
        <View style={styles.scanZone}>
          {scanning ? (
            <>
              <ActivityIndicator size="large" color={colors.g600} />
              <Text style={styles.scanHint}>AI 识别中...</Text>
            </>
          ) : (
            <>
              <View style={styles.scanIcon}>
                <Text style={styles.scanIconEmoji}>📷</Text>
              </View>
              <Text style={styles.scanHint}>{'对准食材或保质期标签拍照\nAI 自动识别食材和过期日'}</Text>
            </>
          )}
        </View>
      </View>

      {/* 底部按钮 */}
      <View style={styles.btns}>
        <TouchableOpacity
          style={[styles.primaryBtn, scanning && { opacity: 0.5 }]}
          activeOpacity={0.85}
          onPress={handleScan}
          disabled={scanning}
        >
          <Text style={styles.primaryBtnText}>点击开始扫描</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          activeOpacity={0.85}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.secondaryBtnText}>手动输入食材</Text>
        </TouchableOpacity>
      </View>

      {/* 手动录入弹窗 */}
      {modalVisible && (
        <ManualInputSheet
          onClose={() => setModalVisible(false)}
          onSave={handleManualSave}
        />
      )}

      {/* AI 识别确认 Modal */}
      {showingConfirm && (
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: slideX }] }]}>
          <ConfirmModal
            item={scanQueue[currentIndex]}
            index={currentIndex + 1}
            total={scanQueue.length}
            photoUri={photoUri}
            onSave={handleConfirmSave}
            onSkip={handleSkip}
          />
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },

  topbar: {
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
  },
  title: {
    fontSize: 22,
    fontWeight: font.medium,
    color: colors.g800,
    fontFamily: font.family,
  },
  histBtn: {
    backgroundColor: colors.g100,
    borderRadius: radius.tag,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  histBtnText: {
    fontSize: 13,
    color: colors.g600,
    fontFamily: font.family,
  },

  middle: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  scanZone: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: colors.g200,
    borderStyle: 'dashed',
    flex: 1,
    maxHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  scanIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.g100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanIconEmoji: { fontSize: 28 },
  scanHint: {
    fontSize: 14,
    color: colors.g600,
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: font.family,
  },

  btns: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 12,
    gap: 12,
    flexShrink: 0,
  },
  primaryBtn: {
    backgroundColor: colors.g400,
    borderRadius: radius.buttonLg,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: font.medium,
    color: '#FFFFFF',
    fontFamily: font.family,
  },
  secondaryBtn: {
    backgroundColor: colors.backgroundCard,
    borderWidth: 1.5,
    borderColor: colors.g200,
    borderRadius: radius.buttonLg,
    paddingVertical: 17,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    color: colors.g600,
    fontFamily: font.family,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  sheetWrapKeyboard: {
    justifyContent: 'flex-end',
    paddingBottom: 16,
  },
  sheet: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 24,
    paddingBottom: 20,
  },
  sheetHeader: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 4,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.g100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: colors.g800,
    fontFamily: font.family,
  },
  sheetBody: {
    paddingHorizontal: 24,
    paddingTop: 4,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: font.medium,
    color: colors.g800,
    fontFamily: font.family,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 10,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.g100,
    marginBottom: 16,
  },

  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepperGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.g100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 18,
    color: colors.g800,
    fontFamily: font.family,
    lineHeight: 22,
  },
  quantityInput: {
    width: 56,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.backgroundMuted,
    textAlign: 'center',
    fontSize: 15,
    color: colors.g800,
    fontFamily: font.family,
    paddingHorizontal: 4,
  },
  quantityDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.g100,
  },
  unitInput: {
    flex: 1,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.backgroundMuted,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.g800,
    fontFamily: font.family,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.g800,
    fontFamily: font.family,
    width: 68,
    flexShrink: 0,
  },
  infoInput: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.backgroundMuted,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.g800,
    fontFamily: font.family,
  },
  datePicker: {
    flex: 1,
  },

  imgPlaceholder: {
    marginTop: 4,
    marginBottom: 8,
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

  sheetFooter: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  saveBtn: {
    backgroundColor: colors.backgroundCard,
    borderWidth: 1.5,
    borderColor: colors.g200,
    borderRadius: radius.buttonLg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: font.medium,
    color: colors.g800,
    fontFamily: font.family,
  },
});

// ─── ConfirmModal styles ───
const cStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheetWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  sheetWrapKeyboard: {
    justifyContent: 'flex-end',
    paddingBottom: 16,
  },
  sheet: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 24,
    maxHeight: '88%',
    overflow: 'hidden',
  },
  sheetHeader: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.g100,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: font.medium,
    color: colors.g800,
    fontFamily: font.family,
  },
  skipBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: radius.tag,
    backgroundColor: colors.g50,
  },
  skipBtnText: {
    fontSize: 13,
    color: '#AAAAAA',
    fontFamily: font.family,
  },
  scrollArea: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: font.medium,
    color: colors.g800,
    fontFamily: font.family,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 10,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.g100,
    marginBottom: 16,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepperGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.g100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 18,
    color: colors.g800,
    fontFamily: font.family,
    lineHeight: 22,
  },
  quantityInput: {
    width: 56,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.backgroundMuted,
    textAlign: 'center',
    fontSize: 15,
    color: colors.g800,
    fontFamily: font.family,
    paddingHorizontal: 4,
  },
  quantityDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.g100,
  },
  unitInput: {
    flex: 1,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.backgroundMuted,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.g800,
    fontFamily: font.family,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.g800,
    fontFamily: font.family,
    width: 68,
    flexShrink: 0,
  },
  infoInput: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.backgroundMuted,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.g800,
    fontFamily: font.family,
  },
  datePicker: {
    flex: 1,
  },
  photoPreview: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    marginTop: 4,
    marginBottom: 8,
    backgroundColor: '#F2F2F2',
    overflow: 'hidden',
    position: 'relative',
  },
  photoCoverImage: {
    width: '100%',
    height: '100%',
  },
  photoCropImage: {
    position: 'absolute',
  },
  sheetFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: colors.g100,
  },
  saveBtn: {
    backgroundColor: colors.g600,
    borderRadius: radius.buttonLg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: font.medium,
    color: '#FFFFFF',
    fontFamily: font.family,
  },
  cancelBtn: {
    backgroundColor: colors.g50,
    borderRadius: radius.buttonLg,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: font.medium,
    color: colors.g800,
    fontFamily: font.family,
  },
});

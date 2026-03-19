import { useState } from 'react';
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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useIngredientStore, AddIngredientInput } from '../../src/features/ingredient/store';
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

// ─── 手动录入 Modal（bottom sheet，不覆盖 tab bar） ───
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
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7); // 默认7天后
    return d;
  });

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

  function handleSave() {
    if (!name.trim()) { showToast('请输入食材名称'); return; }
    if (quantity <= 0) { showToast('数量不能为 0'); return; }
    onSave({
      name: name.trim(),
      quantity,
      unit: unit.trim() || '份',
      expiryDate: formatDate(expiryDate),
    });
  }

  return (
    // 遮罩层
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />

      {/* Sheet 本体 */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.sheetWrap}
        pointerEvents="box-none"
      >
        <View style={styles.sheet}>
          {/* ── 顶部关闭按钮 ── */}
          <View style={styles.sheetHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.sheetBody}
          >
            {/* ── 食材数量 ── */}
            <Text style={styles.sectionTitle}>食材数量</Text>
            <View style={styles.sectionDivider} />

            <View style={styles.quantityRow}>
              {/* 步进器 */}
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

              {/* 单位 */}
              <TextInput
                style={styles.unitInput}
                value={unit}
                onChangeText={setUnit}
                placeholder="单位..."
                placeholderTextColor="#CCCCCC"
              />
            </View>

            {/* ── 食材信息 ── */}
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>食材信息</Text>
            <View style={styles.sectionDivider} />

            {/* 食材名称 */}
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

            {/* 到期日 */}
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
          </ScrollView>

          {/* ── 保存按钮 ── */}
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
  const [modalVisible, setModalVisible] = useState(false);
  const addIngredient = useIngredientStore(s => s.addIngredient);

  function handleSave(input: AddIngredientInput) {
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
        <TouchableOpacity
          style={styles.scanZone}
          activeOpacity={0.8}
          onPress={() => showToast('相机功能开发中 📷')}
        >
          <View style={styles.scanIcon}>
            <Text style={styles.scanIconEmoji}>📷</Text>
          </View>
          <Text style={styles.scanHint}>{'对准食材或保质期标签拍照\nAI 自动识别食材和过期日'}</Text>
        </TouchableOpacity>
      </View>

      {/* 底部按钮 */}
      <View style={styles.btns}>
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={() => showToast('相机打开中...')}
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

      {/* 手动录入底部弹出 Sheet */}
      {modalVisible && (
        <ManualInputSheet
          onClose={() => setModalVisible(false)}
          onSave={handleSave}
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

  // 顶部栏
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

  // 扫描区域
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

  // 底部按钮
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

  // ── Bottom sheet ──
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    backgroundColor: colors.backgroundCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 8 : 16,
    maxHeight: '85%',
  },
  sheetHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
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
    paddingBottom: 12,
  },

  // 分区标题
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

  // 数量行
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

  // 信息行
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
    width: 56,
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

  // 保存按钮
  sheetFooter: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: colors.g100,
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

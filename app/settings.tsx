import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Switch, TextInput, Alert, Platform, Keyboard,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { changeLanguage } from '../src/i18n';
import { colors, font, radius } from '../src/constants/theme';
import { DEFAULT_THRESHOLDS } from '../src/utils/expiryUtils';
import { useUserStore } from '../src/features/user/store';
import { useIngredientStore } from '../src/features/ingredient/store';
import { useBirdStore } from '../src/features/bird/store';
import { scheduleAllNotifications } from '../src/services/notifications/notificationService';
import { getDatabase, initDatabase } from '../src/db/database';
import i18n from '../src/i18n';

function timeStringToDate(timeStr: string): Date {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(h || 9, m || 0, 0, 0);
  return d;
}

function dateToTimeString(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { i18n: i18nInstance } = useTranslation();
  const currentLang = i18nInstance.language as 'zh' | 'en';

  const { userPreference, updateUserPreference } = useUserStore();
  const { ingredients } = useIngredientStore();
  const { userEvent } = useUserStore();

  // DateTimePicker state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerField, setPickerField] = useState<
    'notifyTimeStatusChange' | 'notifyTimeExpired' | 'notifyTimeDailyReminder' | 'notifyTimeInactive'
  >('notifyTimeStatusChange');
  const [pendingDate, setPendingDate] = useState(new Date());

  async function handleLanguageChange(lang: 'zh' | 'en') {
    await changeLanguage(lang);
  }

  function updatePref(changes: Parameters<typeof updateUserPreference>[0]) {
    updateUserPreference(changes);
    setTimeout(() => {
      const { userPreference: pref, userEvent: evt } = useUserStore.getState();
      if (pref) {
        scheduleAllNotifications(ingredients, pref, evt, i18n.language as 'zh' | 'en');
      }
    }, 100);
  }

  function openTimePicker(field: typeof pickerField, currentTime: string) {
    const d = timeStringToDate(currentTime);
    setPickerField(field);
    setPendingDate(d);
    setPickerVisible(true);
  }

  function handleTimeChange(event: DateTimePickerEvent, date?: Date) {
    if (event.type === 'dismissed') { setPickerVisible(false); return; }
    if (!date) return;
    setPendingDate(date);
    if (Platform.OS === 'android') {
      updatePref({ [pickerField]: dateToTimeString(date) });
      setPickerVisible(false);
    }
  }

  function handleTimeSave() {
    updatePref({ [pickerField]: dateToTimeString(pendingDate) });
    setPickerVisible(false);
  }

  function handleTimeCancel() {
    setPickerVisible(false);
  }

  if (!userPreference) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  const notifEnabled = userPreference.notificationsEnabled;
  const ingredientDays = userPreference.notifyInactiveIngredientDays;
  const recipeDays = userPreference.notifyInactiveRecipeDays;

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

      <KeyboardAwareScrollView
        enableOnAndroid
        extraScrollHeight={120}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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

        {/* 通知设置 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('notifications.title')}</Text>

          {/* 总开关 */}
          <View style={styles.masterRow}>
            <Text style={styles.masterIcon}>🔔</Text>
            <Text style={styles.masterLabel}>{t('notifications.masterSwitch')}</Text>
            <Switch
              value={notifEnabled}
              onValueChange={(v) => updatePref({ notificationsEnabled: v })}
              trackColor={{ false: colors.g100, true: colors.g400 }}
              thumbColor="#fff"
            />
          </View>

          <View style={[styles.subItems, !notifEnabled && styles.disabled]}>
            {/* 子项一：状态变化 */}
            <NotifRow
              enabled={notifEnabled}
              checked={userPreference.notifyOnStatusChange}
              onToggle={(v) => updatePref({ notifyOnStatusChange: v })}
              title={t('notifications.statusChange')}
              subtitle={t('notifications.statusChangeSub')}
              timeLabel={t('notifications.timeLabel')}
              timeValue={userPreference.notifyTimeStatusChange}
              onTimePress={() => openTimePicker('notifyTimeStatusChange', userPreference.notifyTimeStatusChange)}
            />

            <View style={styles.divider} />

            {/* 子项二：食材到期 */}
            <NotifRow
              enabled={notifEnabled}
              checked={userPreference.notifyOnExpired}
              onToggle={(v) => updatePref({ notifyOnExpired: v })}
              title={t('notifications.onExpired')}
              subtitle={t('notifications.onExpiredSub')}
              timeLabel={t('notifications.timeLabel')}
              timeValue={userPreference.notifyTimeExpired}
              onTimePress={() => openTimePicker('notifyTimeExpired', userPreference.notifyTimeExpired)}
            />

            <View style={styles.divider} />

            {/* 子项三：每日提醒（多选 pill） */}
            <View style={styles.notifItem}>
              <View style={styles.notifLeft}>
                <Text style={[styles.notifTitle, !notifEnabled && styles.textDisabled]}>
                  {t('notifications.dailyReminder')}
                </Text>
                <Text style={[styles.notifSub, !notifEnabled && styles.textDisabled]}>
                  {t('notifications.dailyReminderSub')}
                </Text>
                <View style={styles.pillRow}>
                  <TouchableOpacity
                    disabled={!notifEnabled}
                    style={[
                      styles.pill,
                      userPreference.notifyOnUrgent && notifEnabled && styles.pillActive,
                    ]}
                    onPress={() => updatePref({ notifyOnUrgent: !userPreference.notifyOnUrgent })}
                  >
                    <Text style={[
                      styles.pillText,
                      userPreference.notifyOnUrgent && notifEnabled && styles.pillTextActive,
                    ]}>
                      {t('notifications.urgent')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={!notifEnabled}
                    style={[
                      styles.pill,
                      userPreference.notifyOnWarning && notifEnabled && styles.pillActive,
                    ]}
                    onPress={() => updatePref({ notifyOnWarning: !userPreference.notifyOnWarning })}
                  >
                    <Text style={[
                      styles.pillText,
                      userPreference.notifyOnWarning && notifEnabled && styles.pillTextActive,
                    ]}>
                      {t('notifications.warning')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity
                disabled={!notifEnabled}
                style={[styles.timeBtn, !notifEnabled && styles.timeBtnDisabled]}
                onPress={() => openTimePicker('notifyTimeDailyReminder', userPreference.notifyTimeDailyReminder)}
              >
                <Text style={[styles.timeBtnLabel, !notifEnabled && styles.textDisabled]}>
                  {t('notifications.timeLabel')}
                </Text>
                <Text style={[styles.timeBtnValue, !notifEnabled && styles.textDisabled]}>
                  {userPreference.notifyTimeDailyReminder}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* 子项四：未录入食材提醒 */}
            <InactiveRow
              enabled={notifEnabled}
              isOn={ingredientDays > 0}
              onToggle={(v) => updatePref({
                notifyInactiveIngredientDays: v ? (ingredientDays > 0 ? ingredientDays : 7) : 0,
              })}
              days={ingredientDays > 0 ? ingredientDays : 7}
              onDaysChange={(d) => updatePref({ notifyInactiveIngredientDays: d })}
              title={t('notifications.inactiveIngredient')}
              subtitle={t('notifications.inactiveIngredientSub', {
                days: ingredientDays > 0 ? ingredientDays : 7,
              })}
              timeLabel={t('notifications.timeLabel')}
              timeValue={userPreference.notifyTimeInactive}
              onTimePress={() => openTimePicker('notifyTimeInactive', userPreference.notifyTimeInactive)}
            />

            <View style={styles.divider} />

            {/* 子项五：未生成菜谱提醒 */}
            <InactiveRow
              enabled={notifEnabled}
              isOn={recipeDays > 0}
              onToggle={(v) => updatePref({
                notifyInactiveRecipeDays: v ? (recipeDays > 0 ? recipeDays : 3) : 0,
              })}
              days={recipeDays > 0 ? recipeDays : 3}
              onDaysChange={(d) => updatePref({ notifyInactiveRecipeDays: d })}
              title={t('notifications.inactiveRecipe')}
              subtitle={t('notifications.inactiveRecipeSub', {
                days: recipeDays > 0 ? recipeDays : 3,
              })}
              timeLabel={t('notifications.timeLabel')}
              timeValue={userPreference.notifyTimeInactive}
              onTimePress={() => openTimePicker('notifyTimeInactive', userPreference.notifyTimeInactive)}
            />
          </View>
        </View>
        {/* 过期状态设置 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('expirySettings.title')}</Text>
          <Text style={[styles.notifSub, { marginBottom: 16 }]}>{t('expirySettings.subtitle')}</Text>

          {/* 即将过期组 */}
          <View style={styles.thresholdGroup}>
            <View style={styles.thresholdGroupHeader}>
              <View style={[styles.statusDot, styles.statusDotUrgent]} />
              <Text style={styles.thresholdGroupTitle}>{t('expirySettings.urgentTitle')}</Text>
            </View>

            <ThresholdEditRow
              displayText={t('expirySettings.daysAndPercent', {
                days: userPreference.urgentDays,
                percent: userPreference.urgentPercentage,
              })}
              fields={[
                {
                  value: userPreference.urgentDays,
                  min: 1, max: 14, unit: currentLang === 'zh' ? '天' : 'd',
                  errorMsg: t('expirySettings.daysRange', { min: 1, max: 14 }),
                },
                {
                  value: userPreference.urgentPercentage,
                  min: 1, max: 99, unit: '%',
                  errorMsg: t('expirySettings.percentRange'),
                },
              ]}
              onSave={(vals) => {
                if (vals[0] >= userPreference.warningDays) return t('expirySettings.validationError');
                updatePref({ urgentDays: vals[0], urgentPercentage: vals[1] });
                return null;
              }}
            />

            <ThresholdEditRow
              displayText={t('expirySettings.absoluteDays', { days: userPreference.urgentAbsoluteDays })}
              fields={[
                {
                  value: userPreference.urgentAbsoluteDays,
                  min: 1, max: 7, unit: currentLang === 'zh' ? '天' : 'd',
                  errorMsg: t('expirySettings.daysRange', { min: 1, max: 7 }),
                },
              ]}
              onSave={(vals) => {
                if (vals[0] >= userPreference.warningAbsoluteDays) return t('expirySettings.validationError');
                updatePref({ urgentAbsoluteDays: vals[0] });
                return null;
              }}
            />

            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => updatePref({
                urgentDays: DEFAULT_THRESHOLDS.urgentDays,
                urgentPercentage: DEFAULT_THRESHOLDS.urgentPercentage,
                urgentAbsoluteDays: DEFAULT_THRESHOLDS.urgentAbsoluteDays,
              })}
            >
              <Text style={styles.resetBtnText}>{t('expirySettings.resetDefault')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* 快过期组 */}
          <View style={styles.thresholdGroup}>
            <View style={styles.thresholdGroupHeader}>
              <View style={[styles.statusDot, styles.statusDotWarning]} />
              <Text style={styles.thresholdGroupTitle}>{t('expirySettings.warningTitle')}</Text>
            </View>

            <ThresholdEditRow
              displayText={t('expirySettings.daysAndPercent', {
                days: userPreference.warningDays,
                percent: userPreference.warningPercentage,
              })}
              fields={[
                {
                  value: userPreference.warningDays,
                  min: 1, max: 30, unit: currentLang === 'zh' ? '天' : 'd',
                  errorMsg: t('expirySettings.daysRange', { min: 1, max: 30 }),
                },
                {
                  value: userPreference.warningPercentage,
                  min: 1, max: 99, unit: '%',
                  errorMsg: t('expirySettings.percentRange'),
                },
              ]}
              onSave={(vals) => {
                if (userPreference.urgentDays >= vals[0]) return t('expirySettings.validationError');
                updatePref({ warningDays: vals[0], warningPercentage: vals[1] });
                return null;
              }}
            />

            <ThresholdEditRow
              displayText={t('expirySettings.absoluteDays', { days: userPreference.warningAbsoluteDays })}
              fields={[
                {
                  value: userPreference.warningAbsoluteDays,
                  min: 1, max: 14, unit: currentLang === 'zh' ? '天' : 'd',
                  errorMsg: t('expirySettings.daysRange', { min: 1, max: 14 }),
                },
              ]}
              onSave={(vals) => {
                if (userPreference.urgentAbsoluteDays >= vals[0]) return t('expirySettings.validationError');
                updatePref({ warningAbsoluteDays: vals[0] });
                return null;
              }}
            />

            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => updatePref({
                warningDays: DEFAULT_THRESHOLDS.warningDays,
                warningPercentage: DEFAULT_THRESHOLDS.warningPercentage,
                warningAbsoluteDays: DEFAULT_THRESHOLDS.warningAbsoluteDays,
              })}
            >
              <Text style={styles.resetBtnText}>{t('expirySettings.resetDefault')}</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* 开发者重置按钮 */}
        {__DEV__ && (
          <TouchableOpacity
            style={styles.devResetBtn}
            onPress={() => {
              Alert.alert(
                '重置所有数据',
                '确定要清空所有食材、菜谱、小鸟解锁记录和使用记录吗？此操作不可恢复。',
                [
                  { text: '取消', style: 'cancel' },
                  {
                    text: '确认重置',
                    style: 'destructive',
                    onPress: () => {
                      const db = getDatabase();
                      db.runSync('DELETE FROM ingredients');
                      db.runSync('DELETE FROM recipes');
                      db.runSync('DELETE FROM bird_companions');
                      db.runSync(`UPDATE user_events SET
                        totalIngredientsLogged=0, totalMealsCooked=0,
                        dailyMealsCooked=0, dailyMealsCookedDate='',
                        cookingStreakDays=0, lastCookedDate=NULL,
                        hasFinishedWarningIngredient=0,
                        hasFinishedUrgentIngredient=0,
                        hasFinishedFreshIngredient=0,
                        hasLetIngredientExpire=0
                        WHERE id=1`);
                      db.runSync(`UPDATE user_preferences SET activeBirdId='night-heron' WHERE id=1`);
                      initDatabase();
                      useIngredientStore.getState().loadIngredients();
                      useBirdStore.getState().loadBirds();
                      useUserStore.getState().loadUserEvent();
                      useUserStore.getState().loadUserPreference();
                      Alert.alert('✓', '数据已重置');
                      router.replace('/(tabs)');
                    },
                  },
                ]
              );
            }}
          >
            <Text style={styles.devResetText}>🛠 重置所有数据（开发模式）</Text>
          </TouchableOpacity>
        )}
      </KeyboardAwareScrollView>

      {/* DateTimePicker with Save / Cancel (iOS only; Android auto-confirms) */}
      {pickerVisible && Platform.OS === 'ios' && (
        <View style={styles.pickerPanel}>
          <DateTimePicker
            value={pendingDate}
            mode="time"
            is24Hour
            display="spinner"
            onChange={handleTimeChange}
            style={{ width: '100%' }}
          />
          <View style={styles.pickerBtnRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleTimeCancel}>
              <Text style={styles.secondaryBtnText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleTimeSave}>
              <Text style={styles.primaryBtnText}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface NotifRowProps {
  enabled: boolean;
  checked: boolean;
  onToggle: (v: boolean) => void;
  title: string;
  subtitle: string;
  timeLabel: string;
  timeValue: string;
  onTimePress: () => void;
}

function NotifRow({ enabled, checked, onToggle, title, subtitle, timeLabel, timeValue, onTimePress }: NotifRowProps) {
  return (
    <View style={styles.notifItem}>
      <View style={styles.notifLeft}>
        <Text style={[styles.notifTitle, !enabled && styles.textDisabled]}>{title}</Text>
        <Text style={[styles.notifSub, !enabled && styles.textDisabled]}>{subtitle}</Text>
      </View>
      <View style={styles.notifRight}>
        <TouchableOpacity
          disabled={!enabled || !checked}
          style={[styles.timeBtn, (!enabled || !checked) && styles.timeBtnDisabled]}
          onPress={onTimePress}
        >
          <Text style={[styles.timeBtnLabel, (!enabled || !checked) && styles.textDisabled]}>{timeLabel}</Text>
          <Text style={[styles.timeBtnValue, (!enabled || !checked) && styles.textDisabled]}>{timeValue}</Text>
        </TouchableOpacity>
        <Switch
          value={checked && enabled}
          disabled={!enabled}
          onValueChange={onToggle}
          trackColor={{ false: colors.g100, true: colors.g400 }}
          thumbColor="#fff"
        />
      </View>
    </View>
  );
}

interface InactiveRowProps {
  enabled: boolean;
  isOn: boolean;
  onToggle: (v: boolean) => void;
  days: number;
  onDaysChange: (d: number) => void;
  title: string;
  subtitle: string;
  timeLabel: string;
  timeValue: string;
  onTimePress: () => void;
}

function InactiveRow({ enabled, isOn, onToggle, days, onDaysChange, title, subtitle, timeLabel, timeValue, onTimePress }: InactiveRowProps) {
  const { t, i18n: { language } } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draftDays, setDraftDays] = useState('');
  const active = enabled && isOn;

  function handleSaveDays() {
    const n = parseInt(draftDays, 10);
    if (isNaN(n) || n < 1 || n > 30) {
      Alert.alert(
        '',
        language === 'zh'
          ? '请输入 1-30 之间的天数'
          : 'Please enter a number between 1 and 30',
      );
      return;
    }
    onDaysChange(n);
    setEditing(false);
  }

  function handleCancelDays() {
    setEditing(false);
  }

  return (
    <View style={styles.notifItem}>
      <View style={styles.notifLeft}>
        <Text style={[styles.notifTitle, !enabled && styles.textDisabled]}>{title}</Text>

        {/* 副标题：实时反映已保存的天数 */}
        {active && !editing ? (
          <TouchableOpacity
            onPress={() => { setDraftDays(String(days)); setEditing(true); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.notifSub, styles.subtitleEditable]}>{subtitle}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.notifSub, !enabled && styles.textDisabled]}>{subtitle}</Text>
        )}

        {/* 天数编辑区 */}
        {active && editing && (
          <View style={styles.daysEditBlock}>
            <TextInput
              style={styles.daysEditInput}
              keyboardType="number-pad"
              value={draftDays}
              onChangeText={setDraftDays}
              maxLength={2}
              autoFocus
              selectTextOnFocus
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              blurOnSubmit
            />
            <View style={styles.daysEditBtns}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleCancelDays}>
                <Text style={styles.secondaryBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveDays}>
                <Text style={styles.primaryBtnText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <View style={styles.notifRight}>
        <TouchableOpacity
          disabled={!active}
          style={[styles.timeBtn, !active && styles.timeBtnDisabled]}
          onPress={onTimePress}
        >
          <Text style={[styles.timeBtnLabel, !active && styles.textDisabled]}>{timeLabel}</Text>
          <Text style={[styles.timeBtnValue, !active && styles.textDisabled]}>{timeValue}</Text>
        </TouchableOpacity>
        <Switch
          value={isOn && enabled}
          disabled={!enabled}
          onValueChange={onToggle}
          trackColor={{ false: colors.g100, true: colors.g400 }}
          thumbColor="#fff"
        />
      </View>
    </View>
  );
}

// ─── ThresholdEditRow ─────────────────────────────────────────────────────────

interface ThresholdField {
  value: number;
  min: number;
  max: number;
  unit: string;
  errorMsg: string;
}

interface ThresholdEditRowProps {
  displayText: string;
  fields: ThresholdField[];
  onSave: (values: number[]) => string | null;
}

function ThresholdEditRow({ displayText, fields, onSave }: ThresholdEditRowProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<string[]>([]);

  function startEdit() {
    setDrafts(fields.map(f => String(f.value)));
    setEditing(true);
  }

  function handleSave() {
    const parsed = drafts.map(d => parseInt(d, 10));
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      if (isNaN(parsed[i]) || parsed[i] < f.min || parsed[i] > f.max) {
        Alert.alert('', f.errorMsg);
        return;
      }
    }
    const err = onSave(parsed);
    if (err) { Alert.alert('', err); return; }
    setEditing(false);
  }

  function setDraft(idx: number, val: string) {
    const next = [...drafts];
    next[idx] = val;
    setDrafts(next);
  }

  return (
    <View style={styles.thresholdRow}>
      {!editing ? (
        <TouchableOpacity onPress={startEdit} activeOpacity={0.7}>
          <Text style={[styles.notifSub, styles.subtitleEditable]}>{displayText}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.daysEditBlock}>
          <View style={styles.thresholdInputRow}>
            {fields.map((f, idx) => (
              <View key={idx} style={styles.thresholdInputGroup}>
                <TextInput
                  style={styles.daysEditInput}
                  keyboardType="number-pad"
                  value={drafts[idx]}
                  onChangeText={v => setDraft(idx, v)}
                  maxLength={3}
                  autoFocus={idx === 0}
                  selectTextOnFocus
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  blurOnSubmit
                />
                <Text style={styles.thresholdUnitLabel}>{f.unit}</Text>
              </View>
            ))}
          </View>
          <View style={styles.daysEditBtns}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setEditing(false)}>
              <Text style={styles.secondaryBtnText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleSave}>
              <Text style={styles.primaryBtnText}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  scrollContent: {
    paddingBottom: 40,
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
  // Notification styles
  masterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  masterIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  masterLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: font.medium,
    color: colors.g800,
    fontFamily: font.family,
  },
  subItems: {
    borderTopWidth: 1,
    borderTopColor: colors.g100,
    paddingTop: 4,
  },
  disabled: {
    opacity: 0.45,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    gap: 8,
  },
  notifLeft: {
    flex: 1,
  },
  notifRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 2,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: font.medium,
    color: colors.g800,
    fontFamily: font.family,
    marginBottom: 2,
  },
  notifSub: {
    fontSize: 12,
    color: '#AAAAAA',
    fontFamily: font.family,
  },
  subtitleEditable: {
    color: colors.g600,
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
  },
  textDisabled: {
    color: '#CCCCCC',
  },
  divider: {
    height: 1,
    backgroundColor: colors.g100,
  },
  timeBtn: {
    backgroundColor: colors.g50,
    borderRadius: radius.badge,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    minWidth: 52,
  },
  timeBtnDisabled: {
    backgroundColor: colors.g50,
  },
  timeBtnLabel: {
    fontSize: 10,
    color: '#AAAAAA',
    fontFamily: font.family,
  },
  timeBtnValue: {
    fontSize: 13,
    fontWeight: font.medium,
    color: colors.g800,
    fontFamily: font.family,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.tag,
    backgroundColor: colors.g50,
    borderWidth: 1.5,
    borderColor: colors.g100,
  },
  pillActive: {
    backgroundColor: colors.g600,
    borderColor: colors.g600,
  },
  pillText: {
    fontSize: 12,
    fontFamily: font.family,
    fontWeight: font.medium,
    color: colors.g600,
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  // Days inline editor
  daysEditBlock: {
    marginTop: 8,
    gap: 8,
  },
  daysEditInput: {
    width: 64,
    height: 36,
    borderRadius: radius.badge,
    backgroundColor: colors.g50,
    borderWidth: 1.5,
    borderColor: colors.g400,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: font.medium,
    color: colors.g800,
    fontFamily: font.family,
  },
  daysEditBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  // Shared button styles (used by days editor and time picker)
  primaryBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: radius.button,
    backgroundColor: colors.g800,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 14,
    fontFamily: font.family,
    fontWeight: font.medium,
    color: '#FFFFFF',
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: radius.button,
    backgroundColor: colors.g50,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.g100,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontFamily: font.family,
    fontWeight: font.medium,
    color: colors.g600,
  },
  // Expiry threshold section
  thresholdGroup: {
    marginBottom: 4,
  },
  thresholdGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    marginTop: 4,
  },
  thresholdGroupTitle: {
    fontSize: 13,
    fontWeight: font.medium,
    color: colors.g800,
    fontFamily: font.family,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotUrgent: {
    backgroundColor: '#EF4444',
  },
  statusDotWarning: {
    backgroundColor: '#F97316',
  },
  thresholdRow: {
    paddingVertical: 4,
  },
  thresholdInputRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  thresholdInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  thresholdUnitLabel: {
    fontSize: 13,
    color: colors.g600,
    fontFamily: font.family,
  },
  resetBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.badge,
    backgroundColor: colors.g50,
    borderWidth: 1,
    borderColor: colors.g100,
  },
  resetBtnText: {
    fontSize: 12,
    color: '#AAAAAA',
    fontFamily: font.family,
  },
  // Time picker panel
  pickerPanel: {
    backgroundColor: colors.backgroundCard,
    borderTopWidth: 1,
    borderTopColor: colors.g100,
    paddingBottom: 16,
  },
  pickerBtnRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
  },
  devResetBtn: {
    marginTop: 32,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: radius.button,
    borderWidth: 1.5,
    borderColor: colors.red,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  devResetText: {
    fontSize: 14,
    color: colors.red,
    fontFamily: font.family,
    textAlign: 'center',
  },
});

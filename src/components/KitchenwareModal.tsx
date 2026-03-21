import { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  ToastAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors, font, radius } from '../constants/theme';
import { useUserStore } from '../features/user/store';
import { useRecipeStore } from '../features/recipe/store';

type SectionKey = 'measuringTools' | 'cookingAppliances' | 'condiments' | 'knives' | 'assistiveTools';

interface SectionDef {
  key: SectionKey;
  labelKey: string;
  presetsKey: string;
}

const SECTIONS: SectionDef[] = [
  { key: 'measuringTools', labelKey: 'kitchenware.measuringToolsLabel', presetsKey: 'kitchenware.measuringPresets' },
  { key: 'cookingAppliances', labelKey: 'kitchenware.cookingAppliancesLabel', presetsKey: 'kitchenware.cookingAppliancesPresets' },
  { key: 'condiments', labelKey: 'kitchenware.condimentsLabel', presetsKey: 'kitchenware.condimentsPresets' },
  { key: 'knives', labelKey: 'kitchenware.knivesLabel', presetsKey: 'kitchenware.knivesPresets' },
  { key: 'assistiveTools', labelKey: 'kitchenware.assistiveToolsLabel', presetsKey: 'kitchenware.assistivePresets' },
];

interface KitchenState {
  measuringTools: string[];
  cookingAppliances: string[];
  condiments: string[];
  knives: string[];
  assistiveTools: string[];
  useImperialUnits: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function KitchenwareModal({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const { userPreference, updateUserPreference } = useUserStore();
  const { invalidateCache } = useRecipeStore();

  const [state, setState] = useState<KitchenState>({
    measuringTools: [],
    cookingAppliances: [],
    condiments: [],
    knives: [],
    assistiveTools: [],
    useImperialUnits: false,
  });

  useEffect(() => {
    if (visible && userPreference) {
      setState({
        measuringTools: [...userPreference.measuringTools],
        cookingAppliances: [...userPreference.cookingAppliances],
        condiments: [...userPreference.condiments],
        knives: [...userPreference.knives],
        assistiveTools: [...userPreference.assistiveTools],
        useImperialUnits: userPreference.useImperialUnits,
      });
    }
  }, [visible, userPreference]);

  function toggleItem(sectionKey: SectionKey, item: string) {
    setState(prev => {
      const current = prev[sectionKey];
      const next = current.includes(item)
        ? current.filter(i => i !== item)
        : [...current, item];
      return { ...prev, [sectionKey]: next };
    });
  }

  function handleAddCustom(sectionKey: SectionKey, labelKey: string, presetsKey: string) {
    const sectionLabel = t(labelKey);
    const presets = t(presetsKey, { returnObjects: true }) as string[];
    const alreadyAdded = state[sectionKey];
    const suggestions = presets.filter(p => !alreadyAdded.includes(p)).slice(0, 5);
    const msgSuffix = suggestions.length > 0
      ? t('kitchenware.addPromptMsg', { presets: suggestions.join('、') })
      : undefined;

    if (Platform.OS === 'ios') {
      Alert.prompt(
        t('kitchenware.addPromptTitle', { section: sectionLabel }),
        msgSuffix,
        (text) => {
          if (text?.trim()) {
            setState(prev => ({
              ...prev,
              [sectionKey]: [...prev[sectionKey], text.trim()],
            }));
          }
        },
        'plain-text',
        '',
        'default',
      );
    } else {
      // Android: show top suggestions as Alert buttons
      if (suggestions.length === 0) return;
      Alert.alert(
        t('kitchenware.addPromptTitle', { section: sectionLabel }),
        msgSuffix,
        [
          ...suggestions.map(preset => ({
            text: preset,
            onPress: () => {
              setState(prev => ({
                ...prev,
                [sectionKey]: [...prev[sectionKey], preset],
              }));
            },
          })),
          { text: t('common.cancel'), style: 'cancel' as const },
        ],
      );
    }
  }

  function handleSave() {
    updateUserPreference({
      measuringTools: state.measuringTools,
      cookingAppliances: state.cookingAppliances,
      condiments: state.condiments,
      knives: state.knives,
      assistiveTools: state.assistiveTools,
      useImperialUnits: state.useImperialUnits,
    });
    invalidateCache();
    onClose();
    const msg = t('kitchenware.savedToast');
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert('', msg, [{ text: t('common.ok') }]);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('kitchenware.title')}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* Unit toggle */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('kitchenware.imperialLabel')}</Text>
            <View style={styles.radioRow}>
              <TouchableOpacity
                style={styles.radioOpt}
                onPress={() => setState(prev => ({ ...prev, useImperialUnits: false }))}
              >
                <View style={[styles.radio, !state.useImperialUnits && styles.radioActive]} />
                <Text style={styles.radioText}>{t('kitchenware.metric')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.radioOpt}
                onPress={() => setState(prev => ({ ...prev, useImperialUnits: true }))}
              >
                <View style={[styles.radio, state.useImperialUnits && styles.radioActive]} />
                <Text style={styles.radioText}>{t('kitchenware.imperial')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Equipment sections */}
          {SECTIONS.map(sec => {
            const presets = t(sec.presetsKey, { returnObjects: true }) as string[];
            const active = state[sec.key];
            return (
              <View key={sec.key} style={styles.section}>
                <Text style={styles.sectionLabel}>{t(sec.labelKey)}</Text>
                <View style={styles.tagsWrap}>
                  {presets.map(item => {
                    const isOn = active.includes(item);
                    return (
                      <TouchableOpacity
                        key={item}
                        style={[styles.chip, isOn && styles.chipOn]}
                        onPress={() => toggleItem(sec.key, item)}
                      >
                        <Text style={[styles.chipText, isOn && styles.chipTextOn]}>
                          {item}{isOn ? ' ✕' : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  {/* Custom items not in presets */}
                  {active
                    .filter(item => !presets.includes(item))
                    .map(item => (
                      <TouchableOpacity
                        key={item}
                        style={[styles.chip, styles.chipOn, styles.chipCustom]}
                        onPress={() => toggleItem(sec.key, item)}
                      >
                        <Text style={[styles.chipText, styles.chipTextOn]}>{item} ✕</Text>
                      </TouchableOpacity>
                    ))
                  }
                  <TouchableOpacity
                    style={styles.addChip}
                    onPress={() => handleAddCustom(sec.key, sec.labelKey, sec.presetsKey)}
                  >
                    <Text style={styles.addChipText}>{t('kitchenware.addBtn')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Footer save button */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>{t('kitchenware.saveBtn')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.g100,
  },
  title: {
    fontSize: 18,
    fontWeight: font.medium,
    color: colors.g800,
    fontFamily: font.family,
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 16,
    color: colors.g600,
    fontFamily: font.family,
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 24,
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: font.medium,
    color: colors.g800,
    fontFamily: font.family,
  },
  radioRow: {
    flexDirection: 'row',
    gap: 24,
  },
  radioOpt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.g200,
    backgroundColor: colors.backgroundCard,
  },
  radioActive: {
    borderColor: colors.g400,
    backgroundColor: colors.g400,
  },
  radioText: {
    fontSize: 13,
    color: colors.g600,
    fontFamily: font.family,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.tag,
    borderWidth: 1.5,
    borderColor: colors.g200,
    backgroundColor: colors.backgroundCard,
  },
  chipOn: {
    backgroundColor: colors.g400,
    borderColor: colors.g400,
  },
  chipCustom: {
    backgroundColor: colors.g600,
    borderColor: colors.g600,
  },
  chipText: {
    fontSize: 13,
    color: colors.g600,
    fontFamily: font.family,
  },
  chipTextOn: {
    color: '#FFFFFF',
  },
  addChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.tag,
    borderWidth: 1.5,
    borderColor: colors.g400,
    backgroundColor: colors.backgroundCard,
  },
  addChipText: {
    fontSize: 13,
    color: colors.g400,
    fontFamily: font.family,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.g100,
  },
  saveBtn: {
    height: 54,
    backgroundColor: colors.g400,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: font.medium,
    color: '#FFFFFF',
    fontFamily: font.family,
  },
});

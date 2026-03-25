import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  ToastAndroid,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, font, radius } from '../../src/constants/theme';
import i18n from '../../src/i18n';
import CustomScrollView from '../../src/components/CustomScrollView';
import KitchenwareModal from '../../src/components/KitchenwareModal';
import { useIngredientStore } from '../../src/features/ingredient/store';
import { useRecipeStore, hasConditionsChanged } from '../../src/features/recipe/store';
import { useUserStore } from '../../src/features/user/store';
import { Recipe, RecipeSortOrder } from '../../src/features/recipe/types';
import { IngredientFilterState } from '../../src/features/ingredient/types';
import { UserPreference } from '../../src/features/user/types';
import type { RecipeGenerationContext } from '../../src/services/ai/recipeGenerate';

function showToast(msg: string, okText = 'OK') {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert('', msg, [{ text: okText }]);
  }
}

function formatGenerationAgeLabel(
  createdAtIso: string,
  t: (key: string, opts?: any) => string,
): string {
  const ms = Date.now() - new Date(createdAtIso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return t('recipes.generationJustNow');
  return t('recipes.generationAge', { minutes: mins });
}

const DEFAULT_PREFERENCE: UserPreference = {
  id: 1,
  cookingTools: [],
  cookingAppliances: [],
  knives: [],
  assistiveTools: [],
  measuringTools: [],
  condiments: [],
  useImperialUnits: false,
  preferredCuisines: [],
  preferredCookingMethods: [],
  preferredFlavors: [],
  activeBirdId: null,
  birdSelectionMode: 'manual',
  notificationsEnabled: true,
  notifyOnStatusChange: true,
  notifyOnExpired: true,
  notifyOnUrgent: true,
  notifyOnWarning: true,
  notifyInactiveIngredientDays: 7,
  notifyInactiveRecipeDays: 3,
  notifyTimeStatusChange: '09:00',
  notifyTimeExpired: '09:00',
  notifyTimeDailyReminder: '09:00',
  notifyTimeInactive: '09:00',
  urgentDays: 3,
  urgentPercentage: 50,
  urgentAbsoluteDays: 1,
  warningDays: 5,
  warningPercentage: 75,
  warningAbsoluteDays: 3,
  customCuisinesZh: [],
  customCuisinesEn: [],
  customMethodsZh: [],
  customMethodsEn: [],
  customFlavorsZh: [],
  customFlavorsEn: [],
};

// ─── 水平 tag 行（多选，空数组 = 全部） ───
function TagRow({
  allTag,
  tags,
  selected,
  onToggle,
  customTags = [],
  onAddCustom,
  onDeleteCustom,
}: {
  allTag: string;
  tags: string[];
  selected: string[];
  onToggle: (tag: string) => void;
  customTags?: string[];
  onAddCustom?: () => void;
  onDeleteCustom?: (tag: string) => void;
}) {
  const [scrollX, setScrollX] = useState(0);
  const [contentW, setContentW] = useState(0);
  const [viewportW, setViewportW] = useState(0);
  const [trackW, setTrackW] = useState(0);

  const thumbW =
    trackW > 0 && contentW > viewportW
      ? Math.max(24, (viewportW / contentW) * trackW)
      : trackW;
  const maxScroll = Math.max(0, contentW - viewportW);
  const thumbLeft =
    maxScroll > 0 && trackW > thumbW ? (scrollX / maxScroll) * (trackW - thumbW) : 0;

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tagRowContent}
        onScroll={e => setScrollX(e.nativeEvent.contentOffset.x)}
        scrollEventThrottle={16}
        onContentSizeChange={w => setContentW(w)}
        onLayout={e => setViewportW(e.nativeEvent.layout.width)}
      >
        {/* + 自定义按钮 */}
        {onAddCustom && (
          <TouchableOpacity style={styles.addTagBtn} onPress={onAddCustom}>
            <Text style={styles.addTagBtnText}>+</Text>
          </TouchableOpacity>
        )}

        {/* 全部 tag */}
        <TouchableOpacity
          style={[styles.tag, selected.length === 0 && styles.tagActive]}
          onPress={() => onToggle(allTag)}
        >
          <Text style={[styles.tagText, selected.length === 0 && styles.tagTextActive]}>{allTag}</Text>
        </TouchableOpacity>

        {/* 自定义 tag（带 × 删除） */}
        {customTags.map(tag => {
          const active = selected.includes(tag);
          return (
            <View key={`custom-${tag}`} style={[styles.customTagPill, active && styles.tagActive]}>
              <TouchableOpacity onPress={() => onToggle(tag)} activeOpacity={0.75}>
                <Text style={[styles.tagText, active && styles.tagTextActive]}>{tag}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                onPress={() => onDeleteCustom?.(tag)}
              >
                <Text style={[styles.deleteTagX, active && styles.deleteTagXActive]}>×</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* 系统预设 tag */}
        {tags.map(tag => {
          const active = selected.includes(tag);
          return (
            <TouchableOpacity
              key={tag}
              style={[styles.tag, active && styles.tagActive]}
              onPress={() => onToggle(tag)}
            >
              <Text style={[styles.tagText, active && styles.tagTextActive]}>{tag}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={styles.hTrack} onLayout={e => setTrackW(e.nativeEvent.layout.width)}>
        <View
          style={[
            styles.hThumb,
            {
              width: Math.min(thumbW, trackW),
              left: Math.max(0, Math.min(thumbLeft, trackW - thumbW)),
            },
          ]}
        />
      </View>
    </View>
  );
}

// ─── 食材标签格（包括 / 排除） ───
function IngredientGrid({ mode }: { mode: 'include' | 'exclude' }) {
  const { t } = useTranslation();
  const { ingredients, setFilterState } = useIngredientStore();

  function toggle(id: string, current: IngredientFilterState) {
    if (mode === 'include') {
      setFilterState(
        id,
        current === IngredientFilterState.INCLUDE
          ? IngredientFilterState.NULL
          : IngredientFilterState.INCLUDE,
      );
    } else {
      setFilterState(
        id,
        current === IngredientFilterState.EXCLUDE
          ? IngredientFilterState.NULL
          : IngredientFilterState.EXCLUDE,
      );
    }
  }

  return (
    <View style={styles.ieBox}>
      <Text style={styles.ieTitle}>{mode === 'include' ? t('recipes.includeTitle') : t('recipes.excludeTitle')}</Text>
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        <View style={styles.ieGrid}>
          {ingredients.length === 0 ? (
            <Text style={styles.ieEmpty}>{t('recipes.noIngredient')}</Text>
          ) : (
            ingredients.map(item => {
              const on =
                mode === 'include'
                  ? item.filterState === IngredientFilterState.INCLUDE
                  : item.filterState === IngredientFilterState.EXCLUDE;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.itag,
                    mode === 'include'
                      ? on
                        ? styles.itagIncOn
                        : styles.itagInc
                      : on
                      ? styles.itagExcOn
                      : styles.itagExc,
                  ]}
                  onPress={() => toggle(item.id, item.filterState)}
                >
                  <Text
                    style={[
                      styles.itagText,
                      mode === 'include'
                        ? on
                          ? styles.itagTextIncOn
                          : styles.itagTextInc
                        : on
                        ? styles.itagTextExcOn
                        : styles.itagTextExc,
                    ]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── 菜谱结果卡片 ───
const CARD_COLORS = ['#E8F5E9', '#FFE8E8', '#EEF4FF', '#FFF8E1', '#F3E5F5'];

function RecipeCard({
  recipe,
  index,
  onToggleFavorite,
}: {
  recipe: Recipe;
  index: number;
  onToggleFavorite: (id: string) => void;
}) {
  const { t } = useTranslation();
  const tags = [recipe.cuisine, recipe.flavor, recipe.cookingMethod];
  const ingredientNames = recipe.ingredients.map(i => i.name).join('、');

  return (
    <TouchableOpacity
      style={styles.rcard}
      activeOpacity={0.85}
      onPress={() => router.push({ pathname: '/recipe-detail', params: { id: recipe.id } })}
    >
      <View
        style={[styles.rcardImg, { backgroundColor: CARD_COLORS[index % CARD_COLORS.length] }]}
      >
        <Text style={styles.rcardEmoji}>🍳</Text>
        <TouchableOpacity
          style={styles.favBtn}
          onPress={() => onToggleFavorite(recipe.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.favBtnText}>{recipe.isFavorited ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
        <View style={styles.rarrow}>
          <Text style={{ fontSize: 14, color: colors.g600 }}>→</Text>
        </View>
      </View>
      <View style={styles.rinfo}>
        <View style={styles.rnameRow}>
          <Text style={styles.rname} numberOfLines={1}>
            {recipe.name}
          </Text>
          <Text style={styles.rtime}>⏱ {t('recipes.durationMin', { count: recipe.durationMinutes })}</Text>
        </View>
        <View style={styles.rtrow}>
          {tags.map(tag => (
            <View key={tag} style={styles.rtag}>
              <Text style={styles.rtagText}>{tag}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.ringr} numberOfLines={2}>
          {t('recipes.using')}{ingredientNames}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── 主屏幕 ───
export default function RecipesScreen() {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const [showResults, setShowResults] = useState(false);
  const [showKitchenware, setShowKitchenware] = useState(false);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [methods, setMethods] = useState<string[]>([]);
  const [tastes, setTastes] = useState<string[]>([]);

  const allTag = t('recipes.allTag');
  const cuisineOptions = t('recipes.cuisineOptions', { returnObjects: true }) as string[];
  const methodOptions = t('recipes.methodOptions', { returnObjects: true }) as string[];
  const flavorOptions = t('recipes.flavorOptions', { returnObjects: true }) as string[];

  // 切换语言后清空选中，因为选项内容已完全改变
  useEffect(() => {
    function resetFilters() {
      setCuisines([]);
      setMethods([]);
      setTastes([]);
    }
    i18n.on('languageChanged', resetFilters);
    return () => { i18n.off('languageChanged', resetFilters); };
  }, []);

  function promptAddCustomTag(type: 'cuisine' | 'method' | 'flavor') {
    const titleKey =
      type === 'cuisine'
        ? 'recipeFilter.addCustomCuisine'
        : type === 'method'
        ? 'recipeFilter.addCustomMethod'
        : 'recipeFilter.addCustomFlavor';
    Alert.prompt(
      t(titleKey),
      undefined,
      (text) => {
        const trimmed = text?.trim();
        if (!trimmed || !userPreference) return;
        if (isEn) {
          if (type === 'cuisine' && !userPreference.customCuisinesEn.includes(trimmed))
            updateUserPreference({ customCuisinesEn: [...userPreference.customCuisinesEn, trimmed] });
          else if (type === 'method' && !userPreference.customMethodsEn.includes(trimmed))
            updateUserPreference({ customMethodsEn: [...userPreference.customMethodsEn, trimmed] });
          else if (type === 'flavor' && !userPreference.customFlavorsEn.includes(trimmed))
            updateUserPreference({ customFlavorsEn: [...userPreference.customFlavorsEn, trimmed] });
        } else {
          if (type === 'cuisine' && !userPreference.customCuisinesZh.includes(trimmed))
            updateUserPreference({ customCuisinesZh: [...userPreference.customCuisinesZh, trimmed] });
          else if (type === 'method' && !userPreference.customMethodsZh.includes(trimmed))
            updateUserPreference({ customMethodsZh: [...userPreference.customMethodsZh, trimmed] });
          else if (type === 'flavor' && !userPreference.customFlavorsZh.includes(trimmed))
            updateUserPreference({ customFlavorsZh: [...userPreference.customFlavorsZh, trimmed] });
        }
      },
      'plain-text',
      '',
    );
  }

  function handleDeleteCustomTag(type: 'cuisine' | 'method' | 'flavor', tagToDelete: string) {
    Alert.alert(
      t('recipeFilter.deleteTagConfirm'),
      undefined,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            if (!userPreference) return;
            if (isEn) {
              if (type === 'cuisine')
                updateUserPreference({ customCuisinesEn: userPreference.customCuisinesEn.filter(x => x !== tagToDelete) });
              else if (type === 'method')
                updateUserPreference({ customMethodsEn: userPreference.customMethodsEn.filter(x => x !== tagToDelete) });
              else
                updateUserPreference({ customFlavorsEn: userPreference.customFlavorsEn.filter(x => x !== tagToDelete) });
            } else {
              if (type === 'cuisine')
                updateUserPreference({ customCuisinesZh: userPreference.customCuisinesZh.filter(x => x !== tagToDelete) });
              else if (type === 'method')
                updateUserPreference({ customMethodsZh: userPreference.customMethodsZh.filter(x => x !== tagToDelete) });
              else
                updateUserPreference({ customFlavorsZh: userPreference.customFlavorsZh.filter(x => x !== tagToDelete) });
            }
            // 同步移除已选中状态
            if (type === 'cuisine') setCuisines(prev => prev.filter(x => x !== tagToDelete));
            else if (type === 'method') setMethods(prev => prev.filter(x => x !== tagToDelete));
            else setTastes(prev => prev.filter(x => x !== tagToDelete));
          },
        },
      ],
    );
  }

  function handleRandomize() {
    // 随机选 0~1 个菜系
    const allCuisines = [...cuisineOptions, ...customCuisines];
    const randomCuisine = allCuisines.length > 0 && Math.random() < 0.7
      ? [allCuisines[Math.floor(Math.random() * allCuisines.length)]]
      : [];
    setCuisines(randomCuisine);

    // 随机选 0~1 个烹饪方式
    const allMethods = [...methodOptions, ...customMethods];
    const randomMethod = allMethods.length > 0 && Math.random() < 0.7
      ? [allMethods[Math.floor(Math.random() * allMethods.length)]]
      : [];
    setMethods(randomMethod);

    // 随机选 0~1 个口味
    const allFlavors = [...flavorOptions, ...customFlavors];
    const randomFlavor = allFlavors.length > 0 && Math.random() < 0.7
      ? [allFlavors[Math.floor(Math.random() * allFlavors.length)]]
      : [];
    setTastes(randomFlavor);

    // 随机打乱食材 include/exclude 状态
    resetAllFilterStates();
    const shuffled = [...ingredients].sort(() => Math.random() - 0.5);
    const includeCount = Math.floor(Math.random() * Math.min(5, shuffled.length) + 1);
    shuffled.slice(0, includeCount).forEach(ing => setFilterState(ing.id, IngredientFilterState.INCLUDE));

    showToast(t('recipes.randomDone'), t('common.ok'));
  }

  function toggleTag(
    tag: string,
    current: string[],
    setter: (v: string[]) => void,
  ) {
    if (tag === allTag) {
      setter([]);
    } else {
      setter(current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag]);
    }
  }

  const { ingredients, loadIngredients, setFilterState, resetAllFilterStates } = useIngredientStore();
  const {
    currentRecipes,
    favoritedRecipes,
    isLoading,
    sortOrder,
    generateAndSetRecipes,
    toggleFavorite,
    loadFavoritedRecipes,
    lastGenerationSnapshot,
  } = useRecipeStore();
  const { userPreference, loadUserPreference, updateUserPreference } = useUserStore();

  // 当前语言对应的自定义 tag
  const customCuisines = isEn
    ? (userPreference?.customCuisinesEn ?? [])
    : (userPreference?.customCuisinesZh ?? []);
  const customMethods = isEn
    ? (userPreference?.customMethodsEn ?? [])
    : (userPreference?.customMethodsZh ?? []);
  const customFlavors = isEn
    ? (userPreference?.customFlavorsEn ?? [])
    : (userPreference?.customFlavorsZh ?? []);

  const userChoseFilterRef = useRef(false);

  const buildGenerationContext = useCallback((): RecipeGenerationContext => {
    const included = ingredients
      .filter(i => i.filterState === IngredientFilterState.INCLUDE)
      .map(i => i.id);
    const excluded = ingredients
      .filter(i => i.filterState === IngredientFilterState.EXCLUDE)
      .map(i => i.id);
    return {
      availableIngredients: ingredients,
      includedIngredientIds: included,
      excludedIngredientIds: excluded,
      selectedCuisines: cuisines,
      selectedCookingMethods: methods,
      selectedFlavors: tastes,
      userPreference: userPreference ?? DEFAULT_PREFERENCE,
      favoritedRecipes,
      sortOrder,
    };
  }, [ingredients, cuisines, methods, tastes, userPreference, favoritedRecipes, sortOrder]);

  useEffect(() => {
    loadIngredients();
    loadFavoritedRecipes();
    loadUserPreference();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (userChoseFilterRef.current) return;
      const ctx = buildGenerationContext();
      const { currentRecipes: list, lastGenerationSnapshot: snap } = useRecipeStore.getState();
      if (list.length > 0 && snap && !hasConditionsChanged(ctx)) {
        setShowResults(true);
      }
    }, [buildGenerationContext]),
  );

  function doGenerate(context: ReturnType<typeof buildGenerationContext>) {
    generateAndSetRecipes(context)
      .then(() => {
        userChoseFilterRef.current = false;
        setShowResults(true);
      })
      .catch((e: any) => {
        showToast(e?.message ?? t('recipes.generateFailed'), t('common.ok'));
      });
  }

  async function handleGenerate(force = false) {
    const context = buildGenerationContext();
    if (!force && currentRecipes.length > 0 && !hasConditionsChanged(context)) {
      showToast(t('recipes.showingCached'), t('common.ok'));
      userChoseFilterRef.current = false;
      setShowResults(true);
      return;
    }

    // Pre-generation check: if kitchen setup is empty, prompt user
    const pref = userPreference ?? DEFAULT_PREFERENCE;
    const kitchenIsEmpty =
      pref.cookingAppliances.length === 0 &&
      pref.condiments.length === 0 &&
      pref.measuringTools.length === 0;
    if (kitchenIsEmpty) {
      Alert.alert(
        t('kitchenware.preGenerateTitle'),
        t('kitchenware.preGenerateBody'),
        [
          {
            text: t('kitchenware.preGenerateGoFill'),
            onPress: () => setShowKitchenware(true),
          },
          {
            text: t('kitchenware.preGenerateSkip'),
            style: 'cancel',
            onPress: () => doGenerate(context),
          },
        ],
      );
      return;
    }

    doGenerate(context);
  }

  async function handleForceRegenerate() {
    await handleGenerate(true);
  }

  function handleToggleFavorite(id: string) {
    try {
      toggleFavorite(id);
    } catch (e: any) {
      showToast(e?.message ?? t('recipes.favoriteFailed'), t('common.ok'));
    }
  }

  // ── 结果页 ──
  if (showResults) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.rrTopbar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rrTitle}>{t('recipes.resultTitle')}</Text>
            {lastGenerationSnapshot ? (
              <Text style={styles.rrGenTime}>
                {formatGenerationAgeLabel(lastGenerationSnapshot.createdAt, t)}
              </Text>
            ) : (
              <Text style={styles.rrSub}>{t('recipes.resultSub')}</Text>
            )}
          </View>
          <View style={styles.rrTopActions}>
            <TouchableOpacity
              onPress={() => void handleForceRegenerate()}
              style={styles.refreshBtn}
              disabled={isLoading}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="refresh" size={22} color={colors.g600} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                userChoseFilterRef.current = true;
                setShowResults(false);
              }}
              style={styles.backBtn}
            >
              <Text style={styles.backBtnText}>←</Text>
            </TouchableOpacity>
          </View>
        </View>

        {currentRecipes.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>{t('recipes.empty')}</Text>
          </View>
        ) : (
          <CustomScrollView contentContainerStyle={styles.rrList}>
            {currentRecipes.map((r, i) => (
              <RecipeCard
                key={r.id}
                recipe={r}
                index={i}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </CustomScrollView>
        )}

        <View style={styles.regenWrap}>
          <TouchableOpacity
            style={[styles.regenBtn, isLoading && { opacity: 0.5 }]}
            onPress={() => void handleForceRegenerate()}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.g800} />
            ) : (
              <Text style={styles.regenBtnText}>{t('recipes.regenerate')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── 筛选页 ──
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KitchenwareModal visible={showKitchenware} onClose={() => setShowKitchenware(false)} />
      <View style={styles.rfTopbar}>
        <View>
          <Text style={styles.rfTitle}>{t('recipes.filterTitle')}</Text>
          <Text style={styles.rfSub}>{t('recipes.filterSub')}</Text>
        </View>
        <TouchableOpacity style={styles.kitBtn} onPress={() => setShowKitchenware(true)}>
          <Text style={styles.kitBtnText}>{t('recipes.kitchenware')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.rfBody}>
        <View style={styles.rfSec}>
          <Text style={styles.flabel}>{t('recipes.cuisineLabel')}</Text>
          <TagRow
            allTag={allTag}
            tags={cuisineOptions}
            selected={cuisines}
            onToggle={tag => toggleTag(tag, cuisines, setCuisines)}
            customTags={customCuisines}
            onAddCustom={() => promptAddCustomTag('cuisine')}
            onDeleteCustom={tag => handleDeleteCustomTag('cuisine', tag)}
          />
        </View>

        <View style={styles.rfSec}>
          <Text style={styles.flabel}>{t('recipes.methodLabel')}</Text>
          <TagRow
            allTag={allTag}
            tags={methodOptions}
            selected={methods}
            onToggle={tag => toggleTag(tag, methods, setMethods)}
            customTags={customMethods}
            onAddCustom={() => promptAddCustomTag('method')}
            onDeleteCustom={tag => handleDeleteCustomTag('method', tag)}
          />
        </View>

        <View style={styles.rfSec}>
          <Text style={styles.flabel}>{t('recipes.flavorLabel')}</Text>
          <TagRow
            allTag={allTag}
            tags={flavorOptions}
            selected={tastes}
            onToggle={tag => toggleTag(tag, tastes, setTastes)}
            customTags={customFlavors}
            onAddCustom={() => promptAddCustomTag('flavor')}
            onDeleteCustom={tag => handleDeleteCustomTag('flavor', tag)}
          />
        </View>

        <View style={styles.ieRow}>
          <IngredientGrid mode="include" />
          <IngredientGrid mode="exclude" />
        </View>

        <TouchableOpacity style={styles.randBtn} onPress={handleRandomize}>
          <Text style={styles.randBtnText}>{t('recipes.random')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.aiBtn, isLoading && { opacity: 0.6 }]}
          onPress={() => void handleGenerate(false)}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <View style={styles.aiBtnLoading}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.aiBtnText}>{t('recipes.generating')}</Text>
            </View>
          ) : (
            <Text style={styles.aiBtnText}>{t('recipes.generate')}</Text>
          )}
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

  // ── 筛选页 ──
  rfTopbar: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
  },
  rfTitle: {
    fontSize: 22,
    fontWeight: font.medium,
    color: colors.g800,
    fontFamily: font.family,
    lineHeight: 28,
  },
  rfSub: {
    fontSize: 12,
    color: colors.g600,
    fontFamily: font.family,
    marginTop: 2,
  },
  kitBtn: {
    backgroundColor: colors.g100,
    borderRadius: radius.tag,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  kitBtnText: {
    fontSize: 12,
    color: colors.g600,
    fontFamily: font.family,
  },
  rfBody: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
    justifyContent: 'space-between',
  },
  rfSec: {
    flexShrink: 0,
  },
  flabel: {
    fontSize: 13,
    fontWeight: font.medium,
    color: colors.g800,
    fontFamily: font.family,
    marginBottom: 6,
  },
  tagRowContent: {
    gap: 8,
    paddingBottom: 5,
  },
  tag: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.tag,
    borderWidth: 1.5,
    borderColor: colors.g200,
    backgroundColor: colors.backgroundCard,
  },
  tagActive: {
    backgroundColor: colors.g400,
    borderColor: colors.g400,
  },
  tagText: {
    fontSize: 13,
    color: colors.g600,
    fontFamily: font.family,
  },
  tagTextActive: {
    color: '#FFFFFF',
  },
  addTagBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.tag,
    borderWidth: 1.5,
    borderColor: colors.g600,
    backgroundColor: colors.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addTagBtnText: {
    fontSize: 15,
    color: colors.g600,
    fontFamily: font.family,
    fontWeight: font.medium,
    lineHeight: 18,
  },
  customTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingLeft: 14,
    paddingRight: 8,
    borderRadius: radius.tag,
    borderWidth: 1.5,
    borderColor: colors.g200,
    backgroundColor: colors.backgroundCard,
  },
  deleteTagX: {
    fontSize: 14,
    color: colors.g400,
    fontFamily: font.family,
    lineHeight: 18,
  },
  deleteTagXActive: {
    color: 'rgba(255,255,255,0.7)',
  },
  hTrack: {
    height: 3,
    backgroundColor: colors.g100,
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  hThumb: {
    position: 'absolute',
    top: 0,
    height: 3,
    backgroundColor: colors.g400,
    borderRadius: 2,
  },

  ieRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    maxHeight: 140,
    minHeight: 80,
  },
  ieBox: {
    flex: 1,
    backgroundColor: colors.backgroundCard,
    borderRadius: 16,
    paddingTop: 10,
    paddingHorizontal: 12,
    paddingBottom: 6,
    borderWidth: 1.5,
    borderColor: colors.g100,
  },
  ieTitle: {
    fontSize: 12,
    fontWeight: font.medium,
    color: colors.g800,
    fontFamily: font.family,
    marginBottom: 7,
    flexShrink: 0,
  },
  ieEmpty: {
    fontSize: 12,
    color: '#CCCCCC',
    fontFamily: font.family,
    textAlign: 'center',
    marginTop: 8,
    width: '100%',
  },
  ieGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  itag: {
    width: '47%',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center',
  },
  itagInc: { backgroundColor: colors.g100 },
  itagIncOn: { backgroundColor: colors.g400 },
  itagExc: { backgroundColor: colors.redBg },
  itagExcOn: { backgroundColor: colors.red },
  itagText: { fontSize: 12, fontFamily: font.family },
  itagTextInc: { color: colors.g600 },
  itagTextIncOn: { color: '#FFFFFF' },
  itagTextExc: { color: colors.red },
  itagTextExcOn: { color: '#FFFFFF' },

  randBtn: {
    height: 44,
    backgroundColor: colors.backgroundCard,
    borderWidth: 1.5,
    borderColor: colors.g200,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  randBtnText: {
    fontSize: 13,
    color: colors.g600,
    fontFamily: font.family,
  },
  aiBtn: {
    height: 54,
    backgroundColor: colors.g400,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  aiBtnLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aiBtnText: {
    fontSize: 16,
    fontWeight: font.medium,
    color: '#FFFFFF',
    fontFamily: font.family,
  },

  // ── 结果页 ──
  rrTopbar: {
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexShrink: 0,
  },
  rrTitle: {
    fontSize: 24,
    fontWeight: font.medium,
    color: colors.g800,
    fontFamily: font.family,
  },
  rrSub: {
    fontSize: 13,
    color: colors.g600,
    fontFamily: font.family,
    marginTop: 2,
  },
  rrGenTime: {
    fontSize: 12,
    color: '#AAAAAA',
    fontFamily: font.family,
    marginTop: 4,
  },
  rrTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  refreshBtn: {
    padding: 6,
    borderRadius: 8,
  },
  backBtn: {
    padding: 4,
    marginTop: 2,
  },
  backBtnText: {
    fontSize: 22,
    color: colors.g600,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#AAAAAA',
    fontFamily: font.family,
  },
  rrList: {
    paddingLeft: 24,
    paddingRight: 4,
    paddingTop: 4,
    paddingBottom: 16,
  },
  rcard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.g100,
    marginBottom: 14,
  },
  rcardImg: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rcardEmoji: {
    fontSize: 52,
  },
  favBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favBtnText: {
    fontSize: 18,
  },
  rarrow: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    width: 30,
    height: 30,
    backgroundColor: colors.backgroundCard,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rinfo: {
    padding: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  rnameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },
  rname: {
    fontSize: 16,
    fontWeight: font.medium,
    color: colors.g800,
    fontFamily: font.family,
    flex: 1,
    marginRight: 8,
  },
  rtime: {
    fontSize: 12,
    color: '#BBBBBB',
    fontFamily: font.family,
    flexShrink: 0,
  },
  rtrow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 7,
  },
  rtag: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 9,
    backgroundColor: colors.g100,
  },
  rtagText: {
    fontSize: 12,
    color: colors.g600,
    fontFamily: font.family,
  },
  ringr: {
    fontSize: 13,
    color: '#999999',
    fontFamily: font.family,
    lineHeight: 18,
  },
  regenWrap: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexShrink: 0,
  },
  regenBtn: {
    backgroundColor: colors.g100,
    borderRadius: radius.button,
    paddingVertical: 18,
    alignItems: 'center',
  },
  regenBtnText: {
    fontSize: 16,
    fontWeight: font.medium,
    color: colors.g800,
    fontFamily: font.family,
  },
});

import { useState, useEffect } from 'react';
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
import { router } from 'expo-router';
import { colors, font, radius } from '../../src/constants/theme';
import CustomScrollView from '../../src/components/CustomScrollView';
import { useIngredientStore } from '../../src/features/ingredient/store';
import { useRecipeStore } from '../../src/features/recipe/store';
import { useUserStore } from '../../src/features/user/store';
import { Recipe, RecipeSortOrder } from '../../src/features/recipe/types';
import { IngredientFilterState } from '../../src/features/ingredient/types';
import { UserPreference } from '../../src/features/user/types';

function showToast(msg: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert('', msg, [{ text: '好的' }]);
  }
}

const DEFAULT_PREFERENCE: UserPreference = {
  id: 1,
  cookingTools: [],
  knives: [],
  assistiveTools: [],
  condiments: [],
  preferredCuisines: [],
  preferredCookingMethods: [],
  preferredFlavors: [],
  activeBirdId: null,
};

// ─── 水平 tag 行（多选，空数组 = 全部） ───
function TagRow({
  allTag = '全部',
  tags,
  selected,
  onToggle,
}: {
  allTag?: string;
  tags: string[];
  selected: string[];
  onToggle: (tag: string) => void;
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

  const allItems = [allTag, ...tags];

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
        {allItems.map(tag => {
          const isAllTag = tag === allTag;
          const active = isAllTag ? selected.length === 0 : selected.includes(tag);
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

// ─── 食材标签格（包括 / 排除），从 store 读取真实食材 ───
function IngredientGrid({ mode }: { mode: 'include' | 'exclude' }) {
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
      <Text style={styles.ieTitle}>{mode === 'include' ? '包括食材' : '排除食材'}</Text>
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        <View style={styles.ieGrid}>
          {ingredients.length === 0 ? (
            <Text style={styles.ieEmpty}>暂无食材</Text>
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
  const tags = [recipe.cuisine, recipe.flavor, recipe.cookingMethod];
  const ingredientNames = recipe.ingredients.map(i => i.name).join('、');

  return (
    <TouchableOpacity
      style={styles.rcard}
      activeOpacity={0.85}
      onPress={() => router.push(`/recipe/${recipe.id}`)}
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
          <Text style={styles.rtime}>⏱ {recipe.durationMinutes}分钟</Text>
        </View>
        <View style={styles.rtrow}>
          {tags.map(t => (
            <View key={t} style={styles.rtag}>
              <Text style={styles.rtagText}>{t}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.ringr} numberOfLines={2}>
          使用食材：{ingredientNames}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── 主屏幕 ───
export default function RecipesScreen() {
  const [showResults, setShowResults] = useState(false);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [methods, setMethods] = useState<string[]>([]);
  const [tastes, setTastes] = useState<string[]>([]);

  function toggleTag(
    tag: string,
    current: string[],
    setter: (v: string[]) => void,
    allTag = '全部',
  ) {
    if (tag === allTag) {
      setter([]);
    } else {
      setter(current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag]);
    }
  }

  const { ingredients, loadIngredients } = useIngredientStore();
  const {
    currentRecipes,
    favoritedRecipes,
    isLoading,
    sortOrder,
    generateAndSetRecipes,
    toggleFavorite,
    loadFavoritedRecipes,
  } = useRecipeStore();
  const { userPreference, loadUserPreference } = useUserStore();

  useEffect(() => {
    loadIngredients();
    loadFavoritedRecipes();
    loadUserPreference();
  }, []);

  async function handleGenerate() {
    const included = ingredients
      .filter(i => i.filterState === IngredientFilterState.INCLUDE)
      .map(i => i.id);
    const excluded = ingredients
      .filter(i => i.filterState === IngredientFilterState.EXCLUDE)
      .map(i => i.id);

    try {
      await generateAndSetRecipes({
        availableIngredients: ingredients,
        includedIngredientIds: included,
        excludedIngredientIds: excluded,
        selectedCuisines: cuisines,
        selectedCookingMethods: methods,
        selectedFlavors: tastes,
        userPreference: userPreference ?? DEFAULT_PREFERENCE,
        favoritedRecipes,
        sortOrder,
      });
      setShowResults(true);
    } catch (e: any) {
      showToast(e?.message ?? '生成失败，请检查网络后重试');
    }
  }

  function handleToggleFavorite(id: string) {
    try {
      toggleFavorite(id);
    } catch (e: any) {
      showToast(e?.message ?? '收藏失败');
    }
  }

  // ── 结果页 ──
  if (showResults) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.rrTopbar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rrTitle}>今天吃这个！</Text>
            <Text style={styles.rrSub}>根据你的冰箱食材智能推荐</Text>
          </View>
          <TouchableOpacity onPress={() => setShowResults(false)} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
        </View>

        {currentRecipes.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>暂无菜谱，请返回重新生成</Text>
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
            onPress={handleGenerate}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.g800} />
            ) : (
              <Text style={styles.regenBtnText}>重新生成</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── 筛选页 ──
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.rfTopbar}>
        <View>
          <Text style={styles.rfTitle}>今天吃什么？</Text>
          <Text style={styles.rfSub}>根据你的冰箱食材智能推荐</Text>
        </View>
        <TouchableOpacity style={styles.kitBtn} onPress={() => showToast('厨具设定开发中')}>
          <Text style={styles.kitBtnText}>🍳 厨具设定</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.rfBody}>
        <View style={styles.rfSec}>
          <Text style={styles.flabel}>选择菜系</Text>
          <TagRow
            tags={['常吃', '家常', '日式', '川菜', '粤菜']}
            selected={cuisines}
            onToggle={tag => toggleTag(tag, cuisines, setCuisines)}
          />
        </View>

        <View style={styles.rfSec}>
          <Text style={styles.flabel}>选择烹饪方式</Text>
          <TagRow
            tags={['电饭煲', '炒菜', '炖煮', '微波炉', '水煮']}
            selected={methods}
            onToggle={tag => toggleTag(tag, methods, setMethods)}
          />
        </View>

        <View style={styles.rfSec}>
          <Text style={styles.flabel}>选择口味</Text>
          <TagRow
            tags={['清淡', '偏辣', '酸甜', '咸鲜']}
            selected={tastes}
            onToggle={tag => toggleTag(tag, tastes, setTastes)}
          />
        </View>

        <View style={styles.ieRow}>
          <IngredientGrid mode="include" />
          <IngredientGrid mode="exclude" />
        </View>

        <TouchableOpacity style={styles.randBtn} onPress={() => showToast('随机选好啦！🎲')}>
          <Text style={styles.randBtnText}>随机选择所有条件</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.aiBtn, isLoading && { opacity: 0.6 }]}
          onPress={handleGenerate}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <View style={styles.aiBtnLoading}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.aiBtnText}>生成中...</Text>
            </View>
          ) : (
            <Text style={styles.aiBtnText}>AI生成今日食谱</Text>
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

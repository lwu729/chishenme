import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert, ToastAndroid } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useRecipeStore } from '../../src/features/recipe/store';
import { Recipe, RecipeStep } from '../../src/features/recipe/types';
import { colors, font, radius } from '../../src/constants/theme';

function showToast(msg: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert('', msg, [{ text: '好的' }]);
  }
}

const STEP_COLORS = ['#E8F5E9', '#EEF4FF', '#FFF8E1', '#FFE8E8', '#F3E5F5'];

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentRecipes, favoritedRecipes, toggleFavorite } = useRecipeStore();

  const recipe: Recipe | undefined =
    currentRecipes.find(r => r.id === id) ?? favoritedRecipes.find(r => r.id === id);

  if (!recipe) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>菜谱不存在</Text>
          <TouchableOpacity style={styles.backBtnLarge} onPress={() => router.back()}>
            <Text style={styles.backBtnLargeText}>← 返回</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  function handleToggleFavorite() {
    try {
      toggleFavorite(recipe!.id);
    } catch (e: any) {
      showToast(e?.message ?? '收藏失败');
    }
  }

  const tags = [recipe.cuisine, recipe.flavor, recipe.cookingMethod];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 顶部栏 */}
      <View style={styles.topbar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.favBtn} onPress={handleToggleFavorite}>
          <Text style={styles.favBtnText}>{recipe.isFavorited ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 菜名 banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerEmoji}>🍳</Text>
          <Text style={styles.recipeName}>{recipe.name}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaItem}>⏱ {recipe.durationMinutes}分钟</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaItem}>{recipe.totalSteps}个步骤</Text>
          </View>
          <View style={styles.tagRow}>
            {tags.map(t => (
              <View key={t} style={styles.tag}>
                <Text style={styles.tagText}>{t}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 所需食材 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>所需食材</Text>
          <View style={styles.ingredientList}>
            {recipe.ingredients.map((ing, i) => (
              <View key={i} style={styles.ingredientRow}>
                <View style={styles.ingredientDot} />
                <Text style={styles.ingredientName}>{ing.name}</Text>
                <Text style={styles.ingredientAmount}>
                  {ing.quantity}
                  {ing.unit}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* 烹饪步骤 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>烹饪步骤</Text>
          <View style={styles.stepList}>
            {recipe.steps.map((step: RecipeStep) => (
              <View key={step.stepNumber} style={styles.stepCard}>
                <View
                  style={[
                    styles.stepNumBadge,
                    { backgroundColor: STEP_COLORS[(step.stepNumber - 1) % STEP_COLORS.length] },
                  ]}
                >
                  <Text style={styles.stepNum}>{step.stepNumber}</Text>
                </View>
                <View style={styles.stepBody}>
                  <Text style={styles.stepInstruction}>{step.instruction}</Text>
                  {step.durationMinutes != null && (
                    <Text style={styles.stepDuration}>⏱ 约{step.durationMinutes}分钟</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* 底部收藏按钮 */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.favLargeBtn, recipe.isFavorited && styles.favLargeBtnActive]}
          onPress={handleToggleFavorite}
          activeOpacity={0.85}
        >
          <Text style={[styles.favLargeBtnText, recipe.isFavorited && styles.favLargeBtnTextActive]}>
            {recipe.isFavorited ? '❤️  已收藏' : '🤍  收藏菜谱'}
          </Text>
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

  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  notFoundText: {
    fontSize: 16,
    color: '#AAAAAA',
    fontFamily: font.family,
  },
  backBtnLarge: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: colors.g100,
    borderRadius: radius.button,
  },
  backBtnLargeText: {
    fontSize: 15,
    color: colors.g800,
    fontFamily: font.family,
  },

  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
    flexShrink: 0,
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
  favBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundCard,
    borderWidth: 1.5,
    borderColor: colors.g100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favBtnText: {
    fontSize: 18,
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },

  banner: {
    backgroundColor: colors.backgroundCard,
    marginHorizontal: 20,
    borderRadius: radius.card,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.g100,
    marginBottom: 16,
  },
  bannerEmoji: {
    fontSize: 56,
    marginBottom: 10,
  },
  recipeName: {
    fontSize: 22,
    fontWeight: font.medium,
    color: colors.g800,
    fontFamily: font.family,
    textAlign: 'center',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  metaItem: {
    fontSize: 13,
    color: colors.g600,
    fontFamily: font.family,
  },
  metaDot: {
    fontSize: 13,
    color: colors.g400,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  tag: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: radius.tag,
    backgroundColor: colors.g100,
  },
  tagText: {
    fontSize: 12,
    color: colors.g600,
    fontFamily: font.family,
  },

  section: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: font.medium,
    color: colors.g800,
    fontFamily: font.family,
    marginBottom: 12,
  },

  ingredientList: {
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.card,
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: colors.g100,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.g100,
  },
  ingredientDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.g400,
    marginRight: 10,
    flexShrink: 0,
  },
  ingredientName: {
    flex: 1,
    fontSize: 14,
    color: colors.g800,
    fontFamily: font.family,
  },
  ingredientAmount: {
    fontSize: 14,
    color: colors.g600,
    fontFamily: font.family,
    flexShrink: 0,
  },

  stepList: {
    gap: 10,
  },
  stepCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.card,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.g100,
  },
  stepNumBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNum: {
    fontSize: 15,
    fontWeight: font.medium,
    color: colors.g800,
    fontFamily: font.family,
  },
  stepBody: {
    flex: 1,
    gap: 4,
  },
  stepInstruction: {
    fontSize: 14,
    color: colors.g800,
    fontFamily: font.family,
    lineHeight: 21,
  },
  stepDuration: {
    fontSize: 12,
    color: '#AAAAAA',
    fontFamily: font.family,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: colors.g100,
    backgroundColor: colors.background,
  },
  favLargeBtn: {
    height: 52,
    borderRadius: radius.button,
    backgroundColor: colors.backgroundCard,
    borderWidth: 1.5,
    borderColor: colors.g200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favLargeBtnActive: {
    backgroundColor: '#FFF0F0',
    borderColor: '#FFAAAA',
  },
  favLargeBtnText: {
    fontSize: 16,
    fontWeight: font.medium,
    color: colors.g800,
    fontFamily: font.family,
  },
  favLargeBtnTextActive: {
    color: '#E05555',
  },
});

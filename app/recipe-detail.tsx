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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useRecipeStore } from '../src/features/recipe/store';
import { useIngredientStore } from '../src/features/ingredient/store';
import { colors, font, radius } from '../src/constants/theme';
import { Recipe } from '../src/features/recipe/types';

function showToast(msg: string, okText = 'OK') {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert('', msg, [{ text: okText }]);
  }
}

// ─── 顶部栏 ───
function TopBar({
  title,
  titleSize = 'large',
  isFavorited,
  onBack,
  onToggleFavorite,
}: {
  title: string;
  titleSize?: 'large' | 'small';
  isFavorited: boolean;
  onBack: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <View style={styles.topbar}>
      <TouchableOpacity style={styles.iconBtn} onPress={onBack} activeOpacity={0.7}>
        <Text style={styles.iconBtnText}>←</Text>
      </TouchableOpacity>
      <Text
        style={titleSize === 'large' ? styles.topbarTitle : styles.topbarTitleSmall}
        numberOfLines={1}
      >
        {title}
      </Text>
      <TouchableOpacity style={styles.iconBtn} onPress={onToggleFavorite} activeOpacity={0.7}>
        <Text style={styles.iconBtnFav}>{isFavorited ? '❤️' : '🤍'}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── 完成弹窗 ───
function CompletionModal({
  visible,
  recipeName,
  onDone,
}: {
  visible: boolean;
  recipeName: string;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalEmoji}>🎉</Text>
          <Text style={styles.modalTitle}>{t('recipeDetail.completionTitle')}</Text>
          <Text style={styles.modalRecipeName}>{recipeName}</Text>
          <Text style={styles.modalSub}>{t('recipeDetail.completionSub')}</Text>
          <TouchableOpacity style={styles.modalBtn} onPress={onDone} activeOpacity={0.85}>
            <Text style={styles.modalBtnText}>{t('recipeDetail.completionBtn')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── 主页面 ───
export default function RecipeDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentRecipes, favoritedRecipes, toggleFavorite } = useRecipeStore();
  const { ingredients, loadIngredients } = useIngredientStore();

  const [view, setView] = useState<'detail' | 'steps'>('detail');
  const [currentStep, setCurrentStep] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);

  useEffect(() => {
    loadIngredients();
  }, []);

  const recipe: Recipe | undefined =
    currentRecipes.find(r => r.id === id) ?? favoritedRecipes.find(r => r.id === id);

  if (!recipe) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>{t('recipeDetail.notFound')}</Text>
          <TouchableOpacity style={styles.notFoundBtn} onPress={() => router.back()}>
            <Text style={styles.notFoundBtnText}>{t('recipeDetail.backBtn')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const fridgeNames = new Set(ingredients.map(i => i.name));

  function handleToggleFavorite() {
    try {
      toggleFavorite(recipe!.id);
    } catch (e: any) {
      showToast(e?.message ?? t('recipeDetail.favoriteFailed'), t('common.ok'));
    }
  }

  // ════════════════════════════════
  // 详情页
  // ════════════════════════════════
  if (view === 'detail') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TopBar
          title={recipe.name}
          isFavorited={recipe.isFavorited}
          onBack={() => router.back()}
          onToggleFavorite={handleToggleFavorite}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Badge 行 */}
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>⏱ {t('recipeDetail.durationLabel', { count: recipe.durationMinutes })}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{recipe.cuisine}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{recipe.cookingMethod}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{recipe.flavor}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* 使用食材 */}
          <Text style={styles.sectionTitle}>{t('recipeDetail.ingredientsTitle')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.ingCards}
          >
            {recipe.ingredients.map((ing, i) => {
              const inFridge = fridgeNames.has(ing.name);
              return (
                <View
                  key={i}
                  style={[styles.ingCard, inFridge ? styles.ingCardIn : styles.ingCardOut]}
                >
                  <View style={[styles.ingDot, inFridge ? styles.ingDotIn : styles.ingDotOut]} />
                  <Text style={styles.ingName} numberOfLines={2}>
                    {ing.name}
                  </Text>
                  <Text style={styles.ingAmt}>
                    {ing.quantity}
                    {ing.unit}
                  </Text>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.divider} />

          {/* 步骤预览 */}
          <Text style={styles.sectionTitle}>{t('recipeDetail.stepsTitle')}</Text>
          <View style={styles.stepsPreview}>
            {recipe.steps.map(step => (
              <View key={step.stepNumber} style={styles.stepPreviewRow}>
                <View style={styles.stepPreviewNum}>
                  <Text style={styles.stepPreviewNumText}>
                    {String(step.stepNumber).padStart(2, '0')}
                  </Text>
                </View>
                <Text style={styles.stepPreviewText} numberOfLines={2}>
                  {step.instruction}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              setCurrentStep(0);
              setShowCompletion(false);
              setView('steps');
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>{t('recipeDetail.startCooking')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ════════════════════════════════
  // 步骤做饭页
  // ════════════════════════════════
  const step = recipe.steps[currentStep];
  const isLast = currentStep >= recipe.steps.length - 1;
  const stepNumStr = String(step?.stepNumber ?? currentStep + 1).padStart(2, '0');
  const totalSteps = recipe.steps.length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar
        title={recipe.name}
        titleSize="small"
        isFavorited={recipe.isFavorited}
        onBack={() => setView('detail')}
        onToggleFavorite={handleToggleFavorite}
      />

      {/* 进度指示 */}
      <View style={styles.progressWrap}>
        <Text style={styles.progressText}>
          {t('recipeDetail.stepProgress', { current: currentStep + 1, total: totalSteps })}
        </Text>
        <View style={styles.progressTrack}>
          <View style={{ flex: currentStep + 1, height: 4, backgroundColor: colors.g600, borderRadius: 2 }} />
          <View style={{ flex: Math.max(0, totalSteps - (currentStep + 1)), height: 4 }} />
        </View>
      </View>

      {/* 主内容区 */}
      <ScrollView
        style={styles.stepScroll}
        contentContainerStyle={styles.stepScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 大号步骤序号 */}
        <Text style={styles.bigStepNum}>{stepNumStr}</Text>

        {/* 步骤说明 */}
        <Text style={styles.stepDesc}>{step?.instruction ?? ''}</Text>

        {/* 时长提示 */}
        {step?.durationMinutes != null && (
          <Text style={styles.stepDur}>{t('recipeDetail.durationHint', { count: step.durationMinutes })}</Text>
        )}

        {/* 小鸟贴士 */}
        <View style={styles.birdRow}>
          <View style={styles.birdAvatar}>
            <Text style={styles.birdEmoji}>🐦</Text>
          </View>
          <View style={styles.birdTriangle} />
          <View style={styles.birdBubble}>
            <Text style={styles.birdBubbleText}>{t('recipeDetail.birdTip')}</Text>
          </View>
        </View>
      </ScrollView>

      {/* 底部按钮 */}
      <View style={styles.bottomBar}>
        {currentStep > 0 && (
          <TouchableOpacity
            style={[styles.primaryBtn, styles.prevBtn]}
            onPress={() => setCurrentStep(s => s - 1)}
            activeOpacity={0.85}
          >
            <Text style={[styles.primaryBtnText, styles.prevBtnText]}>{t('recipeDetail.prevStep')}</Text>
          </TouchableOpacity>
        )}
        {isLast ? (
          <TouchableOpacity
            style={[styles.primaryBtn, styles.doneBtn]}
            onPress={() => setShowCompletion(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>{t('recipeDetail.done')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => setCurrentStep(s => s + 1)}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>{t('recipeDetail.nextStep')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <CompletionModal
        visible={showCompletion}
        recipeName={recipe.name}
        onDone={() => router.replace('/(tabs)')}
      />
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
    gap: 16,
  },
  notFoundText: {
    fontSize: 16,
    color: '#AAAAAA',
    fontFamily: font.family,
  },
  notFoundBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: colors.g100,
    borderRadius: radius.button,
  },
  notFoundBtnText: {
    fontSize: 15,
    color: colors.g800,
    fontFamily: font.family,
  },

  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexShrink: 0,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.g100,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconBtnText: {
    fontSize: 18,
    color: colors.g800,
    lineHeight: 22,
  },
  iconBtnFav: {
    fontSize: 18,
  },
  topbarTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: font.medium,
    color: colors.g800,
    fontFamily: font.family,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  topbarTitleSmall: {
    flex: 1,
    fontSize: 13,
    color: colors.g600,
    fontFamily: font.family,
    textAlign: 'center',
    marginHorizontal: 8,
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 24,
  },

  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    paddingVertical: 5,
    paddingHorizontal: 13,
    borderRadius: 20,
    backgroundColor: colors.g100,
  },
  badgeText: {
    fontSize: 13,
    color: colors.g600,
    fontFamily: font.family,
  },

  divider: {
    height: 1,
    backgroundColor: colors.g100,
    marginBottom: 18,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: font.medium,
    color: colors.g800,
    fontFamily: font.family,
    marginBottom: 12,
  },

  ingCards: {
    gap: 10,
    paddingBottom: 4,
    paddingRight: 4,
  },
  ingCard: {
    width: 88,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 6,
  },
  ingCardIn: {
    backgroundColor: colors.g100,
  },
  ingCardOut: {
    backgroundColor: '#F0F0F0',
  },
  ingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ingDotIn: {
    backgroundColor: '#4CAF50',
  },
  ingDotOut: {
    backgroundColor: '#CCCCCC',
  },
  ingName: {
    fontSize: 13,
    fontWeight: font.medium,
    color: colors.g800,
    fontFamily: font.family,
    textAlign: 'center',
    lineHeight: 17,
  },
  ingAmt: {
    fontSize: 11,
    color: colors.g600,
    fontFamily: font.family,
    textAlign: 'center',
  },

  stepsPreview: {
    gap: 10,
  },
  stepPreviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.backgroundCard,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: colors.g100,
  },
  stepPreviewNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.g100,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepPreviewNumText: {
    fontSize: 12,
    fontWeight: font.medium,
    color: colors.g600,
    fontFamily: font.family,
  },
  stepPreviewText: {
    flex: 1,
    fontSize: 13,
    color: colors.g800,
    fontFamily: font.family,
    lineHeight: 19,
    paddingTop: 4,
  },

  bottomBar: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: colors.g100,
    backgroundColor: colors.background,
    flexShrink: 0,
    gap: 10,
  },
  primaryBtn: {
    height: 54,
    backgroundColor: colors.g600,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtn: {
    backgroundColor: colors.g400,
  },
  prevBtn: {
    backgroundColor: colors.g100,
  },
  prevBtnText: {
    color: colors.g800,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: font.medium,
    color: '#FFFFFF',
    fontFamily: font.family,
  },

  progressWrap: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    flexShrink: 0,
  },
  progressText: {
    fontSize: 13,
    color: colors.g600,
    fontFamily: font.family,
    textAlign: 'center',
    marginBottom: 7,
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.g100,
    borderRadius: 2,
    overflow: 'hidden',
    flexDirection: 'row',
  },

  stepScroll: {
    flex: 1,
  },
  stepScrollContent: {
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: 32,
    paddingBottom: 32,
  },

  bigStepNum: {
    fontSize: 88,
    fontWeight: font.medium,
    color: colors.g200,
    fontFamily: font.family,
    textAlign: 'center',
    lineHeight: 100,
    marginBottom: 4,
  },

  stepDesc: {
    fontSize: 18,
    color: colors.g800,
    fontFamily: font.family,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 8,
  },

  stepDur: {
    fontSize: 13,
    color: '#BBBBBB',
    fontFamily: font.family,
    textAlign: 'center',
    marginBottom: 32,
  },

  birdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    width: '100%',
    gap: 0,
  },
  birdAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.g100,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  birdEmoji: {
    fontSize: 30,
  },
  birdTriangle: {
    width: 0,
    height: 0,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderRightWidth: 10,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: colors.g800,
    flexShrink: 0,
  },
  birdBubble: {
    flex: 1,
    backgroundColor: colors.g800,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginLeft: -1,
  },
  birdBubbleText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontFamily: font.family,
    lineHeight: 19,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 28,
    paddingVertical: 36,
    paddingHorizontal: 28,
    alignItems: 'center',
    width: '100%',
    gap: 8,
  },
  modalEmoji: {
    fontSize: 60,
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: font.medium,
    color: colors.g800,
    fontFamily: font.family,
  },
  modalRecipeName: {
    fontSize: 16,
    color: colors.g600,
    fontFamily: font.family,
    textAlign: 'center',
  },
  modalSub: {
    fontSize: 13,
    color: '#AAAAAA',
    fontFamily: font.family,
    marginBottom: 8,
  },
  modalBtn: {
    marginTop: 8,
    width: '100%',
    height: 52,
    backgroundColor: colors.g600,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    fontSize: 16,
    fontWeight: font.medium,
    color: '#FFFFFF',
    fontFamily: font.family,
  },
});

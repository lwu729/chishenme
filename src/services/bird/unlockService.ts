import { getDatabase } from '../../db/database';
import { BIRDS_DATA } from '../../data/birds';
import { UserEvent } from '../../features/user/types';

export interface UnlockResult {
  birdId: string;
  birdNameZh: string;
  birdNameEn: string;
  birdEmoji: string;
  unlockDescriptionZh: string;
  unlockDescriptionEn: string;
}

export function checkAndUnlockBirds(userEvent: UserEvent): UnlockResult[] {
  const db = getDatabase();
  const newlyUnlocked: UnlockResult[] = [];

  for (const bird of BIRDS_DATA) {
    if (bird.isDefault) continue;

    const row = db.getFirstSync<{ isUnlocked: number }>(
      'SELECT isUnlocked FROM bird_companions WHERE id = ?',
      [bird.id],
    );
    if (row?.isUnlocked) continue;

    let shouldUnlock = false;

    if (bird.id === 'snowy-owl') {
      shouldUnlock = userEvent.cookingStreakDays >= 3;
    } else if (bird.id === 'peacock') {
      shouldUnlock =
        userEvent.hasFinishedWarningIngredient &&
        userEvent.hasFinishedUrgentIngredient &&
        userEvent.hasFinishedFreshIngredient;
    } else if (bird.id === 'penguin') {
      shouldUnlock = userEvent.hasLetIngredientExpire;
    } else if (bird.id === 'macaw') {
      shouldUnlock =
        userEvent.totalIngredientsLogged >= 10 ||
        userEvent.dailyMealsCooked >= 3;
    }

    if (shouldUnlock) {
      db.runSync(
        'UPDATE bird_companions SET isUnlocked = 1, unlockedAt = ? WHERE id = ?',
        [new Date().toISOString(), bird.id],
      );
      newlyUnlocked.push({
        birdId: bird.id,
        birdNameZh: bird.nameZh,
        birdNameEn: bird.nameEn,
        birdEmoji: bird.emoji,
        unlockDescriptionZh: bird.unlockTriggerDescription,
        unlockDescriptionEn: bird.unlockTriggerDescriptionEn,
      });
    }
  }

  return newlyUnlocked;
}

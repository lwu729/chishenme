import { create } from 'zustand';
import { BirdCompanion } from './types';
import { BirdData, BIRDS_DATA } from '../../data/birds';
import { getDatabase } from '../../db/database';
import { UnlockResult } from '../../services/bird/unlockService';
import i18n from '../../i18n';

interface BirdStore {
  birds: BirdCompanion[];
  activeBird: BirdData | null;
  pendingUnlocks: UnlockResult[];

  loadBirds: () => void;
  setActiveBird: (birdId: string) => void;
  getRandomGreeting: () => string;
  getExpiryAlert: (ingredientName: string) => string;
  getInactiveAlert: (days: number) => string;
  addPendingUnlock: (result: UnlockResult) => void;
  clearFirstPendingUnlock: () => void;
}

export const useBirdStore = create<BirdStore>((set, get) => ({
  birds: [],
  activeBird: null,
  pendingUnlocks: [],

  loadBirds: () => {
    const db = getDatabase();
    const rows = db.getAllSync<BirdCompanion>('SELECT * FROM bird_companions');
    const birds: BirdCompanion[] = rows.map(r => ({
      ...r,
      isUnlocked: (r.isUnlocked as unknown as number) === 1,
    }));

    const prefRow = db.getFirstSync<{ activeBirdId: string | null; birdSelectionMode: string }>(
      'SELECT activeBirdId, birdSelectionMode FROM user_preferences WHERE id = 1',
    );

    let activeBirdId = prefRow?.activeBirdId ?? 'night-heron';

    // auto 模式：从已解锁鸟里随机挑一只
    if (prefRow?.birdSelectionMode === 'auto') {
      const unlocked = birds.filter(b => b.isUnlocked);
      if (unlocked.length > 0) {
        const picked = unlocked[Math.floor(Math.random() * unlocked.length)];
        activeBirdId = picked.id;
        db.runSync('UPDATE user_preferences SET activeBirdId = ? WHERE id = 1', [activeBirdId]);
      }
    }

    const activeBird = BIRDS_DATA.find(b => b.id === activeBirdId) ?? BIRDS_DATA[0];
    set({ birds, activeBird });
  },

  setActiveBird: (birdId: string) => {
    const db = getDatabase();
    db.runSync('UPDATE user_preferences SET activeBirdId = ? WHERE id = 1', [birdId]);
    // 同步更新 userStore 的内存状态（lazy import 避免循环依赖）
    try {
      const { useUserStore } = require('../user/store');
      useUserStore.getState().loadUserPreference();
    } catch (_) {}
    const activeBird = BIRDS_DATA.find(b => b.id === birdId) ?? get().activeBird;
    set({ activeBird });
  },

  getRandomGreeting: () => {
    const { activeBird } = get();
    if (!activeBird) return '';
    const isEn = i18n.language === 'en';
    const greetings = isEn ? activeBird.greetingsEn : activeBird.greetingsZh;
    return greetings[Math.floor(Math.random() * greetings.length)];
  },

  getExpiryAlert: (ingredientName: string) => {
    const { activeBird } = get();
    if (!activeBird) return ingredientName;
    const isEn = i18n.language === 'en';
    const template = isEn ? activeBird.expiryAlertEn : activeBird.expiryAlertZh;
    return template.replace('{{name}}', ingredientName);
  },

  getInactiveAlert: (days: number) => {
    const { activeBird } = get();
    if (!activeBird) return String(days);
    const isEn = i18n.language === 'en';
    const template = isEn ? activeBird.inactiveAlertEn : activeBird.inactiveAlertZh;
    return template.replace('{{days}}', String(days));
  },

  addPendingUnlock: (result: UnlockResult) => {
    set(s => ({ pendingUnlocks: [...s.pendingUnlocks, result] }));
  },

  clearFirstPendingUnlock: () => {
    set(s => ({ pendingUnlocks: s.pendingUnlocks.slice(1) }));
  },
}));

import type { RoomConfig } from "./types";

export const DEFAULT_ROOM_CONFIG: RoomConfig = {
  win_score_range: { min: 18, max: 23 },
  lose_score_range: { min: 18, max: 23 },
  win_streak: {
    "2": { point: 1, enabled: false },
    "3": { point: 3, enabled: true },
    "4": { point: 5, enabled: true },
    "5": { point: 7, enabled: true },
    "6": { point: 10, enabled: true },
    "7": { point: 13, enabled: true },
    "8": { point: 16, enabled: true },
    "9": { point: 20, enabled: true },
    "10": { point: 24, enabled: true },
  },
  lose_streak: {
    "2": { point: 1, enabled: false },
    "3": { point: 1, enabled: true },
    "4": { point: 2, enabled: true },
    "5": { point: 4, enabled: true },
    "6": { point: 6, enabled: true },
    "7": { point: 8, enabled: true },
    "8": { point: 11, enabled: true },
    "9": { point: 14, enabled: true },
    "10": { point: 17, enabled: true },
  },
};

export const ADJUST_PRESETS = [1, 3, 5, 10, 15] as const;

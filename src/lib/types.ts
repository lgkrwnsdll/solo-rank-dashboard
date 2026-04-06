export interface Profile {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface RoomConfig {
  win_score_range: { min: number; max: number };
  lose_score_range: { min: number; max: number };
  win_streak: Record<string, { point: number; enabled: boolean }>;
  lose_streak: Record<string, { point: number; enabled: boolean }>;
}

export interface Room {
  id: string;
  host_id: string;
  name: string;
  target_score: number;
  team_a_name: string;
  team_b_name: string;
  status: "active" | "closed";
  config: RoomConfig;
  created_at: string;
  closed_at: string | null;
  winner: "A" | "B" | "draw" | null;
}

export type ParticipantStatus = "invited" | "accepted" | "declined";
export type TeamSide = "A" | "B" | null;

export interface Participant {
  id: string;
  room_id: string;
  user_id: string | null;
  email: string;
  name: string;
  team_side: TeamSide;
  score: number;
  streak: number;
  is_sleeping: boolean;
  status: ParticipantStatus;
  order_index: number;
  wins: number;
  losses: number;
  total_gained: number;
  total_lost: number;
  created_at: string;
}

export interface ScoreLog {
  id: string;
  room_id: string;
  player_id: string;
  amount: number;
  reason: string;
  detail: string | null;
  created_at: string;
}

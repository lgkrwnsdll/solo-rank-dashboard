"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Participant, RoomConfig } from "@/lib/types";
import { ADJUST_PRESETS } from "@/lib/constants";
import { Spinner } from "../../spinner";

interface Props {
  participant: Participant;
  roomId: string;
  config: RoomConfig;
}

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getStreakBonus(
  streak: number,
  streakConfig: Record<string, { point: number; enabled: boolean }>
): number {
  const absStreak = Math.abs(streak);
  // For 10+, use the "10" config
  const key = absStreak >= 10 ? "10" : String(absStreak);
  const config = streakConfig[key];
  if (!config || !config.enabled) return 0;
  return config.point;
}

export function ScoreControls({ participant, roomId, config }: Props) {
  const [customAmount, setCustomAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const supabase = createClient();

  const handleResult = async (type: "win" | "lose") => {
    if (processing) return;
    setProcessing(true);

    const range =
      type === "win" ? config.win_score_range : config.lose_score_range;
    const basePoints = getRandomInt(range.min, range.max);
    const sign = type === "win" ? 1 : -1;

    // Calculate new streak
    const currentStreak = participant.streak;
    let newStreak: number;
    if (type === "win") {
      newStreak = currentStreak > 0 ? currentStreak + 1 : 1;
    } else {
      newStreak = currentStreak < 0 ? currentStreak - 1 : -1;
    }

    // Calculate streak bonus
    const streakConfig =
      type === "win" ? config.win_streak : config.lose_streak;
    const bonus = getStreakBonus(newStreak, streakConfig);

    const totalChange = basePoints * sign + (bonus > 0 ? bonus * sign : 0);

    // Update participant with stats
    const totalPositive = type === "win" ? basePoints + bonus : 0;
    const totalNegative = type === "lose" ? basePoints + bonus : 0;

    await supabase
      .from("participants")
      .update({
        score: participant.score + totalChange,
        streak: newStreak,
        wins: participant.wins + (type === "win" ? 1 : 0),
        losses: participant.losses + (type === "lose" ? 1 : 0),
        total_gained: participant.total_gained + totalPositive,
        total_lost: participant.total_lost + totalNegative,
      })
      .eq("id", participant.id);

    // Log base score
    await supabase.from("score_logs").insert({
      room_id: roomId,
      player_id: participant.id,
      amount: basePoints * sign,
      reason: type,
      detail: `${type === "win" ? "승리" : "패배"} ${sign > 0 ? "+" : ""}${basePoints * sign}`,
    });

    // Log streak bonus if applicable
    if (bonus > 0) {
      await supabase.from("score_logs").insert({
        room_id: roomId,
        player_id: participant.id,
        amount: bonus * sign,
        reason: type === "win" ? "streak_bonus" : "streak_penalty",
        detail: `${Math.abs(newStreak)}${type === "win" ? "연승 보너스" : "연패 감점"} ${sign > 0 ? "+" : ""}${bonus * sign}`,
      });
    }

    setProcessing(false);
  };

  const handleAdjust = async (amount: number) => {
    if (processing || amount === 0) return;
    setProcessing(true);

    await supabase
      .from("participants")
      .update({
        score: participant.score + amount,
        total_gained: participant.total_gained + (amount > 0 ? amount : 0),
        total_lost: participant.total_lost + (amount < 0 ? Math.abs(amount) : 0),
      })
      .eq("id", participant.id);

    await supabase.from("score_logs").insert({
      room_id: roomId,
      player_id: participant.id,
      amount,
      reason: "manual",
      detail: `수동 ${amount > 0 ? "+" : ""}${amount}`,
    });

    setProcessing(false);
  };

  const handleToggleSleep = async () => {
    await supabase
      .from("participants")
      .update({ is_sleeping: !participant.is_sleeping })
      .eq("id", participant.id);
  };

  return (
    <div className="bg-card rounded-lg p-5 border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">
          내 점수 ({participant.name || participant.email})
        </h3>
        <button
          onClick={handleToggleSleep}
          className={`text-sm px-3 py-1 rounded-lg border transition-colors cursor-pointer ${
            participant.is_sleeping
              ? "bg-warning/20 border-warning/30 text-warning"
              : "border-border text-muted hover:text-foreground"
          }`}
        >
          {participant.is_sleeping ? "💤 취침중" : "취침"}
        </button>
      </div>

      {/* Win/Lose Buttons */}
      {participant.is_sleeping && (
        <p className="text-sm text-warning mb-3 text-center">
          취침 중에는 점수를 변경할 수 없습니다.
        </p>
      )}
      <div className="flex gap-3 mb-5">
        <button
          onClick={() => handleResult("win")}
          disabled={processing || participant.is_sleeping}
          className="flex-1 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg text-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          {processing ? <Spinner /> : "승리"}
        </button>
        <button
          onClick={() => handleResult("lose")}
          disabled={processing || participant.is_sleeping}
          className="flex-1 bg-danger hover:bg-danger-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg text-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          {processing ? <Spinner /> : "패배"}
        </button>
      </div>

      {/* Adjust Presets */}
      <div className="grid grid-cols-5 gap-2">
        {ADJUST_PRESETS.map((val) => (
          <div key={val} className="flex flex-col gap-1">
            <button
              onClick={() => handleAdjust(val)}
              disabled={processing || participant.is_sleeping}
              className="bg-success/20 text-success hover:bg-success/30 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              +{val}
            </button>
            <button
              onClick={() => handleAdjust(-val)}
              disabled={processing || participant.is_sleeping}
              className="bg-danger/20 text-danger hover:bg-danger/30 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              -{val}
            </button>
          </div>
        ))}
      </div>

      {/* Custom Amount */}
      <div className="flex items-center justify-center gap-2 mt-3">
        <button
          onClick={() => {
            const val = parseInt(customAmount);
            if (!isNaN(val) && val > 0) {
              handleAdjust(-val);
              setCustomAmount("");
            }
          }}
          disabled={processing || participant.is_sleeping}
          className="bg-danger/20 text-danger hover:bg-danger/30 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          - 적용
        </button>
        <input
          type="number"
          value={customAmount}
          onChange={(e) => setCustomAmount(e.target.value)}
          placeholder="직접 입력"
          className="w-24 bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-center"
        />
        <button
          onClick={() => {
            const val = parseInt(customAmount);
            if (!isNaN(val) && val > 0) {
              handleAdjust(val);
              setCustomAmount("");
            }
          }}
          disabled={processing || participant.is_sleeping}
          className="bg-success/20 text-success hover:bg-success/30 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          + 적용
        </button>
      </div>
    </div>
  );
}

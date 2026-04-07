"use client";

import { useState, useRef } from "react";
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

export function ScoreControls({ participant, roomId, config }: Props) {
  const [customAmount, setCustomAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const processingRef = useRef(false);
  const supabase = createClient();

  const handleResult = async (type: "win" | "lose") => {
    // Synchronous check via ref - blocks rapid clicks before React re-render
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessing(true);

    const range =
      type === "win" ? config.win_score_range : config.lose_score_range;
    const basePoints = getRandomInt(range.min, range.max);

    const streakConfig =
      type === "win" ? config.win_streak : config.lose_streak;

    const { error } = await supabase.rpc("record_match", {
      p_participant_id: participant.id,
      p_type: type,
      p_base_points: basePoints,
      p_streak_config: streakConfig,
    });

    if (error) {
      console.error("record_match error:", error);
    }

    processingRef.current = false;
    setProcessing(false);
  };

  const handleAdjust = async (amount: number) => {
    if (processingRef.current || amount === 0) return;
    processingRef.current = true;
    setProcessing(true);

    const { error } = await supabase.rpc("adjust_score", {
      p_participant_id: participant.id,
      p_amount: amount,
    });

    if (error) {
      console.error("adjust_score error:", error);
    }

    processingRef.current = false;
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
      <div className="flex items-center justify-between mb-4 gap-2">
        <h3 className="font-semibold min-w-0 truncate">
          내 점수 ({participant.name || participant.email})
        </h3>
        <button
          onClick={handleToggleSleep}
          className={`text-sm px-3 py-1 rounded-lg border transition-colors cursor-pointer shrink-0 ${
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
            if (!isNaN(val) && val > 0 && val <= 9999) {
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
          min={1}
          max={9999}
          value={customAmount}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "" || (Number(v) >= 1 && Number(v) <= 9999)) {
              setCustomAmount(v);
            }
          }}
          placeholder="1~9999"
          className="w-24 bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-center"
        />
        <button
          onClick={() => {
            const val = parseInt(customAmount);
            if (!isNaN(val) && val > 0 && val <= 9999) {
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

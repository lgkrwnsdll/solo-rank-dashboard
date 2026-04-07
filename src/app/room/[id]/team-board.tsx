"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Participant, RoomConfig } from "@/lib/types";
import { ScoreLogModal } from "./score-log-modal";

interface Props {
  teamName: string;
  teamSide: "A" | "B";
  players: Participant[];
  totalScore: number;
  roomId: string;
  config: RoomConfig;
  isActive: boolean;
  myParticipantId: string | null;
}

export function TeamBoard({
  teamName,
  teamSide,
  players,
  totalScore,
  roomId,
  config,
  isActive,
  myParticipantId,
}: Props) {
  const [logPlayerId, setLogPlayerId] = useState<string | null>(null);
  const supabase = createClient();

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const topScore =
    sortedPlayers.length > 0 ? sortedPlayers[0].score : 0;

  const otherSide = teamSide === "A" ? "B" : "A";

  const getStreakDisplay = (streak: number) => {
    if (streak >= 3) return { text: `${streak}연승`, icon: "🔥" };
    if (streak <= -3) return { text: `${Math.abs(streak)}연패`, icon: "💀" };
    return null;
  };

  return (
    <div className="bg-card rounded-lg p-4 border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">{teamName}</h3>
        <span className="text-2xl font-bold">{totalScore}</span>
      </div>

      {sortedPlayers.length === 0 ? (
        <p className="text-sm text-muted text-center py-4">
          배정된 참가자가 없습니다.
        </p>
      ) : (
        <div className="space-y-2">
          {sortedPlayers.map((player, idx) => {
            const streakInfo = getStreakDisplay(player.streak);
            const isTop = player.score === topScore && topScore > 0;

            return (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-lg gap-2 ${
                  isTop ? "bg-primary/10 border border-primary/30" : "bg-background"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-sm text-muted w-5 shrink-0">{idx + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`text-sm truncate ${
                          player.id === myParticipantId
                            ? "font-bold"
                            : "font-medium"
                        }`}
                      >
                        {player.name || player.email}
                        {player.id === myParticipantId && (
                          <span className="text-xs text-muted ml-1">(나)</span>
                        )}
                      </span>
                      {player.is_sleeping && (
                        <span className="text-xs text-muted shrink-0">💤</span>
                      )}
                      {streakInfo && (
                        <span className="text-xs whitespace-nowrap shrink-0">
                          {streakInfo.icon} {streakInfo.text}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted mt-0.5">
                      {player.wins}W {player.losses}L
                      <span className="text-success ml-1">+{player.total_gained}</span>
                      <span className="text-danger ml-1">-{player.total_lost}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold">{player.score}</span>
                  <button
                    onClick={() => setLogPlayerId(player.id)}
                    className="text-xs text-muted hover:text-foreground cursor-pointer"
                  >
                    로그
                  </button>
                  {isActive && (
                    <button
                      onClick={async () => {
                        await supabase
                          .from("participants")
                          .update({ team_side: otherSide })
                          .eq("id", player.id);
                      }}
                      className="text-xs text-muted hover:text-primary cursor-pointer"
                      title={`상대팀으로 이동`}
                    >
                      ↔
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {logPlayerId && (
        <ScoreLogModal
          playerId={logPlayerId}
          roomId={roomId}
          onClose={() => setLogPlayerId(null)}
        />
      )}
    </div>
  );
}

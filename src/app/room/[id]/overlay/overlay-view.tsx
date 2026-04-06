"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import type { Room, Participant } from "@/lib/types";

interface Props {
  room: Room;
  participants: Participant[];
}

export function OverlayView({
  room: initialRoom,
  participants: initialParticipants,
}: Props) {
  const [room, setRoom] = useState(initialRoom);
  const [participants, setParticipants] = useState(initialParticipants);
  const supabase = createClient();

  const refreshParticipants = useCallback(async () => {
    const { data } = await supabase
      .from("participants")
      .select("*")
      .eq("room_id", room.id)
      .eq("status", "accepted");
    if (data) setParticipants(data);
  }, [supabase, room.id]);

  useEffect(() => {
    const channel = supabase
      .channel(`overlay-${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${room.id}`,
        },
        (payload) => {
          if (payload.new) setRoom(payload.new as Room);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participants",
          filter: `room_id=eq.${room.id}`,
        },
        () => refreshParticipants()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, room.id, refreshParticipants]);

  const teamA = participants
    .filter((p) => p.team_side === "A")
    .sort((a, b) => a.order_index - b.order_index);
  const teamB = participants
    .filter((p) => p.team_side === "B")
    .sort((a, b) => a.order_index - b.order_index);

  const teamAScore = teamA.reduce((sum, p) => sum + p.score, 0);
  const teamBScore = teamB.reduce((sum, p) => sum + p.score, 0);

  const topA = teamA.length > 0 ? Math.max(...teamA.map((p) => p.score)) : 0;
  const topB = teamB.length > 0 ? Math.max(...teamB.map((p) => p.score)) : 0;

  const getStreakDisplay = (streak: number) => {
    if (streak >= 3) return `🔥${streak}`;
    if (streak <= -3) return `💀${Math.abs(streak)}`;
    return null;
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center pt-1 font-sans text-white">
      <div
        style={{
          width: 324,
          height: 310,
          border: "4px solid #d4a843",
          borderRadius: 0,
          boxSizing: "border-box",
          background: "rgba(0, 0, 0, 0.75)",
        }}
        className="px-1.5 py-1 overflow-hidden flex flex-col"
      >
        {/* Score Summary */}
        <div className="flex items-center justify-center gap-3 py-1">
          <div className="text-center">
            <div className="text-[9px] font-medium opacity-70">{room.team_a_name}</div>
            <div className="text-lg font-bold leading-tight">{teamAScore}</div>
          </div>
          <div className="text-center">
            <div className="text-[8px] opacity-40">목표 {room.target_score}</div>
            <div className="text-xs font-bold opacity-50">vs</div>
          </div>
          <div className="text-center">
            <div className="text-[9px] font-medium opacity-70">{room.team_b_name}</div>
            <div className="text-lg font-bold leading-tight">{teamBScore}</div>
          </div>
        </div>

        {/* Teams */}
        <div className="grid grid-cols-2 gap-1 flex-1 min-h-0">
          {/* Team A */}
          <div className="flex flex-col min-h-0">
            <div className="space-y-px flex-1 overflow-hidden">
              <AnimatePresence>
                {teamA.map((player) => (
                  <PlayerRow
                    key={player.id}
                    player={player}
                    isTop={player.score === topA && topA > 0}
                    getStreakDisplay={getStreakDisplay}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Team B */}
          <div className="flex flex-col min-h-0">
            <div className="space-y-px flex-1 overflow-hidden">
              <AnimatePresence>
                {teamB.map((player) => (
                  <PlayerRow
                    key={player.id}
                    player={player}
                    isTop={player.score === topB && topB > 0}
                    getStreakDisplay={getStreakDisplay}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-center mt-2 text-muted">
        미니맵 크기와 유사하게 제작되었습니다. 미니맵을 가려서 사용하세요.
      </p>
    </div>
  );
}

function PlayerRow({
  player,
  isTop,
  getStreakDisplay,
}: {
  player: Participant;
  isTop: boolean;
  getStreakDisplay: (s: number) => string | null;
}) {
  const streak = getStreakDisplay(player.streak);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`px-1 py-0.5 rounded ${
        isTop
          ? "bg-yellow-500/20 border border-yellow-500/40"
          : "bg-white/10"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-0.5 min-w-0">
          <span className="text-[10px] font-medium truncate max-w-[60px]">
            {player.name || player.email}
          </span>
          {player.is_sleeping && <span className="text-[8px]">💤</span>}
          {streak && <span className="text-[8px]">{streak}</span>}
        </div>
        <motion.span
          key={player.score}
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
          className="font-bold text-[11px]"
        >
          {player.score}
        </motion.span>
      </div>
      <div className="text-[8px] opacity-50 leading-tight">
        {player.wins}W {player.losses}L
        <span className="text-green-400 ml-0.5">+{player.total_gained}</span>
        <span className="text-red-400 ml-0.5">-{player.total_lost}</span>
      </div>
    </motion.div>
  );
}

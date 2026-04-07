"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Room } from "@/lib/types";
import { Spinner } from "../../spinner";

interface Props {
  room: Room;
  userEmail: string;
  userId: string;
  displayName: string;
  onAccepted: () => void;
}

export function InvitePrompt({
  room,
  userEmail,
  userId,
  displayName,
  onAccepted,
}: Props) {
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const supabase = createClient();

  const handleAccept = async () => {
    if (accepting || declining) return;
    setAccepting(true);
    await supabase
      .from("participants")
      .update({
        status: "accepted",
        user_id: userId,
        name: displayName,
      })
      .eq("room_id", room.id)
      .eq("email", userEmail);
    onAccepted();
  };

  const handleDecline = async () => {
    if (accepting || declining) return;
    setDeclining(true);
    await supabase
      .from("participants")
      .update({ status: "declined", user_id: userId })
      .eq("room_id", room.id)
      .eq("email", userEmail);
    window.location.href = "/dashboard";
  };

  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <div className="bg-card rounded-lg p-8 border border-border text-center max-w-sm">
        <h2 className="text-xl font-bold mb-2">{room.name}</h2>
        <p className="text-muted text-sm mb-6">
          이 솔랭내기에 참여하시겠습니까?
        </p>
        <p className="text-sm mb-6">
          목표: {room.target_score}점 &middot; {room.team_a_name} vs{" "}
          {room.team_b_name}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleAccept}
            disabled={accepting || declining}
            className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-medium px-6 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2"
          >
            {accepting ? <><Spinner /> 참여중...</> : "참여"}
          </button>
          <button
            onClick={handleDecline}
            disabled={accepting || declining}
            className="bg-card border border-border disabled:opacity-50 text-muted hover:text-foreground font-medium px-6 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2"
          >
            {declining ? <><Spinner /> 거절중...</> : "거절"}
          </button>
        </div>
      </div>
    </main>
  );
}

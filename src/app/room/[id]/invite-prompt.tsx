"use client";

import { createClient } from "@/lib/supabase/client";
import type { Room } from "@/lib/types";

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
  const supabase = createClient();

  const handleAccept = async () => {
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
            className="bg-primary hover:bg-primary-hover text-white font-medium px-6 py-2 rounded-lg transition-colors cursor-pointer"
          >
            참여
          </button>
          <button
            onClick={handleDecline}
            className="bg-card border border-border text-muted hover:text-foreground font-medium px-6 py-2 rounded-lg transition-colors cursor-pointer"
          >
            거절
          </button>
        </div>
      </div>
    </main>
  );
}

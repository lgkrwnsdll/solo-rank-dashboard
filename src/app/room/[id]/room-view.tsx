"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Room, Participant, Profile } from "@/lib/types";
import { TeamBoard } from "./team-board";
import { ScoreControls } from "./score-controls";
import { RoomSettings } from "./room-settings";
import { InviteSection } from "./invite-section";
import { InvitePrompt } from "./invite-prompt";
import { BlockedView } from "./blocked-view";
import Link from "next/link";

interface Props {
  room: Room;
  participants: Participant[];
  profile: Profile | null;
  userId: string;
  userEmail: string;
  isHost: boolean;
  myParticipant: Participant | null;
  isInvited: boolean;
}

export function RoomView({
  room: initialRoom,
  participants: initialParticipants,
  profile,
  userId,
  userEmail,
  isHost,
  myParticipant: initialMyParticipant,
  isInvited: initialIsInvited,
}: Props) {
  const [room, setRoom] = useState(initialRoom);
  const [participants, setParticipants] = useState(initialParticipants);
  const [myParticipant, setMyParticipant] = useState(initialMyParticipant);
  const [isInvited, setIsInvited] = useState(initialIsInvited);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const refreshParticipants = useCallback(async () => {
    const { data } = await supabase
      .from("participants")
      .select("*")
      .eq("room_id", room.id);
    if (data) {
      setParticipants(data);
      setMyParticipant(data.find((p) => p.user_id === userId) ?? null);
      setIsInvited(
        data.some((p) => p.email === userEmail && p.status === "invited")
      );
    }
  }, [supabase, room.id, userId, userEmail]);

  const refreshRoom = useCallback(async () => {
    const { data } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", room.id)
      .single();
    if (data) setRoom(data);
  }, [supabase, room.id]);

  useEffect(() => {
    const channel = supabase
      .channel(`room-${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${room.id}`,
        },
        () => refreshRoom()
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
  }, [supabase, room.id, refreshParticipants, refreshRoom]);

  // Polling fallback: refresh every 3 seconds to ensure data is up to date
  useEffect(() => {
    const interval = setInterval(() => {
      refreshParticipants();
    }, 3000);
    return () => clearInterval(interval);
  }, [refreshParticipants]);

  // Not invited and not host
  if (!isHost && !myParticipant && !isInvited) {
    return <BlockedView />;
  }

  // Invited but not yet accepted
  if (isInvited && !myParticipant) {
    return (
      <InvitePrompt
        room={room}
        userEmail={userEmail}
        userId={userId}
        displayName={profile?.display_name ?? userEmail}
        onAccepted={() => router.refresh()}
      />
    );
  }

  const isAccepted =
    isHost || (myParticipant && myParticipant.status === "accepted");
  const teamA = participants.filter(
    (p) => p.team_side === "A" && p.status === "accepted"
  );
  const teamB = participants.filter(
    (p) => p.team_side === "B" && p.status === "accepted"
  );
  const unassigned = participants.filter(
    (p) => !p.team_side && p.status === "accepted"
  );
  const teamAScore = teamA.reduce((sum, p) => sum + p.score, 0);
  const teamBScore = teamB.reduce((sum, p) => sum + p.score, 0);

  const handleLeave = async () => {
    if (!myParticipant || isHost) return;
    if (!confirm("이 내기에서 퇴장하시겠습니까?")) return;
    await supabase
      .from("participants")
      .update({ status: "declined" })
      .eq("id", myParticipant.id);
    router.push("/dashboard");
  };

  const handleClose = async () => {
    if (!isHost) return;
    if (!confirm("이 내기를 종료하시겠습니까?")) return;

    let winner: "A" | "B" | "draw";
    if (teamAScore > teamBScore) winner = "A";
    else if (teamBScore > teamAScore) winner = "B";
    else winner = "draw";

    await supabase
      .from("rooms")
      .update({
        status: "closed",
        closed_at: new Date().toISOString(),
        winner,
      })
      .eq("id", room.id);
    await refreshRoom();
  };

  const handleReactivate = async () => {
    if (!isHost) return;
    await supabase
      .from("rooms")
      .update({ status: "active", closed_at: null, winner: null })
      .eq("id", room.id);
    await refreshRoom();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link
            href="/dashboard"
            className="text-muted text-sm hover:text-foreground transition-colors"
          >
            &larr; Dashboard
          </Link>
          <h1 className="text-2xl font-bold mt-1">{room.name}</h1>
          <p className="text-sm text-muted">
            목표 {room.target_score}점
            {room.status === "closed" && (
              <span className="ml-2 text-danger">
                (종료 —{" "}
                {room.winner === "A"
                  ? `${room.team_a_name} 승리`
                  : room.winner === "B"
                    ? `${room.team_b_name} 승리`
                    : room.winner === "draw"
                      ? "무승부"
                      : ""}
                )
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1.5">
            {isAccepted && (
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className="text-xs bg-card border border-border px-2.5 py-1.5 rounded-lg hover:bg-card-hover transition-colors cursor-pointer"
              >
                설정
              </button>
            )}
            {isAccepted && (
              <button
                onClick={() => {
                  window.open(`/room/${room.id}/overlay`, "_blank");
                }}
                className="text-xs bg-card border border-border px-2.5 py-1.5 rounded-lg hover:bg-card-hover transition-colors cursor-pointer"
              >
                송출용 오버레이
              </button>
            )}
            {isHost && (
              <button
                onClick={() => setInviteOpen(!inviteOpen)}
                className="text-xs bg-card border border-border px-2.5 py-1.5 rounded-lg hover:bg-card-hover transition-colors cursor-pointer"
              >
                참가자 초대
              </button>
            )}
          </div>
          {isHost && (
            <button
              onClick={handleCopyLink}
              className="text-xs text-muted hover:text-foreground transition-colors cursor-pointer"
            >
              {linkCopied ? "복사됨!" : "초대 링크 복사"}
            </button>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {settingsOpen && (
        <RoomSettings
          room={room}
          onClose={() => setSettingsOpen(false)}
          onSaved={refreshRoom}
        />
      )}

      {/* Host: Invite Section */}
      {isHost && inviteOpen && (
        <InviteSection roomId={room.id} participants={participants} />
      )}

      {/* Team Boards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <TeamBoard
          teamName={room.team_a_name}
          teamSide="A"
          players={teamA}
          totalScore={teamAScore}
          roomId={room.id}
          config={room.config}
          isActive={room.status === "active"}
        />
        <TeamBoard
          teamName={room.team_b_name}
          teamSide="B"
          players={teamB}
          totalScore={teamBScore}
          roomId={room.id}
          config={room.config}
          isActive={room.status === "active"}
        />
      </div>

      {/* Unassigned Players */}
      {unassigned.length > 0 && (
        <div className="bg-card rounded-lg p-4 border border-border mb-6">
          <h3 className="text-sm font-medium text-muted mb-3">미배정</h3>
          <div className="flex flex-wrap gap-2">
            {unassigned.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 bg-background rounded-lg px-3 py-2 border border-border"
              >
                <span className="text-sm">{p.name || p.email}</span>
                <button
                  onClick={async () => {
                    await supabase
                      .from("participants")
                      .update({ team_side: "A" })
                      .eq("id", p.id);
                  }}
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  &rarr; {room.team_a_name}
                </button>
                <button
                  onClick={async () => {
                    await supabase
                      .from("participants")
                      .update({ team_side: "B" })
                      .eq("id", p.id);
                  }}
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  &rarr; {room.team_b_name}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Score Controls */}
      {isAccepted && myParticipant && room.status === "active" && (
        <ScoreControls
          participant={myParticipant}
          roomId={room.id}
          config={room.config}
        />
      )}

      {/* Bottom Actions */}
      <div className="flex justify-between items-center mt-8 pt-4 border-t border-border">
        {!isHost && isAccepted && (
          <button
            onClick={handleLeave}
            className="text-danger text-sm hover:underline cursor-pointer"
          >
            퇴장
          </button>
        )}
        {isHost && room.status === "active" && (
          <button
            onClick={handleClose}
            className="bg-danger hover:bg-danger-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer"
          >
            내기 종료
          </button>
        )}
        {isHost && room.status === "closed" && (
          <button
            onClick={handleReactivate}
            className="bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer"
          >
            재활성화
          </button>
        )}
      </div>
    </div>
  );
}

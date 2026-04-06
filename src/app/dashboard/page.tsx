import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileSection } from "./profile-section";
import { RoomList } from "./room-list";
import { CreateRoomButton } from "./create-room-button";
import { LogoutButton } from "./logout-button";
import type { Room } from "@/lib/types";

interface RoomWithScores extends Room {
  teamAScore: number;
  teamBScore: number;
  myTeam: "A" | "B" | null;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: participants } = await supabase
    .from("participants")
    .select("*, rooms(*)")
    .eq("user_id", user.id)
    .eq("status", "accepted");

  const { data: hostedRooms } = await supabase
    .from("rooms")
    .select("*")
    .eq("host_id", user.id);

  // Collect all room IDs
  const allRoomIds = new Set<string>();
  const roomMap = new Map<string, Room>();

  hostedRooms?.forEach((room) => {
    allRoomIds.add(room.id);
    roomMap.set(room.id, room);
  });

  participants?.forEach((p) => {
    const room = p.rooms;
    if (room && !allRoomIds.has(room.id)) {
      allRoomIds.add(room.id);
      roomMap.set(room.id, room);
    }
  });

  // Fetch all participants for these rooms to calculate team scores
  const roomIds = Array.from(allRoomIds);
  const { data: allParticipants } = roomIds.length > 0
    ? await supabase
        .from("participants")
        .select("room_id, team_side, score, status, user_id")
        .in("room_id", roomIds)
        .eq("status", "accepted")
    : { data: [] };

  // Build rooms with scores
  const activeRooms: RoomWithScores[] = [];
  const closedRooms: RoomWithScores[] = [];

  roomMap.forEach((room) => {
    const roomParticipants = allParticipants?.filter((p) => p.room_id === room.id) ?? [];
    const teamAScore = roomParticipants
      .filter((p) => p.team_side === "A")
      .reduce((sum, p) => sum + p.score, 0);
    const teamBScore = roomParticipants
      .filter((p) => p.team_side === "B")
      .reduce((sum, p) => sum + p.score, 0);

    const myParticipant = roomParticipants.find((p) => p.user_id === user.id);
    const myTeam = (myParticipant?.team_side as "A" | "B" | null) ?? null;
    const roomWithScores = { ...room, teamAScore, teamBScore, myTeam };
    if (room.status === "active") activeRooms.push(roomWithScores);
    else closedRooms.push(roomWithScores);
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 w-full">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <LogoutButton />
      </div>

      <ProfileSection profile={profile} />

      <div className="flex items-center justify-between mt-10 mb-4">
        <h2 className="text-lg font-semibold">진행 중인 내기</h2>
        <CreateRoomButton />
      </div>
      <RoomList rooms={activeRooms} emptyMessage="진행 중인 내기가 없습니다." />

      <h2 className="text-lg font-semibold mt-10 mb-4">종료된 내기</h2>
      <RoomList rooms={closedRooms} emptyMessage="종료된 내기가 없습니다." paginate />
    </div>
  );
}

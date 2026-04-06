import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RoomView } from "./room-view";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: room } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", id)
    .single();

  if (!room) {
    redirect("/dashboard");
  }

  const { data: participants } = await supabase
    .from("participants")
    .select("*")
    .eq("room_id", id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const myParticipant = participants?.find((p) => p.user_id === user.id);
  const isHost = room.host_id === user.id;
  const isInvited = participants?.some(
    (p) => p.email === user.email && p.status === "invited"
  );

  return (
    <RoomView
      room={room}
      participants={participants ?? []}
      profile={profile}
      userId={user.id}
      userEmail={user.email!}
      isHost={isHost}
      myParticipant={myParticipant ?? null}
      isInvited={isInvited ?? false}
    />
  );
}

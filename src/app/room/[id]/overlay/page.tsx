import { createClient } from "@/lib/supabase/server";
import { OverlayView } from "./overlay-view";

export default async function OverlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: room } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", id)
    .single();

  const { data: participants } = await supabase
    .from("participants")
    .select("*")
    .eq("room_id", id)
    .eq("status", "accepted");

  if (!room) {
    return <div>Room not found</div>;
  }

  return (
    <OverlayView
      room={room}
      participants={participants ?? []}
    />
  );
}

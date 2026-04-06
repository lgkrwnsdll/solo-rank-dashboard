"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_ROOM_CONFIG } from "@/lib/constants";
import { Spinner } from "../spinner";

export function CreateRoomButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("rooms")
      .insert({
        host_id: user.id,
        name: name.trim(),
        config: DEFAULT_ROOM_CONFIG,
      })
      .select()
      .single();

    if (!error && data) {
      // Get profile for display_name
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();

      // Host auto-joins as accepted participant
      await supabase.from("participants").insert({
        room_id: data.id,
        user_id: user.id,
        email: user.email!,
        name: profile?.display_name ?? user.email!.split("@")[0],
        status: "accepted",
      });
      router.push(`/room/${data.id}`);
    }

    setCreating(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer"
      >
        + 방 만들기
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-card rounded-lg p-6 w-full max-w-sm border border-border">
        <h3 className="text-lg font-semibold mb-4">새 내기 만들기</h3>
        <input
          type="text"
          placeholder="방 이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mb-4"
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => {
              setOpen(false);
              setName("");
            }}
            className="text-muted text-sm px-4 py-2 hover:underline cursor-pointer"
          >
            취소
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2"
          >
            {creating ? <><Spinner /> 생성중...</> : "만들기"}
          </button>
        </div>
      </div>
    </div>
  );
}

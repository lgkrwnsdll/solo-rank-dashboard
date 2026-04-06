"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export function ProfileSection({ profile }: { profile: Profile | null }) {
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    if (!profile || !displayName.trim()) return;
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() })
      .eq("id", profile.id);
    await supabase
      .from("participants")
      .update({ name: displayName.trim() })
      .eq("user_id", profile.id);
    setSaving(false);
    setEditing(false);
    router.refresh();
  };

  if (!profile) return null;

  return (
    <div className="bg-card rounded-lg p-5 border border-border">
      <h2 className="text-sm font-medium text-muted mb-3">내 계정</h2>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted w-16">이메일</span>
          <span>{showEmail ? profile.email : "••••••••@••••"}</span>
          <button
            onClick={() => setShowEmail(!showEmail)}
            className="text-primary text-sm hover:underline cursor-pointer"
          >
            {showEmail ? "숨기기" : "보기"}
          </button>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted w-16">닉네임</span>
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-background border border-border rounded px-2 py-1 text-sm"
                autoFocus
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-primary text-sm hover:underline cursor-pointer"
              >
                {saving ? "저장중..." : "저장"}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setDisplayName(profile.display_name);
                }}
                className="text-muted text-sm hover:underline cursor-pointer"
              >
                취소
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span>{displayName}</span>
              <button
                onClick={() => setEditing(true)}
                className="text-primary text-sm hover:underline cursor-pointer"
              >
                수정
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

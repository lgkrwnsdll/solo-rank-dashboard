"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Participant } from "@/lib/types";
import { Spinner } from "../../spinner";

interface Props {
  roomId: string;
  participants: Participant[];
}

export function InviteSection({ roomId, participants }: Props) {
  const [emails, setEmails] = useState("");
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmEmails, setConfirmEmails] = useState<string[] | null>(null);
  const supabase = createClient();

  const pendingInvites = participants.filter((p) => p.status === "invited");

  const handleInviteClick = () => {
    if (!emails.trim()) return;
    setMessage("");

    const emailList = emails
      .split(/[,\n]/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e && e.includes("@"));

    // Only block emails that are currently invited or accepted (declined can be re-invited)
    const blockedEmails = new Set(
      participants
        .filter((p) => p.status !== "declined")
        .map((p) => p.email)
    );
    const newEmails = emailList.filter((e) => !blockedEmails.has(e));

    if (newEmails.length === 0) {
      setMessage("모든 이메일이 이미 초대되었습니다.");
      return;
    }

    setConfirmEmails(newEmails);
  };

  const handleConfirmInvite = async () => {
    if (!confirmEmails) return;
    setInviting(true);

    // Separate: existing declined records vs new emails
    const declinedMap = new Map(
      participants
        .filter((p) => p.status === "declined")
        .map((p) => [p.email, p.id])
    );

    const newInserts = confirmEmails
      .filter((email) => !declinedMap.has(email))
      .map((email) => ({
        room_id: roomId,
        email,
        name: email.split("@")[0],
        status: "invited" as const,
      }));

    const reInviteIds = confirmEmails
      .filter((email) => declinedMap.has(email))
      .map((email) => declinedMap.get(email)!);

    let error = null;
    if (newInserts.length > 0) {
      const { error: insertError } = await supabase
        .from("participants")
        .insert(newInserts);
      if (insertError) error = insertError;
    }

    if (reInviteIds.length > 0) {
      const { error: updateError } = await supabase
        .from("participants")
        .update({ status: "invited", user_id: null })
        .in("id", reInviteIds);
      if (updateError) error = updateError;
    }

    if (error) {
      setMessage("초대 중 오류가 발생했습니다.");
    } else {
      setMessage(`${confirmEmails.length}명 초대 완료`);
      setEmails("");
    }
    setConfirmEmails(null);
    setInviting(false);
  };

  const handleKick = async (participantId: string) => {
    if (!confirm("이 참가자를 강퇴하시겠습니까?")) return;
    await supabase.from("participants").delete().eq("id", participantId);
  };

  return (
    <div className="bg-card rounded-lg p-4 border border-border mb-6">
      <h3 className="text-sm font-medium text-muted mb-3">참가자 초대</h3>
      <div className="flex gap-2 mb-3">
        <textarea
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          placeholder="이메일을 입력하세요 (쉼표 또는 줄바꿈으로 구분)"
          rows={2}
          className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm resize-vertical min-h-[4rem]"
        />
        <button
          onClick={handleInviteClick}
          disabled={inviting}
          className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-medium px-4 rounded-lg transition-colors cursor-pointer self-end"
        >
          {inviting ? "..." : "초대"}
        </button>
      </div>
      {message && <p className="text-xs text-muted mb-3">{message}</p>}

      {/* Confirm Modal */}
      {confirmEmails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-card rounded-lg p-5 w-full max-w-sm border border-border">
            <h3 className="font-semibold mb-3">초대 확인</h3>
            <p className="text-sm text-muted mb-3">
              다음 {confirmEmails.length}명을 초대하시겠습니까?
            </p>
            <div className="bg-background rounded-lg p-3 mb-4 max-h-40 overflow-y-auto">
              {confirmEmails.map((email) => (
                <div key={email} className="text-sm py-0.5">
                  {email}
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmEmails(null)}
                className="text-muted text-sm px-4 py-2 hover:underline cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={handleConfirmInvite}
                disabled={inviting}
                className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2"
              >
                {inviting ? <><Spinner /> 초대중...</> : "초대하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <div>
          <h4 className="text-xs text-muted mb-2">
            대기중 ({pendingInvites.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {pendingInvites.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 bg-background rounded px-2 py-1 text-xs border border-border"
              >
                <span>{p.email}</span>
                <button
                  onClick={() => handleKick(p.id)}
                  className="text-danger hover:underline cursor-pointer"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

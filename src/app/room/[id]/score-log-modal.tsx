"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ScoreLog } from "@/lib/types";

interface Props {
  playerId: string;
  roomId: string;
  onClose: () => void;
}

export function ScoreLogModal({ playerId, roomId, onClose }: Props) {
  const [logs, setLogs] = useState<ScoreLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchLogs() {
      const { data } = await supabase
        .from("score_logs")
        .select("*")
        .eq("player_id", playerId)
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })
        .limit(50);
      setLogs(data ?? []);
      setLoading(false);
    }

    fetchLogs();

    const channel = supabase
      .channel(`logs-${playerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "score_logs",
          filter: `player_id=eq.${playerId}`,
        },
        (payload) => {
          setLogs((prev) => [payload.new as ScoreLog, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playerId, roomId]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-card rounded-lg p-5 w-full max-w-md border border-border max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">점수 변동 로그</h3>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div
          className="overflow-y-auto flex-1 space-y-2"
          style={{ scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent" }}
        >
          {loading ? (
            <p className="text-sm text-muted text-center py-4">로딩중...</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted text-center py-4">
              기록이 없습니다.
            </p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div>
                  <span className="text-sm">{log.detail ?? log.reason}</span>
                  <span className="text-xs text-muted ml-2">
                    {new Date(log.created_at).toLocaleDateString("ko-KR", {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    {new Date(log.created_at).toLocaleTimeString("ko-KR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <span
                  className={`font-bold text-sm ${
                    log.amount > 0 ? "text-success" : "text-danger"
                  }`}
                >
                  {log.amount > 0 ? "+" : ""}
                  {log.amount}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

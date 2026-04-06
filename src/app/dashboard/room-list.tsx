"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Room } from "@/lib/types";

interface RoomWithScores extends Room {
  teamAScore: number;
  teamBScore: number;
  myTeam: "A" | "B" | null;
}

function getMyResult(room: RoomWithScores): { text: string; className: string } | null {
  if (!room.winner || !room.myTeam) return null;
  if (room.winner === "draw") return { text: "무승부", className: "text-warning" };
  if (room.winner === room.myTeam) return { text: "승리", className: "text-success" };
  return { text: "패배", className: "text-danger" };
}

const PAGE_SIZE = 5;

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function RoomList({
  rooms,
  emptyMessage,
  paginate = false,
}: {
  rooms: RoomWithScores[];
  emptyMessage: string;
  paginate?: boolean;
}) {
  const [page, setPage] = useState(0);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = useMemo(() => {
    let result = rooms;
    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter((r) => new Date(r.created_at) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((r) => new Date(r.created_at) <= to);
    }
    return result;
  }, [rooms, dateFrom, dateTo]);

  const hasFilter = dateFrom || dateTo;

  const totalPages = paginate ? Math.ceil(filtered.length / PAGE_SIZE) : 1;
  const displayed = paginate
    ? filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    : filtered;

  return (
    <div>
      {/* Date Filter */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-muted">시작일 기준</span>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
          className="bg-background border border-border rounded px-2 py-1 text-xs"
        />
        <span className="text-xs text-muted">~</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
          className="bg-background border border-border rounded px-2 py-1 text-xs"
        />
        {hasFilter && (
          <button
            onClick={() => { setDateFrom(""); setDateTo(""); setPage(0); }}
            className="text-xs text-muted hover:text-foreground cursor-pointer"
          >
            초기화
          </button>
        )}
      </div>

      {!filtered.length ? (
        <div className="bg-card rounded-lg p-6 border border-border text-center text-muted">
          {hasFilter ? "해당 기간에 내기가 없습니다." : emptyMessage}
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((room) => (
            <Link
              key={room.id}
              href={`/room/${room.id}`}
              className="block bg-card rounded-lg p-4 border border-border hover:bg-card-hover transition-colors"
            >
              <div className="flex items-start justify-between">
                {/* Left: name + scores */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{room.name}</h3>
                    {(() => {
                      const result = getMyResult(room);
                      return result ? (
                        <span className={`text-xs font-bold ${result.className}`}>
                          {result.text}
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <p className="text-sm mt-1">
                    <span className={room.myTeam === "A" ? "font-bold" : "text-muted"}>
                      {room.team_a_name} {room.teamAScore}
                    </span>
                    <span className="text-muted mx-1.5">vs</span>
                    <span className={room.myTeam === "B" ? "font-bold" : "text-muted"}>
                      {room.teamBScore} {room.team_b_name}
                    </span>
                    <span className="text-xs text-muted ml-2">/ {room.target_score}점</span>
                  </p>
                </div>
                {/* Right: date + status */}
                <div className="text-right ml-4 shrink-0">
                  <p className="text-xs text-muted">
                    {formatDate(room.created_at)}
                    {room.closed_at ? ` ~ ${formatDate(room.closed_at)}` : ""}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {paginate && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="text-sm text-muted hover:text-foreground disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            &larr; 이전
          </button>
          <span className="text-sm text-muted">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="text-sm text-muted hover:text-foreground disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            다음 &rarr;
          </button>
        </div>
      )}
    </div>
  );
}

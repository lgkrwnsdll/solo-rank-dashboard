"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Room, RoomConfig } from "@/lib/types";
import { Spinner } from "../../spinner";

interface Props {
  room: Room;
  onClose: () => void;
}

export function RoomSettings({ room, onClose }: Props) {
  const [name, setName] = useState(room.name);
  const [targetScore, setTargetScore] = useState(room.target_score);
  const [teamAName, setTeamAName] = useState(room.team_a_name);
  const [teamBName, setTeamBName] = useState(room.team_b_name);
  const [config, setConfig] = useState<RoomConfig>(room.config);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const handleSave = async () => {
    setSaving(true);
    await supabase
      .from("rooms")
      .update({
        name,
        target_score: targetScore,
        team_a_name: teamAName,
        team_b_name: teamBName,
        config,
      })
      .eq("id", room.id);
    setSaving(false);
    onClose();
  };

  const updateStreakPoint = (
    type: "win_streak" | "lose_streak",
    key: string,
    point: number
  ) => {
    setConfig((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [key]: { ...prev[type][key], point },
      },
    }));
  };

  const toggleStreakEnabled = (
    type: "win_streak" | "lose_streak",
    key: string
  ) => {
    setConfig((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [key]: { ...prev[type][key], enabled: !prev[type][key].enabled },
      },
    }));
  };

  return (
    <div className="bg-card rounded-lg p-5 border border-border mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">방 설정</h3>
        <button
          onClick={onClose}
          className="text-muted hover:text-foreground cursor-pointer"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4">
        {/* Basic Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted">방 이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-background border border-border rounded px-3 py-2 text-sm mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-muted">목표 점수</label>
            <input
              type="number"
              value={targetScore}
              onChange={(e) => setTargetScore(Number(e.target.value))}
              className="w-full bg-background border border-border rounded px-3 py-2 text-sm mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-muted">A팀 이름</label>
            <input
              type="text"
              value={teamAName}
              onChange={(e) => setTeamAName(e.target.value)}
              className="w-full bg-background border border-border rounded px-3 py-2 text-sm mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-muted">B팀 이름</label>
            <input
              type="text"
              value={teamBName}
              onChange={(e) => setTeamBName(e.target.value)}
              className="w-full bg-background border border-border rounded px-3 py-2 text-sm mt-1"
            />
          </div>
        </div>

        {/* Score Range */}
        <div>
          <h4 className="text-sm font-medium mb-2">랜덤 점수 범위</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted">승리</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={config.win_score_range.min}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      win_score_range: {
                        ...prev.win_score_range,
                        min: Number(e.target.value),
                      },
                    }))
                  }
                  className="w-20 bg-background border border-border rounded px-2 py-1 text-sm text-center"
                />
                <span className="text-muted">~</span>
                <input
                  type="number"
                  value={config.win_score_range.max}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      win_score_range: {
                        ...prev.win_score_range,
                        max: Number(e.target.value),
                      },
                    }))
                  }
                  className="w-20 bg-background border border-border rounded px-2 py-1 text-sm text-center"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted">패배</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={config.lose_score_range.min}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      lose_score_range: {
                        ...prev.lose_score_range,
                        min: Number(e.target.value),
                      },
                    }))
                  }
                  className="w-20 bg-background border border-border rounded px-2 py-1 text-sm text-center"
                />
                <span className="text-muted">~</span>
                <input
                  type="number"
                  value={config.lose_score_range.max}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      lose_score_range: {
                        ...prev.lose_score_range,
                        max: Number(e.target.value),
                      },
                    }))
                  }
                  className="w-20 bg-background border border-border rounded px-2 py-1 text-sm text-center"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Streak Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium mb-2">연승 보너스</h4>
            <div className="space-y-1">
              {Object.entries(config.win_streak).map(([key, val]) => (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <span className="w-16 text-muted">
                    {key === "10" ? "10+" : key}연승
                  </span>
                  <input
                    type="number"
                    value={val.point}
                    onChange={(e) =>
                      updateStreakPoint(
                        "win_streak",
                        key,
                        Number(e.target.value)
                      )
                    }
                    className="w-14 bg-background border border-border rounded px-2 py-1 text-sm text-center"
                  />
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={val.enabled}
                      onChange={() => toggleStreakEnabled("win_streak", key)}
                      className="cursor-pointer"
                    />
                    <span className="text-xs text-muted">활성</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2">연패 감점</h4>
            <div className="space-y-1">
              {Object.entries(config.lose_streak).map(([key, val]) => (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <span className="w-16 text-muted">
                    {key === "10" ? "10+" : key}연패
                  </span>
                  <input
                    type="number"
                    value={val.point}
                    onChange={(e) =>
                      updateStreakPoint(
                        "lose_streak",
                        key,
                        Number(e.target.value)
                      )
                    }
                    className="w-14 bg-background border border-border rounded px-2 py-1 text-sm text-center"
                  />
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={val.enabled}
                      onChange={() => toggleStreakEnabled("lose_streak", key)}
                      className="cursor-pointer"
                    />
                    <span className="text-xs text-muted">활성</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          {saving ? <><Spinner /> 저장중...</> : "설정 저장"}
        </button>
      </div>
    </div>
  );
}

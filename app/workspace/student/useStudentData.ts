"use client";

import { useCallback, useEffect, useState } from "react";

export type StudentFavorite = {
  id: string;
  targetType: "job" | "activity" | "content";
  targetId: string;
  targetSnapshot: Record<string, string>;
  status: string;
  createdAt: string;
};
export type StudentCalendarEvent = {
  id: string;
  sourceId: string;
  title: string;
  startAt?: string | null;
  endAt?: string | null;
  reminderAt?: string | null;
  reminderEnabled: boolean;
  status: string;
};
export type StudentExperience = {
  id: string;
  sourceType: "manual" | "platform";
  sourceId?: string | null;
  category: string;
  title: string;
  role: string;
  description: string;
  output: string;
  evidenceUrl?: string;
  occurredAt: string;
  certified: boolean;
  isPublic: boolean;
  sortOrder: number;
};
export type StudentPrivateData = {
  favorites: StudentFavorite[];
  calendar: StudentCalendarEvent[];
  experiences: StudentExperience[];
};

const emptyData: StudentPrivateData = { favorites: [], calendar: [], experiences: [] };

export async function studentRequest(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    headers.set("x-starlight-role", "student");
  }
  return fetch(path, { ...init, headers });
}

export function useStudentData(enabled = true) {
  const [data, setData] = useState<StudentPrivateData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setError("");
    try {
      const response = await studentRequest("/api/student");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "个人数据加载失败");
      setData({
        favorites: payload.favorites || [],
        calendar: payload.calendar || [],
        experiences: payload.experiences || [],
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "个人数据加载失败");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    studentRequest("/api/student")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "个人数据加载失败");
        return payload;
      })
      .then((payload) => {
        if (!active) return;
        setData({
          favorites: payload.favorites || [],
          calendar: payload.calendar || [],
          experiences: payload.experiences || [],
        });
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "个人数据加载失败");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [enabled]);

  const removeFavorite = useCallback(async (favorite: StudentFavorite) => {
    const response = await studentRequest(
      `/api/student?targetType=${encodeURIComponent(favorite.targetType)}&targetId=${encodeURIComponent(favorite.targetId)}`,
      { method: "DELETE" },
    );
    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.error || "取消收藏失败");
    }
    setData((current) => ({
      ...current,
      favorites: current.favorites.filter((item) => item.id !== favorite.id),
    }));
  }, []);

  const toggleFavorite = useCallback(async (
    targetType: StudentFavorite["targetType"],
    targetId: string,
    snapshot: Record<string, unknown>,
  ) => {
    const existing = data.favorites.find(
      (item) => item.targetType === targetType && item.targetId === targetId && item.status !== "removed",
    );
    if (existing) {
      setData((current) => ({ ...current, favorites: current.favorites.filter((item) => item.id !== existing.id) }));
      try { await removeFavorite(existing); }
      catch (error) {
        setData((current) => ({ ...current, favorites: [existing, ...current.favorites] }));
        throw error;
      }
      return false;
    }
    const optimistic: StudentFavorite = {
      id: `pending:${targetType}:${targetId}`,
      targetType,
      targetId,
      targetSnapshot: Object.fromEntries(Object.entries(snapshot).map(([key, value]) => [key, String(value ?? "")])),
      status: "active",
      createdAt: new Date().toISOString(),
    };
    setData((current) => ({ ...current, favorites: [optimistic, ...current.favorites] }));
    try {
      const response = await studentRequest("/api/student", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "favorite", targetType, targetId, snapshot }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "收藏失败");
      setData((current) => ({
        ...current,
        favorites: current.favorites.map((item) => item.id === optimistic.id ? { ...item, id: payload.id || optimistic.id } : item),
      }));
      return true;
    } catch (error) {
      setData((current) => ({ ...current, favorites: current.favorites.filter((item) => item.id !== optimistic.id) }));
      throw error;
    }
  }, [data.favorites, removeFavorite]);

  const setReminder = useCallback(async (sourceId: string, enabled: boolean) => {
    const previous = data.calendar;
    setData((current) => ({
      ...current,
      calendar: current.calendar.map((item) => item.sourceId === sourceId ? { ...item, reminderEnabled: enabled } : item),
    }));
    try {
      const response = await studentRequest("/api/student", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "set-reminder", sourceId, enabled }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "提醒设置失败");
    } catch (error) {
      setData((current) => ({ ...current, calendar: previous }));
      throw error;
    }
  }, [data.calendar]);

  return { data, loading, error, reload, removeFavorite, toggleFavorite, setReminder, setData };
}

"use client";

import { SidePanel, StatusBadge } from "../../components/ui";
import type { StudentFavorite } from "./useStudentData";

const groups = [
  { type: "job", label: "实习项目机会", tab: "opportunities" },
  { type: "activity", label: "成长活动", tab: "activities" },
  { type: "content", label: "成长内容", tab: "content" },
] as const;

export default function FavoritesPanel({
  open,
  favorites,
  onClose,
  onOpen,
  onRemove,
}: {
  open: boolean;
  favorites: StudentFavorite[];
  onClose: () => void;
  onOpen: (tab: string, itemId: string) => void;
  onRemove: (favorite: StudentFavorite) => Promise<void>;
}) {
  return (
    <SidePanel
      open={open}
      title="我的收藏"
      description="岗位、活动和成长内容仅你自己可见，不会向企业公开。"
      onClose={onClose}
    >
      <div className="student-favorites-groups">
        {groups.map((group) => {
          const items = favorites.filter((item) => item.targetType === group.type && item.status !== "removed");
          return (
            <section key={group.type}>
              <header><h3>{group.label}</h3><span>{items.length}</span></header>
              {items.length ? items.map((favorite) => {
                const snapshot = favorite.targetSnapshot || {};
                const offline = snapshot.status === "已下线" || snapshot.status === "offline";
                return (
                  <article key={favorite.id}>
                    <button onClick={() => onOpen(group.tab, favorite.targetId)} disabled={offline}>
                      <b>{snapshot.title || snapshot.company || "收藏内容"}</b>
                      <p>{snapshot.summary || snapshot.company || "打开查看完整信息"}</p>
                      {offline ? <StatusBadge tone="neutral">已下线</StatusBadge> : null}
                    </button>
                    <button className="favorite-remove" onClick={() => onRemove(favorite)}>移除收藏</button>
                  </article>
                );
              }) : <p className="student-favorites-empty">还没有收藏{group.label}，浏览时点击收藏即可稍后查看。</p>}
            </section>
          );
        })}
      </div>
    </SidePanel>
  );
}

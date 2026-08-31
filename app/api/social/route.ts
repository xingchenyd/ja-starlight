import { env } from "cloudflare:workers";
import { getActor, requireAdmin } from "../../../db/runtime";

const setupSql = [
  "CREATE TABLE IF NOT EXISTS workspace_records (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, kind TEXT NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE IF NOT EXISTS content_likes (content_id TEXT NOT NULL, user_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(content_id,user_id))",
  "CREATE TABLE IF NOT EXISTS content_comments (id TEXT PRIMARY KEY, content_id TEXT NOT NULL, author_id TEXT NOT NULL, author_name TEXT NOT NULL, body TEXT NOT NULL, reply_body TEXT NOT NULL DEFAULT '', replied_by TEXT NOT NULL DEFAULT '', replied_at TEXT, status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  "CREATE INDEX IF NOT EXISTS idx_content_comments_content_created ON content_comments(content_id,created_at)",
  "CREATE INDEX IF NOT EXISTS idx_content_likes_content ON content_likes(content_id)",
  "CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_id TEXT NOT NULL, action TEXT NOT NULL, target_type TEXT NOT NULL, target_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
];

async function setup() {
  await env.DB.batch(setupSql.map((sql) => env.DB.prepare(sql)));
}

function validContentId(value: unknown) {
  const id = String(value || "").trim();
  return id.length >= 1 && id.length <= 120 ? id : "";
}

export async function GET(request: Request) {
  await setup();
  const user = await getActor(request);
  const url = new URL(request.url);
  const scope = url.searchParams.get("scope");
  if (scope === "publisher" || scope === "ja") {
    if (scope === "ja" && !(await requireAdmin(request)))
      return Response.json({ error: "需要星光计划管理员权限" }, { status: 403 });
    if (scope === "publisher" && (!user || (user.role !== "enterprise" && !user.testMode)))
      return Response.json({ error: "缺少企业身份" }, { status: 401 });
    const contentRows = scope === "ja"
      ? await env.DB.prepare(
          "SELECT id,payload FROM workspace_records WHERE kind='content' ORDER BY updated_at DESC LIMIT 300",
        ).all()
      : await env.DB.prepare(
          "SELECT id,payload FROM workspace_records WHERE kind='content' AND owner_id=? ORDER BY updated_at DESC LIMIT 300",
        ).bind(user?.id).all();
    const titles = new Map(
      contentRows.results.map((row) => {
        const payload = JSON.parse(String(row.payload)) as Record<string, unknown>;
        return [String(row.id), String(payload.title || "未命名内容")];
      }),
    );
    const ids = [...titles.keys()];
    if (scope === "publisher" && !ids.length)
      return Response.json({ comments: [], pending: 0 });
    const rows = scope === "ja"
      ? await env.DB.prepare(
          "SELECT id,content_id AS contentId,author_name AS authorName,body,reply_body AS replyBody,replied_by AS repliedBy,replied_at AS repliedAt,status,created_at AS createdAt FROM content_comments WHERE status='active' ORDER BY created_at DESC LIMIT 300",
        ).all()
      : await env.DB.prepare(
          `SELECT id,content_id AS contentId,author_name AS authorName,body,reply_body AS replyBody,replied_by AS repliedBy,replied_at AS repliedAt,status,created_at AS createdAt FROM content_comments WHERE content_id IN (${ids.map(() => "?").join(",")}) AND status='active' ORDER BY created_at DESC LIMIT 300`,
        ).bind(...ids).all();
    const comments = rows.results.map((row) => ({
      ...row,
      contentTitle: titles.get(String(row.contentId)) || `平台内容 · ${String(row.contentId).slice(0, 12)}`,
    }));
    return Response.json({
      comments,
      pending: comments.filter((row) => !row.replyBody).length,
    });
  }
  const contentId = validContentId(url.searchParams.get("contentId"));
  if (!contentId)
    return Response.json({ error: "缺少内容标识" }, { status: 400 });
  const [likeRows, comments] = await env.DB.batch([
    env.DB.prepare(
      "SELECT user_id AS userId FROM content_likes WHERE content_id=?",
    ).bind(contentId),
    env.DB.prepare(
      "SELECT id,author_id AS authorId,author_name AS authorName,body,reply_body AS replyBody,replied_by AS repliedBy,replied_at AS repliedAt,created_at AS createdAt FROM content_comments WHERE content_id=? AND status='active' ORDER BY created_at DESC LIMIT 100",
    ).bind(contentId),
  ]);
  const likes = likeRows.results.map((row) => String(row.userId));
  return Response.json({
    liked: Boolean(user?.id && likes.includes(user.id)),
    likeCount: likes.length,
    comments: comments.results.map((row) => ({
      id: row.id,
      author: row.authorName,
      text: row.body,
      reply: row.replyBody || "",
      repliedBy: row.repliedBy || "",
      createdAt: row.createdAt,
      mine: Boolean(user?.id && row.authorId === user.id),
    })),
  });
}

export async function POST(request: Request) {
  await setup();
  const user = await getActor(request);
  if (!user)
    return Response.json({ error: "请先登录后互动" }, { status: 401 });
  if (user.role !== "student" && !user.testMode)
    return Response.json({ error: "当前账号不能以学生身份互动" }, { status: 403 });
  const body = (await request.json()) as {
    action?: "toggle-like" | "add-comment";
    contentId?: string;
    text?: string;
  };
  const contentId = validContentId(body.contentId);
  if (!contentId)
    return Response.json({ error: "内容标识不正确" }, { status: 400 });
  if (body.action === "toggle-like") {
    const existing = await env.DB.prepare(
      "SELECT 1 AS found FROM content_likes WHERE content_id=? AND user_id=?",
    )
      .bind(contentId, user.id)
      .first();
    if (existing)
      await env.DB.prepare(
        "DELETE FROM content_likes WHERE content_id=? AND user_id=?",
      )
        .bind(contentId, user.id)
        .run();
    else
      await env.DB.prepare(
        "INSERT INTO content_likes(content_id,user_id) VALUES(?,?)",
      )
        .bind(contentId, user.id)
        .run();
    const count = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM content_likes WHERE content_id=?",
    )
      .bind(contentId)
      .first<{ count: number }>();
    return Response.json({ ok: true, liked: !existing, likeCount: count?.count || 0 });
  }
  if (body.action === "add-comment") {
    const text = String(body.text || "").trim();
    if (text.length < 2 || text.length > 800)
      return Response.json(
        { error: "评论需为 2—800 个字符" },
        { status: 400 },
      );
    const recent = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM content_comments WHERE author_id=? AND created_at > datetime('now','-5 minutes')",
    )
      .bind(user.id)
      .first<{ count: number }>();
    if ((recent?.count || 0) >= 5)
      return Response.json(
        { error: "评论较频繁，请稍后再试" },
        { status: 429 },
      );
    const id = crypto.randomUUID();
    await env.DB.prepare(
      "INSERT INTO content_comments(id,content_id,author_id,author_name,body) VALUES(?,?,?,?,?)",
    )
      .bind(id, contentId, user.id, user.name, text)
      .run();
    return Response.json({
      ok: true,
      comment: {
        id,
        author: user.name,
        text,
        reply: "",
        createdAt: new Date().toISOString(),
        mine: true,
      },
    });
  }
  return Response.json({ error: "不支持的互动操作" }, { status: 400 });
}

export async function DELETE(request: Request) {
  await setup();
  const user = await getActor(request);
  if (!user)
    return Response.json({ error: "请先登录" }, { status: 401 });
  const id = String(new URL(request.url).searchParams.get("commentId") || "");
  if (!id) return Response.json({ error: "缺少评论" }, { status: 400 });
  const result = await env.DB.prepare(
    "UPDATE content_comments SET status='deleted' WHERE id=? AND author_id=? AND status='active'",
  )
    .bind(id, user.id)
    .run();
  if (!result.meta.changes)
    return Response.json({ error: "无权删除该评论" }, { status: 403 });
  return Response.json({ ok: true });
}

export async function PATCH(request: Request) {
  await setup();
  const user = await getActor(request);
  const body = (await request.json()) as {
    commentId?: string;
    action?: "reply" | "delete";
    reply?: string;
    scope?: "publisher" | "ja";
  };
  if (!body.commentId || !["reply", "delete"].includes(String(body.action)))
    return Response.json({ error: "缺少处理信息" }, { status: 400 });
  const jaActor = body.scope === "ja" ? await requireAdmin(request) : null;
  if (body.scope === "ja" && !jaActor)
    return Response.json({ error: "需要星光计划管理员权限" }, { status: 403 });
  if (body.scope !== "ja" && (!user || (user.role !== "enterprise" && !user.testMode)))
    return Response.json({ error: "缺少发布方身份" }, { status: 401 });
  const comment = await env.DB.prepare(
    "SELECT id,content_id AS contentId,status FROM content_comments WHERE id=?",
  ).bind(body.commentId).first<{ id: string; contentId: string; status: string }>();
  if (!comment || comment.status !== "active")
    return Response.json({ error: "评论不存在或已删除" }, { status: 404 });
  if (body.scope !== "ja") {
    const owned = await env.DB.prepare(
      "SELECT id FROM workspace_records WHERE id=? AND kind='content' AND owner_id=?",
    ).bind(comment.contentId, user?.id).first();
    if (!owned)
      return Response.json({ error: "无权管理其他发布方的评论" }, { status: 403 });
  }
  const actorId = body.scope === "ja" ? String(jaActor?.id) : String(user?.id);
  if (body.action === "reply") {
    const reply = String(body.reply || "").trim();
    if (reply.length < 2 || reply.length > 800)
      return Response.json({ error: "回复需为 2—800 个字符" }, { status: 400 });
    await env.DB.prepare(
      "UPDATE content_comments SET reply_body=?,replied_by=?,replied_at=CURRENT_TIMESTAMP WHERE id=?",
    ).bind(reply, body.scope === "ja" ? "星光计划项目团队" : "内容发布方", comment.id).run();
  } else {
    await env.DB.prepare(
      "UPDATE content_comments SET status='deleted' WHERE id=?",
    ).bind(comment.id).run();
  }
  await env.DB.prepare(
    "INSERT INTO audit_logs(actor_id,action,target_type,target_id) VALUES(?,?, 'content-comment',?)",
  ).bind(actorId, `comment-${body.action}`, comment.id).run();
  return Response.json({ ok: true });
}

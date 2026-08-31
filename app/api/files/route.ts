import { env } from "cloudflare:workers";
import { getActor, writeAudit } from "../../../db/runtime";

const documents = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const media = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"];
function safeKey(value: string) { return value.length > 0 && value.length < 500 && !value.includes("..") ? value : ""; }

export async function POST(request: Request) {
  const actor = await getActor(request);
  if (!actor) return Response.json({ error: "请先登录后上传文件" }, { status: 401 });
  const form = await request.formData(), file = form.get("file"), purpose = String(form.get("purpose") || "media");
  if (!(file instanceof File)) return Response.json({ error: "请选择文件" }, { status: 400 });
  const allowed = purpose === "resume" ? ["application/pdf"] : [...documents, ...media];
  const max = file.type.startsWith("video/") ? 100 * 1024 * 1024 : purpose === "resume" ? 20 * 1024 * 1024 : 15 * 1024 * 1024;
  if (file.size > max) return Response.json({ error: `文件不能超过 ${Math.round(max / 1024 / 1024)}MB` }, { status: 413 });
  if (!allowed.includes(file.type)) return Response.json({ error: purpose === "resume" ? "简历仅支持 PDF" : "支持 JPG、PNG、WebP、MP4、WebM、PDF 或 DOCX" }, { status: 415 });
  const folder = purpose === "resume" ? "resumes" : "media", id = crypto.randomUUID();
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "asset";
  const key = `${folder}/${actor.id}/${id}-${cleanName}`, visibility = purpose === "resume" ? "private" : "public";
  await env.FILES.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type }, customMetadata: { owner: actor.id, originalName: file.name.slice(0, 240), visibility, purpose, assetId: id } });
  await env.DB.prepare("INSERT INTO media_assets(id,owner_id,storage_key,original_name,content_type,size,purpose,visibility,status) VALUES(?,?,?,?,?,?,?,?,'ready')").bind(id, actor.id, key, file.name.slice(0, 240), file.type, file.size, purpose, visibility).run();
  await writeAudit(actor.id, "upload-file", "media-asset", id);
  return Response.json({ ok: true, id, key, url: visibility === "private" ? null : `/api/files?key=${encodeURIComponent(key)}`, name: file.name, size: file.size, status: visibility === "private" ? "仅自己可见" : "上传成功", type: file.type });
}

export async function GET(request: Request) {
  const url = new URL(request.url), key = safeKey(String(url.searchParams.get("key") || ""));
  if (!key) {
    const actor = await getActor(request);
    if (!actor) return Response.json({ assets: [] }, { status: 401 });
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 40) || 40));
    const rows = await env.DB.prepare("SELECT id,storage_key AS storageKey,original_name AS name,content_type AS type,size,purpose,visibility,status,created_at AS createdAt FROM media_assets WHERE owner_id=? AND archived_at IS NULL ORDER BY created_at DESC LIMIT ?").bind(actor.id, limit).all();
    return Response.json({ assets: rows.results.map((row) => ({ ...row, url: row.visibility === "public" ? `/api/files?key=${encodeURIComponent(String(row.storageKey))}` : null })) });
  }
  const object = await env.FILES.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  const visibility = object.customMetadata?.visibility;
  if (visibility !== "public") {
    const actor = await getActor(request);
    if (!actor || actor.id !== object.customMetadata?.owner) return new Response("Forbidden", { status: 403 });
    await env.DB.prepare("INSERT INTO file_access_logs(actor_id,storage_key,action) VALUES(?,?,'view-private')").bind(actor.id, key).run();
  }
  const headers = new Headers({ "content-type": object.httpMetadata?.contentType || "application/octet-stream", "cache-control": visibility === "public" ? "public, max-age=3600, stale-while-revalidate=86400" : "private, no-store", "x-content-type-options": "nosniff" });
  if (object.etag) headers.set("etag", object.etag);
  return new Response(object.body, { headers });
}

export async function DELETE(request: Request) {
  const actor = await getActor(request);
  if (!actor) return Response.json({ error: "请先登录" }, { status: 401 });
  const key = safeKey(String(new URL(request.url).searchParams.get("key") || ""));
  if (!key) return Response.json({ error: "缺少文件标识" }, { status: 400 });
  const result = await env.DB.prepare("UPDATE media_assets SET archived_at=CURRENT_TIMESTAMP,status='archived' WHERE storage_key=? AND owner_id=? AND archived_at IS NULL").bind(key, actor.id).run();
  if (!result.meta.changes) return Response.json({ error: "文件不存在或无权操作" }, { status: 404 });
  await writeAudit(actor.id, "archive-file", "media-asset", key);
  return Response.json({ ok: true, recoverable: true });
}

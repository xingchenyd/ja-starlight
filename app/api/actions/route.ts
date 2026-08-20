import { env } from "cloudflare:workers";
import { headers } from "next/headers";

const setupStatements = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('student','enterprise','admin')), status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS registrations (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, activity_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'registered', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, activity_id))`,
  `CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_id TEXT NOT NULL, action TEXT NOT NULL, target_type TEXT NOT NULL, target_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE INDEX IF NOT EXISTS idx_registrations_user_created ON registrations(user_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id, created_at)`,
];

async function setup(){await env.DB.batch(setupStatements.map(sql=>env.DB.prepare(sql)))}
async function identity(request:Request){
  const h=await headers(); const realId=h.get("oai-authenticated-user-id");
  const local=new URL(request.url).hostname==="localhost"||new URL(request.url).hostname==="127.0.0.1";
  const demo=request.headers.get("x-starlight-demo-id"); const demoId=demo&&/^[a-zA-Z0-9-]{8,80}$/.test(demo)?`demo:${demo}`:null;
  return {id:realId??demoId??(local?"demo-preview-user":null),email:h.get("oai-authenticated-user-email")??"preview@ja.org.cn",name:"星光同学",local};
}

export async function GET(request:Request){
  await setup(); const user=await identity(request); if(!user.id)return Response.json({signedIn:false,registrations:[]});
  const [regs,profile]=await env.DB.batch([
    env.DB.prepare("SELECT activity_id AS activityId,status,created_at AS createdAt FROM registrations WHERE user_id=? ORDER BY created_at DESC").bind(user.id),
    env.DB.prepare("SELECT id,email,name,role,status FROM users WHERE id=?").bind(user.id),
  ]);
  return Response.json({signedIn:true,profile:profile.results[0]??null,registrations:regs.results});
}

export async function POST(request:Request){
  await setup(); const user=await identity(request); if(!user.id)return Response.json({error:"请先登录后继续"},{status:401});
  const body=await request.json() as {action?:string;targetId?:string;role?:string};
  const safeRole=body.role==="enterprise"?"enterprise":"student";
  await env.DB.prepare("INSERT INTO users(id,email,name,role,status) VALUES(?,?,?,?, 'active') ON CONFLICT(id) DO NOTHING").bind(user.id,user.email,user.name,safeRole).run();
  if(body.action==="register"&&body.targetId){
    await env.DB.prepare("INSERT INTO registrations(user_id,activity_id,status) VALUES(?,?,'registered') ON CONFLICT(user_id,activity_id) DO UPDATE SET status='registered'").bind(user.id,body.targetId).run();
  }else if(body.action==="cancel-registration"&&body.targetId){
    await env.DB.prepare("UPDATE registrations SET status='cancelled' WHERE user_id=? AND activity_id=?").bind(user.id,body.targetId).run();
  }else{return Response.json({error:"不支持的操作"},{status:400})}
  await env.DB.prepare("INSERT INTO audit_logs(actor_id,action,target_type,target_id) VALUES(?,?,?,?)").bind(user.id,body.action,"activity",body.targetId??"").run();
  return Response.json({ok:true});
}

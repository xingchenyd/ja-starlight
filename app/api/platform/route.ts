import {env} from "cloudflare:workers";
import {headers} from "next/headers";

const sql=[
 `CREATE TABLE IF NOT EXISTS workspace_records (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, kind TEXT NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
 `CREATE INDEX IF NOT EXISTS idx_workspace_owner_kind ON workspace_records(owner_id, kind, updated_at)`,
 `CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_id TEXT NOT NULL, action TEXT NOT NULL, target_type TEXT NOT NULL, target_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`
];
async function setup(){await env.DB.batch(sql.map(s=>env.DB.prepare(s)))}
async function actor(request:Request){const h=await headers();const real=h.get("oai-authenticated-user-id");const demo=request.headers.get("x-starlight-demo-id");return real??(demo&&/^[a-zA-Z0-9-]{8,80}$/.test(demo)?`demo:${demo}`:null)}
function clean(value:unknown){const text=JSON.stringify(value);if(text.length>24000)throw new Error("内容过长");return text}

export async function GET(request:Request){await setup();const id=await actor(request);if(!id)return Response.json({records:[]});const kind=new URL(request.url).searchParams.get("kind");const query=kind?env.DB.prepare("SELECT id,kind,payload,updated_at AS updatedAt FROM workspace_records WHERE owner_id=? AND kind=? ORDER BY updated_at DESC").bind(id,kind):env.DB.prepare("SELECT id,kind,payload,updated_at AS updatedAt FROM workspace_records WHERE owner_id=? ORDER BY updated_at DESC").bind(id);const rows=await query.all();return Response.json({records:rows.results.map(r=>({...r,payload:JSON.parse(String(r.payload))}))})}

export async function POST(request:Request){await setup();const owner=await actor(request);if(!owner)return Response.json({error:"缺少体验身份"},{status:401});const body=await request.json() as {id?:string;kind?:string;payload?:unknown};const allowed=["student-profile","enterprise-profile","job","activity","content"];if(!body.kind||!allowed.includes(body.kind)||!body.payload)return Response.json({error:"数据类型不正确"},{status:400});const id=body.id&&/^[a-zA-Z0-9-]{4,100}$/.test(body.id)?body.id:crypto.randomUUID();await env.DB.prepare("INSERT INTO workspace_records(id,owner_id,kind,payload,updated_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated_at=CURRENT_TIMESTAMP WHERE owner_id=excluded.owner_id").bind(id,owner,body.kind,clean(body.payload)).run();await env.DB.prepare("INSERT INTO audit_logs(actor_id,action,target_type,target_id) VALUES(?,'save',?,?)").bind(owner,body.kind,id).run();return Response.json({ok:true,id})}

export async function DELETE(request:Request){await setup();const owner=await actor(request);if(!owner)return Response.json({error:"缺少体验身份"},{status:401});const id=new URL(request.url).searchParams.get("id");if(!id)return Response.json({error:"缺少记录"},{status:400});await env.DB.prepare("DELETE FROM workspace_records WHERE id=? AND owner_id=?").bind(id,owner).run();await env.DB.prepare("INSERT INTO audit_logs(actor_id,action,target_type,target_id) VALUES(?,'delete','workspace_record',?)").bind(owner,id).run();return Response.json({ok:true})}

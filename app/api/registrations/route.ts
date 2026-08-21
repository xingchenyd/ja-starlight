import {env} from "cloudflare:workers";
import {headers} from "next/headers";

const setupSql=[
 "CREATE TABLE IF NOT EXISTS workspace_records (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, kind TEXT NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
 "CREATE TABLE IF NOT EXISTS activity_registrations (id TEXT PRIMARY KEY, activity_id TEXT NOT NULL, activity_title TEXT NOT NULL, student_owner_id TEXT NOT NULL, publisher_owner_id TEXT NOT NULL, answers TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'registered', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
 "CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_registration_student_activity ON activity_registrations(student_owner_id, activity_id)",
 "CREATE INDEX IF NOT EXISTS idx_activity_registration_publisher ON activity_registrations(publisher_owner_id, created_at)",
 "CREATE INDEX IF NOT EXISTS idx_activity_registration_activity ON activity_registrations(activity_id, created_at)",
];

async function setup(){await env.DB.batch(setupSql.map(sql=>env.DB.prepare(sql)))}
async function actor(request:Request){const h=await headers();const real=h.get("oai-authenticated-user-id");const demo=request.headers.get("x-starlight-demo-id");return real??(demo&&/^[a-zA-Z0-9-]{8,80}$/.test(demo)?`demo:${demo}`:null)}
function cleanAnswers(value:unknown){const json=JSON.stringify(value);if(json.length>12000)throw new Error("报名信息过长");return json}

export async function GET(request:Request){
 await setup();const owner=await actor(request);if(!owner)return Response.json({registrations:[]});
 const url=new URL(request.url);const scope=url.searchParams.get("scope");
 const statement=scope==="publisher"
  ?env.DB.prepare("SELECT id,activity_id AS activityId,activity_title AS activityTitle,answers,status,created_at AS createdAt FROM activity_registrations WHERE publisher_owner_id=? ORDER BY created_at DESC").bind(owner)
  :env.DB.prepare("SELECT id,activity_id AS activityId,activity_title AS activityTitle,answers,status,created_at AS createdAt FROM activity_registrations WHERE student_owner_id=? ORDER BY created_at DESC").bind(owner);
 const rows=await statement.all();return Response.json({registrations:rows.results.map(row=>({...row,answers:JSON.parse(String(row.answers))}))});
}

export async function POST(request:Request){
 await setup();const student=await actor(request);if(!student)return Response.json({error:"缺少报名身份"},{status:401});
 const body=await request.json() as {activityId?:string;activityTitle?:string;answers?:Record<string,string>};
 if(!body.activityId||!body.activityTitle||!body.answers||Object.keys(body.answers).length===0)return Response.json({error:"请完整填写报名信息"},{status:400});
 const record=await env.DB.prepare("SELECT owner_id AS ownerId,payload FROM workspace_records WHERE id=? AND kind='activity'").bind(body.activityId).first();
 let publisher="ja:seed";
 if(record){const payload=JSON.parse(String(record.payload));if(payload.reviewStatus!=="approved")return Response.json({error:"该活动暂未开放报名"},{status:400});publisher=String(record.ownerId)}
 const id=crypto.randomUUID();
 await env.DB.prepare("INSERT INTO activity_registrations(id,activity_id,activity_title,student_owner_id,publisher_owner_id,answers,status,created_at) VALUES(?,?,?,?,?,?,'registered',CURRENT_TIMESTAMP) ON CONFLICT(student_owner_id,activity_id) DO UPDATE SET answers=excluded.answers,status='registered',created_at=CURRENT_TIMESTAMP").bind(id,body.activityId,body.activityTitle,student,publisher,cleanAnswers(body.answers)).run();
 await env.DB.prepare("INSERT INTO audit_logs(actor_id,action,target_type,target_id) VALUES(?,'register','activity',?)").bind(student,body.activityId).run();
 return Response.json({ok:true,id});
}

export async function DELETE(request:Request){
 await setup();const student=await actor(request);if(!student)return Response.json({error:"缺少报名身份"},{status:401});
 const id=new URL(request.url).searchParams.get("activityId");if(!id)return Response.json({error:"缺少活动"},{status:400});
 await env.DB.prepare("DELETE FROM activity_registrations WHERE activity_id=? AND student_owner_id=?").bind(id,student).run();
 return Response.json({ok:true});
}

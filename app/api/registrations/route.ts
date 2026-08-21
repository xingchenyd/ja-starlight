import {env} from "cloudflare:workers";
import {headers} from "next/headers";

type ActivityRow={id:string;ownerId:string;payload:string};
type RegistrationRow={id:string;activityId:string;activityTitle:string;publisherOwnerId?:string;answers:string;status:string;reviewNote?:string;reviewedAt?:string|null;createdAt:string};
const setupSql=[
 "CREATE TABLE IF NOT EXISTS workspace_records (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, kind TEXT NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
 "CREATE TABLE IF NOT EXISTS activity_registrations (id TEXT PRIMARY KEY, activity_id TEXT NOT NULL, activity_title TEXT NOT NULL, student_owner_id TEXT NOT NULL, publisher_owner_id TEXT NOT NULL, answers TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', review_note TEXT NOT NULL DEFAULT '', reviewed_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
 "CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_registration_student_activity ON activity_registrations(student_owner_id, activity_id)",
 "CREATE INDEX IF NOT EXISTS idx_activity_registration_publisher ON activity_registrations(publisher_owner_id, created_at)",
 "CREATE INDEX IF NOT EXISTS idx_activity_registration_activity ON activity_registrations(activity_id, created_at)",
];

async function setup(){
 await env.DB.batch(setupSql.slice(0,2).map(sql=>env.DB.prepare(sql)));
 const columns=await env.DB.prepare("PRAGMA table_info(activity_registrations)").all();const names=new Set(columns.results.map(row=>String(row.name)));
 const alters=[];if(!names.has("review_note"))alters.push(env.DB.prepare("ALTER TABLE activity_registrations ADD COLUMN review_note TEXT NOT NULL DEFAULT ''"));if(!names.has("reviewed_at"))alters.push(env.DB.prepare("ALTER TABLE activity_registrations ADD COLUMN reviewed_at TEXT"));if(alters.length)await env.DB.batch(alters);
 await env.DB.batch(setupSql.slice(2).map(sql=>env.DB.prepare(sql)));
}
async function actor(request:Request){const h=await headers();const real=h.get("oai-authenticated-user-id");const demo=request.headers.get("x-starlight-demo-id");return real??(demo&&/^[a-zA-Z0-9-]{8,80}$/.test(demo)?`demo:${demo}`:null)}
function cleanAnswers(value:unknown){const json=JSON.stringify(value);if(json.length>12000)throw new Error("报名信息过长");return json}
function parseRegistration(row:RegistrationRow){return {...row,answers:JSON.parse(String(row.answers)),status:row.status==="registered"?"pending":row.status,reviewNote:row.reviewNote||""}}
async function activities(){const rows=await env.DB.prepare("SELECT id,owner_id AS ownerId,payload FROM workspace_records WHERE kind='activity'").all();return rows.results as unknown as ActivityRow[]}
function activityIdsOwnedBy(rows:ActivityRow[],owner:string){const ids=new Set<string>();for(const row of rows){if(row.ownerId!==owner)continue;ids.add(row.id);try{const payload=JSON.parse(String(row.payload));if(payload.id)ids.add(String(payload.id))}catch{ids.add(row.id)}}return ids}
function findActivity(rows:ActivityRow[],activityId:string){return rows.find(row=>{if(row.id===activityId)return true;try{return String(JSON.parse(String(row.payload)).id||"")===activityId}catch{return false}})}

export async function GET(request:Request){
 await setup();const owner=await actor(request);if(!owner)return Response.json({registrations:[]});const scope=new URL(request.url).searchParams.get("scope");
 if(scope==="publisher"){
  const [activityRows,registrationRows]=await Promise.all([activities(),env.DB.prepare("SELECT id,activity_id AS activityId,activity_title AS activityTitle,publisher_owner_id AS publisherOwnerId,answers,status,review_note AS reviewNote,reviewed_at AS reviewedAt,created_at AS createdAt FROM activity_registrations ORDER BY created_at DESC LIMIT 500").all()]);
  const ownedIds=activityIdsOwnedBy(activityRows,owner);const visible=(registrationRows.results as unknown as RegistrationRow[]).filter(row=>row.publisherOwnerId===owner||ownedIds.has(row.activityId)).map(parseRegistration);return Response.json({registrations:visible});
 }
 const rows=await env.DB.prepare("SELECT id,activity_id AS activityId,activity_title AS activityTitle,answers,status,review_note AS reviewNote,reviewed_at AS reviewedAt,created_at AS createdAt FROM activity_registrations WHERE student_owner_id=? ORDER BY created_at DESC").bind(owner).all();return Response.json({registrations:(rows.results as unknown as RegistrationRow[]).map(parseRegistration)});
}

export async function POST(request:Request){
 await setup();const student=await actor(request);if(!student)return Response.json({error:"缺少报名身份"},{status:401});const body=await request.json() as {activityId?:string;activityTitle?:string;answers?:Record<string,string>};
 if(!body.activityId||!body.activityTitle||!body.answers||Object.keys(body.answers).length===0)return Response.json({error:"请完整填写报名信息"},{status:400});
 const activityRows=await activities();const record=findActivity(activityRows,body.activityId);let publisher="ja:seed";let canonicalActivityId=body.activityId;
 if(record){const payload=JSON.parse(String(record.payload));if(payload.reviewStatus!=="approved")return Response.json({error:"该活动暂未开放报名"},{status:400});publisher=String(record.ownerId);canonicalActivityId=record.id}
 const previous=await env.DB.prepare("SELECT id FROM activity_registrations WHERE student_owner_id=? AND activity_id IN (?,?) LIMIT 1").bind(student,body.activityId,canonicalActivityId).first();const id=previous?String(previous.id):crypto.randomUUID();if(previous)await env.DB.prepare("UPDATE activity_registrations SET activity_id=?,activity_title=?,publisher_owner_id=?,answers=?,status='pending',review_note='',reviewed_at=NULL,created_at=CURRENT_TIMESTAMP WHERE id=?").bind(canonicalActivityId,body.activityTitle,publisher,cleanAnswers(body.answers),id).run();else await env.DB.prepare("INSERT INTO activity_registrations(id,activity_id,activity_title,student_owner_id,publisher_owner_id,answers,status,review_note,reviewed_at,created_at) VALUES(?,?,?,?,?,?,'pending','',NULL,CURRENT_TIMESTAMP)").bind(id,canonicalActivityId,body.activityTitle,student,publisher,cleanAnswers(body.answers)).run();
 await env.DB.prepare("INSERT INTO audit_logs(actor_id,action,target_type,target_id) VALUES(?,'register','activity',?)").bind(student,canonicalActivityId).run();return Response.json({ok:true,id,status:"pending"});
}

export async function PATCH(request:Request){
 await setup();const publisher=await actor(request);if(!publisher)return Response.json({error:"缺少企业身份"},{status:401});const body=await request.json() as {registrationId?:string;decision?:"approved"|"rejected";note?:string};
 if(!body.registrationId||!["approved","rejected"].includes(String(body.decision)))return Response.json({error:"缺少审核决定"},{status:400});if(body.decision==="rejected"&&!body.note?.trim())return Response.json({error:"退回时请填写原因"},{status:400});
 const registration=await env.DB.prepare("SELECT id,activity_id AS activityId,publisher_owner_id AS publisherOwnerId FROM activity_registrations WHERE id=?").bind(body.registrationId).first() as {id:string;activityId:string;publisherOwnerId:string}|null;if(!registration)return Response.json({error:"报名不存在"},{status:404});
 const ownedIds=activityIdsOwnedBy(await activities(),publisher);if(registration.publisherOwnerId!==publisher&&!ownedIds.has(registration.activityId))return Response.json({error:"无权审核此报名"},{status:403});
 await env.DB.prepare("UPDATE activity_registrations SET publisher_owner_id=?,status=?,review_note=?,reviewed_at=CURRENT_TIMESTAMP WHERE id=?").bind(publisher,body.decision,body.note?.trim()||(body.decision==="approved"?"企业确认报名通过":""),body.registrationId).run();
 await env.DB.prepare("INSERT INTO audit_logs(actor_id,action,target_type,target_id) VALUES(?,?,'activity-registration',?)").bind(publisher,`registration-${body.decision}`,body.registrationId).run();return Response.json({ok:true,status:body.decision});
}

export async function DELETE(request:Request){await setup();const student=await actor(request);if(!student)return Response.json({error:"缺少报名身份"},{status:401});const id=new URL(request.url).searchParams.get("activityId");if(!id)return Response.json({error:"缺少活动"},{status:400});const activityRows=await activities();const record=findActivity(activityRows,id);await env.DB.prepare("DELETE FROM activity_registrations WHERE activity_id=? AND student_owner_id=?").bind(record?.id||id,student).run();return Response.json({ok:true})}

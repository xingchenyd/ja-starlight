import {env} from "cloudflare:workers";

async function setup(){
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS workspace_records (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, kind TEXT NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_workspace_owner_kind ON workspace_records(owner_id, kind, updated_at)"),
  ]);
}

export async function GET(){
  await setup();
  const rows=await env.DB.prepare("SELECT id,kind,payload,updated_at AS updatedAt FROM workspace_records WHERE kind IN ('job','activity','content') ORDER BY updated_at DESC LIMIT 200").all();
  const records=rows.results
    .map(row=>({...row,payload:JSON.parse(String(row.payload))}))
    .filter(row=>{const payload=row.payload as {reviewStatus?:string;city?:string;place?:string};if(payload.reviewStatus!=="approved")return false;if(row.kind==="job")return payload.city==="长沙";if(row.kind==="activity")return String(payload.place||"").includes("长沙");return true});
  return Response.json({records},{headers:{"cache-control":"public, max-age=60"}});
}

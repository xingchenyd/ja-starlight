// Disposable runtime. Never opens the production database or uses production credentials.
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
const dir=await mkdtemp(join(tmpdir(),"star-plan-challenge-audit-"));
const base="http://127.0.0.1:3014";
await writeFile(join(dir,"runtime.json"),JSON.stringify({AUTH_PEPPER:randomUUID()+randomUUID(),AUTH_SEED_STUDENT_PASSWORD:"StudentAudit2026!",AUTH_SEED_ENTERPRISE_PASSWORD:"EnterpriseAudit2026!",AUTH_SEED_ADMIN_KEY:"STARLIGHT-LocalAuditAdminKey-20260921-Only",AUTH_TRUSTED_ORIGINS:base,MAIL_PROVIDER:"disabled"}));
await writeFile(join(dir,"restore-complete.json"),"{}");
console.log("Disposable acceptance directory:",dir);
const start=()=>{
  const child=spawn(process.execPath,["--experimental-sqlite","server/start.mjs"],{env:{...process.env,STARLIGHT_CONFIG_FILE:join(dir,"runtime.json"),STARLIGHT_DATA_DIR:dir,STARLIGHT_STANDALONE_ENTRY:resolve("dist/standalone/server.js"),HOST:"127.0.0.1",PORT:"3014"},stdio:["ignore","pipe","pipe"]});
  child.stdout.on("data",x=>process.stdout.write(x));child.stderr.on("data",x=>process.stderr.write(x));return child;
};
let server=start();
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(){
  let ready=false;
  for(let i=0;i<60;i++){if(server.exitCode!==null)throw new Error("Local server exited");try{const r=await fetch(base+"/api/catalog");if(r.ok){ready=true;break;}}catch{ /* Runtime may still be starting. */ }await pause(500);}
  if(!ready)throw new Error("Local runtime not ready");
}
try {
  await ready();
  for(const script of ["full-acceptance-http.mjs","challenge-acceptance-http.mjs"]){
    const code=await new Promise((resolve,reject)=>{const p=spawn(process.execPath,[`scripts/${script}`,base,"--disposable-database"],{stdio:"inherit"});p.on("error",reject);p.on("exit",resolve);});
    if(code!==0)throw new Error(`${script} failed`);
  }
  await new Promise(resolve=>{server.once("exit",resolve);server.kill();});
  const db=new DatabaseSync(join(dir,"app.sqlite"),{readOnly:true});
  const integrity=db.prepare("PRAGMA integrity_check").get();
  if(integrity.integrity_check!=="ok")throw new Error("SQLite integrity check failed");
  const teams=db.prepare("SELECT COUNT(*) AS n FROM challenge_teams").get().n;
  const history=db.prepare("SELECT COUNT(*) AS n FROM challenge_history").get().n;
  const privateCertificates=db.prepare("SELECT COUNT(*) AS n FROM student_experiences WHERE source_id LIKE 'challenge:%' AND certified=1 AND is_public=0").get().n;
  if(teams!==2||history!==6||privateCertificates!==4)throw new Error(`Persistence mismatch: ${teams}/${history}/${privateCertificates}`);
  db.close();
  server=start();await ready();
  const login=await fetch(base+"/api/auth/login",{method:"POST",headers:{origin:base,"content-type":"application/json"},body:JSON.stringify({role:"student",email:"student@starlight-hunan.cn",password:"StudentAudit2026!"})});
  if(!login.ok)throw new Error("Restart authentication failed");
  const read=await fetch(base+"/api/challenges?activityId=challenge-acceptance-20260922",{headers:{cookie:login.headers.get("set-cookie").split(";")[0]}});
  const result=await read.json();if(result.team?.status!=="awarded"||result.team.members.length!==2)throw new Error("Restart readback mismatch");
  console.log(JSON.stringify({persisted:true,integrity:"ok",teams,history,privateCertificates,restartReadback:"awarded / 2 members"}));
  if(process.argv.includes("--keep-running")){console.log("READY_FOR_BROWSER",dir);await new Promise(()=>{});}
}finally{server.kill();}

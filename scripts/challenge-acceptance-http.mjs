import assert from "node:assert/strict";
const [base,ack] = process.argv.slice(2);
if(ack!=="--disposable-database"||!["127.0.0.1","localhost"].includes(new URL(base).hostname)) throw new Error("Disposable loopback database required");
const cookies={}, passed=[];
async function call(path,role,method="GET",body,status=200){
  const r=await fetch(base+path,{method,headers:{origin:base,"content-type":"application/json",...(cookies[role]?{cookie:cookies[role]}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  const value=await r.json(); assert.equal(r.status,status,`${method} ${path}: ${JSON.stringify(value)}`); return {value,r};
}
async function data(...args){return (await call(...args)).value;}
for(const [role,email,password] of [["captain","student@starlight-hunan.cn","StudentAudit2026!"],["enterprise","enterprise@starlight-hunan.cn","EnterpriseAudit2026!"]]){
  const {r}=await call("/api/auth/login",null,"POST",{role:role==="captain"?"student":"enterprise",email,password});cookies[role]=r.headers.get("set-cookie").split(";")[0];
}
cookies.admin=(await call("/api/admin-auth/login",null,"POST",{key:"STARLIGHT-LocalAuditAdminKey-20260921-Only"})).r.headers.get("set-cookie").split(";")[0];
for(const role of ["member","outsider","otherEnterprise"]){const {r}=await call("/api/auth/register",null,"POST",{role:role==="otherEnterprise"?"enterprise":"student",email:`${role.toLowerCase()}@challenge.example`,password:"ChallengeAudit2026!"},201);cookies[role]=r.headers.get("set-cookie").split(";")[0];}
const activityId="challenge-acceptance-20260922";
const challenge={enabled:true,problem:"循环经济中的重复包装浪费问题",eligibility:"在校学生",deliverables:"提交可验证的循环包装方案和试点分析",criteria:"问题理解30%、可行性40%、价值验证30%",rewards:"企业线下兑现奖励及实习推荐",teamMin:2,teamMax:2,registrationDeadline:"2099-10-01",submissionDeadline:"2099-10-20",resultsDate:"2099-10-30"};
const payload={title:"循环经济团队挑战验收",summary:"针对循环包装提出可以验证的真实企业改进方案。",cover:"/media/ja-career-fair.jpg",date:"2099-10-02",capacity:10,challenge,registrationFields:[{id:"name",label:"姓名",type:"text",required:true}]};
await call("/api/platform","enterprise","POST",{id:activityId,kind:"activity",payload:{...payload,challenge:{...challenge,teamMax:0}}},400);
await data("/api/platform","enterprise","POST",{id:activityId,kind:"activity",payload});
await data("/api/admin","admin","POST",{id:activityId,decision:"approved"});
assert.equal((await data(`/api/catalog?id=${activityId}`,null)).record.payload.challenge.teamMax,2);
await call("/api/challenges",null,"GET",undefined,401);
await call("/api/challenges?scope=enterprise","captain","GET",undefined,403);
const post=(role,body,status=200)=>data("/api/challenges",role,"POST",body,status);
await post("captain",{action:"create",activityId,name:"循环团队"},403);
for(const role of ["captain","member","outsider"]){
  const r=await data("/api/registrations",role,"POST",{activityId,activityTitle:payload.title,answers:{name:`验收${role}`}});
  await data("/api/registrations","enterprise","PATCH",{registrationId:r.id,decision:"approved"});
  const state=await data("/api/student",role);assert.ok(!state.experiences.some(x=>x.sourceId===r.id),"qualification is not certified completion");
}
await call("/api/registrations","captain","POST",{activityId,activityTitle:payload.title,answers:{name:"覆写已通过报名"}},409);
passed.push("valid publishing, access isolation and qualification without premature certification");
await post("captain",{action:"create",activityId,name:"循环团队"});
const own=async(role="captain")=>(await data(`/api/challenges?activityId=${activityId}`,role)).team;
let team=await own();assert.equal(team.members.length,1);
await post("captain",{action:"create",activityId,name:"重复团队"},409);
const submission={title:"循环包装验证方案",summary:"我们梳理了包装流转环节，设计重复使用方案，通过成本测算和用户验证形成试点建议。",url:"https://example.org/circular-economy"};
await post("captain",{action:"submit",teamId:team.id,version:team.version,...submission},409);
let invite=await post("captain",{action:"invite",teamId:team.id,version:team.version,email:"member@challenge.example"});
await post("outsider",{action:"join",code:invite.code},403);
await post("member",{action:"join",code:invite.code,activityId:"another-activity"},409);
await post("member",{action:"join",code:invite.code});
team=await own();assert.equal(team.members.length,2);assert.ok(team.members.some(m=>m.name==="验收member"));
await post("member",{action:"join",code:invite.code},403);
await post("member",{action:"submit",teamId:team.id,version:team.version,...submission},403);
invite=await post("captain",{action:"invite",teamId:team.id,version:team.version,email:"outsider@challenge.example"});
await post("outsider",{action:"join",code:invite.code},409);
team=await own();
const activeInvite=team.invites.find(i=>i.email==="outsider@challenge.example"&&!i.revokedAt&&!i.consumedAt);
await post("captain",{action:"revoke",teamId:team.id,version:team.version,inviteId:activeInvite.id});
await post("outsider",{action:"join",code:invite.code},403);
team=await own();
await call("/api/platform","enterprise","POST",{id:activityId,kind:"activity",payload:{...payload,challenge:{...challenge,teamMax:10}}},409);
await post("captain",{action:"submit",teamId:team.id,version:team.version-1,...submission},409);
await post("captain",{action:"submit",teamId:team.id,version:team.version,...submission,url:"javascript:alert(1)"},400);
await post("captain",{action:"submit",teamId:team.id,version:team.version,...submission});
team=await own();assert.equal(team.status,"submitted");
await post("member",{action:"leave",teamId:team.id,version:team.version},409);
assert.equal((await own("member")).submission.title,submission.title);
assert.equal((await data("/api/challenges?scope=enterprise","otherEnterprise")).teams.length,0);
assert.equal((await data("/api/challenges?scope=ja","admin")).teams.length,0);
await post("otherEnterprise",{action:"review",teamId:team.id,version:team.version,decision:"completed",note:"越权评审"},403);
await post("admin",{action:"review",scope:"ja",teamId:team.id,version:team.version,decision:"completed",note:"越权评审"},403);
passed.push("independent accounts, targeted invitations, capacity, version conflicts and roster locking");
await post("enterprise",{action:"review",teamId:team.id,version:team.version,decision:"revision_requested",note:"请补充试点数据"});
team=await own();assert.equal(team.status,"revision_requested");
await post("captain",{action:"submit",teamId:team.id,version:team.version,...submission,summary:submission.summary+" 已补充数据验证。"});
team=await own();
await post("enterprise",{action:"review",teamId:team.id,version:team.version,decision:"awarded",note:"试点验证充分，方案可行。",score:91,award:"优秀方案奖，奖励由企业按公告线下兑现。",referral:"邀请参加实习岗位面谈，不承诺直接录用。"});
for(const role of ["captain","member"]){
  const result=await own(role);assert.equal(result.status,"awarded");assert.equal(result.review.score,91);
  const experience=(await data("/api/student",role)).experiences.find(x=>x.sourceId===`challenge:${team.id}`);
  assert.ok(experience?.certified);assert.equal(experience.isPublic,false);assert.match(experience.output,/优秀方案奖/);
}
await post("enterprise",{action:"review",teamId:team.id,version:(await own()).version,decision:"completed",note:"重复终审"},409);
passed.push("revision history, final evaluation and private certified results for every member");
const ja=await data("/api/admin","admin","PUT",{kind:"activity",payload:{...payload,title:"星光计划自办循环经济挑战",challenge:{...challenge,teamMin:1}}});
assert.equal((await data(`/api/catalog?id=${ja.id}`,null)).record.payload.reviewStatus,"approved");
await call("/api/admin","admin","POST",{id:ja.id,decision:"approved"},400);
const jr=await data("/api/registrations","outsider","POST",{activityId:ja.id,activityTitle:"自办挑战",answers:{name:"独立账号参赛者"}});
await data("/api/registrations","admin","PATCH",{scope:"ja",registrationId:jr.id,decision:"approved"});
await post("outsider",{action:"create",activityId:ja.id,name:"自办测试团队"});
let jt=(await data(`/api/challenges?activityId=${ja.id}`,"outsider")).team;
const invitations=[];
for(const [role,email] of [["captain","student@starlight-hunan.cn"],["member","member@challenge.example"]]){
  const signup=await data("/api/registrations",role,"POST",{activityId:ja.id,activityTitle:"自办挑战",answers:{name:`并发验收${role}`}});
  await data("/api/registrations","admin","PATCH",{scope:"ja",registrationId:signup.id,decision:"approved"});
  const issued=await post("outsider",{action:"invite",teamId:jt.id,version:jt.version,email});
  invitations.push({role,code:issued.code});
  jt=(await data(`/api/challenges?activityId=${ja.id}`,"outsider")).team;
}
const joins=await Promise.all(invitations.map(async({role,code})=>{
  const response=await fetch(base+"/api/challenges",{method:"POST",headers:{origin:base,"content-type":"application/json",cookie:cookies[role]},body:JSON.stringify({action:"join",code})});
  return response.status;
}));
assert.deepEqual(joins.sort(),[200,409]);
jt=(await data(`/api/challenges?activityId=${ja.id}`,"outsider")).team;
assert.equal(jt.members.length,2);
await post("outsider",{action:"submit",teamId:jt.id,version:jt.version,...submission});
jt=(await data(`/api/challenges?activityId=${ja.id}`,"outsider")).team;
await post("enterprise",{action:"review",teamId:jt.id,version:jt.version,decision:"completed",note:"越权评审"},403);
await post("admin",{action:"review",scope:"ja",teamId:jt.id,version:jt.version,decision:"completed",note:"方案已完成并通过评审"});
assert.equal((await data("/api/challenges?scope=ja","admin")).teams.length,1);
passed.push("operations-hosted competition scope and simultaneous last-seat joins");
console.log(JSON.stringify({passed},null,2));

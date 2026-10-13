import assert from 'node:assert/strict';
const [base, ack] = process.argv.slice(2);
if (ack !== '--disposable-database' || !['127.0.0.1','localhost'].includes(new URL(base).hostname)) throw new Error('Disposable loopback database required');
const cookies = {}, passed = [];
async function call(path, role, method='GET', body, status=200) {
  const response=await fetch(base+path,{method,headers:{origin:base,'content-type':'application/json',...(cookies[role]?{cookie:cookies[role]}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  const value=await response.json();assert.equal(response.status,status,`${method} ${path}: ${JSON.stringify(value)}`);return {response,value};
}
async function json(...args){return(await call(...args)).value;}
for(const [role,payload] of [['admin',{key:'STARLIGHT-LocalAuditAdminKey-20260921-Only'}],['student',{role:'student',email:'student@starlight-hunan.cn',password:'StudentAudit2026!'}],['enterprise',{role:'enterprise',email:'enterprise@starlight-hunan.cn',password:'EnterpriseAudit2026!'}]]){
  const {response}=await call(role==='admin'?'/api/admin-auth/login':'/api/auth/login',null,'POST',payload);
  cookies[role]=response.headers.get('set-cookie').split(';')[0];
}
assert.equal((await json('/api/catalog',null)).total,0);
passed.push('empty public catalog has no bootstrapped test records');
const ids=[];
for(let n=1;n<=3;n++)ids.push((await json('/api/admin','admin','PUT',{kind:'content',payload:{title:`正式发布验收${n}`,summary:'验证平台后台内容无需重复审核，并且可以按照排名连续公开展示。',cover:'/media/ja-career-fair.jpg'}})).id);
const inserted=(await json('/api/admin','admin','PUT',{kind:'content',payload:{title:'插入第二名',summary:'验证同一个栏目排名冲突时，原项目以及后续项目自动顺延。',sortOrder:2,cover:'/media/ja-career-fair.jpg'}})).id;
ids.push(inserted);
let catalog=(await json('/api/catalog?pageSize=100',null)).records.filter(row=>row.kind==='content');
assert.deepEqual(catalog.map(row=>[row.id,row.payload.sortOrder]),[[ids[0],1],[inserted,2],[ids[1],3],[ids[2],4]]);
const firstPage=await json('/api/catalog?pageSize=2&page=1',null),secondPage=await json('/api/catalog?pageSize=2&page=2',null);
assert.equal(firstPage.hasMore,true);assert.equal(secondPage.hasMore,false);
assert.deepEqual([...firstPage.records,...secondPage.records].map(row=>row.id),catalog.map(row=>row.id));
await json('/api/admin','admin','POST',{action:'configure',id:ids[2],sortOrder:1});
catalog=(await json('/api/catalog?pageSize=100',null)).records.filter(row=>row.kind==='content');
assert.deepEqual(catalog.map(row=>[row.id,row.payload.sortOrder]),[[ids[2],1],[ids[0],2],[inserted,3],[ids[1],4]]);
await call('/api/admin','admin','POST',{action:'configure',id:ids[0],sortOrder:1.5},400);
await call('/api/admin','admin','POST',{id:ids[0],decision:'approved'},400);
passed.push('direct platform publication, rank 2 collision, moving and invalid input');
const activity=(await json('/api/admin','admin','PUT',{kind:'activity',payload:{title:'平台直接发布活动',summary:'验证平台自发活动直接发布、学生立即能填写报名，而不重复进入审核队列。',cover:'/media/ja-career-fair.jpg',date:'2099-12-20',registrationFields:[{id:'name',label:'姓名',type:'text',required:true}]}})).id;
assert.equal((await json('/api/catalog?id='+activity,null)).record.payload.reviewStatus,'approved');
const reg=await json('/api/registrations','student','POST',{activityId:activity,activityTitle:'平台直接发布活动',answers:{name:'正式发布验收'}});
assert.ok((await json('/api/registrations?scope=ja','admin')).registrations.some(row=>row.id===reg.id));
passed.push('platform activity immediately visible and signup reaches platform operations');
const enterpriseId='launch-enterprise-content';
await json('/api/platform','enterprise','POST',{id:enterpriseId,kind:'content',payload:{title:'企业发布待审核',summary:'验证企业提交的内容仍然需要平台审核，通过后才展示给学生。',cover:'/media/ja-career-fair.jpg'}});
await call('/api/catalog?id='+enterpriseId,null,'GET',undefined,404);
await json('/api/admin','admin','POST',{id:enterpriseId,decision:'approved',sortOrder:2});
const pendingId='launch-enterprise-pending';
await json('/api/platform','enterprise','POST',{id:pendingId,kind:'content',payload:{title:'待审核内容删除',summary:'验证后台能够删除尚未通过审核的企业内容，并向发布方提供删除原因。',cover:'/media/ja-career-fair.jpg'}});
await call('/api/admin','student','DELETE',{id:enterpriseId,reason:'越权'},401);
await call('/api/admin','admin','DELETE',{id:enterpriseId,reason:''},400);
let existing=(await json('/api/admin','admin')).records.find(row=>row.id===enterpriseId);
await call('/api/admin','admin','DELETE',{id:enterpriseId,version:existing.version-1,reason:'过期数据'},409);
await json('/api/admin','admin','DELETE',{id:enterpriseId,version:existing.version,reason:'已完成验收，移除验收内容'});
await call('/api/catalog?id='+enterpriseId,null,'GET',undefined,404);
const archived=(await json('/api/platform?archived=1','enterprise')).records.find(row=>row.id===enterpriseId);
assert.ok(archived?.payload.moderationDeleted);
await call('/api/platform','enterprise','POST',{id:enterpriseId,kind:'content',version:archived.version,payload:{...archived.payload,reviewStatus:'draft'}},403);
await json('/api/admin','admin','DELETE',{id:pendingId,reason:'移除待审核验收内容'});
assert.ok((await json('/api/notifications','enterprise')).notifications.some(row=>row.type==='moderation-delete'));
passed.push('enterprise review retained, cross-role denial, reason/version checks and no self-restoration');
for(const id of [...ids,activity])await json('/api/admin','admin','DELETE',{id,reason:'清理隔离验收数据'});
assert.equal((await json('/api/catalog',null)).total,0);
assert.ok((await json('/api/registrations','student')).registrations.some(row=>row.id===reg.id));
passed.push('deletion across public views, contiguous ranking and historical signup preservation');
console.log(JSON.stringify({passed},null,2));

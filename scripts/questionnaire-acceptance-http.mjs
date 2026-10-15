// Writes only to a disposable loopback database, never production.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const [base, ack] = process.argv.slice(2);
if (ack !== '--disposable-database' || !['127.0.0.1','localhost'].includes(new URL(base).hostname)) throw new Error('Disposable loopback database required');
const cookies = {}, passed = [];
async function call(path,role,method='GET',body,status=200){
 const response=await fetch(base+path,{method,headers:{origin:base,'content-type':'application/json',...(cookies[role]?{cookie:cookies[role]}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await response.json();assert.equal(response.status,status,`${method} ${path}: ${JSON.stringify(data)}`);return {response,data};
}
async function json(...args){return(await call(...args)).data;}
for(const [role,payload] of [['admin',{key:'STARLIGHT-LocalAuditAdminKey-20260921-Only'}],['student',{role:'student',email:'student@starlight-hunan.cn',password:'StudentAudit2026!'}],['enterprise',{role:'enterprise',email:'enterprise@starlight-hunan.cn',password:'EnterpriseAudit2026!'}]]){
 const {response}=await call(role==='admin'?'/api/admin-auth/login':'/api/auth/login',null,'POST',payload);cookies[role]=response.headers.get('set-cookie').split(';')[0];
}
const fields=[{id:'name',label:'姓名',type:'text',required:true},{id:'email',label:'常用邮箱',type:'email',required:true},{id:'q_opinion',label:'你对循环经济有什么看法？',description:'可结合你身边的案例说明。',placeholder:'请分享你的想法',type:'textarea',required:true,maxLength:2000},{id:'q_role',label:'希望参与哪个角色？',type:'radio',required:true,options:['调研','设计','技术']},{id:'q_interest',label:'关注哪些议题？',type:'checkbox',required:true,options:['资源循环','绿色消费','企业转型']}];
const answers={name:'本地问卷验收同学',email:'questionnaire@example.test',q_opinion:'希望从校园消费和闲置资源再利用入手。'.repeat(100),q_role:'设计',q_interest:JSON.stringify(['资源循环','绿色消费'])};
await call('/api/admin', 'admin','PUT',{kind:'activity',payload:{title:'无效问卷',summary:'验证无效题目会被拦截',registrationFields:[{...fields[3],options:['只有一个']}]}},400);
for(const role of ['admin','enterprise']){
 const form=new FormData();form.append('purpose','media');form.append('file',new File([await readFile('public/media/ja-career-fair.jpg')],`questionnaire-${role}.jpg`,{type:'image/jpeg'}));
 const uploaded=await fetch(base+'/api/files',{method:'POST',headers:{origin:base,cookie:role==='admin'?cookies.admin+'; '+cookies.student:cookies[role],...(role==='admin'?{'x-starlight-scope':'admin'}:{})},body:form});const media=await uploaded.json();assert.equal(uploaded.status,200,JSON.stringify(media));
 if(role==='admin') assert.match(media.key,/^media\/admin:/,'admin scope must not borrow the student session');
 const payload={title:role==='admin'?'循环经济 · 青年共创报名':'企业创新工作坊 · 自定义问卷',summary:'了解活动介绍后，分享你的看法并选择感兴趣的方向。支持完整开放式问答与选择题。',cover:media.url,gallery:[media.url],date:'2099-12-20',place:'长沙',capacity:100,category:'主题工作坊',bodyBlocks:[{id:'intro',type:'heading',title:'活动介绍'},{id:'body',type:'text',text:'从身边的真实问题出发，探索可落地的解决方案。报名时请填写下方问卷，主办方将根据回答与你联系。'}],agenda:['了解活动背景','交流共创方案'],registrationFields:fields};
 let id;
 if(role==='admin') id=(await json('/api/admin',role,'PUT',{kind:'activity',payload})).id;
 else {id='questionnaire-enterprise-20261015';await json('/api/platform',role,'POST',{id,kind:'activity',payload});await json('/api/admin','admin','POST',{id,decision:'approved'});}
 const publicItem=(await json('/api/catalog?id='+id,null)).record;assert.deepEqual(publicItem.payload.registrationFields,fields);assert.equal(publicItem.payload.gallery[0],media.url);
 assert.equal((await fetch(base+media.url)).status,200,'uploaded public image');
 const signup=value=>({activityId:id,activityTitle:payload.title,answers:value});
 await call('/api/registrations','student','POST',signup({...answers,q_opinion:''}),400);
 await call('/api/registrations','student','POST',signup({...answers,q_role:'伪造选项'}),400);
 await call('/api/registrations','student','POST',signup({...answers,q_interest:'[1]'}),400);
 await call('/api/registrations','student','POST',signup({...answers,q_opinion:'长'.repeat(2001)}),400);
 const reg=await json('/api/registrations','student','POST',signup(answers));
 const scope=role==='admin'?'ja':'publisher';
 const read=(await json('/api/registrations?scope='+scope,role)).registrations.find(r=>r.id===reg.id);
 assert.deepEqual(read.answers,answers);assert.deepEqual(read.formFields,fields);
 assert.ok(read.answers.q_opinion.length>1200,'long response was not silently truncated');
 const studentRead=(await json('/api/registrations','student')).registrations.find(r=>r.id===reg.id);assert.deepEqual(studentRead.formFields,fields);
 if(role==='enterprise'){
   const current=(await json('/api/platform?kind=activity',role)).records.find(r=>r.id===id);
   const nextFields=[fields[0],fields[1],{...fields[4],label:'新版多选题'},fields[3],{...fields[2],label:'新版开放题'}];
   await json('/api/platform',role,'POST',{id,kind:'activity',version:current.version,payload:{...current.payload,registrationFields:nextFields}});
   const historical=(await json('/api/registrations?scope=publisher',role)).registrations.find(r=>r.id===reg.id);assert.deepEqual(historical.formFields,fields,'existing answer keeps original questions after publisher edits');
   await json('/api/admin','admin','POST',{id,decision:'approved'});
 }
 await json('/api/registrations',role,'PATCH',{scope:role==='admin'?'ja':'enterprise',registrationId:reg.id,decision:'approved',note:'已收到完整问卷回答'});
 passed.push(`${role}: image upload, publication, required/choice/length validation, student signup, original-question snapshot, publisher readback and approval`);
}
await call('/api/registrations?scope=publisher',null,'GET',undefined,401);
const preview=await json('/api/admin','admin','PUT',{kind:'activity',payload:{title:'循环经济实践报名 · 请填写你的想法',summary:'这是本地问卷测试活动：先阅读介绍，再分享观点、选择参与角色和关注议题。',cover:'/media/ja-career-fair.jpg',gallery:['/media/ja-career-fair.jpg'],date:'2099-12-20',place:'长沙',capacity:100,registrationFields:fields,bodyBlocks:[{id:'intro',type:'heading',title:'欢迎参与青年共创'},{id:'body',type:'text',text:'从校园闲置资源再利用出发，共同探索有社会价值的循环经济方案。请填写以下问卷，主办方将在报名记录中看到你的完整回答。'}]}});
passed.push(`ready for manual signup: /workspace/student/activities?item=${preview.id}`);
console.log(JSON.stringify({passed},null,2));

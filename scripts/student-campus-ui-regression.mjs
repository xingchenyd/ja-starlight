// Run against an isolated self-hosted build; never uses production credentials/data.
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {chromium} from '../work/ui-audit-tools/node_modules/playwright/index.mjs';

const base='http://127.0.0.1:3018',folder=resolve('outputs/student-campus-20261118');
await mkdir(folder,{recursive:true});
const dir=await mkdtemp(join(tmpdir(),'star-plan-student-campus-'));
const key=randomBytes(32).toString('hex'),config=join(dir,'runtime.json');
await writeFile(config,JSON.stringify({AUTH_PEPPER:randomBytes(32).toString('hex'),AUTH_SEED_ADMIN_KEY:key,AUTH_ENABLE_SAMPLE_ACCOUNTS:'false',AUTH_TRUSTED_ORIGINS:base,MAIL_PROVIDER:'disabled'}));
await writeFile(join(dir,'restore-complete.json'),'{}');
const server=spawn(process.execPath,['--experimental-sqlite','server/start.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:'3018',STARLIGHT_CONFIG_FILE:config,STARLIGHT_DATA_DIR:dir},stdio:['ignore','ignore','inherit']});
const report={passed:[],errors:[],dataDirectory:dir};let browser;
const check=(name)=>{report.passed.push(name);console.log('PASS',name)};
async function api(context,path,method='GET',data){const res=await context.request.fetch(base+path,{method,data,headers:{origin:base}});const body=await res.json();assert(res.ok(),path+': '+JSON.stringify(body));return body;}
async function nav(page,name){const toggle=page.locator('.workspace-menu-toggle');if(await toggle.isVisible()&&await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();await page.getByRole('button',{name,exact:false}).first().click();}
async function layout(page,name,width){await page.waitForTimeout(500);const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);assert(!overflow,name+' horizontal overflow');assert.equal(await page.getByText('This page couldn’t load').count(),0);await page.screenshot({path:join(folder,`${name}-${width}.png`),fullPage:true});}
try{
 for(let n=0;n<60;n++){try{if((await fetch(base+'/api/catalog')).ok)break}catch{}if(n===59)throw Error('runtime unavailable');await new Promise(r=>setTimeout(r,300));}
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const owner=await browser.newContext(),student=await browser.newContext();
 const a=await owner.newPage(),s=await student.newPage();
 for(const p of [a,s])p.on('pageerror',e=>report.errors.push({url:p.url(),message:e.message}));
 await api(owner,'/api/admin-auth/login','POST',{key});
 const email='school-flow@example.test',password='SchoolFlow2026!';
 await api(student,'/api/auth/register','POST',{role:'student',email,password});
 await api(student,'/api/auth/login','POST',{role:'student',email,password});
 await s.goto(base+'/campus');await s.getByRole('heading',{name:'合作学校尚未开通'}).waitFor();
 assert.equal(await s.getByRole('combobox',{name:'选择学校',exact:true}).count(),0);
 check('空学校目录显示开通指引，不显示无法使用的空下拉框');
 await a.goto(base+'/operations?access=owner');await nav(a,'学校与任命');
 await a.getByLabel('学校正式名称').fill('本地流程验收学校');await a.getByRole('button',{name:'创建学校',exact:true}).click();
 await a.getByRole('button',{name:'前往本校学生核验'}).waitFor();
 await s.getByRole('button',{name:'刷新学校列表'}).click();
 await s.getByRole('combobox',{name:'选择学校',exact:true}).selectOption({label:'本地流程验收学校'});
 await s.getByRole('button',{name:'申请加入学校'}).click();await s.getByText('待核验',{exact:true}).waitFor();
 check('后台创建学校后学生可刷新、选择学校并提交申请');
 await a.getByRole('button',{name:'前往本校学生核验'}).click();await a.getByRole('button',{name:'刷新',exact:true}).click();
 await a.getByRole('button',{name:'核验通过',exact:true}).click();await a.getByText('已核验',{exact:true}).waitFor();
 await nav(a,'学校与任命');await a.getByLabel('已注册或已激活的邮箱').fill(email);
 await a.getByLabel('授权角色').selectOption('campus_partner');await a.getByRole('combobox',{name:'学校',exact:true}).selectOption({label:'本地流程验收学校'});
 await a.getByRole('button',{name:'确认任命'}).click();await a.locator('.campus-line').filter({hasText:email}).waitFor();
 await s.reload();await s.getByText('✦ 平台认证星光伙伴 · 本地流程验收学校',{exact:true}).waitFor();
 assert.equal(await s.getByRole('combobox',{name:'选择学校',exact:true}).count(),0);
 await s.getByText('学校归属已核验。如需更正学校',{exact:false}).waitFor();
 const state=await api(student,'/api/campus');assert.equal(state.membership.status,'verified');assert.equal(state.roles[0].schoolId,state.membership.schoolId);
 const forbidden=await student.request.post(base+'/api/campus',{data:{action:'grant',email,role:'project_lead'},headers:{origin:base}});assert.equal(forbidden.status(),403);
 check('后台核验和任命后学生获得本校权限；已核验学校锁定且不能自授管理员权限');
 // Actual server-side records, including one without any optional arrays.
 const company=await browser.newContext();
 await api(company,'/api/auth/register','POST',{role:'enterprise',email:'company@example.test',password});
 await api(company,'/api/auth/login','POST',{role:'enterprise',email:'company@example.test',password});
 await api(company,'/api/platform','POST',{kind:'enterprise-profile',payload:{name:'本地虚构企业',industry:'互联网AI',city:'长沙',intro:'本地浏览器验收的虚构企业，不对应任何真实组织。用于核验学生机会入口和可选字段缺失时的兼容行为。',contactName:'本地测试',contactPhone:'13800000000',contactEmail:'jobs@example.test'}});
 const organization=(await api(owner,'/api/admin')).organizations.find(o=>o.name==='本地虚构企业');assert(organization);
 await api(owner,'/api/admin','POST',{action:'verify-organization',organizationId:organization.id,decision:'approved'});
 const jobIds=[];
 for(const [n,fields] of [[1,{}],[2,{tags:null,benefits:[]}],[3,{tags:['调研'],benefits:['实践']}]]){
   const row=await api(company,'/api/platform','POST',{kind:'job',payload:{title:`回归岗位${n}`,company:'本地虚构企业',summary:'缺省字段回归',jobCategory:'产品运营',contactEmail:'jobs@example.test',responsibilities:['需求分析','整理报告'],requirements:['协作沟通','记录复盘'],...fields}});jobIds.push(row.id);
 }
 for(const width of [1440,390]){
   await s.setViewportSize({width,height:900});await s.goto(base+'/workspace/student/overview');await nav(s,'实习项目机会');
   await s.locator('.student-job-list article').first().waitFor();assert.equal(await s.locator('.student-job-list article').count(),3);
   await layout(s,'opportunities',width);
   await s.getByPlaceholder('企业、岗位或技能').fill('回归岗位1');await s.waitForTimeout(450);assert.equal(await s.locator('.student-job-list article').count(),1);
   await s.getByRole('button',{name:'查看职责、要求与项目说明 →'}).click();await s.getByRole('dialog').waitFor();await layout(s,'job-detail',width);
   await s.keyboard.press('Escape');await s.getByRole('dialog').waitFor({state:'hidden'});
   await s.reload();await s.locator('.student-job-list article').waitFor();assert.equal(await s.getByPlaceholder('企业、岗位或技能').inputValue(),'回归岗位1');
   await s.getByRole('button',{name:'清空全部',exact:true}).click();assert.equal(await s.locator('.student-job-list article').count(),3);
   await s.goto(base+'/workspace/student/opportunities?item='+jobIds[1]);await s.getByRole('dialog').waitFor();await s.keyboard.press('Escape');
   await nav(s,'总览');await s.getByRole('heading',{name:'总览',exact:true}).waitFor();await nav(s,'实习项目机会');await s.locator('.student-job-list article').first().waitFor();
   await s.goBack();await s.getByRole('heading',{name:'总览',exact:true}).waitFor();await s.goForward();await s.locator('.student-job-list article').first().waitFor();
   await s.goto(base+'/opportunities/'+jobIds[0]);await s.getByRole('heading',{name:'回归岗位1',exact:true}).waitFor();await layout(s,'public-detail',width);
   await s.goto(base+'/campus');await s.getByText('✦ 平台认证星光伙伴 · 本地流程验收学校',{exact:true}).waitFor();await layout(s,'campus',width);
   check(`${width}px：导航、搜索、详情、关闭、刷新保留筛选、清空、直达、前进后退、公开详情、校园页`);
 }
 const db=new DatabaseSync(join(dir,'app.sqlite'),{readOnly:true});assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.equal(db.prepare("SELECT count(*) AS n FROM business_grants WHERE status='active' AND role='campus_partner'").get().n,1);db.close();
 check('学校归属与任命持久化到 SQLite，数据库完整性通过');
 assert.deepEqual(report.errors,[]);
}finally{await writeFile(join(folder,'report.json'),JSON.stringify(report,null,2));await browser?.close();server.kill();}

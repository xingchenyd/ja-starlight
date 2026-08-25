export type Job = {
  id:string; title:string; company:string; city:string; mode:string; duration:string; tags:string[];
  jobCategory:string;
  status:string; logo:string; logoUrl?:string; color:string; summary:string; contactEmail:string;
  responsibilities:string[]; requirements:string[]; benefits:string[]; publishedAt:string; region?:string; sortOrder?:number; featured?:boolean; degree?:string; salary?:string; salaryMin?:number; salaryMax?:number; industry?:string;
};
export type RegistrationField = {id:string;label:string;type:"text"|"tel"|"email"|"textarea";required:boolean};
export type Activity = {id:string;title:string;date:string;place:string;category:string;capacity:number;registered:number;status:string;cover:string;coverType?:"image"|"video";videoUrl?:string;summary:string;registrationFields?:RegistrationField[];region?:string;sortOrder?:number;featured?:boolean;publisher?:string};
export type ContentItem = {id:string;title:string;category:string;duration:string;level:string;summary:string;cover:string;coverType?:"image"|"video";mediaType:"article"|"video";sortOrder?:number;featured?:boolean;publisher?:string};

export const jobs:Job[]=[
 {id:"job-01",title:"工业互联网产品运营实习生",company:"三一集团",city:"长沙",mode:"线下",duration:"3个月",jobCategory:"产品运营",tags:["智能制造","产品运营","本科可投"],status:"招募中",logo:"三一",color:"#00a0af",summary:"参与工业互联网产品的用户研究、内容运营与数据复盘。",contactEmail:"starlight-sany@example.com",responsibilities:["协助产品用户研究、访谈记录与洞察整理","参与产品内容计划、活动运营及数据复盘","与设计和业务团队协作推动需求落地"],requirements:["本科或研究生在读，每周可到岗 3 天以上","对产品、智能制造或用户研究有兴趣","表达清晰，能够独立完成资料整理与基础分析"],benefits:["企业导师一对一指导","真实项目作品沉淀","JA 认证成长经历"],publishedAt:"2026.08.20",degree:"本科",salary:"150-200/天",salaryMin:150,salaryMax:200,industry:"制造业"},
 {id:"job-02",title:"新能源研发项目助理",company:"中联重科",city:"长沙",mode:"线下",duration:"4个月",jobCategory:"技术研发",tags:["新能源","研发支持","理工科"],status:"招募中",logo:"中联",color:"#8fc440",summary:"支持新能源装备项目资料研究、测试记录与跨部门协作。",contactEmail:"starlight-zoomlion@example.com",responsibilities:["整理研发项目资料与测试数据","支持样机测试、会议纪要和项目排期","协助形成阶段性技术报告"],requirements:["机械、电气、材料或相关专业在读","具备基础数据整理和技术文档能力","认真细致，有团队协作意识"],benefits:["研发流程体验","工程师导师","智能制造行业观察"],publishedAt:"2026.08.19",degree:"本科",salary:"180-240/天",salaryMin:180,salaryMax:240,industry:"能源化工环保"},
 {id:"job-03",title:"用户增长数据分析实习生",company:"芒果TV",city:"长沙",mode:"混合办公",duration:"3个月",jobCategory:"数据分析",tags:["数据分析","SQL","互联网"],status:"招募中",logo:"M",color:"#e3e24f",summary:"协助用户数据清洗、指标看板维护与专题分析。",contactEmail:"starlight-mgtv@example.com",responsibilities:["完成用户数据清洗与日常质量检查","维护核心指标看板并输出周度洞察","在导师指导下完成一项增长专题分析"],requirements:["掌握 Excel，了解 SQL 或 Python","对数字敏感，能够清晰解释分析结论","可稳定参与每周项目例会"],benefits:["内容平台数据项目","专题分析作品","结项反馈与认证"],publishedAt:"2026.08.18",degree:"本科",salary:"120-180/天",salaryMin:120,salaryMax:180,industry:"互联网AI"},
 {id:"job-04",title:"新媒体内容策划实习生",company:"湖南广播影视集团",city:"长沙",mode:"线下",duration:"4个月",jobCategory:"品牌内容",tags:["新媒体","内容策划","传播"],status:"即将截止",logo:"广电",color:"#28708b",summary:"参与青年内容选题、社交媒体运营和用户洞察。",contactEmail:"starlight-hunanmedia@example.com",responsibilities:["参与社交内容策划与选题研究","协助青年用户趋势和竞品分析","支持传播项目执行、素材管理与效果复盘"],requirements:["热爱内容、文化或传媒行业","有文字、摄影、视频或社交媒体作品","每周可到岗 4 天"],benefits:["真实内容项目","创意团队导师","作品集辅导"],publishedAt:"2026.08.17",degree:"大专",salary:"100-160/天",salaryMin:100,salaryMax:160,industry:"广告传媒文化体育"},
 {id:"job-05",title:"供应链数字化实习生",company:"蓝思科技",city:"长沙",mode:"线下",duration:"4个月",jobCategory:"智能制造",tags:["供应链","数字化","理工科"],status:"招募中",logo:"蓝思",color:"#008b9c",summary:"协助供应链数据分析、流程梳理和跨团队项目推进。",contactEmail:"starlight-lens@example.com",responsibilities:["梳理供应链流程和关键数据指标","支持数字化课题研究及解决方案验证","跟进跨团队项目进度与问题闭环"],requirements:["理工科、商科或供应链相关专业","具备结构化分析和项目推进意识","熟悉数据工具或流程建模者优先"],benefits:["供应链全景观察","数字化课题实战","企业导师反馈"],publishedAt:"2026.08.16",degree:"本科",salary:"160-220/天",salaryMin:160,salaryMax:220,industry:"电子通信半导体"},
 {id:"job-06",title:"普惠金融项目实习生",company:"长沙银行",city:"长沙",mode:"线下",duration:"3个月",jobCategory:"金融与商业",tags:["金融","项目支持","商业分析"],status:"招募中",logo:"长沙",color:"#285f74",summary:"参与普惠金融项目调研、客户需求整理与项目运营。",contactEmail:"starlight-csbank@example.com",responsibilities:["参与行业资料研究和项目数据整理","协助客户需求访谈与服务流程分析","支持项目活动执行和成果报告制作"],requirements:["金融、经济、商科或相关专业在读","具备研究、沟通或内容写作能力","认真负责，尊重客户隐私"],benefits:["金融业务观察","项目研究成果","JA 认证成长经历"],publishedAt:"2026.08.15",region:"湖南",sortOrder:20,degree:"本科",salary:"120-180/天",salaryMin:120,salaryMax:180,industry:"金融"},
 {id:"job-07",title:"青年公益项目共创助理",company:"岳阳社区创新中心",city:"岳阳",mode:"项目制",duration:"6周",jobCategory:"公益实践",tags:["公益实践","项目共创","社会责任"],status:"招募中",logo:"岳阳",color:"#48ae78",summary:"围绕青年公益和社区服务设计一次小型行动方案。",contactEmail:"starlight-yueyang@example.com",responsibilities:["参与社区需求访谈和问题定义","协助设计活动流程、物料和志愿者分工","整理项目成果并形成 JA 成长记录"],requirements:["愿意参与公益实践并尊重真实社区需求","具备基础沟通、记录和协作能力","可参与线下走访和线上复盘"],benefits:["公益项目成果","社会责任实践","JA 认证成长经历"],publishedAt:"2026.08.14",region:"湖南",sortOrder:18,featured:true,degree:"高中",salary:"0-80/天",salaryMin:0,salaryMax:80,industry:"政府公益"}
];

export const activities:Activity[]=[
 {id:"act-01",title:"长沙未来职场开放日 · 智能制造专场",date:"2026.09.12",place:"长沙 · 经开区",category:"企业参访",capacity:80,registered:63,status:"报名中",cover:"/media/ja-career-fair.jpg",summary:"走进智能制造企业，与产品、数据和研发团队面对面。",publisher:"JA China × 三一集团",registrationFields:[{id:"name",label:"姓名",type:"text",required:true},{id:"phone",label:"联系电话",type:"tel",required:true},{id:"school",label:"学校与专业",type:"text",required:true},{id:"expectation",label:"你希望在活动中收获什么？",type:"textarea",required:true}]},
 {id:"act-02",title:"从校园到职场：第一份简历工作坊",date:"2026.09.19",place:"长沙 · 岳麓区",category:"能力工作坊",capacity:120,registered:86,status:"报名中",cover:"/media/ja-student-company.jpg",summary:"把校园经历转化为清晰、可信、可投递的简历表达。",publisher:"JA China",registrationFields:[{id:"name",label:"姓名",type:"text",required:true},{id:"phone",label:"联系电话",type:"tel",required:true},{id:"email",label:"常用邮箱",type:"email",required:true},{id:"school",label:"学校、专业与年级",type:"text",required:true}]},
 {id:"act-03",title:"长沙青年可持续创新挑战赛",date:"2026.10.08",place:"长沙 · 湘江新区",category:"创新挑战",capacity:120,registered:88,status:"报名中",cover:"/media/ja-competition.jpg",summary:"围绕真实可持续议题组队探索，完成从问题到方案的创新实践。",publisher:"JA China × 企业导师团",registrationFields:[{id:"name",label:"姓名",type:"text",required:true},{id:"phone",label:"联系电话",type:"tel",required:true},{id:"school",label:"学校与专业",type:"text",required:true},{id:"experience",label:"相关经历或想解决的问题",type:"textarea",required:false}]}
];

export const contents:ContentItem[]=[
 {id:"con-01",title:"把经历写成有说服力的简历",category:"技能成长",duration:"12 分钟",level:"入门",summary:"用行动、任务和结果重新组织校园经历，完成一段更可信的简历表达。",cover:"/media/focused-learning.jpg",mediaType:"video",sortOrder:30,featured:true},
 {id:"con-02",title:"第一次职业探索：从问题出发",category:"职业探索",duration:"18 分钟",level:"入门",summary:"通过三个问题认识自己的兴趣、能力与价值取向，建立探索地图。",cover:"/og-ja-starlight.png",mediaType:"article",sortOrder:25},
 {id:"con-03",title:"企业开放日复盘：如何提出好问题",category:"活动分享",duration:"15 分钟",level:"进阶",summary:"理解活动前准备、现场观察和活动后复盘，让一次参访沉淀成可展示的成长记录。",cover:"/media/youth-collaboration.jpg",mediaType:"video",sortOrder:22},
 {id:"con-04",title:"湖南企业如何参与青年成长",category:"企业曝光",duration:"24 分钟",level:"进阶",summary:"展示企业如何通过岗位、项目、活动和反馈形成可被看见的社会责任画像。",cover:"/media/ja-student-company.jpg",mediaType:"article",sortOrder:18}
];

export const reviews=[
 {id:"rv-01",type:"企业入驻",name:"长沙智能制造示例企业",submitted:"今天 09:42",risk:"资料齐全",status:"待审核"},
 {id:"rv-02",type:"职位发布",name:"产品运营实习生 · 长沙示例企业",submitted:"昨天 16:20",risk:"邮箱待核",status:"待审核"},
 {id:"rv-03",type:"活动方案",name:"长沙未来工程师体验日",submitted:"昨天 11:05",risk:"资料齐全",status:"待审核"},
 {id:"rv-04",type:"成长内容",name:"长沙青年职业准备",submitted:"08月18日",risk:"版权待核",status:"待审核"}
];

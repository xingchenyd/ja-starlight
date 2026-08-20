export type Job = {
  id:string; title:string; company:string; city:string; mode:string; duration:string; tags:string[];
  status:string; logo:string; logoUrl?:string; color:string; summary:string; contactEmail:string;
  responsibilities:string[]; requirements:string[]; benefits:string[]; publishedAt:string;
};
export type Activity = {id:string;title:string;date:string;place:string;category:string;capacity:number;registered:number;status:string;cover:string;coverType?:"image"|"video";videoUrl?:string;summary:string};
export type ContentItem = {id:string;title:string;category:string;duration:string;level:string;summary:string;cover:string;coverType?:"image"|"video";mediaType:"article"|"video"};

export const jobs:Job[]=[
 {id:"job-01",title:"产品运营实习生",company:"英特尔中国",city:"北京",mode:"线下",duration:"3个月",tags:["科技","产品","本科可投"],status:"招募中",logo:"I",logoUrl:"/media/logos/intel.svg",color:"#0071c5",summary:"参与青年创新项目的用户研究、内容运营与数据复盘，在真实业务场景中理解产品从需求到落地的全过程。",contactEmail:"campus.cn@intel.com",responsibilities:["协助产品用户研究、访谈记录与洞察整理","参与内容计划、活动运营及数据复盘","与设计和业务团队协作推动需求落地"],requirements:["本科或研究生在读，每周可到岗 3 天以上","对产品、青年创新或用户研究有兴趣","表达清晰，能够独立完成资料整理与基础分析"],benefits:["企业导师一对一指导","真实项目作品沉淀","JA 认证成长经历"],publishedAt:"2026.08.18"},
 {id:"job-02",title:"可持续发展项目助理",company:"施耐德电气",city:"上海",mode:"混合办公",duration:"4个月",tags:["ESG","项目管理","英文"],status:"招募中",logo:"S",logoUrl:"/media/logos/schneider.svg",color:"#3dcd58",summary:"支持可持续发展项目资料研究、伙伴沟通与活动执行，参与跨部门协作并形成项目成果报告。",contactEmail:"youngtalent.cn@se.com",responsibilities:["开展可持续发展议题的桌面研究","支持伙伴沟通、会议纪要与项目排期","参与青年活动执行和成果报告制作"],requirements:["关注 ESG、社会创新或绿色发展议题","具备中英文资料阅读与基础写作能力","有项目组织或学生社团经验优先"],benefits:["混合办公","跨部门项目体验","可持续发展行业导师"],publishedAt:"2026.08.16"},
 {id:"job-03",title:"数据分析实习生",company:"戴尔科技",city:"远程",mode:"远程",duration:"3个月",tags:["数据","SQL","可远程"],status:"招募中",logo:"D",logoUrl:"/media/logos/dell.svg",color:"#0672ce",summary:"协助业务数据清洗、指标看板维护与专题分析，用清晰的数据叙事支持团队决策。",contactEmail:"earlycareer.cn@dell.com",responsibilities:["完成业务数据清洗与日常质量检查","维护核心指标看板并输出周度洞察","在导师指导下完成一项专题分析"],requirements:["掌握 Excel，了解 SQL 或 Python","对数字敏感，能够清晰解释分析结论","可稳定远程参与每周例会"],benefits:["远程协作","数据项目作品","结项反馈与认证"],publishedAt:"2026.08.14"},
 {id:"job-04",title:"品牌传播实习生",company:"欧莱雅中国",city:"上海",mode:"线下",duration:"6个月",tags:["品牌","内容","美妆"],status:"即将截止",logo:"L",color:"#22404d",summary:"参与品牌内容策划、社交媒体运营和青年消费者洞察，让创意在真实品牌项目中发生。",contactEmail:"campus.china@loreal.com",responsibilities:["参与品牌社交内容策划与选题研究","协助青年消费者趋势和竞品分析","支持传播项目执行、素材管理与效果复盘"],requirements:["热爱品牌、内容或消费行业","有文字、摄影、视频或社交媒体作品","每周可到岗 4 天，持续 6 个月"],benefits:["品牌项目经验","创意团队导师","作品集辅导"],publishedAt:"2026.08.12"},
 {id:"job-05",title:"供应链创新助理",company:"联想集团",city:"深圳",mode:"线下",duration:"4个月",tags:["供应链","分析","理工科"],status:"招募中",logo:"L",logoUrl:"/media/logos/lenovo.svg",color:"#e2231a",summary:"协助供应链创新课题分析、流程梳理和跨团队项目推进，了解全球化企业的运营体系。",contactEmail:"internship.cn@lenovo.com",responsibilities:["梳理供应链流程和关键数据指标","支持创新课题研究及解决方案验证","跟进跨团队项目进度与问题闭环"],requirements:["理工科、商科或供应链相关专业","具备结构化分析和项目推进意识","熟悉数据工具或流程建模者优先"],benefits:["全球供应链视角","创新课题实战","企业导师反馈"],publishedAt:"2026.08.10"},
 {id:"job-06",title:"青年项目研究员",company:"JA 中国",city:"北京",mode:"混合办公",duration:"3个月",tags:["教育","研究","社会创新"],status:"招募中",logo:"JA",color:"#00a0af",summary:"参与青年职业发展项目研究、项目评估与内容沉淀，直接参与公益项目的设计迭代。",contactEmail:"starlight@jachina.org",responsibilities:["参与青年需求调研和项目资料分析","协助活动评估、访谈与案例整理","把项目经验转化为可复用的成长内容"],requirements:["关注青年发展、教育或社会创新","具备研究、采访或内容写作能力","认真负责，尊重参与者隐私"],benefits:["公益项目全流程","研究成果署名","JA 认证成长经历"],publishedAt:"2026.08.08"}
];

export const activities:Activity[]=[
 {id:"act-01",title:"未来职场开放日 · 科技行业专场",date:"2026.09.12",place:"北京 · 中关村",category:"企业参访",capacity:80,registered:63,status:"报名中",cover:"/media/youth-collaboration.jpg",summary:"走进真实科技企业，与产品、数据和研发团队面对面，完成一场职业观察任务。"},
 {id:"act-02",title:"从校园到职场：第一份简历工作坊",date:"2026.09.19",place:"线上直播",category:"能力工作坊",capacity:200,registered:146,status:"报名中",cover:"/media/focused-learning.jpg",summary:"在导师带领下把校园经历转化为清晰、可信、可投递的简历表达。",videoUrl:"https://www.youtube.com/embed/ysz5S6PUM-U"},
 {id:"act-03",title:"青年可持续创新挑战赛",date:"2026.10.08",place:"上海 · 杨浦",category:"创新挑战",capacity:120,registered:88,status:"报名中",cover:"/og-ja-starlight.png",summary:"围绕真实可持续议题组队探索，在企业导师支持下完成从问题到方案的创新实践。"}
];

export const contents:ContentItem[]=[
 {id:"con-01",title:"把经历写成有说服力的简历",category:"简历与面试",duration:"12 分钟",level:"入门",summary:"用行动、任务和结果重新组织校园经历，完成一段更可信的简历表达。",cover:"/media/focused-learning.jpg",mediaType:"video"},
 {id:"con-02",title:"第一次职业探索：从问题出发",category:"职业探索",duration:"18 分钟",level:"入门",summary:"通过三个问题认识自己的兴趣、能力与价值取向，建立探索地图。",cover:"/og-ja-starlight.png",mediaType:"article"},
 {id:"con-03",title:"高质量实习的沟通与反馈",category:"职场通识",duration:"15 分钟",level:"进阶",summary:"理解职场沟通的基本结构，学会主动同步、澄清和复盘。",cover:"/media/youth-collaboration.jpg",mediaType:"video"},
 {id:"con-04",title:"案例面试：拆解商业问题",category:"简历与面试",duration:"24 分钟",level:"进阶",summary:"掌握结构化拆题、提出假设和清晰表达结论的基本方法。",cover:"/media/focused-learning.jpg",mediaType:"article"}
];

export const reviews=[
 {id:"rv-01",type:"企业入驻",name:"博世中国",submitted:"今天 09:42",risk:"资料齐全",status:"待审核"},
 {id:"rv-02",type:"职位发布",name:"数字化营销实习生 · SAP",submitted:"昨天 16:20",risk:"邮箱待核",status:"待审核"},
 {id:"rv-03",type:"活动方案",name:"未来工程师体验日 · 联想",submitted:"昨天 11:05",risk:"资料齐全",status:"待审核"},
 {id:"rv-04",type:"成长内容",name:"AI 时代的职业准备",submitted:"08月18日",risk:"版权待核",status:"待审核"}
];

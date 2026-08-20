export type Job = {id:string;title:string;company:string;city:string;mode:string;duration:string;tags:string[];status:string;applications:number;logo:string;color:string;summary:string};
export type Activity = {id:string;title:string;date:string;place:string;category:string;capacity:number;registered:number;status:string};
export type ContentItem = {id:string;title:string;category:string;duration:string;level:string;summary:string};

export const jobs:Job[]=[
 {id:"job-01",title:"产品运营实习生",company:"英特尔中国",city:"北京",mode:"线下",duration:"3个月",tags:["科技","产品","本科可投"],status:"招募中",applications:38,logo:"I",color:"#0875bd",summary:"参与青年创新项目的用户研究、内容运营与数据复盘，在真实业务场景中理解产品从需求到落地的全过程。"},
 {id:"job-02",title:"可持续发展项目助理",company:"施耐德电气",city:"上海",mode:"混合办公",duration:"4个月",tags:["ESG","项目管理","英文"],status:"招募中",applications:26,logo:"S",color:"#39a848",summary:"支持可持续发展项目资料研究、伙伴沟通与活动执行，参与跨部门协作并形成项目成果报告。"},
 {id:"job-03",title:"数据分析实习生",company:"戴尔科技",city:"远程",mode:"远程",duration:"3个月",tags:["数据","SQL","可远程"],status:"招募中",applications:42,logo:"D",color:"#1875a7",summary:"协助业务数据清洗、指标看板维护与专题分析，用清晰的数据叙事支持团队决策。"},
 {id:"job-04",title:"品牌传播实习生",company:"欧莱雅中国",city:"上海",mode:"线下",duration:"6个月",tags:["品牌","内容","美妆"],status:"即将截止",applications:61,logo:"L",color:"#b22965",summary:"参与品牌内容策划、社交媒体运营和青年消费者洞察，让创意在真实品牌项目中发生。"},
 {id:"job-05",title:"供应链创新助理",company:"联想集团",city:"深圳",mode:"线下",duration:"4个月",tags:["供应链","分析","理工科"],status:"招募中",applications:19,logo:"L",color:"#e1262f",summary:"协助供应链创新课题分析、流程梳理和跨团队项目推进，了解全球化企业的运营体系。"},
 {id:"job-06",title:"青年项目研究员",company:"JA 中国",city:"北京",mode:"混合办公",duration:"3个月",tags:["教育","研究","社会创新"],status:"招募中",applications:31,logo:"JA",color:"#00a0af",summary:"参与青年职业发展项目研究、项目评估与内容沉淀，直接参与公益项目的设计迭代。"}
];
export const activities:Activity[]=[
 {id:"act-01",title:"未来职场开放日 · 科技行业专场",date:"2026.09.12",place:"北京 · 中关村",category:"企业参访",capacity:80,registered:63,status:"报名中"},
 {id:"act-02",title:"从校园到职场：第一份简历工作坊",date:"2026.09.19",place:"线上直播",category:"能力工作坊",capacity:200,registered:146,status:"报名中"},
 {id:"act-03",title:"青年可持续创新挑战赛",date:"2026.10.08",place:"上海 · 杨浦",category:"创新挑战",capacity:120,registered:88,status:"报名中"}
];
export const contents:ContentItem[]=[
 {id:"con-01",title:"把经历写成有说服力的简历",category:"简历与面试",duration:"12 分钟",level:"入门",summary:"用行动、任务和结果重新组织校园经历，完成一段更可信的简历表达。"},
 {id:"con-02",title:"第一次职业探索：从问题出发",category:"职业探索",duration:"18 分钟",level:"入门",summary:"通过三个问题认识自己的兴趣、能力与价值取向，建立探索地图。"},
 {id:"con-03",title:"高质量实习的沟通与反馈",category:"职场通识",duration:"15 分钟",level:"进阶",summary:"理解职场沟通的基本结构，学会主动同步、澄清和复盘。"},
 {id:"con-04",title:"案例面试：拆解商业问题",category:"简历与面试",duration:"24 分钟",level:"进阶",summary:"掌握结构化拆题、提出假设和清晰表达结论的基本方法。"}
];
export const reviews=[
 {id:"rv-01",type:"企业入驻",name:"博世中国",submitted:"今天 09:42",risk:"资料齐全",status:"待审核"},
 {id:"rv-02",type:"职位发布",name:"数字化营销实习生 · SAP",submitted:"昨天 16:20",risk:"薪酬待核",status:"待审核"},
 {id:"rv-03",type:"活动方案",name:"未来工程师体验日 · 联想",submitted:"昨天 11:05",risk:"资料齐全",status:"待审核"},
 {id:"rv-04",type:"成长内容",name:"AI 时代的职业准备",submitted:"08月18日",risk:"版权待核",status:"待审核"}
];

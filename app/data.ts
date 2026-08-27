export type Job = {
  id: string;
  title: string;
  company: string;
  city: string;
  mode: string;
  duration: string;
  tags: string[];
  jobCategory: string;
  status: string;
  logo: string;
  logoUrl?: string;
  color: string;
  summary: string;
  contactEmail: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  publishedAt: string;
  region?: string;
  sortOrder?: number;
  featured?: boolean;
  degree?: string;
  salary?: string;
  salaryMin?: number;
  salaryMax?: number;
  industry?: string;
};
export type RegistrationField = {
  id: string;
  label: string;
  type: "text" | "tel" | "email" | "textarea";
  required: boolean;
};
export type RichBlock = {
  id: string;
  type:
    | "heading"
    | "text"
    | "image"
    | "gallery"
    | "video"
    | "quote"
    | "agenda"
    | "card"
    | "attachment";
  title?: string;
  text?: string;
  url?: string;
  caption?: string;
  items?: string[];
  meta?: string;
};
export type Activity = {
  id: string;
  title: string;
  date: string;
  place: string;
  category: string;
  capacity: number;
  registered: number;
  status: string;
  cover: string;
  coverType?: "image" | "video";
  videoUrl?: string;
  summary: string;
  registrationFields?: RegistrationField[];
  region?: string;
  sortOrder?: number;
  featured?: boolean;
  publisher?: string;
  agenda?: string[];
  abilityTags?: string[];
  bodyBlocks?: RichBlock[];
  gallery?: string[];
  attachments?: string[];
};
export type ContentItem = {
  id: string;
  title: string;
  category: string;
  duration: string;
  level: string;
  summary: string;
  cover: string;
  coverType?: "image" | "video";
  mediaType: "article" | "video";
  sortOrder?: number;
  featured?: boolean;
  publisher?: string;
  bodyBlocks?: RichBlock[];
  gallery?: string[];
  attachments?: string[];
  tags?: string[];
};

export const jobs: Job[] = [
  {
    id: "job-01",
    title: "工业互联网产品运营实习生",
    company: "三一集团",
    city: "长沙",
    mode: "线下",
    duration: "3个月",
    jobCategory: "产品运营",
    tags: ["智能制造", "产品运营", "本科可投"],
    status: "招募中",
    logo: "三一",
    color: "#00a0af",
    summary: "参与工业互联网产品的用户研究、内容运营与数据复盘。",
    contactEmail: "starlight-sany@example.com",
    responsibilities: [
      "协助产品用户研究、访谈记录与洞察整理",
      "参与产品内容计划、活动运营及数据复盘",
      "与设计和业务团队协作推动需求落地",
    ],
    requirements: [
      "本科或研究生在读，每周可到岗 3 天以上",
      "对产品、智能制造或用户研究有兴趣",
      "表达清晰，能够独立完成资料整理与基础分析",
    ],
    benefits: ["企业导师一对一指导", "真实项目作品沉淀", "JA 认证成长经历"],
    publishedAt: "2026.08.20",
    degree: "本科",
    salary: "150-200/天",
    salaryMin: 150,
    salaryMax: 200,
    industry: "制造业",
  },
  {
    id: "job-02",
    title: "新能源研发项目助理",
    company: "中联重科",
    city: "长沙",
    mode: "线下",
    duration: "4个月",
    jobCategory: "技术研发",
    tags: ["新能源", "研发支持", "理工科"],
    status: "招募中",
    logo: "中联",
    color: "#8fc440",
    summary: "支持新能源装备项目资料研究、测试记录与跨部门协作。",
    contactEmail: "starlight-zoomlion@example.com",
    responsibilities: [
      "整理研发项目资料与测试数据",
      "支持样机测试、会议纪要和项目排期",
      "协助形成阶段性技术报告",
    ],
    requirements: [
      "机械、电气、材料或相关专业在读",
      "具备基础数据整理和技术文档能力",
      "认真细致，有团队协作意识",
    ],
    benefits: ["研发流程体验", "工程师导师", "智能制造行业观察"],
    publishedAt: "2026.08.19",
    degree: "本科",
    salary: "180-240/天",
    salaryMin: 180,
    salaryMax: 240,
    industry: "能源化工环保",
  },
  {
    id: "job-03",
    title: "用户增长数据分析实习生",
    company: "芒果TV",
    city: "长沙",
    mode: "混合办公",
    duration: "3个月",
    jobCategory: "数据分析",
    tags: ["数据分析", "SQL", "互联网"],
    status: "招募中",
    logo: "M",
    color: "#e3e24f",
    summary: "协助用户数据清洗、指标看板维护与专题分析。",
    contactEmail: "starlight-mgtv@example.com",
    responsibilities: [
      "完成用户数据清洗与日常质量检查",
      "维护核心指标看板并输出周度洞察",
      "在导师指导下完成一项增长专题分析",
    ],
    requirements: [
      "掌握 Excel，了解 SQL 或 Python",
      "对数字敏感，能够清晰解释分析结论",
      "可稳定参与每周项目例会",
    ],
    benefits: ["内容平台数据项目", "专题分析作品", "结项反馈与认证"],
    publishedAt: "2026.08.18",
    degree: "本科",
    salary: "120-180/天",
    salaryMin: 120,
    salaryMax: 180,
    industry: "互联网AI",
  },
  {
    id: "job-04",
    title: "新媒体内容策划实习生",
    company: "湖南广播影视集团",
    city: "长沙",
    mode: "线下",
    duration: "4个月",
    jobCategory: "品牌内容",
    tags: ["新媒体", "内容策划", "传播"],
    status: "即将截止",
    logo: "广电",
    color: "#28708b",
    summary: "参与青年内容选题、社交媒体运营和用户洞察。",
    contactEmail: "starlight-hunanmedia@example.com",
    responsibilities: [
      "参与社交内容策划与选题研究",
      "协助青年用户趋势和竞品分析",
      "支持传播项目执行、素材管理与效果复盘",
    ],
    requirements: [
      "热爱内容、文化或传媒行业",
      "有文字、摄影、视频或社交媒体作品",
      "每周可到岗 4 天",
    ],
    benefits: ["真实内容项目", "创意团队导师", "作品集辅导"],
    publishedAt: "2026.08.17",
    degree: "大专",
    salary: "100-160/天",
    salaryMin: 100,
    salaryMax: 160,
    industry: "广告传媒文化体育",
  },
  {
    id: "job-05",
    title: "供应链数字化实习生",
    company: "蓝思科技",
    city: "长沙",
    mode: "线下",
    duration: "4个月",
    jobCategory: "智能制造",
    tags: ["供应链", "数字化", "理工科"],
    status: "招募中",
    logo: "蓝思",
    color: "#008b9c",
    summary: "协助供应链数据分析、流程梳理和跨团队项目推进。",
    contactEmail: "starlight-lens@example.com",
    responsibilities: [
      "梳理供应链流程和关键数据指标",
      "支持数字化课题研究及解决方案验证",
      "跟进跨团队项目进度与问题闭环",
    ],
    requirements: [
      "理工科、商科或供应链相关专业",
      "具备结构化分析和项目推进意识",
      "熟悉数据工具或流程建模者优先",
    ],
    benefits: ["供应链全景观察", "数字化课题实战", "企业导师反馈"],
    publishedAt: "2026.08.16",
    degree: "本科",
    salary: "160-220/天",
    salaryMin: 160,
    salaryMax: 220,
    industry: "电子通信半导体",
  },
  {
    id: "job-06",
    title: "普惠金融项目实习生",
    company: "长沙银行",
    city: "长沙",
    mode: "线下",
    duration: "3个月",
    jobCategory: "金融与商业",
    tags: ["金融", "项目支持", "商业分析"],
    status: "招募中",
    logo: "长沙",
    color: "#285f74",
    summary: "参与普惠金融项目调研、客户需求整理与项目运营。",
    contactEmail: "starlight-csbank@example.com",
    responsibilities: [
      "参与行业资料研究和项目数据整理",
      "协助客户需求访谈与服务流程分析",
      "支持项目活动执行和成果报告制作",
    ],
    requirements: [
      "金融、经济、商科或相关专业在读",
      "具备研究、沟通或内容写作能力",
      "认真负责，尊重客户隐私",
    ],
    benefits: ["金融业务观察", "项目研究成果", "JA 认证成长经历"],
    publishedAt: "2026.08.15",
    region: "湖南",
    sortOrder: 20,
    degree: "本科",
    salary: "120-180/天",
    salaryMin: 120,
    salaryMax: 180,
    industry: "金融",
  },
  {
    id: "job-07",
    title: "青年公益项目共创助理",
    company: "长沙社区创新中心",
    city: "长沙",
    mode: "项目制",
    duration: "6周",
    jobCategory: "公益实践",
    tags: ["公益实践", "项目共创", "社会责任"],
    status: "招募中",
    logo: "公益",
    color: "#48ae78",
    summary: "围绕青年公益和社区服务设计一次小型行动方案。",
    contactEmail: "starlight-community@example.com",
    responsibilities: [
      "参与社区需求访谈和问题定义",
      "协助设计活动流程、物料和志愿者分工",
      "整理项目成果并形成 JA 成长记录",
    ],
    requirements: [
      "愿意参与公益实践并尊重真实社区需求",
      "具备基础沟通、记录和协作能力",
      "可参与线下走访和线上复盘",
    ],
    benefits: ["公益项目成果", "社会责任实践", "JA 认证成长经历"],
    publishedAt: "2026.08.14",
    region: "湖南",
    sortOrder: 18,
    featured: true,
    degree: "高中",
    salary: "0-80/天",
    salaryMin: 0,
    salaryMax: 80,
    industry: "政府公益",
  },
  {
    id: "job-08",
    title: "AI 产品体验研究助理",
    company: "万兴科技",
    city: "长沙",
    mode: "混合办公",
    duration: "3个月",
    jobCategory: "产品运营",
    tags: ["AI工具", "用户访谈", "产品体验"],
    status: "招募中",
    logo: "万兴",
    color: "#00b8c3",
    summary: "围绕 AI 创作工具完成体验测试、用户反馈归因和竞品观察。",
    contactEmail: "starlight-wondershare@example.com",
    responsibilities: [
      "组织学生用户体验测试并整理反馈",
      "拆解同类 AI 产品功能与使用场景",
      "协助产品团队输出体验优化建议",
    ],
    requirements: [
      "本科及以上在读，关注 AI 应用或创意工具",
      "能清晰表达体验问题并记录证据",
      "有产品体验报告或内容创作作品优先",
    ],
    benefits: ["AI 产品真实课题", "产品经理导师反馈", "可沉淀研究作品集"],
    publishedAt: "2026.08.23",
    region: "湖南",
    sortOrder: 34,
    featured: true,
    degree: "本科",
    salary: "180-260/天",
    salaryMin: 180,
    salaryMax: 260,
    industry: "互联网AI",
  },
  {
    id: "job-09",
    title: "智能网联汽车市场研究实习生",
    company: "比亚迪长沙基地",
    city: "长沙",
    mode: "线下",
    duration: "3个月",
    jobCategory: "数据分析",
    tags: ["汽车", "市场研究", "数据整理"],
    status: "招募中",
    logo: "BYD",
    color: "#24404d",
    summary: "参与新能源与智能网联汽车市场资料收集、用户画像和竞品分析。",
    contactEmail: "starlight-byd@example.com",
    responsibilities: [
      "整理行业资讯、车型参数和用户反馈",
      "协助制作竞品分析表和趋势简报",
      "支持校园用户调研和访谈纪要",
    ],
    requirements: [
      "汽车、营销、统计、管理等相关方向优先",
      "熟悉 Excel，能独立完成资料归纳",
      "对新能源车和智能出行感兴趣",
    ],
    benefits: ["汽车行业观察", "市场研究作品", "企业导师点评"],
    publishedAt: "2026.08.22",
    region: "湖南",
    sortOrder: 32,
    degree: "本科",
    salary: "160-230/天",
    salaryMin: 160,
    salaryMax: 230,
    industry: "汽车",
  },
  {
    id: "job-10",
    title: "跨境电商运营实习生",
    company: "安克创新",
    city: "长沙",
    mode: "线下",
    duration: "4个月",
    jobCategory: "品牌内容",
    tags: ["跨境电商", "内容运营", "英语"],
    status: "招募中",
    logo: "安克",
    color: "#008b9c",
    summary: "支持海外内容上新、用户评论洞察与产品卖点整理。",
    contactEmail: "starlight-anker@example.com",
    responsibilities: [
      "协助整理海外平台商品内容和用户评论",
      "参与产品卖点、FAQ 与素材库维护",
      "跟进活动数据并形成复盘记录",
    ],
    requirements: [
      "英语读写能力较好，关注消费电子",
      "具备内容编辑、数据整理或社媒运营经验",
      "每周可稳定参与项目协作",
    ],
    benefits: ["跨境业务体验", "品牌内容作品", "国际化视角"],
    publishedAt: "2026.08.21",
    region: "湖南",
    sortOrder: 30,
    degree: "本科",
    salary: "150-220/天",
    salaryMin: 150,
    salaryMax: 220,
    industry: "消费批发零售",
  },
  {
    id: "job-11",
    title: "教育项目运营助理",
    company: "长沙素质教育创新中心",
    city: "长沙",
    mode: "项目制",
    duration: "8周",
    jobCategory: "项目实践",
    tags: ["教育项目", "活动运营", "学生服务"],
    status: "招募中",
    logo: "教育",
    color: "#8fc440",
    summary: "协助青少年职业启蒙课程执行、学员沟通和课后反馈整理。",
    contactEmail: "starlight-edu@example.com",
    responsibilities: [
      "支持课程现场签到、分组与材料准备",
      "整理学生反馈和导师观察记录",
      "参与课程内容迭代和活动复盘",
    ],
    requirements: [
      "高中及以上学生可参与，教育相关兴趣优先",
      "有耐心，愿意与青少年沟通协作",
      "能按时完成记录和复盘",
    ],
    benefits: ["教育实践经历", "活动执行能力", "JA 认证成长记录"],
    publishedAt: "2026.08.20",
    region: "湖南",
    sortOrder: 26,
    degree: "高中",
    salary: "60-120/天",
    salaryMin: 60,
    salaryMax: 120,
    industry: "教育培训",
  },
  {
    id: "job-12",
    title: "品牌视觉与短视频助理",
    company: "长沙青年文化传播工作室",
    city: "长沙",
    mode: "混合办公",
    duration: "2个月",
    jobCategory: "品牌内容",
    tags: ["短视频", "视觉设计", "活动记录"],
    status: "招募中",
    logo: "文化",
    color: "#28708b",
    summary: "围绕青年成长活动完成短视频剪辑、图片整理和视觉物料设计。",
    contactEmail: "starlight-creative@example.com",
    responsibilities: [
      "拍摄或整理活动图片、短视频素材",
      "协助完成公众号、海报和短视频基础设计",
      "维护案例素材库并输出传播复盘",
    ],
    requirements: [
      "有摄影、剪辑、设计或写作作品",
      "熟悉任一图片/视频工具",
      "能理解公益项目语境和品牌规范",
    ],
    benefits: ["公开传播作品", "活动现场记录", "视觉作品集"],
    publishedAt: "2026.08.19",
    region: "湖南",
    sortOrder: 24,
    degree: "大专",
    salary: "100-180/天",
    salaryMin: 100,
    salaryMax: 180,
    industry: "广告传媒文化体育",
  },
  {
    id: "job-13",
    title: "绿色供应链调研实习生",
    company: "长沙低碳产业联盟",
    city: "长沙",
    mode: "项目制",
    duration: "6周",
    jobCategory: "公益实践",
    tags: ["ESG", "绿色供应链", "调研"],
    status: "招募中",
    logo: "低碳",
    color: "#006b3f",
    summary: "围绕企业绿色供应链案例做资料研究、访谈提纲和展示材料。",
    contactEmail: "starlight-green@example.com",
    responsibilities: [
      "收集低碳供应链案例和政策资料",
      "协助设计访谈提纲并整理会议记录",
      "参与制作项目展示页和行动建议",
    ],
    requirements: [
      "关注可持续发展、ESG 或产业研究",
      "具备资料检索、结构化写作能力",
      "愿意参与线下调研和小组共创",
    ],
    benefits: ["ESG 项目作品", "行业导师反馈", "公益实践认证"],
    publishedAt: "2026.08.18",
    region: "湖南",
    sortOrder: 22,
    degree: "本科",
    salary: "80-150/天",
    salaryMin: 80,
    salaryMax: 150,
    industry: "能源化工环保",
  },
  {
    id: "job-14",
    title: "金融科技体验优化助理",
    company: "湘江新区金融科技企业",
    city: "长沙",
    mode: "线下",
    duration: "3个月",
    jobCategory: "金融与商业",
    tags: ["金融科技", "用户体验", "流程优化"],
    status: "招募中",
    logo: "湘江",
    color: "#2d7082",
    summary: "协助梳理金融科技产品流程、用户反馈和服务触点优化建议。",
    contactEmail: "starlight-fintech@example.com",
    responsibilities: [
      "体验产品流程并记录问题路径",
      "整理用户反馈、客服问题与优化优先级",
      "协助输出体验地图和流程优化建议",
    ],
    requirements: [
      "金融、信息管理、交互、商科等方向优先",
      "对服务体验和流程分析有兴趣",
      "遵守数据和用户隐私规范",
    ],
    benefits: ["金融科技实践", "体验地图作品", "导师复盘"],
    publishedAt: "2026.08.17",
    region: "湖南",
    sortOrder: 21,
    degree: "本科",
    salary: "140-210/天",
    salaryMin: 140,
    salaryMax: 210,
    industry: "金融",
  },
];

export const activities: Activity[] = [
  {
    id: "act-01",
    title: "长沙未来职场开放日 · 智能制造专场",
    date: "2026.09.12",
    place: "长沙 · 经开区",
    category: "企业参访",
    capacity: 80,
    registered: 63,
    status: "报名中",
    cover: "/media/ja-official-manufacturing.jpg",
    summary: "走进智能制造企业，与产品、数据和研发团队面对面。",
    publisher: "JA China × 三一集团",
    sortOrder: 38,
    featured: true,
    abilityTags: ["行业认知", "表达沟通", "问题解决"],
    bodyBlocks: [
      { id: "a1", type: "heading", title: "活动亮点" },
      {
        id: "a2",
        type: "text",
        text: "学生将通过企业参访、小组观察和导师对谈理解智能制造岗位的真实工作内容。",
      },
      {
        id: "a3",
        type: "image",
        url: "/media/ja-official-manufacturing.jpg",
        caption: "智造未来活动现场",
      },
      {
        id: "a4",
        type: "agenda",
        title: "企业参观｜岗位观察｜小组复盘｜导师反馈",
      },
    ],
    registrationFields: [
      { id: "name", label: "姓名", type: "text", required: true },
      { id: "phone", label: "联系电话", type: "tel", required: true },
      { id: "school", label: "学校与专业", type: "text", required: true },
      {
        id: "expectation",
        label: "你希望在活动中收获什么？",
        type: "textarea",
        required: true,
      },
    ],
  },
  {
    id: "act-02",
    title: "从校园到职场：第一份简历工作坊",
    date: "2026.09.19",
    place: "长沙 · 岳麓区",
    category: "能力工作坊",
    capacity: 120,
    registered: 86,
    status: "报名中",
    cover: "/media/ja-student-company.jpg",
    summary: "把校园经历转化为清晰、可信、可投递的简历表达。",
    publisher: "JA China",
    sortOrder: 34,
    abilityTags: ["表达沟通", "项目管理"],
    bodyBlocks: [
      { id: "a1", type: "heading", title: "你将完成什么" },
      {
        id: "a2",
        type: "text",
        text: "把活动、项目、社团和竞赛经历拆解为任务、行动、结果，形成一版可继续迭代的简历。",
      },
      {
        id: "a3",
        type: "card",
        title: "活动产出",
        text: "一份简历初稿、一段自我介绍、一次同伴反馈记录。",
      },
    ],
    registrationFields: [
      { id: "name", label: "姓名", type: "text", required: true },
      { id: "phone", label: "联系电话", type: "tel", required: true },
      { id: "email", label: "常用邮箱", type: "email", required: true },
      { id: "school", label: "学校、专业与年级", type: "text", required: true },
    ],
  },
  {
    id: "act-03",
    title: "长沙青年可持续创新挑战赛",
    date: "2026.10.08",
    place: "长沙 · 湘江新区",
    category: "创新挑战",
    capacity: 120,
    registered: 88,
    status: "报名中",
    cover: "/media/ja-competition.jpg",
    summary: "围绕真实可持续议题组队探索，完成从问题到方案的创新实践。",
    publisher: "JA China × 企业导师团",
    sortOrder: 32,
    featured: true,
    abilityTags: ["创新思维", "团队协作", "社会责任"],
    bodyBlocks: [
      { id: "a1", type: "heading", title: "挑战主题" },
      {
        id: "a2",
        type: "text",
        text: "从校园、社区和企业真实议题出发，提出可执行的小型解决方案。",
      },
      {
        id: "a3",
        type: "gallery",
        items: [
          "/media/ja-official-market.jpg",
          "/media/ja-official-coy-awards.jpg",
          "/media/ja-official-student-company.jpg",
        ],
        caption: "项目展示与学生公司现场",
      },
      {
        id: "a4",
        type: "quote",
        text: "让学生把问题意识、商业逻辑和社会责任放在同一个项目里训练。",
      },
    ],
    registrationFields: [
      { id: "name", label: "姓名", type: "text", required: true },
      { id: "phone", label: "联系电话", type: "tel", required: true },
      { id: "school", label: "学校与专业", type: "text", required: true },
      {
        id: "experience",
        label: "相关经历或想解决的问题",
        type: "textarea",
        required: false,
      },
    ],
  },
  {
    id: "act-04",
    title: "未来职业市集 · 长沙站",
    date: "2026.10.16",
    place: "长沙 · 青年活动中心",
    category: "职业市集",
    capacity: 180,
    registered: 124,
    status: "报名中",
    cover: "/media/ja-official-career-market.jpg",
    summary: "用摊位、任务卡和导师快问快答，让学生在一下午里看见不同职业路径。",
    publisher: "JA China × 合作企业",
    sortOrder: 36,
    featured: true,
    abilityTags: ["行业认知", "表达沟通"],
    bodyBlocks: [
      { id: "a1", type: "heading", title: "活动形式" },
      {
        id: "a2",
        type: "text",
        text: "学生可自由穿梭企业摊位，通过岗位任务卡了解岗位日常、能力要求与成长路径。",
      },
      {
        id: "a3",
        type: "image",
        url: "/media/ja-official-career-market.jpg",
        caption: "未来职业市集活动现场",
      },
      {
        id: "a4",
        type: "agenda",
        title: "签到领取任务卡｜企业摊位探索｜导师快问快答｜成长记录填写",
      },
    ],
    registrationFields: [
      { id: "name", label: "姓名", type: "text", required: true },
      { id: "phone", label: "联系电话", type: "tel", required: true },
      { id: "email", label: "常用邮箱", type: "email", required: true },
      { id: "school", label: "学校、专业与年级", type: "text", required: true },
      {
        id: "expectation",
        label: "最想了解的岗位类别",
        type: "textarea",
        required: false,
      },
    ],
  },
  {
    id: "act-05",
    title: "校企同频 · 创变未来人才引擎圆桌",
    date: "2026.10.22",
    place: "长沙 · 高校联合空间",
    category: "导师对谈",
    capacity: 90,
    registered: 58,
    status: "报名中",
    cover: "/media/ja-official-forum.jpg",
    summary: "邀请高校、企业与青年代表讨论未来能力、实习准备和真实项目学习。",
    publisher: "JA China × 高校伙伴",
    sortOrder: 30,
    abilityTags: ["行业认知", "表达沟通"],
    bodyBlocks: [
      { id: "a1", type: "heading", title: "为什么参加" },
      {
        id: "a2",
        type: "text",
        text: "这不是单向讲座，而是围绕学生困惑展开的圆桌交流。你可以带着具体问题来现场提问。",
      },
      {
        id: "a3",
        type: "image",
        url: "/media/ja-official-forum.jpg",
        caption: "校企同频圆桌现场",
      },
    ],
    registrationFields: [
      { id: "name", label: "姓名", type: "text", required: true },
      { id: "phone", label: "联系电话", type: "tel", required: true },
      { id: "school", label: "学校与专业", type: "text", required: true },
      {
        id: "expectation",
        label: "你想向导师提什么问题？",
        type: "textarea",
        required: true,
      },
    ],
  },
  {
    id: "act-06",
    title: "学生公司产品展销会体验营",
    date: "2026.11.02",
    place: "长沙 · 商业创新空间",
    category: "商业实践",
    capacity: 140,
    registered: 97,
    status: "报名中",
    cover: "/media/ja-official-market.jpg",
    summary: "在真实展销场景中学习用户反馈、产品表达、定价和现场运营。",
    publisher: "JA China COY 项目组",
    sortOrder: 28,
    featured: true,
    abilityTags: ["团队协作", "创新思维", "项目管理"],
    bodyBlocks: [
      { id: "a1", type: "heading", title: "现场任务" },
      {
        id: "a2",
        type: "text",
        text: "学生将观察产品摊位，记录用户反馈，并尝试用商业语言复盘一个产品方案。",
      },
      {
        id: "a3",
        type: "image",
        url: "/media/ja-official-market.jpg",
        caption: "学生公司产品展销现场",
      },
      {
        id: "a4",
        type: "card",
        title: "可形成成长记录",
        text: "用户访谈记录、产品反馈卡、现场运营复盘。",
      },
    ],
    registrationFields: [
      { id: "name", label: "姓名", type: "text", required: true },
      { id: "phone", label: "联系电话", type: "tel", required: true },
      { id: "school", label: "学校与专业", type: "text", required: true },
    ],
  },
  {
    id: "act-07",
    title: "城市功能区商业启蒙课堂",
    date: "2026.11.09",
    place: "长沙 · 合作学校",
    category: "公益课堂",
    capacity: 100,
    registered: 72,
    status: "报名中",
    cover: "/media/ja-official-classroom.jpg",
    summary: "通过城市功能区任务，让学生理解职业、商业和社区之间的连接。",
    publisher: "JA China 志愿者团队",
    sortOrder: 24,
    abilityTags: ["社会责任", "问题解决"],
    bodyBlocks: [
      { id: "a1", type: "heading", title: "课堂内容" },
      {
        id: "a2",
        type: "text",
        text: "学生在模拟城市中扮演不同角色，理解服务、生产、交换与公共责任。",
      },
      {
        id: "a3",
        type: "image",
        url: "/media/ja-official-classroom.jpg",
        caption: "JA 公益课堂现场",
      },
    ],
    registrationFields: [
      { id: "name", label: "姓名", type: "text", required: true },
      { id: "phone", label: "联系电话", type: "tel", required: true },
      { id: "school", label: "学校与专业", type: "text", required: true },
      {
        id: "experience",
        label: "是否有志愿服务经历？",
        type: "textarea",
        required: false,
      },
    ],
  },
  {
    id: "act-08",
    title: "学生公司长沙地区赛观摩日",
    date: "2026.11.16",
    place: "长沙 · 创新展示中心",
    category: "赛事观摩",
    capacity: 160,
    registered: 118,
    status: "报名中",
    cover: "/media/ja-official-coy-awards.jpg",
    summary:
      "观看学生公司路演和成果展示，学习如何把项目讲清楚、卖出去、留下来。",
    publisher: "JA China 学生公司项目",
    sortOrder: 26,
    abilityTags: ["表达沟通", "创新思维", "商业分析"],
    bodyBlocks: [
      { id: "a1", type: "heading", title: "观摩重点" },
      {
        id: "a2",
        type: "text",
        text: "从展示、路演、问答和评审反馈中理解一个学生项目如何被验证。",
      },
      {
        id: "a3",
        type: "image",
        url: "/media/ja-official-coy-awards.jpg",
        caption: "学生公司大赛颁奖与展示",
      },
    ],
    registrationFields: [
      { id: "name", label: "姓名", type: "text", required: true },
      { id: "phone", label: "联系电话", type: "tel", required: true },
      { id: "email", label: "常用邮箱", type: "email", required: true },
      { id: "school", label: "学校、专业与年级", type: "text", required: true },
    ],
  },
];

export const contents: ContentItem[] = [
  {
    id: "con-01",
    title: "把经历写成有说服力的简历",
    category: "技能成长",
    duration: "12 分钟",
    level: "入门",
    summary: "用行动、任务和结果重新组织校园经历，完成一段更可信的简历表达。",
    cover: "/media/focused-learning.jpg",
    mediaType: "video",
    sortOrder: 30,
    featured: true,
    tags: ["简历", "表达"],
    bodyBlocks: [
      { id: "c1", type: "heading", title: "从经历到证据" },
      {
        id: "c2",
        type: "text",
        text: "不要只写“参与活动”，而要写清楚你承担了什么任务、采取了什么行动，以及最后产生了什么结果。",
      },
      {
        id: "c3",
        type: "card",
        title: "简历句式",
        text: "在 XX 场景中，负责 XX，通过 XX 方法，产出 XX 结果。",
      },
    ],
  },
  {
    id: "con-02",
    title: "第一次职业探索：从问题出发",
    category: "职业探索",
    duration: "18 分钟",
    level: "入门",
    summary: "通过三个问题认识自己的兴趣、能力与价值取向，建立探索地图。",
    cover: "/og-ja-starlight.png",
    mediaType: "article",
    sortOrder: 25,
    tags: ["职业探索", "方法"],
    bodyBlocks: [
      { id: "c1", type: "heading", title: "三个问题" },
      {
        id: "c2",
        type: "text",
        text: "我对什么问题有好奇？我愿意反复练习什么能力？我希望自己的工作连接怎样的人和场景？",
      },
      {
        id: "c3",
        type: "quote",
        text: "职业探索不是一次决定，而是一组持续更新的证据。",
      },
    ],
  },
  {
    id: "con-03",
    title: "企业开放日复盘：如何提出好问题",
    category: "活动分享",
    duration: "15 分钟",
    level: "进阶",
    summary:
      "理解活动前准备、现场观察和活动后复盘，让一次参访沉淀成可展示的成长记录。",
    cover: "/media/ja-official-manufacturing.jpg",
    mediaType: "video",
    sortOrder: 22,
    tags: ["企业参访", "复盘"],
    bodyBlocks: [
      { id: "c1", type: "heading", title: "现场观察法" },
      {
        id: "c2",
        type: "text",
        text: "好的参访问题通常来自具体观察：岗位如何协作、工具如何使用、问题如何被记录和解决。",
      },
      {
        id: "c3",
        type: "image",
        url: "/media/ja-official-manufacturing.jpg",
        caption: "智能制造开放日现场",
      },
    ],
  },
  {
    id: "con-04",
    title: "湖南企业如何参与青年成长",
    category: "企业曝光",
    duration: "24 分钟",
    level: "进阶",
    summary:
      "展示企业如何通过岗位、项目、活动和反馈形成可被看见的社会责任画像。",
    cover: "/media/ja-student-company.jpg",
    mediaType: "article",
    sortOrder: 18,
    tags: ["企业参与", "社会责任"],
    bodyBlocks: [
      { id: "c1", type: "heading", title: "企业可以贡献什么" },
      {
        id: "c2",
        type: "text",
        text: "企业不仅提供岗位，还能提供真实任务、导师反馈、行业场景和学生成长证明。",
      },
      {
        id: "c3",
        type: "gallery",
        items: [
          "/media/ja-official-forum.jpg",
          "/media/ja-official-career-market.jpg",
          "/media/ja-official-planning.jpg",
        ],
        caption: "校企协同与活动现场",
      },
    ],
  },
  {
    id: "con-05",
    title: "未来职业市集复盘：如何在摊位前做有效交流",
    category: "活动分享",
    duration: "10 分钟",
    level: "入门",
    summary: "把一次职业市集变成可沉淀的探索记录：问问题、记线索、做判断。",
    cover: "/media/ja-official-career-market.jpg",
    mediaType: "article",
    sortOrder: 36,
    featured: true,
    publisher: "JA China",
    tags: ["职业市集", "沟通"],
    bodyBlocks: [
      { id: "c1", type: "heading", title: "三步记录法" },
      {
        id: "c2",
        type: "text",
        text: "第一步记录岗位名称和工作场景，第二步记录能力关键词，第三步写下自己是否愿意继续了解以及原因。",
      },
      {
        id: "c3",
        type: "image",
        url: "/media/ja-official-career-market.jpg",
        caption: "未来职业市集现场",
      },
    ],
  },
  {
    id: "con-06",
    title: "学生公司从 0 到 1：把产品卖给真实用户",
    category: "技能成长",
    duration: "16 分钟",
    level: "进阶",
    summary: "从产品定义、用户反馈到现场展销，理解学生公司项目的商业闭环。",
    cover: "/media/ja-official-market.jpg",
    mediaType: "video",
    sortOrder: 34,
    publisher: "JA China COY 项目组",
    tags: ["学生公司", "产品"],
    bodyBlocks: [
      { id: "c1", type: "heading", title: "从作品到商品" },
      {
        id: "c2",
        type: "text",
        text: "真实用户会用购买、停留、提问和反馈告诉你产品是否成立。",
      },
      {
        id: "c3",
        type: "gallery",
        items: [
          "/media/ja-official-market.jpg",
          "/media/ja-official-student-company.jpg",
          "/media/ja-official-coy-awards.jpg",
        ],
        caption: "学生公司产品展销与展示",
      },
    ],
  },
  {
    id: "con-07",
    title: "校企圆桌笔记：未来人才需要怎样的能力",
    category: "职业探索",
    duration: "20 分钟",
    level: "进阶",
    summary: "整理嘉宾对谈中关于沟通、技术理解、项目协作和持续学习的核心观点。",
    cover: "/media/ja-official-forum.jpg",
    mediaType: "article",
    sortOrder: 32,
    publisher: "JA China × 高校伙伴",
    tags: ["校企圆桌", "能力模型"],
    bodyBlocks: [
      { id: "c1", type: "heading", title: "能力不是抽象词" },
      {
        id: "c2",
        type: "text",
        text: "企业真正关心的是学生能否在不确定任务中理解问题、找到资源、推进协作并复盘结果。",
      },
      {
        id: "c3",
        type: "image",
        url: "/media/ja-official-forum.jpg",
        caption: "校企同频圆桌现场",
      },
    ],
  },
  {
    id: "con-08",
    title: "智造未来开放日：一张岗位观察卡怎么写",
    category: "职业探索",
    duration: "14 分钟",
    level: "入门",
    summary:
      "用岗位观察卡记录工作任务、协作对象、常用工具、能力要求和个人匹配度。",
    cover: "/media/ja-official-planning.jpg",
    mediaType: "article",
    sortOrder: 28,
    publisher: "JA China",
    tags: ["岗位观察", "制造业"],
    bodyBlocks: [
      { id: "c1", type: "heading", title: "观察卡结构" },
      {
        id: "c2",
        type: "text",
        text: "岗位观察卡包括：岗位任务、工作环境、协作对象、常用工具、能力要求、我是否感兴趣。",
      },
      {
        id: "c3",
        type: "image",
        url: "/media/ja-official-planning.jpg",
        caption: "学生展示未来规划主题",
      },
    ],
  },
  {
    id: "con-09",
    title: "公益课堂志愿者指南：如何和低龄学生互动",
    category: "公益实践",
    duration: "12 分钟",
    level: "入门",
    summary: "帮助志愿者理解课堂节奏、学生反馈和安全边界，让公益课堂更稳定。",
    cover: "/media/ja-official-classroom.jpg",
    mediaType: "article",
    sortOrder: 20,
    publisher: "JA China 志愿者团队",
    tags: ["公益课堂", "志愿服务"],
    bodyBlocks: [
      { id: "c1", type: "heading", title: "先建立安全感" },
      {
        id: "c2",
        type: "text",
        text: "面对低龄学生时，清晰的规则、温和的反馈和具体的鼓励比复杂讲解更重要。",
      },
      {
        id: "c3",
        type: "image",
        url: "/media/ja-official-classroom.jpg",
        caption: "JA 公益课堂现场",
      },
    ],
  },
  {
    id: "con-10",
    title: "从比赛到成长主页：如何整理一段 JA 认证经历",
    category: "简历面试",
    duration: "18 分钟",
    level: "进阶",
    summary:
      "把参与活动、项目产出、导师反馈和个人反思整理为成长时间轴里的高光证据。",
    cover: "/media/ja-official-coy-awards.jpg",
    mediaType: "article",
    sortOrder: 38,
    featured: true,
    publisher: "JA China",
    tags: ["JA认证", "成长主页"],
    bodyBlocks: [
      { id: "c1", type: "heading", title: "什么值得放进成长主页" },
      {
        id: "c2",
        type: "text",
        text: "值得展示的不是活动名称本身，而是你在活动中完成了什么、获得什么反馈、下一步如何改进。",
      },
      {
        id: "c3",
        type: "image",
        url: "/media/ja-official-coy-awards.jpg",
        caption: "学生公司大赛成果展示",
      },
    ],
  },
];

export const reviews = [
  {
    id: "rv-01",
    type: "企业入驻",
    name: "长沙智能制造示例企业",
    submitted: "今天 09:42",
    risk: "资料齐全",
    status: "待审核",
  },
  {
    id: "rv-02",
    type: "职位发布",
    name: "产品运营实习生 · 长沙示例企业",
    submitted: "昨天 16:20",
    risk: "邮箱待核",
    status: "待审核",
  },
  {
    id: "rv-03",
    type: "活动方案",
    name: "长沙未来工程师体验日",
    submitted: "昨天 11:05",
    risk: "资料齐全",
    status: "待审核",
  },
  {
    id: "rv-04",
    type: "成长内容",
    name: "长沙青年职业准备",
    submitted: "08月18日",
    risk: "版权待核",
    status: "待审核",
  },
];

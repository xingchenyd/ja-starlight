export type ResumeFields = Partial<Record<"name" | "school" | "major" | "grade" | "skills" | "awards" | "bio" | "phone" | "email", string>>;

// Extract only evidence present in the document. Missing fields stay absent so
// importing another resume cannot erase information already entered by its owner.
export function extractResumeProfile(text: string): ResumeFields {
  const lines = text.normalize("NFKC").replace(/\r/g, "\n").split("\n")
    .map(line => line.replace(/[ \t]+/g, " ").trim()).filter(Boolean);
  const source = lines.join("\n");
  const fields: ResumeFields = {};
  const label = (names: string, limit = 100) => {
    const match = source.match(new RegExp(`(?:^|[\\n |｜])(?:${names})\\s*[:：]\\s*([^\\n|｜]+)`, "i"));
    return match?.[1].split(/\s+(?=[\p{L}]{2,8}\s*[:：])/u)[0].trim().slice(0, limit);
  };
  const name = label("姓名|Name|Full name", 60);
  if (name) fields.name = name;
  else {
    const candidate = lines.slice(0, 5).find(line => /^[\p{Script=Han}·]{2,5}$/u.test(line) && !/简历|介绍|经历|教育|背景|技能|信息|求职|荣誉|奖项|能力|大学|学院|工作/.test(line));
    if (candidate) fields.name = candidate;
  }
  const school = label("学校|院校|毕业院校|就读院校|School|University")
    || source.match(/[\p{Script=Han}]{2,20}(?:大学|学院|职业技术学校|高级中学)(?:[\p{Script=Han}]{0,10}校区)?/u)?.[0];
  if (school) fields.school = school;
  const major = label("专业|所学专业|Major") || source.match(/([\p{Script=Han}]{2,16})专业/u)?.[1];
  if (major) fields.major = major;
  const grade = label("年级|毕业时间|预计毕业|毕业年份|Grade") || source.match(/20\d{2}\s*届|大[一二三四五]|研[一二三]|博[一二三四五]/)?.[0];
  if (grade) fields.grade = grade;
  const email = source.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  if (email) fields.email = email;
  const phone = source.match(/(?<!\d)(?:\+?86[- ]?)?1[3-9]\d(?:[- ]?\d){8}(?!\d)/)?.[0];
  if (phone) fields.phone = phone.replace(/[- ]/g, "");
  const sectionNames = /^(?:教育(?:背景|经历)?|工作(?:经历|经验)?|实习(?:经历|经验)?|项目(?:经历|经验)?|校园经历|社会实践|专业技能|个人技能|技能(?:特长|证书)?|获奖(?:经历|情况)?|荣誉(?:奖项)?|奖项|自我(?:评价|介绍)|个人简介|联系方式|求职意向|Education|Experience|Skills|Awards|Profile|Summary)\s*[:：]?/i;
  const section = (heading: RegExp) => {
    const index = lines.findIndex(line => heading.test(line));
    if (index < 0) return undefined;
    const first = lines[index].replace(heading, "").replace(/^\s*[:：]\s*/, "").trim();
    const body = first ? [first] : [];
    for (let i = index + 1; i < lines.length && body.length < 15; i++) {
      if (sectionNames.test(lines[i])) break;
      body.push(lines[i]);
    }
    return body.join("\n").slice(0, 2000) || undefined;
  };
  const skills = section(/^(?:专业技能|个人技能|技能(?:特长|证书)?|Skills)\s*[:：]?/i);
  const awards = section(/^(?:获奖(?:经历|情况)?|荣誉(?:奖项)?|奖项|Awards)\s*[:：]?/i);
  const bio = section(/^(?:自我(?:评价|介绍)|个人简介|Profile|Summary)\s*[:：]?/i);
  if (skills) fields.skills = skills.replace(/\n/g, "，");
  if (awards) fields.awards = awards;
  if (bio) fields.bio = bio;
  return fields;
}

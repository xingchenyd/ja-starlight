const types = new Set(["heading","text","image","gallery","video","quote","agenda","card","attachment"]);
export function validateRichBlocks(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 100) return ["正文须为最多 100 个内容区块"];
  const ids = new Set<string>();
  for (const block of value) {
    if (!block || typeof block !== "object" || Array.isArray(block) || typeof block.id !== "string" || !block.id || ids.has(block.id) || !types.has(block.type)) return ["正文区块的标识或类型不正确"];
    ids.add(block.id);
    for (const field of ["title","text","url","caption","meta"]) if (block[field] !== undefined && (typeof block[field] !== "string" || block[field].length > 15000)) return ["正文区块只能填写文字或有效媒体链接"];
    if (block.url && !/^(https?:\/\/|\/api\/files\?key=|\/media\/)/.test(block.url)) return ["正文链接仅支持 http/https 或平台上传文件"];
    if (block.items !== undefined && (!Array.isArray(block.items) || block.items.length > 24 || block.items.some((item: unknown) => typeof item !== "string" || !/^(https?:\/\/|\/api\/files\?key=|\/media\/)/.test(item)))) return ["正文图集格式不正确"];
  }
  return [];
}

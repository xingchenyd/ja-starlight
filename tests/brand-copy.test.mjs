import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { glob } from "node:fs/promises";
import test from "node:test";

test("customer-facing source uses the 星光计划 brand name", async () => {
  const paths = [];
  for await (const path of glob(["../app/**/*.tsx", "../app/data.ts", "../lib/auth/mail.ts"], { cwd: import.meta.dirname })) paths.push(path);
  const source = (await Promise.all(paths.map((path) => readFile(new URL(path, import.meta.url), "utf8")))).join("\n");
  const forbidden = [
    /JA\s+星光计划/,
    /JA\s+Star Plan/,
    /JA\s+China/i,
    /JA\s*认证/,
    /JA\s+(?:后台|活动|内容|项目团队|管理员|审核|回复|内部|管理密钥|本地测试管理员)/,
    /(?:企业与|由|向)\s*JA(?:\s|<)/,
    />JA</,
  ];
  for (const pattern of forbidden) assert.doesNotMatch(source, pattern);
  assert.match(source, /星光计划认证/);
  assert.match(source, /星光计划运营后台/);
});

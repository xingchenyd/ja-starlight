import assert from "node:assert/strict";
import { glob, readFile } from "node:fs/promises";
import test from "node:test";

test("formal product UI does not expose prototype or unfinished language", async () => {
  const paths = [];
  for await (const path of glob(["../app/**/*.tsx", "../lib/auth/mail.ts"], { cwd: import.meta.dirname })) paths.push(path);
  const source = (await Promise.all(paths.map((path) => readFile(new URL(path, import.meta.url), "utf8")))).join("\n");
  for (const pattern of [/内测版/, /测试版/, /演示账号/, /当前部署尚未启用/, /后续接入/, /TODO|TBD/]) assert.doesNotMatch(source, pattern);
  assert.doesNotMatch(source, /href=["']#["']/);
});

test("local acceptance secrets remain ignored and deployment secrets remain documented", async () => {
  const [ignore, example] = await Promise.all([
    readFile(new URL("../.gitignore", import.meta.url), "utf8"),
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
  ]);
  assert.match(ignore, /\.env\*/);
  assert.match(ignore, /\.dev\.vars/);
  assert.match(example, /AUTH_SEED_ADMIN_KEY=/);
  assert.match(example, /AUTH_PEPPER=/);
});

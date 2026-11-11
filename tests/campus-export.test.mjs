import test from 'node:test';
import assert from 'node:assert/strict';
import { registrationCsv } from '../lib/campus/export.ts';
test('signup CSV preserves historical prompts when the same question id has been renamed',()=>{
  const csv=registrationCsv([
    {activityTitle:'A',status:'approved',createdAt:'2026-11-10',answers:{q:'旧回答'},formFields:[{id:'q',label:'原始问题'}]},
    {activityTitle:'A',status:'pending',createdAt:'2026-11-10',answers:{q:'新回答'},formFields:[{id:'q',label:'改版后问题'}]},
  ]);
  assert.ok(csv.startsWith('\ufeff'));assert.match(csv,/"原始问题","改版后问题"/);assert.match(csv,/"旧回答",""/);assert.match(csv,/"","新回答"/);
});
test('signup CSV safely quotes multiline answers, blocks formula cells and keeps legacy answers',()=>{
  const csv=registrationCsv([{activityTitle:'A',status:'pending',createdAt:'2026-11-10',answers:{q:' =HYPERLINK("x")',body:'第一行\n第二行,"引号"'}}]);
  assert.ok(csv.includes("' =HYPERLINK"));assert.ok(csv.includes('第一行\n第二行,""引号""'));assert.match(csv,/"q","body"/);
});

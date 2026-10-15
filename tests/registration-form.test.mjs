import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRegistrationFields, validateRegistrationAnswer, selectedAnswers, answerLabel, answerText } from '../lib/services/registration-form.ts';
const long = { id:'q_stable',label:'你对循环经济有什么看法？',type:'textarea',required:true,maxLength:2000 };
const multi = { id:'q_choice',label:'你关注哪些方向？',type:'checkbox',required:true,options:['产品设计','运营','数据分析'] };
test('form supports open questions, single and multiple choice without changing stable ids',()=>{
  assert.deepEqual(validateRegistrationFields([long,multi,{...multi,id:'single',type:'radio'}]),[]);
  assert.ok(validateRegistrationFields([long,{...long}]).length);
  assert.ok(validateRegistrationFields([{...long,label:''}]).length);
  assert.ok(validateRegistrationFields([{...multi,options:['相同','相同']}]).length);
  assert.ok(validateRegistrationFields([{...multi,options:['只有一个']}]).length);
  assert.ok(validateRegistrationFields([{...long,maxLength:0}]).length);
  assert.ok(validateRegistrationFields([{...long,id:'__proto__'}]).length);
  assert.deepEqual(validateRegistrationFields([{...long,label:''}],true),[]);
});
test('long answers are validated without silent truncation and required questions reject blanks',()=>{
  assert.equal(validateRegistrationAnswer(long,'观点'.repeat(800)),'');
  assert.ok(validateRegistrationAnswer(long,'观点'.repeat(1001)));
  assert.ok(validateRegistrationAnswer(long,'  '));
  assert.equal(validateRegistrationAnswer({...long,required:false},''),'');
  for(const type of ['email','tel'])assert.ok(validateRegistrationAnswer({...long,type},'无效联系方式'));
});
test('choices reject forged options, malformed arrays and duplicate selections',()=>{
  assert.equal(validateRegistrationAnswer(multi,JSON.stringify(['产品设计','运营'])),'');
  for(const value of ['[]','[1]','null','"运营"','["伪造"]','["运营","运营"]'])assert.ok(validateRegistrationAnswer(multi,value),value);
  assert.ok(validateRegistrationAnswer({...multi,type:'radio'},'伪造'));
  assert.equal(validateRegistrationAnswer({...multi,type:'radio'},'产品设计'),'');
  assert.deepEqual(selectedAnswers('["运营"]'),['运营']);
  assert.equal(answerText('["运营","数据分析"]',multi),'运营、数据分析');
  assert.equal(answerLabel('q_stable',[long]),long.label);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRichBlocks } from '../lib/campus/publication.ts';
test('campus rich content rejects malformed nested values, duplicate block ids and executable links',()=>{
  assert.deepEqual(validateRichBlocks([{id:'a',type:'heading',title:'活动介绍'},{id:'b',type:'text',text:'真实的图文介绍'}]),[]);
  for(const value of [[{id:'a',type:'text',text:{nested:'object'}}],[{id:'a',type:'text'},{id:'a',type:'quote'}],[{id:'a',type:'attachment',url:'javascript:alert(1)'}],[{id:'a',type:'gallery',items:[5]}]]) assert.ok(validateRichBlocks(value).length);
  assert.deepEqual(validateRichBlocks([{id:'a',type:'image',url:'/api/files?key=media%2Fuploaded.jpg'},{id:'b',type:'attachment',url:'https://example.org/project'}]),[]);
});

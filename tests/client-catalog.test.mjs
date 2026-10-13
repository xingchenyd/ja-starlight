import test from 'node:test';
import assert from 'node:assert/strict';
import { getPublicCatalog } from '../lib/catalog/client-catalog.ts';

test('shared public catalog reads all pages, deduplicates parallel reads and refreshes after expiry',async()=>{
  const originalFetch=globalThis.fetch, originalNow=Date.now;
  const calls=[];let time=100000, generation=0;
  Date.now=()=>time;
  globalThis.fetch=async(url,options)=>{
    calls.push(url);assert.equal(options.cache,'no-store');
    const page=Number(new URL(url,'http://localhost').searchParams.get('page'));
    const count=page===1?100:3;
    return Response.json({records:Array.from({length:count},(_,index)=>({id:`${generation}:${page}:${index}`,kind:'content',payload:{title:'公开内容'}})),hasMore:page===1});
  };
  try{
    const [first,second]=await Promise.all([getPublicCatalog(),getPublicCatalog()]);
    assert.equal(first.length,103);assert.equal(second,first);assert.equal(calls.length,2);
    await getPublicCatalog();assert.equal(calls.length,2);
    time+=16000;generation=1;
    const refreshed=await getPublicCatalog();assert.equal(calls.length,4);assert.ok(refreshed[0].id.startsWith('1:'));
  }finally{globalThis.fetch=originalFetch;Date.now=originalNow;}
});

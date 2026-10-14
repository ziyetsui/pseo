import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parse } from 'node-html-parser';
import { readWebsiteViews, verifyWebsiteViewOutput } from '../website-view-output.mjs';

function sample() {
  const root='/zh-CN/prompts/website';
  const targets=[['use-case','fun','u','used_for'],['model','claude','m','designed_for'],['tool','three-js','t','built_with']];
  const views=[{id:'all',axis:'all',targetId:null,href:`${root}/views/all`,count:2},...targets.map(([axis,slug,targetId])=>({id:axis,axis,targetId,href:`${root}/views/${axis}/${slug}`,count:1}))];
  const documents=new Map([[root,parse(views.map(view=>`<a data-website-view="${view.id}" href="${view.href}" data-view-axis="${view.axis}" data-view-target="${view.targetId??''}" data-view-count="${view.count}"></a>`).join(''))]]);
  for(const view of views)documents.set(view.href,parse(`<article data-website-case="w"></article>${view.axis==='all'?'<article data-website-case="base"></article>':''}`));
  const receipt={publishedWebsiteViews:views,publishedWebsites:[{id:'w'}],publishedPrompts:[{id:'base'}]};
  const graph={nodes:targets.map(([type,slug,id])=>({type,slug,id})),edges:targets.map(([, ,to,type])=>({from:'w',to,type}))};
  return {documents,receipt,graph,root};
}
test('verifies real rendered Website view scopes against semantic edges',()=>{
  const x=sample();assert.deepEqual(readWebsiteViews(x.documents.get(x.root)),x.receipt.publishedWebsiteViews);
  assert.doesNotThrow(()=>verifyWebsiteViewOutput(x.documents,x.receipt,x.graph));
});
test('rejects a case dump, missing routes, duplicate cases and unrelated graph membership',()=>{
  for(const mutate of [
    x=>x.documents.set(x.root,parse('<article data-website-case="w"></article>')),
    x=>x.documents.delete(x.receipt.publishedWebsiteViews[1].href),
    x=>x.documents.set(x.receipt.publishedWebsiteViews[1].href,parse('<article data-website-case="w"></article><article data-website-case="w"></article>')),
    x=>x.graph.edges.splice(0,1),
  ]){const x=sample();mutate(x);assert.throws(()=>verifyWebsiteViewOutput(x.documents,x.receipt,x.graph));}
});

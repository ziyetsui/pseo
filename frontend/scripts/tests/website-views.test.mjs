import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parse } from 'node-html-parser';
import { readWebsiteViews, verifyWebsiteViewOutput, websiteValidationGraph } from '../website-view-output.mjs';

function sample() {
  const root='/zh-CN/prompts/website';
  const targets=[['use-case','fun','u','used_for'],['model','claude','m','designed_for'],['tool','three-js','t','built_with']];
  const views=[{id:'all',axis:'all',targetId:null,href:`${root}/views/all`,count:2},...targets.map(([axis,slug,targetId])=>({id:axis,axis,targetId,href:`${root}/views/${axis}/${slug}`,count:1}))];
  const documents=new Map([[root,parse(views.map(view=>`<a data-website-view="${view.id}" href="${view.href}" data-view-axis="${view.axis}" data-view-target="${view.targetId??''}" data-view-count="${view.count}"></a>`).join(''))]]);
  for(const view of views)documents.set(view.href,parse(`<article data-website-case="w"></article>${view.axis==='all'?'<article data-website-case="base"></article>':''}`));
  const receipt={publishedWebsiteViews:views,publishedWebsites:[{id:'w'}],publishedPrompts:[{id:'base'}]};
  const graph={nodes:targets.map(([type,slug,id])=>({type,slug,id})),edges:targets.map(([, ,to,type])=>({from:'w',to,type})),websiteIds:['w','base']};
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

test('rejects unrelated baseline membership even when HTML and receipt counts agree',()=>{
  const x=sample(), view=x.receipt.publishedWebsiteViews[2];
  view.count=2;
  x.documents.get(x.root).querySelector(`[href="${view.href}"]`).setAttribute('data-view-count','2');
  x.documents.set(view.href,parse('<article data-website-case="w"></article><article data-website-case="base"></article>'));
  assert.throws(()=>verifyWebsiteViewOutput(x.documents,x.receipt,x.graph));
});
test('rejects a view whose target is absent from the graph',()=>{
  const x=sample();x.graph.nodes=x.graph.nodes.filter(node=>node.id!=='t');
  assert.throws(()=>verifyWebsiteViewOutput(x.documents,x.receipt,x.graph));
});

test('recovered prompt aliases share an existing case identity in independent Website membership', () => {
  const graph = {nodes:[
    {id:'case',type:'website-case'},{id:'prompt',type:'prompt',promptOnly:true},
    {id:'source',type:'source'},{id:'website',type:'use-case',slug:'website'},
  ],edges:[
    {from:'case',to:'source',type:'sourced_from'},{from:'prompt',to:'source',type:'sourced_from'},
    {from:'case',to:'website',type:'used_for'},{from:'prompt',to:'website',type:'used_for'},
  ]};
  assert.deepEqual(websiteValidationGraph(graph,[],[]).websiteIds,['case']);
});


test('retains distinct prompts from the same original case source', () => {
 const graph={nodes:[{id:'case',type:'website-case'},{id:'first',type:'prompt',promptOnly:true},{id:'second',type:'prompt',promptOnly:true},{id:'source',type:'source'},{id:'website',type:'use-case',slug:'website'}],edges:['case','first','second'].flatMap(from=>[{from,to:'source',type:'sourced_from'},{from,to:'website',type:'used_for'}])};
 assert.deepEqual(websiteValidationGraph(graph,[],[]).websiteIds,['case','second']);
});

test('requires complete reviewed Website categories while retaining model edges and immutable source graph',()=>{
 const graph={nodes:[{id:'case',type:'website-case'},{id:'website',type:'use-case',slug:'website'},{id:'model',type:'model',slug:'claude'}],edges:[{from:'case',to:'website',type:'used_for'},{from:'case',to:'model',type:'designed_for'}]};
 const before=JSON.stringify(graph);
 const projected=websiteValidationGraph(graph,[],[],{case:'creative-coding'});
 assert.equal(JSON.stringify(graph),before);
 assert.ok(projected.edges.some(edge=>edge.from==='case'&&edge.to==='model'&&edge.type==='designed_for'));
 assert.ok(projected.edges.some(edge=>edge.from==='case'&&edge.to==='navigation:website-purpose:creative-coding'&&edge.type==='used_for'));
 for(const invalid of [{},{case:'not-a-category'},{case:'web-design',extra:'web-design'}])assert.throws(()=>websiteValidationGraph(graph,[],[],invalid),/category membership/);
});

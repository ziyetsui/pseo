#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {artifacts}=require('./engine.cjs');
function generate(input,output) {
  const raw=JSON.parse(fs.readFileSync(input,'utf8'));
  const files=artifacts(raw); // Validate before any mutation.
  fs.mkdirSync(output,{recursive:false}); // Existing directory is never overwritten.
  for (const [name,body] of Object.entries(files)) fs.writeFileSync(path.join(output,name),body,{flag:'wx'});
  return Object.keys(files);
}
module.exports={generate};
if(require.main===module){
  const [input,output,...rest]=process.argv.slice(2);
  if(!input||!output||rest.length){console.error('用法: node scripts/generate.cjs INPUT.json NEW_OUTPUT_DIRECTORY');process.exitCode=2;}
  else try{const files=generate(input,path.resolve(output));console.log(JSON.stringify({status:'ok',output:path.resolve(output),files},null,2));}
  catch(e){console.error(JSON.stringify({status:'error',message:e.message}));process.exitCode=1;}
}

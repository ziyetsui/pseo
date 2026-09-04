import path from 'node:path';
export default { agentRules:false, devIndicators:false, turbopack:{root:path.resolve('../../..')}, async redirects(){return [{source:'/zh-CN/:path*',destination:'http://127.0.0.1:3000/zh-CN/:path*',permanent:false}]},async headers(){return [{source:'/:path*',headers:[{key:'X-Robots-Tag',value:'noindex, nofollow'}]}]} };

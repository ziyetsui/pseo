import path from 'node:path';
export default {devIndicators:false,agentRules:false,turbopack:{root:path.resolve('../../..')},async headers(){return [{source:'/:path*',headers:[{key:'X-Robots-Tag',value:'noindex, nofollow'}]}]}};

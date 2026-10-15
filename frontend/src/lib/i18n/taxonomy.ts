import type {Locale} from '@/lib/catalog/types';
const supplemental:Record<string,string>={
 'Advertising':'广告','Automotive':'汽车','Beauty':'美妆','Food & beverage':'餐饮','Cinematic':'电影感','Luxury':'奢华风','Photorealistic':'写实风','Retro / vintage':'复古风','Camera movement / shot language':'镜头运动','Image-to-video':'图生视频','Multi-shot / storyboard':'分镜','Transition / morph / match cut':'转场',
 'Architecture & Spaces':'建筑与空间','Brand & Logos':'品牌与标志','Business & conversion':'商业与转化','Characters & People':'角色与人物','Charts & Infographics':'图表与信息图','Creation & development':'创作与开发','Documents & Publishing':'文档与出版','History & Classical Themes':'历史与古典主题','Illustration & Art':'插画与艺术','Learning & understanding':'学习与理解','Other Use Cases':'其他用途','Photography & Realism':'摄影与写实','Play & exploration':'互动与探索','Posters & Typography':'海报与排版','Productivity':'效率工具','Products & E-commerce':'产品与电商','Scenes & Storytelling':'场景与叙事','UI & Interfaces':'界面设计','Website':'网站',
 '3D':'三维','Architecture':'建筑','Brand':'品牌','Character':'角色','Characters':'角色','Charts':'图表','Classical':'古典','Documents':'文档','History':'历史','Illustration':'插画','Infographic':'信息图','Photography':'摄影','Poster':'海报','Product':'产品','Products':'产品','Realistic':'写实','Scenes':'场景','UI':'界面',
 'Product marketing':'产品营销','UGC':'用户生成内容','Web & motion design':'网页与动效设计','Web & motion':'网页与动效','Anime / illustrated':'动漫与插画','Sci-fi / cyberpunk':'科幻与赛博朋克','Surreal / fantasy':'超现实与奇幻','Person / portrait':'人物与肖像','Architecture / interior':'建筑与室内','Food / drink':'美食与饮品','Vehicle':'交通工具','Character consistency':'角色一致性','Lip sync / dialogue':'口型同步与对白','Text-to-video':'文生视频','3D configurator':'三维配置器','Real-time 3D':'实时三维','Scroll animation':'滚动动画',
 'Commerce':'商业','Creative':'创意','Education':'教育','Fashion':'时尚','Food':'美食','Social':'社交','Story':'故事','Tech':'科技','Travel':'旅行',
};
const modelNames:Record<string,string>={'GPT Image':'GPT IMAGE 2','GPT Image 2':'GPT IMAGE 2','Seedance':'SEEDANCE 2.0'};
export function taxonomyLabel(locale:Locale,label:string):string{
 if(modelNames[label])return modelNames[label];
 if(locale==='en')return label==='微缩摄影'?'Miniature photography':label;
 return supplemental[label]??label;
}

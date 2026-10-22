import type { Catalog, Ref } from '@/lib/catalog/types';
import { chineseTitle } from './chinese-titles';

const labels: Record<string, string> = {
  beauty: '美妆', fashion: '时尚', advertising: '广告创意', automotive: '汽车',
  'food-beverage': '餐饮美食', 'product-marketing': '产品营销', ugc: '生活记录',
  'web-motion-design': '网页与动效', website: '网站制作',
  'photography-realism': '摄影写实', 'characters-people': '人物肖像',
  'products-e-commerce': '产品电商', 'posters-typography': '海报排版',
  'other-use-cases': '更多创意', 'brand-logos': '品牌标识',
  'documents-publishing': '文档出版', 'ui-interfaces': '界面设计',
  'scenes-storytelling': '场景叙事', 'architecture-spaces': '建筑空间',
  'history-classical-themes': '历史与古典', 'charts-infographics': '图表信息',
  'illustration-art': '艺术插画', 'website-business': '商业网站',
  'website-fun': '互动体验', 'website-productivity': '效率工具',
  'website-creation': '创作开发', 'website-learning': '学习探索',
  photorealistic: '写实摄影', cinematic: '电影质感', luxury: '高级奢华',
  'retro-vintage': '复古胶片', 'sci-fi-cyberpunk': '科幻赛博',
  'anime-illustrated': '动漫插画', 'surreal-fantasy': '超现实',
  realistic: '写实', illustration: '插画', architecture: '建筑',
  scenes: '场景', documents: '文档', photography: '摄影',
  poster: '海报', charts: '图表', brand: '品牌', products: '产品',
  history: '历史', characters: '人物', character: '角色', classical: '古典',
  product: '产品', ui: '界面', infographic: '信息图', '3d': '3D',
};

// Chinese labels are a local typography sample, never written to source records.
export function localizeCatalog(catalog: Catalog): Catalog {
  const ref = (item: Ref): Ref => ({ ...item, label: labels[item.slug] ?? item.label });
  return { ...catalog,
    useCases: catalog.useCases.map(ref), styles: catalog.styles.map(ref),
    subjects: catalog.subjects.map(ref), techniques: catalog.techniques.map(ref),
    prompts: catalog.prompts.map(item => ({ ...item, title: chineseTitle(item.title), useCases: item.useCases.map(ref), styles: item.styles.map(ref), subjects: item.subjects.map(ref), techniques: item.techniques.map(ref) })),
  };
}

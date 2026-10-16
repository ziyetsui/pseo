/** Public profile observations on 2026-10-16. Likes are a snapshot, not live counts. */
export type XhsStudy = {
  id: string;
  category: string;
  categoryEn: string;
  medium: 'image' | 'video';
  title: string;
  summary: string;
  summaryEn: string;
  likes: number;
  sourceUrl: string;
  cover: string;
};

export const xhsProfile = 'https://www.xiaohongshu.com/user/profile/5927f4085e87e76da3bd2319?xsec_token=ABzYXGOY3NZSF74bxiq72CtsnPdda2Y-A8IBMBLcZ0UOQ%3D&xsec_source=pc_search';
export const xhsObservedAt = '2026-10-16';
export const xhsStudies: readonly XhsStudy[] = [
  {
    id: '69155ec50000000004016537', category: '参考图图文', categoryEn: 'Reference image study', medium: 'image',
    title: '如何让AI抄参考图？（附完整指令词）',
    summary: '水果油画风海报的参考图拆解。原帖含 11 张图，并说明风格和元素重组思路。',
    summaryEn: 'An 11-image study of fruit posters in an oil-painting style, with a reference-image workflow.',
    likes: 9348,
    sourceUrl: 'https://www.xiaohongshu.com/explore/69155ec50000000004016537?xsec_token=AB6HkyUH2-Ko2VikCxyTMF6AvKPYm9QlWd6rrTXskbv6I=&xsec_source=pc_user',
    cover: '/xhs-curation/69155ec50000000004016537.webp',
  },
  {
    id: '69fed5c4000000001a037df5', category: '旅行视频', categoryEn: 'Travel video', medium: 'video',
    title: '如何用color walk记录旅行 【附指令操作】',
    summary: '把真实旅行照片与建筑冰箱贴式图标组合成上下分区的旅行海报。',
    summaryEn: 'A travel photo workflow combining a real image with a simplified architectural souvenir motif.',
    likes: 8648,
    sourceUrl: 'https://www.xiaohongshu.com/explore/69fed5c4000000001a037df5?xsec_token=AByWN-t7930nOfydumE1L3mp19Nuo6UAbauGZw2t9Gd6U=&xsec_source=pc_user',
    cover: '/xhs-curation/69fed5c4000000001a037df5.webp',
  },
  {
    id: '6948a40c000000001e03739c', category: '信息可视化', categoryEn: 'Infographic', medium: 'image',
    title: '如何让AI做信息可视化分析图？（附指令词）',
    summary: '以北京四合院为主题的 A3 信息展板，原帖含 7 张图。',
    summaryEn: 'A seven-image A3 information-board study about the history and structure of Beijing courtyard houses.',
    likes: 5833,
    sourceUrl: 'https://www.xiaohongshu.com/explore/6948a40c000000001e03739c?xsec_token=ABWS8VlVdlOp2lJjBH4RjzMyw4eu6cI8Z7avBZwPqk918=&xsec_source=pc_user',
    cover: '/xhs-curation/6948a40c000000001e03739c.webp',
  },
  {
    id: '68f72c01000000000503879d', category: '包装异形卡', categoryEn: 'Packaging card', medium: 'image',
    title: '如何让AI做异形卡？（附详细指令词）',
    summary: '水果和蔬菜主题的电商线下异形卡物料，原帖含 18 张图，并注明灵感来源。',
    summaryEn: 'An 18-image set of die-cut fruit and vegetable cards for commerce materials, with an inspiration credit.',
    likes: 5021,
    sourceUrl: 'https://www.xiaohongshu.com/explore/68f72c01000000000503879d?xsec_token=ABkw14VpDAaE82e-LJbqvkkDpd7Ky2Qr_YAAiQlQM1vlQ=&xsec_source=pc_user',
    cover: '/xhs-curation/68f72c01000000000503879d.webp',
  },
  {
    id: '6a1ffc78000000002101bf0e', category: 'TVC 广告视频', categoryEn: 'TVC ad video', medium: 'video',
    title: '一分钟❗️学会做TVC广告【附指令】',
    summary: '以乌龙茶产品为对象的商业广告短片制作示范。',
    summaryEn: 'A short commercial-video workflow built around an oolong-tea product.',
    likes: 1114,
    sourceUrl: 'https://www.xiaohongshu.com/explore/6a1ffc78000000002101bf0e?xsec_token=AB9UB9_yuPW1re607Se4lVcXhlK-ZbC0WQkWBhCXPlHb8=&xsec_source=pc_user',
    cover: '/xhs-curation/6a1ffc78000000002101bf0e.webp',
  },
  {
    id: '6949fa24000000001f005425', category: '电商海报', categoryEn: 'Commerce poster', medium: 'image',
    title: '如何让AI做电商海报？【可商用？可分层？】',
    summary: '蔬菜主题电商海报组，原帖含 15 张图；工具与商用权利说法均为作者原帖陈述。',
    summaryEn: 'A 15-image vegetable poster set. Tool and commercial-rights claims belong to the original post.',
    likes: 232,
    sourceUrl: 'https://www.xiaohongshu.com/explore/6949fa24000000001f005425?xsec_token=AByIEZxcI2oDLQBjKsK2nVJowV714h1UlvGQSgCpMqHvw=&xsec_source=pc_user',
    cover: '/xhs-curation/6949fa24000000001f005425.webp',
  },
  {
    id: '6a1033e30000000006032363', category: '电商主图', categoryEn: 'Product hero image', medium: 'video',
    title: '30秒学会❗️一句话让AI抄亚马逊电商主图？',
    summary: '用参考图快速制作跨境电商商品主图的短视频示范。',
    summaryEn: 'A short walkthrough for adapting reference images into marketplace product hero images.',
    likes: 125,
    sourceUrl: 'https://www.xiaohongshu.com/explore/6a1033e30000000006032363?xsec_token=ABDcl8GFZQSTM8bubdxKkR1_-yJ4Hncl3U0fXlX0Ev5-Y=&xsec_source=pc_user',
    cover: '/xhs-curation/6a1033e30000000006032363.webp',
  },
  {
    id: '69f1eb7a000000001f00159f', category: '产品详情页', categoryEn: 'Product detail page', medium: 'video',
    title: '现在Image2 做产品详情页已经这样了吗！',
    summary: '以实拍产品图生成商品详情页版式的短视频，作者将其用于找风格和布局方向。',
    summaryEn: 'A video showing how a product photo can guide a detail-page layout and visual direction.',
    likes: 50,
    sourceUrl: 'https://www.xiaohongshu.com/explore/69f1eb7a000000001f00159f?xsec_token=AB4IiJLIloY7cJcbh31PmR_4knk8q2iL5gT3mp2JY2-Lg=&xsec_source=pc_user',
    cover: '/xhs-curation/69f1eb7a000000001f00159f.webp',
  },
];

export function xhsCurationHref(locale: 'en' | 'zh-CN') {
  return `/${locale}/prompts/creator-studies/zhenzhu-naicha`;
}

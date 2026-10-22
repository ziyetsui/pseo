import type { Metadata } from 'next';
import { loadCatalog } from '@/lib/catalog/server';
import { ChineseHub } from './ChineseHub';
import { localizeCatalog } from './materials';
import './proto.css';

export const metadata: Metadata = { title: 'Ancher · 中文定稿', robots: 'noindex, nofollow' };

export default async function Page() {
  if (process.env.NODE_ENV === 'production') return <main className="route-state"><h1>Not available</h1><p>This typography prototype is available in development only.</p></main>;
  const catalog = await loadCatalog('zh-CN');
  return <div className="chinese-type" lang="zh-CN"><ChineseHub catalog={localizeCatalog(catalog)} /></div>;
}

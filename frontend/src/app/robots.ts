import type { MetadataRoute } from 'next';
import { dataMode, siteOrigin } from '@/lib/catalog/config';
export const dynamic = 'force-static';
export default function robots(): MetadataRoute.Robots {
  if (dataMode() === 'visual-fixture') return { rules: { userAgent: '*', disallow: '/' } };
  return { rules: { userAgent: '*', allow: '/' }, sitemap: `${siteOrigin()}/sitemap.xml` };
}

import { loadCatalogs } from '@/lib/catalog/server';
import { Hub } from '@/components/Hub';
import { siteMetadata } from '@/site/metadata';
export async function generateMetadata() {
  const catalog = (await loadCatalogs())[0];
  if (!catalog) throw new Error('No enabled catalog locale is available');
  return siteMetadata(catalog, '/', 'The library');
}
export default async function Home() {
  const catalog = (await loadCatalogs())[0];
  if (!catalog) throw new Error('No enabled catalog locale is available');
  return <Hub catalog={catalog} />;
}

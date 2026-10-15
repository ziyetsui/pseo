/** Shared by the renderer and static Cloudflare export; no catalog or JSON imports. */
export const legacyWebsiteSlugs = ['website','web-design','web-development','web-motion-design','website-creation','website-business','website-fun','website-productivity','website-learning'] as const;
export const isWebsiteTask = (slug:string) => (legacyWebsiteSlugs as readonly string[]).includes(slug);
export function websiteLegacyPaths(locale:string):string[]{
 const root=`/${locale}/prompts`;
 return [...legacyWebsiteSlugs.map(slug=>`${root}/use-cases/${slug}`),...legacyWebsiteSlugs.filter(slug=>slug!=='website'&&slug!=='web-design').map(slug=>`${root}/website/views/use-case/${slug}`)];
}

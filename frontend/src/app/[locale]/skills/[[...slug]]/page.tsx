import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SkillsIndex, SkillDetail } from '@/components/Skills';
import { SiteHeader } from '@/components/Chrome';
import { skills, type Skill } from '@/lib/skills';
import type { Locale } from '@/lib/catalog/types';
import { availableLocales } from '@/lib/catalog/server';

type Params = { locale: string; slug?: string[] };
export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return ['en', 'zh-CN'].flatMap(locale => [
    { locale, slug: [] },
    ...skills.map(skill => ({ locale, slug: [skill.id] })),
  ]);
}

function resolve({ locale, slug = [] }: Params): { locale: Locale; skill: Skill | undefined } {
  if (locale !== 'en' && locale !== 'zh-CN') notFound();
  if (slug.length > 1) notFound();
  const skill = slug.length ? skills.find(skill => skill.id === slug[0]) : undefined;
  if (slug.length && !skill) notFound();
  return { locale, skill };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { skill } = resolve(await params);
  return {
    title: `${skill?.id ?? 'PSEO Skills'} · Prompt Library`,
    description: skill?.description ?? 'A skill for every step of programmatic SEO. Install the complete workflow into your coding agent.',
    robots: { index: false, follow: false },
  };
}

export default async function SkillsPage({ params }: { params: Promise<Params> }) {
  const { locale, skill } = resolve(await params);
  const libraryLocales = await availableLocales();
  const libraryLocale = libraryLocales.includes(locale) ? locale : libraryLocales[0];
  return <div className="prototype-magnetic"><div className="taste">
    <SiteHeader level="hub" locale={locale} libraryLocale={libraryLocale} sectionNavigation="library" activeSection="skills" />
    {skill ? <SkillDetail locale={locale} skill={skill} /> : <SkillsIndex locale={locale} />}
  </div></div>;
}

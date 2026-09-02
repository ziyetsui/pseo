import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { isPublishedLocale } from "@/lib/i18n/config";
import { localeHome, promptsHome } from "@/lib/i18n/routes";
import { JsonLd, breadcrumbList } from "@/lib/seo/json-ld";
import { buildMetadata } from "@/lib/seo/site";

const TITLE = "提示词库";
const DESCRIPTION = "按模型、用途、技巧与风格整理的图片提示词合集，每条均标注原始出处。";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublishedLocale(locale)) notFound();
  return buildMetadata({
    locale,
    title: TITLE,
    description: DESCRIPTION,
    paths: { [locale]: promptsHome(locale) },
  });
}

export default async function PromptsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isPublishedLocale(locale)) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-16">
      <JsonLd
        data={breadcrumbList([
          { name: "首页", path: localeHome(locale) },
          { name: TITLE, path: promptsHome(locale) },
        ])}
      />
      <h1 className="text-4xl font-black tracking-tighter uppercase md:text-6xl">{TITLE}</h1>
      <p className="mt-6 max-w-prose text-lg font-medium">{DESCRIPTION}</p>
      <p className="mt-6 max-w-prose border-2 border-foreground bg-surface p-4 font-medium shadow-hard-sm md:border-4">
        提示词列表尚未接入内容仓库，本页面暂不展示条目数量或统计数字。
      </p>
    </div>
  );
}

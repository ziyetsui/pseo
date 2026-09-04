/** Shared, serializable UI model. API DTOs remain generated separately. */
export type DataMode = "visual-fixture" | "public-api";
export type Locale = "zh-CN" | "en";
export type Axis = "model" | "useCase" | "technique" | "style" | "subject";

export interface Ref {
  id: string;
  slug: string;
  label: string;
  href: string;
  count: number;
  description?: string;
  officialUrl?: string | null;
  seo?: {
    title: string;
    description: string;
    canonicalUrl: string;
    hreflang: Record<string, string>;
    robots: "index,follow" | "noindex,nofollow";
  };
  localeVariants?: { locale: string; slug: string; href: string }[];
}

export interface Media {
  id: string;
  kind: "image" | "video";
  src: string;
  alt: string;
  width: number | null;
  height: number | null;
  poster: string | null;
  label: string | null;
}

export interface Variable {
  token: string;
  label: string;
  defaultValue: string;
  options: string[];
  note: string | null;
  required: boolean;
}

export interface Prompt {
  id: string;
  slug: string;
  href: string;
  locale: Locale;
  title: string;
  summary: string;
  prompt: string;
  /** The supplied text is an editable adaptation, not a word-for-word source quotation. */
  editableTemplate?: boolean;
  language: string;
  kind: "image" | "video" | "text" | "other";
  models: Ref[];
  useCases: Ref[];
  techniques: Ref[];
  styles: Ref[];
  subjects: Ref[];
  handle: string;
  creatorRef?: { id: string; slug: string; label: string } | null;
  img: string | null;
  media: Media[];
  likes: number | null;
  saves: number | null;
  views: number | null;
  highValue: boolean;
  score: number | null;
  publishedAt: string | null;
  variables: Variable[];
  steps: { order: number; title: string; body: string }[];
  requiredInputs: string[];
  optionalInputs: string[];
  parameters: { label: string; value: string }[];
  source: { url: string; platform: string; observedAt: string | null };
  evidence: { type: string; url: string | null; confidence: number | null }[];
  actions: { canCopy: boolean; tryUrl: string | null };
  localeVariants: { locale: string; slug: string; href: string }[];
  seo: { title: string; description: string; canonicalUrl: string | null; robots: string; hreflang: Record<string, string> };
  /** Source-record revision from PromptDetail.revision, distinct from Catalog.revision. */
  revision: string;
  /** Static prototype placement only; never used as a rights/publication decision. */
  appearsOn: ("l1" | "l2" | "l3" | "l4")[];
  featuredOn: ("l1" | "l2")[];
  /** Exact inputs to backend/application/queries.py ordering; never a popularity claim. */
  ranking?: { value: number; featured: boolean; searchText: string; metricsObservedAt: string };
}

export interface Collection extends Ref {
  subtitle: string;
  promptIds: string[];
}

export interface Creator extends Ref {
  handle: string;
  url: string;
  avatarUrl: string | null;
}

export interface Catalog {
  locale: Locale;
  mode: DataMode;
  revision: string;
  observedAt: string | null;
  prompts: Prompt[];
  models: Ref[];
  useCases: Ref[];
  techniques: Ref[];
  styles: Ref[];
  subjects: Ref[];
  collections: Collection[];
  creators: Creator[];
  locales: { locale: string; displayName: string; enabled: boolean; href: string }[];
}

export type PromptSort = "relevance" | "trending" | "value" | "newest";
export interface Filters {
  q?: string;
  model?: readonly string[];
  useCase?: readonly string[];
  technique?: readonly string[];
  style?: readonly string[];
  subject?: readonly string[];
  contentType?: readonly string[];
  creator?: readonly string[];
  collection?: string;
  sort?: PromptSort;
  window?: "7d" | "30d" | "all";
}

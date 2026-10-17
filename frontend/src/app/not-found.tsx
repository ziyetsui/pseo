/* eslint-disable @next/next/no-html-link-for-pages -- Static catalog navigation omits tree-only RSC prefetch files. */
export default function NotFound() {
  return <main className="route-state"><p>404</p><h1>This page is not in the library.</h1><p>The link may have changed, or this version is no longer available.</p><a href="/">Browse the prompt library →</a></main>;
}

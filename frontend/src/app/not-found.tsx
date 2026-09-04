import Link from 'next/link';
export default function NotFound() {
  return <main className="route-state"><p>404</p><h1>This page is not in the library.</h1><p>The link may have changed, or this version is no longer available.</p><Link href="/">Browse the prompt library →</Link></main>;
}

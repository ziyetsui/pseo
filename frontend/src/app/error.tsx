"use client";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="route-state"><h1>The library could not be loaded.</h1><p>Please try again in a moment.</p><button onClick={reset} type="button">Try again</button></main>;
}

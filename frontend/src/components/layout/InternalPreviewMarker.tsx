interface InternalPreviewMarkerProps {
  mode: "fixture" | "cms-preview";
  revision: string;
}

function shortRevision(revision: string): string {
  return revision.startsWith("sha256:") ? revision.slice(7, 19) : revision.slice(0, 12);
}

/** Visible only in explicitly enabled CMS preview mode. */
export function InternalPreviewMarker({ mode, revision }: InternalPreviewMarkerProps) {
  if (mode !== "cms-preview") return null;

  return (
    <aside
      aria-label="内部 CMS 预览"
      role="status"
      data-internal-preview
      className="fixed right-3 bottom-3 z-50 rounded-full border border-amber-950 bg-amber-300 px-3 py-1 text-xs font-black tracking-wide text-amber-950 shadow-lg"
    >
      CMS Preview · {shortRevision(revision)}
    </aside>
  );
}

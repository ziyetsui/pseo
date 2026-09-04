"use client";

import { useCallback, useLayoutEffect, useRef, type RefObject } from "react";
import { placeholderParts } from "@/lib/catalog/placeholders";

/** The textarea owns editing; its inert mirror adds color without changing the draft. */
export function HighlightedPromptInput({ inputRef, value, placeholder, onChange }: {
  inputRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const mirror = useRef<HTMLDivElement>(null);
  const sync = useCallback(() => {
    const input = inputRef.current;
    const layer = mirror.current;
    if (!input || !layer) return;
    layer.style.width = `${input.clientWidth}px`;
    layer.style.height = `${input.clientHeight}px`;
    layer.scrollTop = input.scrollTop;
    layer.scrollLeft = input.scrollLeft;
  }, [inputRef]);
  useLayoutEffect(sync, [value, sync]);
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const observer = new ResizeObserver(sync);
    observer.observe(input);
    return () => observer.disconnect();
  }, [inputRef, sync]);

  return <div className="msh-editor">
    <div className="msh-highlight" ref={mirror} aria-hidden="true">
      {placeholderParts(value).map((part, index) => part.token
        ? <mark className="prompt-placeholder" key={index}>{part.text}</mark>
        : part.text)}
      {/* Match the native input's final empty line without changing its value. */}
      {value.endsWith("\n") ? "\n" : null}
    </div>
    <textarea ref={inputRef} className="msh-input" id="gen4" rows={3} value={value}
      placeholder={placeholder} spellCheck={false} onScroll={sync}
      onChange={event => onChange(event.target.value)} />
  </div>;
}

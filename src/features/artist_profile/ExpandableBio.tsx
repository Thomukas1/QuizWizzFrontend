import React, { useRef, useState } from 'react';

export default function ExpandableBio({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  React.useEffect(() => {
    const el = textRef.current;
    if (el) setClamped(el.scrollHeight > el.clientHeight);
  }, [text]);

  return (
    <div className="text-sm leading-relaxed text-left">
      <p
        ref={textRef}
        className={expanded ? '' : 'line-clamp-2'}
      >
        {text}
      </p>
      {clamped && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-accent mt-1"
        >
          {expanded ? 'show less' : 'show more'}
        </button>
      )}
    </div>
  );
}
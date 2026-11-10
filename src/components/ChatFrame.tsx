import { useEffect, useRef, useState, type ReactNode } from "react";

function composerLift() {
  const nav = document.querySelector("nav");
  const box = nav?.getBoundingClientRect();
  const navHeight = box && box.height > 0 && box.top < window.innerHeight ? Math.round(box.height) : 0;
  const viewport = window.visualViewport;
  const keyboard = viewport
    ? Math.max(0, Math.round(window.innerHeight - viewport.offsetTop - viewport.height))
    : 0;
  if (keyboard > 0) return keyboard;
  return navHeight > 0 ? navHeight : 12;
}

export function ChatFrame({
  header,
  children,
  composer,
  scrollKey,
}: {
  header: ReactNode;
  children: ReactNode;
  composer?: ReactNode;
  scrollKey?: string | number;
}) {
  const [bottom, setBottom] = useState(68);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => setBottom(composerLift());
    update();
    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [scrollKey, bottom]);

  return (
    <div
      className="fixed inset-x-0 top-14 z-20 mx-auto flex w-full max-w-xl flex-col bg-background px-4"
      style={{ bottom }}
    >
      <div className="shrink-0 pb-2 pt-3">{header}</div>
      <div ref={scroller} className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pb-3">
        {children}
      </div>
      {composer ? (
        <div className="shrink-0 border-t border-border/60 bg-background py-2">{composer}</div>
      ) : null}
    </div>
  );
}

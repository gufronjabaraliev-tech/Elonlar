import { type MouseEvent, type PointerEvent, type ReactNode, useRef } from "react";

import { cn } from "@/lib/utils";

type Drag = {
  down: boolean;
  x: number;
  y: number;
  left: number;
  moved: boolean;
  lastX: number;
  lastT: number;
  vx: number;
};

function slideNodes(el: HTMLElement) {
  return [...el.children].filter((node): node is HTMLElement => node instanceof HTMLElement);
}

function closestSlide(el: HTMLElement, slides: HTMLElement[], scrollLeft: number) {
  const viewMid = scrollLeft + el.clientWidth / 2;
  let index = 0;
  let best = Infinity;
  slides.forEach((slide, i) => {
    const mid = slide.offsetLeft + slide.offsetWidth / 2;
    const dist = Math.abs(mid - viewMid);
    if (dist < best) {
      best = dist;
      index = i;
    }
  });
  return index;
}

function settle(el: HTMLElement, velocity: number, startLeft: number) {
  const slides = slideNodes(el);
  if (slides.length < 2) {
    el.style.scrollSnapType = "";
    el.style.scrollBehavior = "";
    return;
  }
  const startIndex = closestSlide(el, slides, startLeft);
  let index = closestSlide(el, slides, el.scrollLeft);
  if (velocity < -0.4 && index === startIndex && index < slides.length - 1) index += 1;
  if (velocity > 0.4 && index === startIndex && index > 0) index -= 1;
  const slide = slides[index];
  if (!slide) return;
  const left = slide.offsetLeft - (el.clientWidth - slide.offsetWidth) / 2;
  const max = Math.max(0, el.scrollWidth - el.clientWidth);
  const target = Math.max(0, Math.min(left, max));
  el.style.scrollBehavior = "smooth";
  el.scrollTo({ left: target, behavior: "smooth" });
  const restore = () => {
    el.style.scrollSnapType = "";
    el.style.scrollBehavior = "";
    el.removeEventListener("scrollend", restore);
  };
  el.addEventListener("scrollend", restore);
  window.setTimeout(restore, 420);
}

export function SideScroll({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag>({ down: false, x: 0, y: 0, left: 0, moved: false, lastX: 0, lastT: 0, vx: 0 });

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const el = ref.current;
    if (!el || el.scrollWidth <= el.clientWidth + 1) return;
    const now = performance.now();
    drag.current = {
      down: true,
      x: event.clientX,
      y: event.clientY,
      left: el.scrollLeft,
      moved: false,
      lastX: event.clientX,
      lastT: now,
      vx: 0,
    };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    const state = drag.current;
    if (!el || !state.down) return;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    if (!state.moved) {
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        state.down = false;
        return;
      }
      state.moved = true;
      el.style.scrollSnapType = "none";
      el.style.scrollBehavior = "auto";
      try {
        el.setPointerCapture(event.pointerId);
      } catch {
        /* pointer allaqachon tugagan bo'lishi mumkin */
      }
    }
    const now = performance.now();
    const dt = now - state.lastT;
    if (dt > 0) state.vx = (event.clientX - state.lastX) / dt;
    state.lastX = event.clientX;
    state.lastT = now;
    el.scrollLeft = state.left - dx;
  }

  function onPointerEnd() {
    const el = ref.current;
    const moved = drag.current.moved;
    const velocity = drag.current.vx;
    drag.current.down = false;
    if (el && moved) settle(el, velocity, drag.current.left);
    if (!moved) return;
    const stopClick = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      drag.current.moved = false;
      window.removeEventListener("click", stopClick, true);
    };
    window.addEventListener("click", stopClick, true);
    window.setTimeout(() => {
      window.removeEventListener("click", stopClick, true);
      drag.current.moved = false;
    }, 400);
  }

  function onClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (!drag.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
    drag.current.moved = false;
  }

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onClickCapture={onClickCapture}
      className={cn(
        "relative flex w-full min-w-0 cursor-grab touch-pan-y select-none overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] active:cursor-grabbing [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}

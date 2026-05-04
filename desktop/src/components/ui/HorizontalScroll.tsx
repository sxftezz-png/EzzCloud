import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from '../../lib/icons';

interface HorizontalScrollProps {
  children: ReactNode;
  className?: string;
}

export function HorizontalScroll({ children, className = '' }: HorizontalScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  // Пересчитываем видимость стрелок раз в скролл/resize. Через ResizeObserver
  // ловим момент когда детей подгрузили (skeleton -> карточки) и появился overflow.
  const recompute = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanLeft(el.scrollLeft > 0);
    setCanRight(max > 0 && el.scrollLeft < max - 1);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    recompute();
    el.addEventListener('scroll', recompute, { passive: true });
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    for (const c of Array.from(el.children)) ro.observe(c);

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      const movingRight = e.deltaY > 0;
      const atLeft = el.scrollLeft <= 0;
      const atRight = el.scrollLeft >= max - 1;
      if ((movingRight && atRight) || (!movingRight && atLeft)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      el.removeEventListener('scroll', recompute);
      el.removeEventListener('wheel', onWheel);
      ro.disconnect();
    };
  }, [recompute]);

  const scrollBy = useCallback((dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    // ~85% видимой ширины — прокручиваем почти страницу, но оставляем «крайнюю» карточку видимой.
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  }, []);

  return (
    <div className="relative group/hscroll">
      <div ref={ref} className={`flex gap-4 overflow-x-auto pb-2 scrollbar-hide ${className}`}>
        {children}
      </div>
      {canLeft && (
        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => scrollBy(-1)}
          className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/55 hover:bg-black/75 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white shadow-lg shadow-black/40 transition-all duration-200 opacity-0 group-hover/hscroll:opacity-100 cursor-pointer outline-none"
        >
          <ChevronLeft size={18} />
        </button>
      )}
      {canRight && (
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => scrollBy(1)}
          className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/55 hover:bg-black/75 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white shadow-lg shadow-black/40 transition-all duration-200 opacity-0 group-hover/hscroll:opacity-100 cursor-pointer outline-none"
        >
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
}

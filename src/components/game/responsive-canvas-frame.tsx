"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

const ScaledCanvasContext = createContext(false);

export function canvasFrameLayout(width: number, height: number, minWidth: number, minHeight: number, inherited = false) {
  const scale = inherited ? 1 : height < 420 ? 0.8 : height < 540 ? 0.9 : 1;
  const contentWidth = Math.max(minWidth, width / scale);
  const contentHeight = Math.max(minHeight, height / scale);
  return { scale, contentWidth, contentHeight, width: contentWidth * scale, height: contentHeight * scale };
}

/** Scale the canvas and its native controls together; scroll content that cannot fit readably. */
export function ResponsiveCanvasFrame({ children, overlay = true, minWidth = 320, minHeight = 360, narrowMinHeight = minHeight }: {
  children: ReactNode; overlay?: boolean; minWidth?: number; minHeight?: number; narrowMinHeight?: number;
}) {
  const inherited = useContext(ScaledCanvasContext);
  const hostRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 960, height: 600 });
  useEffect(() => {
    const host = hostRef.current; if (!host) return;
    const update = () => setSize({ width: host.clientWidth, height: host.clientHeight });
    const observer = new ResizeObserver(update); observer.observe(host); update();
    return () => observer.disconnect();
  }, []);
  const initial = canvasFrameLayout(size.width, size.height, minWidth, minHeight, inherited);
  const layout = canvasFrameLayout(size.width, size.height, minWidth, initial.contentWidth < 640 ? narrowMinHeight : minHeight, inherited);
  return <div ref={hostRef} className={`${overlay ? "absolute inset-0 z-30" : "relative h-full w-full"} overflow-auto overscroll-contain`}>
    <div className="relative" style={{ width: layout.width, height: layout.height }}>
      <div className="absolute top-0 left-0 origin-top-left" style={{ width: layout.contentWidth, height: layout.contentHeight, transform: `scale(${layout.scale})` }}>
        <ScaledCanvasContext.Provider value={true}>{children}</ScaledCanvasContext.Provider>
      </div>
    </div>
  </div>;
}

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { prepareWithSegments, layoutNextLine } from "@chenglou/pretext";
import type { PreparedTextWithSegments, LayoutCursor } from "@chenglou/pretext";
import Companion from "@/components/Companion";
import EyePlacementTool from "@/components/EyePlacementTool";
import type { EyeCalibrationPair } from "@/components/EyePlacementTool";
import {
  buildShapeProfile,
  getShapeBlockedInterval,
  type ShapeProfile,
} from "@/lib/image-shape";

// --- Article content ---
const TITLE = "The Secret Life of Trees";
const SUBTITLE = "How forests communicate through an underground network";
const BODY = [
  "Beneath the forest floor lies a vast network of fungal threads connecting the roots of trees. Scientists call it the mycorrhizal network — but it has earned a more poetic name: the Wood Wide Web. Through this network, trees share nutrients, send chemical warnings about insect attacks, and even nurture their young.",
  "A mother tree — the oldest and tallest in a grove — can recognize her own seedlings among the crowd. She sends them extra carbon through the fungal network, giving them a better chance of survival in the shaded understory. When a tree is dying, it dumps its resources into the network, feeding its neighbors one final time.",
  "This discovery has reshaped how ecologists think about competition in forests. Trees are not isolated individuals fighting for sunlight. They are members of a community, cooperating through shared infrastructure that is invisible to the naked eye.",
  "The implications extend beyond biology. Urban planners are beginning to consider mycorrhizal health when designing green spaces. Conservationists argue that protecting a single ancient tree means protecting an entire network. And philosophers see in the Wood Wide Web a metaphor for the kind of quiet, persistent interconnection that sustains all living systems.",
  "Suzanne Simard, the Canadian ecologist who first proved these connections exist, spent decades being dismissed by the forestry establishment. Her early papers were rejected. Colleagues questioned her methods. The idea that trees could communicate seemed too anthropomorphic, too sentimental for serious science. But Simard persisted, designing ever more rigorous experiments using radioactive carbon isotopes to trace the flow of nutrients between trees.",
  "Her breakthrough came in 1997, when she published a paper in Nature showing that Douglas fir and paper birch trees were sharing carbon through mycorrhizal networks. The paper was a sensation. It demonstrated not just that trees were connected, but that they were actively transferring resources to one another — sometimes across species lines.",
  "Since then, researchers around the world have expanded on Simard's work. Studies in European beech forests have shown that trees synchronize their growth rates through the network, growing more slowly in good years so that struggling neighbors can catch up. In tropical forests, seedlings that are connected to the network survive at rates far higher than those that are not.",
  "The network is not limited to trees. Mycorrhizal fungi form partnerships with roughly ninety percent of all land plants. A single fungal network can connect dozens of trees across hundreds of meters. Some networks are thousands of years old — older than any individual tree they support.",
  "There is growing evidence that the network carries not just nutrients but information. When a tree is attacked by insects, it can release chemical signals through the fungal threads that prompt neighboring trees to produce defensive compounds before the insects arrive. This is not metaphor. It is chemistry.",
  "The practical implications are enormous. Industrial forestry has traditionally treated forests as collections of individual trees — resources to be harvested one by one. But if trees depend on underground networks for survival, then clear-cutting does not just remove trees. It destroys the infrastructure that remaining trees need to recover.",
  "Some foresters are already changing their practices. In British Columbia, Simard has helped design retention harvesting protocols that preserve mother trees and their network connections. Early results suggest that forests managed this way regenerate faster and support greater biodiversity.",
  "Cities are paying attention too. Urban forests — the trees lining streets and filling parks — are typically planted as isolated individuals in compacted soil, cut off from any network. New approaches to urban forestry are experimenting with connected planting beds and mycorrhizal inoculants to give city trees the underground partnerships they evolved to depend on.",
  "The philosophical implications run deeper still. Western science has long been built on the assumption that nature is fundamentally competitive — that evolution selects for individuals who outcompete their neighbors. The Wood Wide Web suggests a more nuanced picture: one in which cooperation and mutual aid are not exceptions to the rule of nature, but central to it.",
  "Indigenous cultures around the world have long held this view. Many First Nations in the Pacific Northwest speak of trees as relatives — as beings embedded in networks of reciprocal obligation. Simard has acknowledged that her scientific findings echo what Indigenous knowledge keepers have been saying for millennia.",
  "Next time you walk through a forest, pause for a moment. Look at the trees around you — not as isolated columns of wood, but as nodes in an ancient, living network. Beneath your feet, through threads thinner than a human hair, they are sharing food, sending warnings, and nurturing their young. The forest is not a collection of individuals. It is a community. And it has been talking long before we learned to listen.",
].join("\n\n");

// --- Layout constants (responsive) ---
const COLUMN_MAX_WIDTH = 672;
const COMPANION_PADDING = 8;
const MIN_SLOT_WIDTH = 40;

// Returns responsive values based on screen width
function getResponsiveLayout(screenWidth: number) {
  const isSmall = screenWidth < 640;
  const isMedium = screenWidth < 1024;
  const fontSize = isSmall ? 16 : 18;
  const titleFontSize = isSmall ? 28 : 36;
  const fontFamily = '"Georgia", serif';
  return {
    // Shorthand strings for Pretext (needs the full CSS font string)
    font: `${fontSize}px ${fontFamily}`,
    titleFont: `bold ${titleFontSize}px ${fontFamily}`,
    // Separate values for React inline styles (avoids shorthand conflict)
    fontSize,
    titleFontSize,
    fontFamily,
    lineHeight: isSmall ? 26 : 30,
    titleLineHeight: isSmall ? 34 : 44,
    paddingX: isSmall ? 16 : 24,
    paddingTop: isSmall ? 40 : 64,
    companionWidth: isSmall ? 100 : isMedium ? 130 : 150,
    companionHeight: isSmall ? 100 : isMedium ? 130 : 150,
  };
}

// --- Types ---
type PositionedLine = {
  x: number;
  y: number;
  text: string;
};

type CompanionRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * For a given line band, return all available text slots using
 * the real image shape profile.
 */
function getLineSlots(
  lineTop: number,
  lineBottom: number,
  columnLeft: number,
  columnWidth: number,
  companion: CompanionRect,
  shapeProfile: ShapeProfile,
): { x: number; width: number }[] {
  const columnRight = columnLeft + columnWidth;

  const blocked = getShapeBlockedInterval(
    lineTop,
    lineBottom,
    companion.x,
    companion.y,
    shapeProfile,
    COMPANION_PADDING,
  );

  if (!blocked) {
    return [{ x: columnLeft, width: columnWidth }];
  }

  // Clamp blocked interval to column bounds — if the companion is
  // outside the column, it shouldn't affect text at all
  const clampedLeft = Math.max(blocked.left, columnLeft);
  const clampedRight = Math.min(blocked.right, columnRight);

  // If the companion doesn't actually overlap the column, full width
  if (clampedLeft >= clampedRight) {
    return [{ x: columnLeft, width: columnWidth }];
  }

  const slots: { x: number; width: number }[] = [];

  const leftWidth = clampedLeft - columnLeft;
  if (leftWidth >= MIN_SLOT_WIDTH) {
    slots.push({ x: columnLeft, width: leftWidth });
  }

  const rightWidth = columnRight - clampedRight;
  if (rightWidth >= MIN_SLOT_WIDTH) {
    slots.push({ x: Math.round(clampedRight), width: rightWidth });
  }

  return slots;
}

function layoutBody(
  prepared: PreparedTextWithSegments,
  startY: number,
  columnLeft: number,
  columnWidth: number,
  companion: CompanionRect,
  shapeProfile: ShapeProfile,
  lineHeight: number,
): PositionedLine[] {
  const lines: PositionedLine[] = [];
  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
  let y = startY;

  while (true) {
    const slots = getLineSlots(y, y + lineHeight, columnLeft, columnWidth, companion, shapeProfile);

    if (slots.length === 0) {
      y += lineHeight;
      continue;
    }

    let textExhausted = false;

    for (const slot of slots) {
      const line = layoutNextLine(prepared, cursor, slot.width);
      if (line === null) {
        textExhausted = true;
        break;
      }
      lines.push({ x: slot.x, y, text: line.text });
      cursor = line.end;
    }

    if (textExhausted) break;
    y += lineHeight;
  }

  return lines;
}

type ArticleData = {
  title: string;
  subtitle: string;
  body: string;
};

export default function CanvasPage() {
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [eyeCalibration, setEyeCalibration] = useState<EyeCalibrationPair | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFetchUrl = async () => {
    if (!urlInput.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch article");
      }

      setArticle({
        title: data.title,
        subtitle: data.byline || data.siteName || "",
        body: data.textContent,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 1: URL input
  if (!article) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="flex w-full max-w-lg flex-col items-center gap-5">
          <h1 className="text-2xl font-semibold text-gray-900">
            Paste an article URL
          </h1>
          <div className="flex w-full gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleFetchUrl()}
              placeholder="https://..."
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-gray-500"
              disabled={loading}
            />
            <button
              onClick={handleFetchUrl}
              disabled={loading || !urlInput.trim()}
              className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Read"}
            </button>
          </div>
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          <button
            onClick={() => setArticle({
              title: TITLE,
              subtitle: SUBTITLE,
              body: BODY,
            })}
            className="text-xs text-gray-400 transition-colors hover:text-gray-600"
          >
            or use sample article
          </button>
        </div>
      </main>
    );
  }

  // Step 2: Eye placement
  if (!eyeCalibration) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <EyePlacementTool
          imageSrc="/companions/mark.png"
          onDone={(cal) => setEyeCalibration(cal)}
        />
      </main>
    );
  }

  // Step 3: Canvas
  return <CanvasView eyeCalibration={eyeCalibration} article={article} />;
}

type CompanionMode = "anchored" | "fixed";

function CanvasView({ eyeCalibration, article }: { eyeCalibration: EyeCalibrationPair; article: ArticleData }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<PositionedLine[]>([]);
  const [titleLines, setTitleLines] = useState<PositionedLine[]>([]);
  const [subtitleY, setSubtitleY] = useState(0);
  const [companionPos, setCompanionPos] = useState({ x: 0, y: 0 });
  const [companionSize, setCompanionSize] = useState({ w: 150, h: 150 });
  const companionSizeRef = useRef({ w: 150, h: 150 });
  const [ready, setReady] = useState(false);
  const [stageHeight, setStageHeight] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [mode, setMode] = useState<CompanionMode>("anchored");
  const [layoutConfig, setLayoutConfig] = useState(() =>
    typeof window !== "undefined" ? getResponsiveLayout(window.innerWidth) : getResponsiveLayout(1024),
  );

  const fixedViewportPos = useRef({ x: 0, y: 0 });
  const [fixedPos, setFixedPos] = useState({ x: 0, y: 0 });

  const preparedRef = useRef<PreparedTextWithSegments | null>(null);
  const columnLeftRef = useRef(0);
  const columnWidthRef = useRef(0);
  const bodyStartYRef = useRef(0);
  const lineHeightRef = useRef(30);
  const shapeProfileRef = useRef<ShapeProfile>({ rows: [], width: 0, height: 0, offsetX: 0, offsetY: 0 });

  const isDragging = useRef(false);
  const didDrag = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const rafId = useRef(0);
  const modeRef = useRef<CompanionMode>("anchored");

  // Update lines and recalculate stage height
  const updateLines = useCallback((newLines: PositionedLine[]) => {
    setLines(newLines);
    if (newLines.length > 0) {
      const lastLine = newLines[newLines.length - 1];
      setStageHeight(lastLine.y + lineHeightRef.current + 100); // 100px bottom padding
    }
  }, []);

  // Convert viewport position to page position (adds scroll offset)
  const viewportToPage = useCallback((vx: number, vy: number) => {
    const stageEl = stageRef.current;
    if (!stageEl) return { x: vx, y: vy };
    const rect = stageEl.getBoundingClientRect();
    return { x: vx - rect.left, y: vy - rect.top };
  }, []);

  const relayout = useCallback((compX: number, compY: number) => {
    if (!preparedRef.current) return;
    const bodyLines = layoutBody(
      preparedRef.current,
      bodyStartYRef.current,
      columnLeftRef.current,
      columnWidthRef.current,
      { x: compX, y: compY, width: companionSize.w, height: companionSize.h },
      shapeProfileRef.current,
      lineHeightRef.current,
    );
    updateLines(bodyLines);
  }, [companionSize]);

  // Rebuild shape profile at a given angle and relayout text
  const rebuildShapeAndRelayout = useCallback(async (
    compX: number,
    compY: number,
    angleDeg: number,
  ) => {
    const profile = await buildShapeProfile(
      "/companions/mark.png",
      companionSize.w,
      companionSize.h,
      angleDeg,
    );
    shapeProfileRef.current = profile;
    if (!preparedRef.current) return;
    const bodyLines = layoutBody(
      preparedRef.current,
      bodyStartYRef.current,
      columnLeftRef.current,
      columnWidthRef.current,
      { x: compX, y: compY, width: companionSize.w, height: companionSize.h },
      profile,
      lineHeightRef.current,
    );
    updateLines(bodyLines);
  }, [companionSize]);

  // --- Initial layout on mount ---
  useEffect(() => {
    const resp = getResponsiveLayout(window.innerWidth);
    setLayoutConfig(resp);
    setCompanionSize({ w: resp.companionWidth, h: resp.companionHeight });
    companionSizeRef.current = { w: resp.companionWidth, h: resp.companionHeight };

    Promise.all([
      document.fonts.ready,
      buildShapeProfile("/companions/mark.png", resp.companionWidth, resp.companionHeight, 0),
    ]).then(([, shapeProfile]) => {
      shapeProfileRef.current = shapeProfile;

      const stageEl = stageRef.current;
      if (!stageEl) return;

      const stageWidth = stageEl.clientWidth;
      const columnWidth = Math.min(COLUMN_MAX_WIDTH, stageWidth - resp.paddingX * 2);
      const columnLeft = Math.round((stageWidth - columnWidth) / 2);
      columnLeftRef.current = columnLeft;
      columnWidthRef.current = columnWidth;

      // Title
      const titlePrepared = prepareWithSegments(article.title, resp.titleFont);
      const tLines: PositionedLine[] = [];
      let tCursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
      let tY = resp.paddingTop;
      while (true) {
        const line = layoutNextLine(titlePrepared, tCursor, columnWidth);
        if (line === null) break;
        tLines.push({ x: columnLeft, y: tY, text: line.text });
        tCursor = line.end;
        tY += resp.titleLineHeight;
      }
      setTitleLines(tLines);

      // Subtitle
      const subY = tY + 8;
      setSubtitleY(subY);

      // Body
      const bodyStartY = subY + 36;
      bodyStartYRef.current = bodyStartY;

      lineHeightRef.current = resp.lineHeight;

      const compX = columnLeft + Math.round((columnWidth - resp.companionWidth) / 2);
      const compY = bodyStartY + resp.lineHeight * 3;
      setCompanionPos({ x: compX, y: compY });

      const prepared = prepareWithSegments(article.body, resp.font);
      preparedRef.current = prepared;

      const bodyLines = layoutBody(
        prepared,
        bodyStartY,
        columnLeft,
        columnWidth,
        { x: compX, y: compY, width: resp.companionWidth, height: resp.companionHeight },
        shapeProfile,
        resp.lineHeight,
      );
      updateLines(bodyLines);
      setReady(true);
    });
  }, []);

  // --- Window resize handler ---
  useEffect(() => {
    const handleResize = () => {
      const stageEl = stageRef.current;
      if (!stageEl || !preparedRef.current) return;

      const resp = getResponsiveLayout(window.innerWidth);
      setLayoutConfig(resp);
      lineHeightRef.current = resp.lineHeight;

      // Update companion size
      companionSizeRef.current = { w: resp.companionWidth, h: resp.companionHeight };
      setCompanionSize({ w: resp.companionWidth, h: resp.companionHeight });

      const stageWidth = stageEl.clientWidth;
      const columnWidth = Math.min(COLUMN_MAX_WIDTH, stageWidth - resp.paddingX * 2);
      const columnLeft = Math.round((stageWidth - columnWidth) / 2);
      columnLeftRef.current = columnLeft;
      columnWidthRef.current = columnWidth;

      // Re-layout title
      const titlePrepared = prepareWithSegments(article.title, resp.titleFont);
      const tLines: PositionedLine[] = [];
      let tCursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
      let tY = resp.paddingTop;
      while (true) {
        const line = layoutNextLine(titlePrepared, tCursor, columnWidth);
        if (line === null) break;
        tLines.push({ x: columnLeft, y: tY, text: line.text });
        tCursor = line.end;
        tY += resp.titleLineHeight;
      }
      setTitleLines(tLines);
      const subY = tY + 8;
      setSubtitleY(subY);
      bodyStartYRef.current = subY + 36;

      // Clamp companion position to stay within visible area
      const maxX = stageWidth - resp.companionWidth;
      const clampedX = Math.max(0, Math.min(maxX, companionPos.x));
      const clampedY = Math.max(0, companionPos.y);
      setCompanionPos({ x: clampedX, y: clampedY });

      // If in fixed mode, also clamp viewport position
      if (modeRef.current === "fixed") {
        const vpX = Math.max(0, Math.min(window.innerWidth - resp.companionWidth, fixedViewportPos.current.x));
        const vpY = Math.max(0, Math.min(window.innerHeight - resp.companionHeight, fixedViewportPos.current.y));
        fixedViewportPos.current = { x: vpX, y: vpY };
        setFixedPos({ x: vpX, y: vpY });
      }

      // Rebuild shape profile for new companion size
      buildShapeProfile("/companions/mark.png", resp.companionWidth, resp.companionHeight, 0).then((profile) => {
        shapeProfileRef.current = profile;

        // Re-layout body with clamped position
        if (!preparedRef.current) return;
        const bodyLines = layoutBody(
          preparedRef.current,
          bodyStartYRef.current,
          columnLeft,
          columnWidth,
          { x: clampedX, y: clampedY, width: resp.companionWidth, height: resp.companionHeight },
          profile,
          resp.lineHeight,
        );
        updateLines(bodyLines);
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [companionPos]);

  // --- Scroll handler for fixed mode ---
  // When scrolling in fixed mode, the companion's PAGE position changes
  // (even though its VIEWPORT position stays the same), so text must reflow.
  useEffect(() => {
    let scrollRaf = 0;

    const handleScroll = () => {
      if (modeRef.current !== "fixed") return;
      cancelAnimationFrame(scrollRaf);
      scrollRaf = requestAnimationFrame(() => {
        const stageEl = stageRef.current;
        if (!stageEl) return;
        // Convert fixed viewport position to current page position
        const rect = stageEl.getBoundingClientRect();
        const pageX = fixedViewportPos.current.x - rect.left;
        const pageY = fixedViewportPos.current.y - rect.top;
        setCompanionPos({ x: pageX, y: pageY });

        if (!preparedRef.current) return;
        const bodyLines = layoutBody(
          preparedRef.current,
          bodyStartYRef.current,
          columnLeftRef.current,
          columnWidthRef.current,
          { x: pageX, y: pageY, width: companionSizeRef.current.w, height: companionSizeRef.current.h },
          shapeProfileRef.current,
          lineHeightRef.current,
        );
        updateLines(bodyLines);
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(scrollRaf);
    };
  }, []);

  // --- Mode toggle ---
  const toggleMode = useCallback(() => {
    const stageEl = stageRef.current;
    if (!stageEl) return;

    if (modeRef.current === "anchored") {
      // Switching to fixed: save current viewport position
      const rect = stageEl.getBoundingClientRect();
      const vp = {
        x: companionPos.x + rect.left,
        y: companionPos.y + rect.top,
      };
      fixedViewportPos.current = vp;
      setFixedPos(vp);
      modeRef.current = "fixed";
      setMode("fixed");
    } else {
      // Switching to anchored: convert viewport position back to page position
      const pagePos = viewportToPage(fixedViewportPos.current.x, fixedViewportPos.current.y);
      modeRef.current = "anchored";
      setMode("anchored");
      setCompanionPos(pagePos);
      relayout(pagePos.x, pagePos.y);
    }
  }, [companionPos, viewportToPage, relayout]);

  // --- Drag handlers (mouse + touch) ---
  const startDrag = useCallback((clientX: number, clientY: number) => {
    isDragging.current = true;
    didDrag.current = false;

    const stageEl = stageRef.current;
    if (!stageEl) return;
    const stageRect = stageEl.getBoundingClientRect();

    if (modeRef.current === "fixed") {
      dragOffset.current = {
        x: clientX - fixedViewportPos.current.x,
        y: clientY - fixedViewportPos.current.y,
      };
    } else {
      dragOffset.current = {
        x: clientX - stageRect.left - companionPos.x,
        y: clientY - stageRect.top - companionPos.y,
      };
    }

    const latestPos = { x: companionPos.x, y: companionPos.y };

    const onMove = (cx: number, cy: number) => {
      if (!isDragging.current) return;
      didDrag.current = true;

      if (modeRef.current === "fixed") {
        const vx = cx - dragOffset.current.x;
        const vy = cy - dragOffset.current.y;
        fixedViewportPos.current = { x: vx, y: vy };
        setFixedPos({ x: vx, y: vy });
        const rect = stageRef.current?.getBoundingClientRect();
        if (rect) {
          latestPos.x = vx - rect.left;
          latestPos.y = vy - rect.top;
        }
      } else {
        const rect = stageRef.current?.getBoundingClientRect();
        if (rect) {
          latestPos.x = cx - rect.left - dragOffset.current.x;
          latestPos.y = cy - rect.top - dragOffset.current.y;
        }
      }

      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        setCompanionPos({ x: latestPos.x, y: latestPos.y });
        relayout(latestPos.x, latestPos.y);
      });
    };

    const onEnd = () => {
      isDragging.current = false;
      setCompanionPos({ x: latestPos.x, y: latestPos.y });
      relayout(latestPos.x, latestPos.y);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };

    const handleMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault(); // prevent scrolling while dragging
      const t = e.touches[0];
      if (t) onMove(t.clientX, t.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
  }, [companionPos, relayout]);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
  }, [startDrag]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    if (t) startDrag(t.clientX, t.clientY);
  }, [startDrag]);

  // --- Rotation handler ---
  const handleRotate = useCallback((angleDeg: number) => {
    setRotation(angleDeg);
    rebuildShapeAndRelayout(companionPos.x, companionPos.y, angleDeg);
  }, [companionPos, rebuildShapeAndRelayout]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-white">
      <div ref={stageRef} className="relative w-full" style={{ minHeight: stageHeight > 0 ? `${stageHeight}px` : "100vh" }}>
        {/* Title */}
        {titleLines.map((line, i) => (
          <div
            key={`title-${i}`}
            className="absolute whitespace-pre font-bold text-gray-900"
            style={{
              left: line.x,
              top: line.y,
              fontSize: layoutConfig.titleFontSize,
              fontFamily: layoutConfig.fontFamily,
              fontWeight: "bold",
              lineHeight: `${layoutConfig.titleLineHeight}px`,
            }}
          >
            {line.text}
          </div>
        ))}

        {/* Subtitle */}
        {ready && (
          <div
            className="absolute text-gray-500"
            style={{
              left: columnLeftRef.current,
              top: subtitleY,
              fontSize: layoutConfig.fontSize,
              fontFamily: layoutConfig.fontFamily,
              lineHeight: "28px",
            }}
          >
            {article.subtitle}
          </div>
        )}

        {/* Body lines */}
        {lines.map((line, i) => (
          <div
            key={`body-${i}`}
            className="absolute whitespace-pre text-gray-800"
            style={{
              left: line.x,
              top: line.y,
              fontSize: layoutConfig.fontSize,
              fontFamily: layoutConfig.fontFamily,
              lineHeight: `${layoutConfig.lineHeight}px`,
            }}
          >
            {line.text}
          </div>
        ))}

        {/* Companion — rendered inside stage for anchored, outside for fixed */}
        {ready && mode === "anchored" && (
          <Companion
            x={companionPos.x}
            y={companionPos.y}
            width={companionSize.w}
            height={companionSize.h}
            onDragStart={handleDragStart}
            onTouchDragStart={handleTouchStart}
            didDrag={didDrag}
            onRotate={handleRotate}
            currentRotation={rotation}
            eyeCalibration={eyeCalibration}
            mode="anchored"
            onToggleMode={toggleMode}
          />
        )}
      </div>

      {/* Fixed mode: companion is outside the scrolling stage */}
      {ready && mode === "fixed" && (
        <Companion
          x={fixedPos.x}
          y={fixedPos.y}
          width={companionSize.w}
          height={companionSize.h}
          onDragStart={handleDragStart}
          onTouchDragStart={handleTouchStart}
          didDrag={didDrag}
          onRotate={handleRotate}
          currentRotation={rotation}
          eyeCalibration={eyeCalibration}
          mode="fixed"
          onToggleMode={toggleMode}
        />
      )}
    </main>
  );
}

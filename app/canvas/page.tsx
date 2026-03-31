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
const BODY =
  "Beneath the forest floor lies a vast network of fungal threads connecting the roots of trees. Scientists call it the mycorrhizal network — but it has earned a more poetic name: the Wood Wide Web. Through this network, trees share nutrients, send chemical warnings about insect attacks, and even nurture their young.\n\nA mother tree — the oldest and tallest in a grove — can recognize her own seedlings among the crowd. She sends them extra carbon through the fungal network, giving them a better chance of survival in the shaded understory. When a tree is dying, it dumps its resources into the network, feeding its neighbors one final time.\n\nThis discovery has reshaped how ecologists think about competition in forests. Trees are not isolated individuals fighting for sunlight. They are members of a community, cooperating through shared infrastructure that is invisible to the naked eye.\n\nThe implications extend beyond biology. Urban planners are beginning to consider mycorrhizal health when designing green spaces. Conservationists argue that protecting a single ancient tree means protecting an entire network. And philosophers see in the Wood Wide Web a metaphor for the kind of quiet, persistent interconnection that sustains all living systems.\n\nNext time you walk through a forest, remember: beneath your feet, the trees are talking.";

// --- Layout constants ---
const FONT = '18px "Georgia", serif';
const LINE_HEIGHT = 30;
const COLUMN_MAX_WIDTH = 672;
const PADDING_X = 24;
const PADDING_TOP = 64;
const COMPANION_PADDING = 8;
const MIN_SLOT_WIDTH = 40;

// --- Companion size ---
const COMPANION_WIDTH = 150;
const COMPANION_HEIGHT = 150;

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
): PositionedLine[] {
  const lines: PositionedLine[] = [];
  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
  let y = startY;

  while (true) {
    const slots = getLineSlots(y, y + LINE_HEIGHT, columnLeft, columnWidth, companion, shapeProfile);

    if (slots.length === 0) {
      y += LINE_HEIGHT;
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
    y += LINE_HEIGHT;
  }

  return lines;
}

export default function CanvasPage() {
  const [eyeCalibration, setEyeCalibration] = useState<EyeCalibrationPair | null>(null);

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

  return <CanvasView eyeCalibration={eyeCalibration} />;
}

function CanvasView({ eyeCalibration }: { eyeCalibration: EyeCalibrationPair }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<PositionedLine[]>([]);
  const [titleLines, setTitleLines] = useState<PositionedLine[]>([]);
  const [subtitleY, setSubtitleY] = useState(0);
  const [companionPos, setCompanionPos] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);

  const preparedRef = useRef<PreparedTextWithSegments | null>(null);
  const columnLeftRef = useRef(0);
  const columnWidthRef = useRef(0);
  const bodyStartYRef = useRef(0);
  const shapeProfileRef = useRef<ShapeProfile>({ rows: [], width: 0, height: 0, offsetX: 0, offsetY: 0 });

  const isDragging = useRef(false);
  const didDrag = useRef(false); // true if mouse moved during press (= drag, not click)
  const dragOffset = useRef({ x: 0, y: 0 });
  const rafId = useRef(0);

  const relayout = useCallback((compX: number, compY: number) => {
    if (!preparedRef.current) return;
    const bodyLines = layoutBody(
      preparedRef.current,
      bodyStartYRef.current,
      columnLeftRef.current,
      columnWidthRef.current,
      { x: compX, y: compY, width: COMPANION_WIDTH, height: COMPANION_HEIGHT },
      shapeProfileRef.current,
    );
    setLines(bodyLines);
  }, []);

  // Rebuild shape profile at a given angle and relayout text
  const rebuildShapeAndRelayout = useCallback(async (
    compX: number,
    compY: number,
    angleDeg: number,
  ) => {
    const profile = await buildShapeProfile(
      "/companions/mark.png",
      COMPANION_WIDTH,
      COMPANION_HEIGHT,
      angleDeg,
    );
    shapeProfileRef.current = profile;
    if (!preparedRef.current) return;
    const bodyLines = layoutBody(
      preparedRef.current,
      bodyStartYRef.current,
      columnLeftRef.current,
      columnWidthRef.current,
      { x: compX, y: compY, width: COMPANION_WIDTH, height: COMPANION_HEIGHT },
      profile,
    );
    setLines(bodyLines);
  }, []);

  // --- Initial layout on mount ---
  useEffect(() => {
    Promise.all([
      document.fonts.ready,
      buildShapeProfile("/companions/mark.png", COMPANION_WIDTH, COMPANION_HEIGHT, 0),
    ]).then(([, shapeProfile]) => {
      shapeProfileRef.current = shapeProfile;

      const stageEl = stageRef.current;
      if (!stageEl) return;

      const stageWidth = stageEl.clientWidth;
      const columnWidth = Math.min(COLUMN_MAX_WIDTH, stageWidth - PADDING_X * 2);
      const columnLeft = Math.round((stageWidth - columnWidth) / 2);
      columnLeftRef.current = columnLeft;
      columnWidthRef.current = columnWidth;

      // Title
      const titleFont = 'bold 36px "Georgia", serif';
      const titlePrepared = prepareWithSegments(TITLE, titleFont);
      const titleLineHeight = 44;
      const tLines: PositionedLine[] = [];
      let tCursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
      let tY = PADDING_TOP;
      while (true) {
        const line = layoutNextLine(titlePrepared, tCursor, columnWidth);
        if (line === null) break;
        tLines.push({ x: columnLeft, y: tY, text: line.text });
        tCursor = line.end;
        tY += titleLineHeight;
      }
      setTitleLines(tLines);

      // Subtitle
      const subY = tY + 8;
      setSubtitleY(subY);

      // Body
      const bodyStartY = subY + 36;
      bodyStartYRef.current = bodyStartY;

      const compX = columnLeft + Math.round((columnWidth - COMPANION_WIDTH) / 2);
      const compY = bodyStartY + LINE_HEIGHT * 3;
      setCompanionPos({ x: compX, y: compY });

      const prepared = prepareWithSegments(BODY, FONT);
      preparedRef.current = prepared;

      const bodyLines = layoutBody(
        prepared,
        bodyStartY,
        columnLeft,
        columnWidth,
        { x: compX, y: compY, width: COMPANION_WIDTH, height: COMPANION_HEIGHT },
        shapeProfile,
      );
      setLines(bodyLines);
      setReady(true);
    });
  }, []);

  // --- Drag handlers ---
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    didDrag.current = false; // reset — will become true if mouse moves

    const stageEl = stageRef.current;
    if (!stageEl) return;
    const stageRect = stageEl.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - stageRect.left - companionPos.x,
      y: e.clientY - stageRect.top - companionPos.y,
    };

    const latestPos = { x: companionPos.x, y: companionPos.y };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current) return;

      didDrag.current = true; // mouse moved — this is a drag, not a click

      const newX = moveEvent.clientX - stageRect.left - dragOffset.current.x;
      const newY = moveEvent.clientY - stageRect.top - dragOffset.current.y;
      latestPos.x = newX;
      latestPos.y = newY;

      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        setCompanionPos({ x: latestPos.x, y: latestPos.y });
        relayout(latestPos.x, latestPos.y);
      });
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      setCompanionPos({ x: latestPos.x, y: latestPos.y });
      relayout(latestPos.x, latestPos.y);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, [companionPos, relayout]);

  // --- Rotation handler ---
  const handleRotate = useCallback((angleDeg: number) => {
    rebuildShapeAndRelayout(companionPos.x, companionPos.y, angleDeg);
  }, [companionPos, rebuildShapeAndRelayout]);

  return (
    <main className="min-h-screen bg-white">
      <div ref={stageRef} className="relative w-full" style={{ minHeight: "100vh" }}>
        {/* Title */}
        {titleLines.map((line, i) => (
          <div
            key={`title-${i}`}
            className="absolute whitespace-pre font-bold text-gray-900"
            style={{
              left: line.x,
              top: line.y,
              font: 'bold 36px "Georgia", serif',
              lineHeight: "44px",
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
              font: '18px "Georgia", serif',
              lineHeight: "28px",
            }}
          >
            {SUBTITLE}
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
              font: FONT,
              lineHeight: `${LINE_HEIGHT}px`,
            }}
          >
            {line.text}
          </div>
        ))}

        {/* Companion */}
        {ready && (
          <Companion
            x={companionPos.x}
            y={companionPos.y}
            width={COMPANION_WIDTH}
            height={COMPANION_HEIGHT}
            onDragStart={handleDragStart}
            didDrag={didDrag}
            onRotate={handleRotate}
            eyeCalibration={eyeCalibration}
          />
        )}
      </div>
    </main>
  );
}

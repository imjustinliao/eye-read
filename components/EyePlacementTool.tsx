"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";

// --- Types ---

/** Eye color theme */
export type EyeColorTheme = {
  name: string;
  eyeWhite: string;  // fill color for the eye circle
  pupil: string;     // fill color for the pupil
};

export const EYE_COLOR_PRESETS: EyeColorTheme[] = [
  { name: "Dark", eyeWhite: "#ffffff", pupil: "#000000" },
  { name: "Red", eyeWhite: "#ffcccc", pupil: "#8b0000" },
];

/** One eye's calibration: center position + radius, all relative to image size (0–1) */
export type EyeCalibration = {
  cx: number;
  cy: number;
  r: number;
};

export type EyeCalibrationPair = {
  left: EyeCalibration;
  right: EyeCalibration;
  colorTheme: EyeColorTheme;
};

type EyePlacementToolProps = {
  imageSrc: string;
  onDone: (calibration: EyeCalibrationPair) => void;
};

// --- Constants ---
const DISPLAY_SIZE = 300;
const DEFAULT_RADIUS = 0.06;
const MIN_RADIUS = 0.035; // minimum so pupil (40% of this) is still visible
const MAX_RADIUS = 0.15;
const HANDLE_SIZE = 7; // corner handle square size in pixels

export default function EyePlacementTool({ imageSrc, onDone }: EyePlacementToolProps) {
  const [leftEye, setLeftEye] = useState<EyeCalibration>({
    cx: 0.38, cy: 0.38, r: DEFAULT_RADIUS,
  });
  const [rightEye, setRightEye] = useState<EyeCalibration>({
    cx: 0.62, cy: 0.38, r: DEFAULT_RADIUS,
  });
  const [selectedEye, setSelectedEye] = useState<"left" | "right" | null>(null);
  const [colorTheme, setColorTheme] = useState<EyeColorTheme>(EYE_COLOR_PRESETS[0]);
  const [showCustom, setShowCustom] = useState(false);

  const imageRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<{
    eye: "left" | "right";
    type: "move" | "resize";
    corner?: "tl" | "tr" | "bl" | "br";
    startMouseX: number;
    startMouseY: number;
    startCx: number;
    startCy: number;
    startR: number;
  } | null>(null);

  const toPixel = (val: number) => val * DISPLAY_SIZE;

  const clampRadius = (r: number) => Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, r));

  const handleMouseDown = useCallback((
    eye: "left" | "right",
    type: "move" | "resize",
    e: React.MouseEvent,
    corner?: "tl" | "tr" | "bl" | "br",
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedEye(eye);
    const current = eye === "left" ? leftEye : rightEye;
    dragging.current = {
      eye, type, corner,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startCx: current.cx,
      startCy: current.cy,
      startR: current.r,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const d = dragging.current;
      if (!d) return;

      const dx = (moveEvent.clientX - d.startMouseX) / DISPLAY_SIZE;
      const dy = (moveEvent.clientY - d.startMouseY) / DISPLAY_SIZE;
      const setter = d.eye === "left" ? setLeftEye : setRightEye;

      if (d.type === "move") {
        setter({
          cx: Math.max(0, Math.min(1, d.startCx + dx)),
          cy: Math.max(0, Math.min(1, d.startCy + dy)),
          r: d.startR,
        });
      } else {
        // Figma-style: drag corner handle outward = bigger, inward = smaller
        // Use the axis that moved more (like Figma's proportional resize)
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        const delta = Math.max(absDx, absDy);

        // Determine if dragging outward (bigger) or inward (smaller)
        // based on which corner and which direction the mouse moved
        let sign = 1;
        if (d.corner === "tl") sign = (dx < 0 || dy < 0) ? 1 : -1;
        else if (d.corner === "tr") sign = (dx > 0 || dy < 0) ? 1 : -1;
        else if (d.corner === "bl") sign = (dx < 0 || dy > 0) ? 1 : -1;
        else if (d.corner === "br") sign = (dx > 0 || dy > 0) ? 1 : -1;

        setter({
          cx: d.startCx,
          cy: d.startCy,
          r: clampRadius(d.startR + sign * delta),
        });
      }
    };

    const handleMouseUp = () => {
      dragging.current = null;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, [leftEye, rightEye]);

  const renderEyeCircle = (eye: EyeCalibration, which: "left" | "right") => {
    const cx = toPixel(eye.cx);
    const cy = toPixel(eye.cy);
    const r = toPixel(eye.r);
    const isSelected = selectedEye === which;
    const h = HANDLE_SIZE;

    // Pupil preview: shows what the eye will look like
    const pupilR = r * 0.4;

    // Bounding box corners for resize handles
    const corners = [
      { id: "tl" as const, x: cx - r - h / 2, y: cy - r - h / 2, cursor: "nwse-resize" },
      { id: "tr" as const, x: cx + r - h / 2, y: cy - r - h / 2, cursor: "nesw-resize" },
      { id: "bl" as const, x: cx - r - h / 2, y: cy + r - h / 2, cursor: "nesw-resize" },
      { id: "br" as const, x: cx + r - h / 2, y: cy + r - h / 2, cursor: "nwse-resize" },
    ];

    return (
      <g key={which}>
        {/* Eye preview: colored circle + pupil */}
        <circle cx={cx} cy={cy} r={r} fill={colorTheme.eyeWhite} opacity={0.85} />
        <circle cx={cx} cy={cy} r={pupilR} fill={colorTheme.pupil} />

        {/* Selection border */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={isSelected ? "rgba(59, 130, 246, 0.9)" : "rgba(59, 130, 246, 0.4)"}
          strokeWidth={isSelected ? 2 : 1}
        />

        {/* Draggable area (invisible, covers the whole eye) */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="transparent"
          className="cursor-grab active:cursor-grabbing"
          onMouseDown={(e) => handleMouseDown(which, "move", e)}
        />

        {/* Corner resize handles (Figma-style) */}
        {corners.map((c) => (
          <rect
            key={c.id}
            x={c.x}
            y={c.y}
            width={h}
            height={h}
            rx={1}
            fill="white"
            stroke="rgba(59, 130, 246, 0.9)"
            strokeWidth={1.5}
            style={{ cursor: c.cursor }}
            onMouseDown={(e) => handleMouseDown(which, "resize", e, c.id)}
          />
        ))}

        {/* Label */}
        <text
          x={cx}
          y={cy - r - 12}
          textAnchor="middle"
          fill="rgba(59, 130, 246, 0.9)"
          fontSize={11}
          fontWeight={500}
          fontFamily="system-ui, sans-serif"
        >
          {which === "left" ? "L" : "R"}
        </text>
      </g>
    );
  };

  return (
    <div className="flex flex-col items-center gap-6 p-8">
      <h2 className="text-xl font-semibold text-gray-900">
        Place the eyes
      </h2>
      <p className="max-w-sm text-center text-sm text-gray-500">
        Drag each eye into position. Use the corner handles to resize.
        The white circle is the eye area — the pupil scales automatically.
      </p>

      <div
        ref={imageRef}
        className="relative select-none"
        style={{ width: DISPLAY_SIZE, height: DISPLAY_SIZE }}
        onMouseDown={() => setSelectedEye(null)}
      >
        <Image
          src={imageSrc}
          alt="Companion"
          width={DISPLAY_SIZE}
          height={DISPLAY_SIZE}
          draggable={false}
          className="rounded-lg"
        />
        <svg
          className="absolute inset-0"
          width={DISPLAY_SIZE}
          height={DISPLAY_SIZE}
          style={{ overflow: "visible" }}
        >
          {renderEyeCircle(leftEye, "left")}
          {renderEyeCircle(rightEye, "right")}
        </svg>
      </div>

      {/* Eye color section */}
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm font-medium text-gray-700">Eye color</p>
        <div className="flex items-center gap-2">
          {/* Preset swatches */}
          {EYE_COLOR_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => { setColorTheme(preset); setShowCustom(false); }}
              className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors ${
                colorTheme.name === preset.name && !showCustom
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {/* Mini eye preview */}
              <svg width={18} height={18} viewBox="0 0 18 18">
                <circle cx={9} cy={9} r={8} fill={preset.eyeWhite} stroke="#d1d5db" strokeWidth={1} />
                <circle cx={9} cy={9} r={3.5} fill={preset.pupil} />
              </svg>
              {preset.name}
            </button>
          ))}

          {/* Custom button */}
          <button
            onClick={() => setShowCustom(!showCustom)}
            className={`h-9 rounded-lg border px-3 text-xs font-medium transition-colors ${
              showCustom
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            Custom
          </button>
        </div>

        {/* Custom color pickers */}
        {showCustom && (
          <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <label className="flex items-center gap-2 text-xs text-gray-600">
              Eye
              <input
                type="color"
                value={colorTheme.eyeWhite}
                onChange={(e) => setColorTheme({ name: "Custom", eyeWhite: e.target.value, pupil: colorTheme.pupil })}
                className="h-7 w-7 cursor-pointer rounded border border-gray-300"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-600">
              Pupil
              <input
                type="color"
                value={colorTheme.pupil}
                onChange={(e) => setColorTheme({ name: "Custom", eyeWhite: colorTheme.eyeWhite, pupil: e.target.value })}
                className="h-7 w-7 cursor-pointer rounded border border-gray-300"
              />
            </label>
          </div>
        )}
      </div>

      <button
        onClick={() => onDone({ left: leftEye, right: rightEye, colorTheme })}
        className="rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700"
      >
        Done
      </button>
    </div>
  );
}

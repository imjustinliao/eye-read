import { useRef, useEffect, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import type { EyeCalibrationPair } from "@/components/EyePlacementTool";
import { getPupilLocal } from "@/lib/eye-tracking";

type CompanionProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  onDragStart: (e: React.MouseEvent) => void;
  onTouchDragStart: (e: React.TouchEvent) => void;
  didDrag: React.RefObject<boolean>;
  onRotate: (angleDeg: number) => void;
  currentRotation: number;
  eyeCalibration: EyeCalibrationPair;
  mode: "anchored" | "fixed";
  onToggleMode: () => void;
};

export default function Companion({
  x, y, width, height,
  onDragStart, onTouchDragStart, didDrag, onRotate,
  currentRotation, eyeCalibration, mode, onToggleMode,
}: CompanionProps) {
  const controls = useAnimationControls();
  const containerRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef(currentRotation);

  // Keep rotation ref in sync with prop
  useEffect(() => {
    rotationRef.current = currentRotation;
  }, [currentRotation]);

  // Set rotation immediately on mount/mode switch (no animation)
  useEffect(() => {
    controls.set({ rotate: currentRotation });
  }, []); // only on mount

  // Pupil positions in LOCAL coords (relative to companion top-left, un-rotated)
  const [leftPupil, setLeftPupil] = useState({ x: 0, y: 0 });
  const [rightPupil, setRightPupil] = useState({ x: 0, y: 0 });
  const rafRef = useRef(0);

  useEffect(() => {
    let latestMouseX = 0;
    let latestMouseY = 0;

    const updatePupils = () => {
      const el = containerRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();

      const lp = getPupilLocal(
        eyeCalibration.left, latestMouseX, latestMouseY,
        rect, width, height, rotationRef.current,
      );
      const rp = getPupilLocal(
        eyeCalibration.right, latestMouseX, latestMouseY,
        rect, width, height, rotationRef.current,
      );
      setLeftPupil(lp);
      setRightPupil(rp);
    };

    const handleMouseMove = (e: MouseEvent) => {
      latestMouseX = e.clientX;
      latestMouseY = e.clientY;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updatePupils);
    };

    const handleScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updatePupils);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("scroll", handleScroll, { passive: true });
    updatePupils();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [width, height, eyeCalibration]);

  const handleMouseUp = () => {
    if (!didDrag.current) {
      const nudge = 15 + Math.random() * 10;
      const newRotation = currentRotation + nudge;

      const size = Math.max(width, height);
      const duration = size * 0.002;

      controls.start({
        rotate: newRotation,
        transition: {
          duration,
          ease: [0.2, 0.8, 0.3, 1],
        },
      });

      onRotate(newRotation);
    }
  };

  const leftR = eyeCalibration.left.r * width;
  const rightR = eyeCalibration.right.r * width;
  const leftPupilR = leftR * 0.4;
  const rightPupilR = rightR * 0.4;

  return (
    <div
      ref={containerRef}
      className={`${mode === "fixed" ? "fixed" : "absolute"} cursor-grab active:cursor-grabbing`}
      style={{ left: x, top: y, width, height, zIndex: 50 }}
      onMouseDown={onDragStart}
      onTouchStart={onTouchDragStart}
      onMouseUp={handleMouseUp}
    >
      <motion.div animate={controls} className="relative" style={{ width, height }}>
        {/* Plain img to avoid Next.js Image wrapper adding extra spacing */}
        <img
          src="/companions/mark.png"
          alt="Companion"
          width={width}
          height={height}
          draggable={false}
          className="block select-none"
        />

        {/* Eye overlays — all coords in local (un-rotated) companion space */}
        <svg
          className="pointer-events-none absolute inset-0"
          width={width}
          height={height}
          style={{ overflow: "visible" }}
        >
          <circle
            cx={eyeCalibration.left.cx * width}
            cy={eyeCalibration.left.cy * height}
            r={leftR}
            fill={eyeCalibration.colorTheme.eyeWhite}
          />
          <circle
            cx={leftPupil.x}
            cy={leftPupil.y}
            r={leftPupilR}
            fill={eyeCalibration.colorTheme.pupil}
          />
          <circle
            cx={eyeCalibration.right.cx * width}
            cy={eyeCalibration.right.cy * height}
            r={rightR}
            fill={eyeCalibration.colorTheme.eyeWhite}
          />
          <circle
            cx={rightPupil.x}
            cy={rightPupil.y}
            r={rightPupilR}
            fill={eyeCalibration.colorTheme.pupil}
          />
        </svg>
      </motion.div>

      <button
        onClick={(e) => { e.stopPropagation(); onToggleMode(); }}
        className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gray-900 px-2.5 py-1 text-[10px] font-medium text-white opacity-0 transition-opacity hover:bg-gray-700 group-hover:opacity-100"
        style={{ opacity: undefined }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.6"; }}
      >
        {mode === "anchored" ? "Pin to screen" : "Anchor to page"}
      </button>
    </div>
  );
}

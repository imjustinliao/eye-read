import { useRef, useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { motion, useAnimationControls } from "framer-motion";
import type { EyeCalibrationPair } from "@/components/EyePlacementTool";
import { getPupilPosition } from "@/lib/eye-tracking";

type CompanionProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  onDragStart: (e: React.MouseEvent) => void;
  didDrag: React.RefObject<boolean>;
  onRotate: (angleDeg: number) => void;
  eyeCalibration: EyeCalibrationPair;
  mode: "anchored" | "fixed";
  onToggleMode: () => void;
};

export default function Companion({
  x, y, width, height,
  onDragStart, didDrag, onRotate,
  eyeCalibration, mode, onToggleMode,
}: CompanionProps) {
  const controls = useAnimationControls();
  const totalRotation = useRef(0);

  // Pupil positions (in pixels, relative to companion top-left)
  const [leftPupil, setLeftPupil] = useState({ x: 0, y: 0 });
  const [rightPupil, setRightPupil] = useState({ x: 0, y: 0 });
  const rafRef = useRef(0);

  // Track cursor and update pupils using requestAnimationFrame
  useEffect(() => {
    let latestMouseX = 0;
    let latestMouseY = 0;

    const updatePupils = () => {
      const lp = getPupilPosition(
        eyeCalibration.left, latestMouseX, latestMouseY,
        x, y, width, height,
      );
      const rp = getPupilPosition(
        eyeCalibration.right, latestMouseX, latestMouseY,
        x, y, width, height,
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

    window.addEventListener("mousemove", handleMouseMove);
    // Initial position
    updatePupils();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [x, y, width, height, eyeCalibration]);

  const handleMouseUp = () => {
    if (!didDrag.current) {
      const nudge = 15 + Math.random() * 10;
      totalRotation.current += nudge;

      const size = Math.max(width, height);
      const duration = size * 0.002;

      controls.start({
        rotate: totalRotation.current,
        transition: {
          duration,
          ease: [0.2, 0.8, 0.3, 1],
        },
      });

      onRotate(totalRotation.current);
    }
  };

  // Eye rendering helpers
  const leftR = eyeCalibration.left.r * width;
  const rightR = eyeCalibration.right.r * width;
  const leftPupilR = leftR * 0.4;
  const rightPupilR = rightR * 0.4;

  return (
    <div
      className={`${mode === "fixed" ? "fixed" : "absolute"} cursor-grab active:cursor-grabbing`}
      style={{ left: x, top: y, width, height, zIndex: 50 }}
      onMouseDown={onDragStart}
      onMouseUp={handleMouseUp}
    >
      <motion.div animate={controls} className="relative">
        <Image
          src="/companions/mark.png"
          alt="Companion"
          width={width}
          height={height}
          draggable={false}
          className="select-none"
        />

        {/* Eye overlays */}
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
            cx={leftPupil.x - x}
            cy={leftPupil.y - y}
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
            cx={rightPupil.x - x}
            cy={rightPupil.y - y}
            r={rightPupilR}
            fill={eyeCalibration.colorTheme.pupil}
          />
        </svg>
      </motion.div>

      {/* Mode toggle button — appears on hover */}
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

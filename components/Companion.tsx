import { useRef } from "react";
import Image from "next/image";
import { motion, useAnimationControls } from "framer-motion";

type CompanionProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  onDragStart: (e: React.MouseEvent) => void;
  didDrag: React.RefObject<boolean>;
  onRotate: (angleDeg: number) => void;
};

export default function Companion({ x, y, width, height, onDragStart, didDrag, onRotate }: CompanionProps) {
  const controls = useAnimationControls();
  const totalRotation = useRef(0);

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

      // Tell the canvas page about the new angle so text reflows to match
      onRotate(totalRotation.current);
    }
  };

  return (
    <div
      className="absolute cursor-grab active:cursor-grabbing"
      style={{ left: x, top: y, width, height }}
      onMouseDown={onDragStart}
      onMouseUp={handleMouseUp}
    >
      <motion.div animate={controls}>
        <Image
          src="/companions/mark.png"
          alt="Companion"
          width={width}
          height={height}
          draggable={false}
          className="select-none"
        />
      </motion.div>
    </div>
  );
}

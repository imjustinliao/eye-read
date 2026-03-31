import type { EyeCalibration } from "@/components/EyePlacementTool";

/**
 * Calculate where a pupil should be, given the cursor position.
 *
 * The pupil moves toward the cursor but stays inside the eye boundary.
 * Returns the pupil center in pixels, relative to the companion's top-left.
 *
 * How the math works:
 * 1. Find the angle from the eye center to the cursor (using atan2)
 * 2. Find the distance from the eye center to the cursor
 * 3. The pupil moves proportionally toward the cursor, but is clamped
 *    so it never exits the eye boundary (radius minus pupil size)
 */
export function getPupilPosition(
  eye: EyeCalibration,
  cursorX: number,
  cursorY: number,
  companionX: number,
  companionY: number,
  companionWidth: number,
  companionHeight: number,
): { x: number; y: number } {
  // Convert fractional eye position to pixel position on the page
  const eyeCenterX = companionX + eye.cx * companionWidth;
  const eyeCenterY = companionY + eye.cy * companionHeight;
  const eyeRadius = eye.r * companionWidth;

  // Pupil is smaller than the eye — leave room so it stays inside
  const pupilRadius = eyeRadius * 0.4;
  const maxDistance = eyeRadius - pupilRadius;

  // Vector from eye center to cursor
  const dx = cursorX - eyeCenterX;
  const dy = cursorY - eyeCenterY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance === 0) {
    // Cursor is exactly on the eye center — pupil stays centered
    return { x: eyeCenterX, y: eyeCenterY };
  }

  // How far the pupil should move (proportional, with a cap)
  // The pupil reaches the edge when the cursor is ~200px away
  const pullStrength = Math.min(1, distance / 200);
  const pupilDistance = pullStrength * maxDistance;

  // Unit vector (direction) from eye center to cursor
  const ux = dx / distance;
  const uy = dy / distance;

  return {
    x: eyeCenterX + ux * pupilDistance,
    y: eyeCenterY + uy * pupilDistance,
  };
}

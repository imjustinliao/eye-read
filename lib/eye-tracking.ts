import type { EyeCalibration } from "@/components/EyePlacementTool";

/**
 * Calculate pupil position in the companion's LOCAL coordinate space
 * (relative to companion top-left, before rotation).
 *
 * Takes the cursor position in viewport coords, the companion's viewport
 * rect, and the rotation angle to correctly un-rotate the cursor direction.
 *
 * Returns {x, y} in local companion coords (0,0 = companion top-left).
 */
export function getPupilLocal(
  eye: EyeCalibration,
  cursorX: number,
  cursorY: number,
  companionRect: { left: number; top: number; width: number; height: number },
  companionWidth: number,
  companionHeight: number,
  rotationDeg: number,
): { x: number; y: number } {
  // Eye center in local coords
  const localEyeX = eye.cx * companionWidth;
  const localEyeY = eye.cy * companionHeight;
  const eyeRadius = eye.r * companionWidth;
  const pupilRadius = eyeRadius * 0.4;
  const maxDistance = eyeRadius - pupilRadius;

  // Companion center in viewport coords
  const compCenterVpX = companionRect.left + companionRect.width / 2;
  const compCenterVpY = companionRect.top + companionRect.height / 2;

  // Cursor relative to companion center (viewport space)
  const relX = cursorX - compCenterVpX;
  const relY = cursorY - compCenterVpY;

  // Un-rotate cursor direction to get it in local (un-rotated) space
  const angleRad = (-rotationDeg * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const localCursorX = relX * cos - relY * sin;
  const localCursorY = relX * sin + relY * cos;

  // Now localCursor is relative to companion center in local space.
  // Convert to be relative to companion top-left.
  const cursorFromOriginX = localCursorX + companionWidth / 2;
  const cursorFromOriginY = localCursorY + companionHeight / 2;

  // Vector from eye center to cursor (both in local space)
  const dx = cursorFromOriginX - localEyeX;
  const dy = cursorFromOriginY - localEyeY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance === 0) {
    return { x: localEyeX, y: localEyeY };
  }

  const pullStrength = Math.min(1, distance / 150);
  const pupilDistance = pullStrength * maxDistance;

  const ux = dx / distance;
  const uy = dy / distance;

  return {
    x: localEyeX + ux * pupilDistance,
    y: localEyeY + uy * pupilDistance,
  };
}

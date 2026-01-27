/**
 * Organic contour renderer with Catmull-Rom splines and variable width strokes.
 * Creates beautiful, flowing line aesthetics inspired by BabyTrack/TouchDesigner.
 */

import type { TrackedContour } from './ContourTracker';

export interface RenderStyle {
  color: string;
  baseWidth: number; // 1-10px
  velocityResponse: number; // 0-1, how much speed affects width
  taperAmount: number; // 0-1, how much trails thin at tail
  glowIntensity: number; // 0-1
  glowColor: string;
}

export interface TrailPoint {
  x: number;
  y: number;
  width: number;
  opacity: number;
  timestamp: number;
  contourId: number;
}

// Minimum stroke width to prevent invisible strokes
const MIN_STROKE_WIDTH = 0.5;

// Number of interpolated points between each control point pair
const SPLINE_SEGMENTS = 10;

// Maximum trail duration in milliseconds (10 seconds)
const MAX_TRAIL_DURATION = 10000;

export class OrganicRenderer {
  private trails: Map<number, TrailPoint[]> = new Map();

  /**
   * Render contours with organic styling to a canvas context.
   * @param ctx - Canvas 2D rendering context
   * @param contours - Array of tracked contours to render
   * @param style - Render style configuration
   * @param width - Canvas width in pixels
   * @param height - Canvas height in pixels
   * @param timestamp - Current timestamp in milliseconds
   */
  render(
    ctx: CanvasRenderingContext2D,
    contours: TrackedContour[],
    style: RenderStyle,
    width: number,
    height: number,
    _timestamp: number
  ): void {
    ctx.save();

    // Set up glow effect if enabled
    if (style.glowIntensity > 0) {
      ctx.shadowBlur = style.glowIntensity * 20;
      ctx.shadowColor = style.glowColor;
    }

    // Render each contour's trail
    for (const contour of contours) {
      const trail = this.trails.get(contour.id);
      if (!trail || trail.length < 2) continue;

      // Apply taper to trail points
      const taperedTrail = this.applyTaper(trail, style.taperAmount);

      // Convert trail points to canvas coordinates
      const canvasPoints = taperedTrail.map((p) => ({
        x: p.x * width,
        y: p.y * height,
        width: p.width,
        opacity: p.opacity,
      }));

      // Generate smooth spline through points
      const splinePoints = this.catmullRomSpline(canvasPoints);

      // Interpolate widths along the spline
      const pointsWithWidth = this.interpolateWidths(canvasPoints, splinePoints);

      // Draw variable width stroke
      ctx.fillStyle = style.color;
      ctx.globalAlpha = 1;
      this.drawVariableWidthStroke(ctx, pointsWithWidth);
    }

    // Also render current contour outlines for immediate feedback
    for (const contour of contours) {
      if (contour.smoothedPoints.length < 3) continue;

      // Calculate width based on velocity
      const strokeWidth = this.calculateWidth(
        contour.velocity,
        style.baseWidth,
        style.velocityResponse
      );

      // Convert to canvas coordinates
      const canvasPoints = contour.smoothedPoints.map((p) => ({
        x: p.x * width,
        y: p.y * height,
        width: strokeWidth,
      }));

      // Generate smooth spline
      const splinePoints = this.catmullRomSpline(canvasPoints);

      // Add width to spline points
      const pointsWithWidth = splinePoints.map((p) => ({
        ...p,
        width: strokeWidth,
      }));

      // Draw the contour
      ctx.fillStyle = style.color;
      ctx.globalAlpha = 1;
      this.drawVariableWidthStroke(ctx, pointsWithWidth);
    }

    ctx.restore();
  }

  /**
   * Catmull-Rom spline interpolation that passes through all control points.
   * @param points - Control points to interpolate through
   * @param tension - Spline tension (0.5 default, lower = looser, higher = tighter)
   * @returns Array of interpolated points
   */
  private catmullRomSpline(
    points: { x: number; y: number }[],
    tension: number = 0.5
  ): { x: number; y: number }[] {
    if (points.length < 2) return [...points];
    if (points.length === 2) {
      // Just return the two points with some interpolation
      const result: { x: number; y: number }[] = [];
      for (let i = 0; i <= SPLINE_SEGMENTS; i++) {
        const t = i / SPLINE_SEGMENTS;
        result.push({
          x: points[0].x + (points[1].x - points[0].x) * t,
          y: points[0].y + (points[1].y - points[0].y) * t,
        });
      }
      return result;
    }

    const result: { x: number; y: number }[] = [];

    // Process each segment
    for (let i = 0; i < points.length - 1; i++) {
      // Get four points for the spline segment
      // Use boundary points when at edges
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      // Generate interpolated points for this segment
      for (let j = 0; j <= (i === points.length - 2 ? SPLINE_SEGMENTS : SPLINE_SEGMENTS - 1); j++) {
        const t = j / SPLINE_SEGMENTS;

        // Catmull-Rom basis functions
        const t2 = t * t;
        const t3 = t2 * t;

        // Compute position using Catmull-Rom formula
        // P(t) = 0.5 * [(2*P1) + (-P0 + P2)*t + (2*P0 - 5*P1 + 4*P2 - P3)*t^2 + (-P0 + 3*P1 - 3*P2 + P3)*t^3]
        const x =
          0.5 *
          (2 * p1.x +
            (-p0.x + p2.x) * t * tension +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 * tension +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3 * tension);

        const y =
          0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * t * tension +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 * tension +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3 * tension);

        result.push({ x, y });
      }
    }

    return result;
  }

  /**
   * Interpolate widths and opacity along the spline based on control point values.
   * @param controlPoints - Original control points with widths and optional opacity
   * @param splinePoints - Interpolated spline points
   * @returns Spline points with interpolated widths and opacity
   */
  private interpolateWidths(
    controlPoints: { x: number; y: number; width: number; opacity?: number }[],
    splinePoints: { x: number; y: number }[]
  ): { x: number; y: number; width: number; opacity: number }[] {
    if (controlPoints.length < 2 || splinePoints.length === 0) {
      return splinePoints.map((p) => ({
        ...p,
        width: controlPoints[0]?.width || 1,
        opacity: controlPoints[0]?.opacity ?? 1,
      }));
    }

    const result: { x: number; y: number; width: number; opacity: number }[] = [];
    const totalSplinePoints = splinePoints.length;

    for (let i = 0; i < totalSplinePoints; i++) {
      // Calculate which segment this point belongs to
      const t = totalSplinePoints === 1 ? 0 : i / (totalSplinePoints - 1);
      const segmentFloat = t * (controlPoints.length - 1);
      const segmentIndex = Math.min(Math.floor(segmentFloat), controlPoints.length - 2);
      const localT = segmentFloat - segmentIndex;

      // Interpolate width between control points
      const w1 = controlPoints[segmentIndex].width;
      const w2 = controlPoints[segmentIndex + 1].width;
      const width = w1 + (w2 - w1) * localT;

      // Interpolate opacity between control points
      const o1 = controlPoints[segmentIndex].opacity ?? 1;
      const o2 = controlPoints[segmentIndex + 1].opacity ?? 1;
      const opacity = o1 + (o2 - o1) * localT;

      result.push({
        ...splinePoints[i],
        width,
        opacity,
      });
    }

    return result;
  }

  /**
   * Draw a stroke with variable width using filled polygons.
   * Creates offset curves on both sides of the path and fills the resulting shape.
   * @param ctx - Canvas 2D rendering context
   * @param points - Points with x, y, width, and optional opacity properties
   */
  private drawVariableWidthStroke(
    ctx: CanvasRenderingContext2D,
    points: { x: number; y: number; width: number; opacity?: number }[]
  ): void {
    if (points.length < 2) return;

    // Calculate perpendicular offsets for each point
    const leftSide: { x: number; y: number }[] = [];
    const rightSide: { x: number; y: number }[] = [];

    for (let i = 0; i < points.length; i++) {
      const curr = points[i];

      // Calculate direction vector
      let dx: number, dy: number;

      if (i === 0) {
        // First point: use direction to next point
        dx = points[1].x - curr.x;
        dy = points[1].y - curr.y;
      } else if (i === points.length - 1) {
        // Last point: use direction from previous point
        dx = curr.x - points[i - 1].x;
        dy = curr.y - points[i - 1].y;
      } else {
        // Middle points: average direction
        dx = points[i + 1].x - points[i - 1].x;
        dy = points[i + 1].y - points[i - 1].y;
      }

      // Normalize direction
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.0001) {
        // If direction is too small, use previous perpendicular or skip
        if (leftSide.length > 0) {
          leftSide.push(leftSide[leftSide.length - 1]);
          rightSide.push(rightSide[rightSide.length - 1]);
        }
        continue;
      }

      dx /= len;
      dy /= len;

      // Perpendicular vector (90 degrees rotated)
      const perpX = -dy;
      const perpY = dx;

      // Offset by half width
      const halfWidth = curr.width / 2;

      leftSide.push({
        x: curr.x + perpX * halfWidth,
        y: curr.y + perpY * halfWidth,
      });

      rightSide.push({
        x: curr.x - perpX * halfWidth,
        y: curr.y - perpY * halfWidth,
      });
    }

    if (leftSide.length < 2) return;

    // Draw the polygon: left side forward, right side backward
    ctx.beginPath();
    ctx.moveTo(leftSide[0].x, leftSide[0].y);

    for (let i = 1; i < leftSide.length; i++) {
      ctx.lineTo(leftSide[i].x, leftSide[i].y);
    }

    // Round cap at the end
    const lastLeft = leftSide[leftSide.length - 1];
    const lastPoint = points[points.length - 1];

    // Draw semicircle at end
    const endAngle = Math.atan2(lastLeft.y - lastPoint.y, lastLeft.x - lastPoint.x);
    ctx.arc(lastPoint.x, lastPoint.y, lastPoint.width / 2, endAngle, endAngle + Math.PI);

    // Right side backward
    for (let i = rightSide.length - 1; i >= 0; i--) {
      ctx.lineTo(rightSide[i].x, rightSide[i].y);
    }

    // Round cap at the start
    const firstRight = rightSide[0];
    const firstPoint = points[0];

    const startAngle = Math.atan2(firstRight.y - firstPoint.y, firstRight.x - firstPoint.x);
    ctx.arc(firstPoint.x, firstPoint.y, firstPoint.width / 2, startAngle, startAngle + Math.PI);

    ctx.closePath();

    // Apply average opacity from points
    const avgOpacity =
      points.reduce((sum, p) => sum + (p.opacity ?? 1), 0) / points.length;
    ctx.globalAlpha = avgOpacity;

    ctx.fill();
  }

  /**
   * Calculate stroke width based on velocity.
   * Higher velocity = thinner strokes for a whippy, energetic feel.
   * @param velocity - Current velocity in normalized units per second
   * @param baseWidth - Base stroke width in pixels
   * @param velocityResponse - How much velocity affects width (0-1)
   * @returns Calculated stroke width
   */
  private calculateWidth(
    velocity: number,
    baseWidth: number,
    velocityResponse: number
  ): number {
    // Normalize velocity (assuming typical velocity range of 0-2 normalized units/sec)
    const normalizedVelocity = Math.min(velocity / 2, 1);

    // Higher velocity = thinner stroke
    const widthMultiplier = 1 - normalizedVelocity * velocityResponse;

    // Calculate final width with minimum
    return Math.max(MIN_STROKE_WIDTH, baseWidth * widthMultiplier);
  }

  /**
   * Apply taper effect to trail points.
   * Head (newest, index 0) gets full width, tail (oldest) thins based on taperAmount.
   * @param points - Trail points to taper
   * @param taperAmount - How much to thin the tail (0-1)
   * @returns New array of tapered trail points
   */
  private applyTaper(points: TrailPoint[], taperAmount: number): TrailPoint[] {
    if (points.length === 0) return [];
    if (taperAmount === 0) return points;

    return points.map((point, index) => {
      // Calculate taper factor: 1 at head (index 0), (1-taperAmount) at tail
      const progress = index / (points.length - 1 || 1);
      const taperFactor = 1 - progress * taperAmount;

      return {
        ...point,
        width: point.width * taperFactor,
        // Also fade opacity slightly with taper
        opacity: point.opacity * (0.3 + 0.7 * taperFactor),
      };
    });
  }

  /**
   * Update trail history with new contour positions.
   * @param contours - Current tracked contours
   * @param timestamp - Current timestamp in milliseconds
   * @param trailLength - Trail duration in seconds
   * @param style - Render style configuration
   */
  updateTrails(contours: TrackedContour[], timestamp: number, trailLength: number, style: RenderStyle): void {
    const trailDurationMs = Math.min(trailLength * 1000, MAX_TRAIL_DURATION);

    // Track which contour IDs are currently active
    const activeIds = new Set(contours.map((c) => c.id));

    // Update trails for each active contour
    for (const contour of contours) {
      let trail = this.trails.get(contour.id);

      if (!trail) {
        trail = [];
        this.trails.set(contour.id, trail);
      }

      // Calculate width based on velocity
      const width = this.calculateWidth(contour.velocity, style.baseWidth, style.velocityResponse);

      // Add new point at the head (index 0)
      const newPoint: TrailPoint = {
        x: contour.centroid.x,
        y: contour.centroid.y,
        width,
        opacity: 1,
        timestamp,
        contourId: contour.id,
      };

      // Insert at beginning (newest first)
      trail.unshift(newPoint);

      // Remove old points beyond trail duration
      const cutoffTime = timestamp - trailDurationMs;
      while (trail.length > 0 && trail[trail.length - 1].timestamp < cutoffTime) {
        trail.pop();
      }

      // Limit trail length to prevent memory issues
      const maxPoints = 500;
      if (trail.length > maxPoints) {
        trail.length = maxPoints;
      }
    }

    // Clean up trails for contours that no longer exist
    for (const [id, trail] of this.trails.entries()) {
      if (!activeIds.has(id)) {
        // Check if trail should be completely removed
        if (trail.length === 0 || trail[trail.length - 1].timestamp < timestamp - trailDurationMs) {
          this.trails.delete(id);
        }
      }
    }
  }

  /**
   * Clear all trail data.
   */
  clearTrails(): void {
    this.trails.clear();
  }

  /**
   * Get trail data for a specific contour.
   * @param contourId - ID of the contour
   * @returns Trail points or undefined if not found
   */
  getTrail(contourId: number): TrailPoint[] | undefined {
    return this.trails.get(contourId);
  }

  /**
   * Get the number of active trails.
   */
  getTrailCount(): number {
    return this.trails.size;
  }
}

/**
 * Contour tracking with temporal smoothing for stable video effects.
 * Tracks contours across frames and applies exponential moving average smoothing.
 */

import type { Contour, ContourPoint } from './MarchingSquares';

export interface TrackedContour extends Contour {
  velocity: number; // pixels per second (normalized space)
  velocityVector: { x: number; y: number };
  age: number; // frames since first detected
  lastSeen: number; // timestamp in milliseconds
  smoothedPoints: ContourPoint[];
}

export interface ContourTrackerOptions {
  smoothing?: number;
}

// Matching thresholds
const MAX_CENTROID_DISTANCE = 0.15; // Maximum centroid distance for matching (normalized)
const AREA_SIMILARITY_WEIGHT = 0.3; // Weight for area similarity in matching score
const FADE_OUT_DURATION = 200; // Milliseconds to keep unmatched contours

export class ContourTracker {
  private tracked: Map<number, TrackedContour> = new Map();
  private nextId: number = 0;
  private smoothing: number = 0.6;
  private lastTimestamp: number = 0;

  constructor(options?: ContourTrackerOptions) {
    if (options?.smoothing !== undefined) {
      this.smoothing = Math.max(0, Math.min(1, options.smoothing));
    }
  }

  /**
   * Update tracked contours with new frame data.
   * @param contours - New contours detected in current frame
   * @param timestamp - Current frame timestamp in milliseconds
   * @returns Array of tracked contours with smoothing applied
   */
  update(contours: Contour[], timestamp: number): TrackedContour[] {
    const deltaTime = this.lastTimestamp > 0 ? timestamp - this.lastTimestamp : 0;
    this.lastTimestamp = timestamp;

    const existingTracked = Array.from(this.tracked.values());

    // Match new contours to existing tracked contours
    const matches = this.matchContours(contours, existingTracked);

    // Set to track which existing contours were matched
    const matchedExistingIds = new Set<number>();

    // Process matched contours
    for (const [newIndex, existingId] of matches.entries()) {
      const newContour = contours[newIndex];
      const existing = this.tracked.get(existingId)!;
      matchedExistingIds.add(existingId);

      // Calculate velocity from centroid movement
      const { velocity, vector } = this.calculateVelocity(
        newContour.centroid,
        existing.centroid,
        deltaTime
      );

      // Apply smoothing to points
      const smoothedPoints = this.smoothPoints(
        newContour.points,
        existing.smoothedPoints,
        this.smoothing
      );

      // Calculate smoothed centroid
      const smoothedCentroid = this.calculateCentroid(smoothedPoints);

      // Update tracked contour
      const updated: TrackedContour = {
        ...newContour,
        id: existingId,
        centroid: smoothedCentroid,
        velocity,
        velocityVector: vector,
        age: existing.age + 1,
        lastSeen: timestamp,
        smoothedPoints,
      };

      this.tracked.set(existingId, updated);
    }

    // Create new tracked contours for unmatched new contours
    for (let i = 0; i < contours.length; i++) {
      if (!matches.has(i)) {
        const newContour = contours[i];
        const id = this.nextId++;

        const tracked: TrackedContour = {
          ...newContour,
          id,
          velocity: 0,
          velocityVector: { x: 0, y: 0 },
          age: 0,
          lastSeen: timestamp,
          smoothedPoints: [...newContour.points],
        };

        this.tracked.set(id, tracked);
      }
    }

    // Handle unmatched existing contours (fade-out period)
    for (const existing of existingTracked) {
      if (!matchedExistingIds.has(existing.id)) {
        const timeSinceLastSeen = timestamp - existing.lastSeen;

        if (timeSinceLastSeen >= FADE_OUT_DURATION) {
          // Remove contour after fade-out period
          this.tracked.delete(existing.id);
        }
        // Otherwise, keep the contour in tracked map (it will fade out)
      }
    }

    return Array.from(this.tracked.values());
  }

  /**
   * Match new contours to existing tracked contours using centroid distance
   * and area similarity.
   * @param newContours - Contours detected in current frame
   * @param existing - Currently tracked contours
   * @returns Map of newIndex -> existingId for matched pairs
   */
  private matchContours(
    newContours: Contour[],
    existing: TrackedContour[]
  ): Map<number, number> {
    const matches = new Map<number, number>();

    if (newContours.length === 0 || existing.length === 0) {
      return matches;
    }

    // Calculate all pairwise scores
    const scores: Array<{
      newIndex: number;
      existingId: number;
      score: number;
    }> = [];

    for (let i = 0; i < newContours.length; i++) {
      const newContour = newContours[i];

      for (const tracked of existing) {
        // Calculate centroid distance
        const dx = newContour.centroid.x - tracked.centroid.x;
        const dy = newContour.centroid.y - tracked.centroid.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Skip if too far apart
        if (distance > MAX_CENTROID_DISTANCE) continue;

        // Calculate area similarity (ratio clamped to reasonable range)
        const areaRatio = tracked.area > 0 ? newContour.area / tracked.area : 1;
        const clampedRatio = Math.max(0.5, Math.min(2, areaRatio));
        const areaSimilarity = Math.abs(1 - clampedRatio);

        // Combined score (lower is better)
        const score = distance + areaSimilarity * AREA_SIMILARITY_WEIGHT;

        scores.push({
          newIndex: i,
          existingId: tracked.id,
          score,
        });
      }
    }

    // Sort by score (lowest first)
    scores.sort((a, b) => a.score - b.score);

    // Greedy matching: assign best matches first
    const usedNew = new Set<number>();
    const usedExisting = new Set<number>();

    for (const { newIndex, existingId, score: _score } of scores) {
      if (usedNew.has(newIndex) || usedExisting.has(existingId)) continue;

      matches.set(newIndex, existingId);
      usedNew.add(newIndex);
      usedExisting.add(existingId);
    }

    return matches;
  }

  /**
   * Apply exponential moving average smoothing to contour points.
   * @param current - Current frame points
   * @param previous - Previous smoothed points
   * @param factor - Smoothing factor (0-1, higher = more smoothing)
   * @returns Smoothed points
   */
  private smoothPoints(
    current: ContourPoint[],
    previous: ContourPoint[],
    factor: number
  ): ContourPoint[] {
    // If point counts differ significantly, just use current points
    if (previous.length === 0 || Math.abs(current.length - previous.length) > current.length * 0.5) {
      return [...current];
    }

    const smoothed: ContourPoint[] = [];

    // Use the shorter length for iteration
    const len = Math.min(current.length, previous.length);

    for (let i = 0; i < len; i++) {
      // EMA: smoothed = previous * factor + current * (1 - factor)
      smoothed.push({
        x: previous[i].x * factor + current[i].x * (1 - factor),
        y: previous[i].y * factor + current[i].y * (1 - factor),
      });
    }

    // If current has more points, add them without smoothing
    for (let i = len; i < current.length; i++) {
      smoothed.push({ ...current[i] });
    }

    return smoothed;
  }

  /**
   * Calculate velocity from centroid movement between frames.
   * @param current - Current centroid position
   * @param previous - Previous centroid position
   * @param deltaTime - Time between frames in milliseconds
   * @returns Velocity magnitude and vector
   */
  private calculateVelocity(
    current: ContourPoint,
    previous: ContourPoint,
    deltaTime: number
  ): { velocity: number; vector: { x: number; y: number } } {
    if (deltaTime <= 0) {
      return { velocity: 0, vector: { x: 0, y: 0 } };
    }

    const dx = current.x - previous.x;
    const dy = current.y - previous.y;

    // Convert to per-second rate (deltaTime is in ms)
    const timeInSeconds = deltaTime / 1000;
    const vx = dx / timeInSeconds;
    const vy = dy / timeInSeconds;

    const velocity = Math.sqrt(vx * vx + vy * vy);

    return {
      velocity,
      vector: { x: vx, y: vy },
    };
  }

  /**
   * Calculate centroid from points.
   */
  private calculateCentroid(points: ContourPoint[]): ContourPoint {
    if (points.length === 0) {
      return { x: 0, y: 0 };
    }

    let sumX = 0;
    let sumY = 0;

    for (const point of points) {
      sumX += point.x;
      sumY += point.y;
    }

    return {
      x: sumX / points.length,
      y: sumY / points.length,
    };
  }

  /**
   * Set the smoothing factor for temporal averaging.
   * @param value - Smoothing factor (0-1, higher = more smoothing)
   */
  setSmoothing(value: number): void {
    this.smoothing = Math.max(0, Math.min(1, value));
  }

  /**
   * Get current smoothing factor.
   */
  getSmoothing(): number {
    return this.smoothing;
  }

  /**
   * Clear all tracked contours.
   */
  clear(): void {
    this.tracked.clear();
  }

  /**
   * Get the number of currently tracked contours.
   */
  getTrackedCount(): number {
    return this.tracked.size;
  }
}

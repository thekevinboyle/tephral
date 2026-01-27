/**
 * Marching Squares contour extraction for binary images.
 * Extracts polyline paths representing boundaries between "on" and "off" regions.
 */

export interface ContourPoint {
  x: number; // normalized 0-1
  y: number; // normalized 0-1
}

export interface Contour {
  id: number;
  points: ContourPoint[];
  centroid: ContourPoint;
  area: number;
  boundingBox: { x: number; y: number; width: number; height: number };
}

/**
 * Direction vectors for marching squares edge traversal.
 * Index corresponds to the case number (0-15).
 * Each case defines how to move to the next cell.
 */
const DIRECTION_LOOKUP: { dx: number; dy: number }[] = [
  { dx: 0, dy: 0 }, // 0: no contour
  { dx: 0, dy: 1 }, // 1: bottom-left corner
  { dx: 1, dy: 0 }, // 2: bottom-right corner
  { dx: 1, dy: 0 }, // 3: bottom edge
  { dx: 0, dy: -1 }, // 4: top-right corner
  { dx: 0, dy: 0 }, // 5: saddle (ambiguous)
  { dx: 0, dy: -1 }, // 6: right edge
  { dx: 1, dy: 0 }, // 7: only top-left outside
  { dx: -1, dy: 0 }, // 8: top-left corner
  { dx: 0, dy: 1 }, // 9: left edge
  { dx: 0, dy: 0 }, // 10: saddle (ambiguous)
  { dx: 0, dy: 1 }, // 11: only top-right outside
  { dx: -1, dy: 0 }, // 12: top edge
  { dx: -1, dy: 0 }, // 13: only bottom-right outside
  { dx: 0, dy: -1 }, // 14: only bottom-left outside
  { dx: 0, dy: 0 }, // 15: fully inside
];

export class MarchingSquares {
  private width: number = 0;
  private height: number = 0;
  private binaryGrid: Uint8Array = new Uint8Array(0);
  private visited: Set<number> = new Set();
  private contourId: number = 0;

  /**
   * Extract contours from a binary image using the marching squares algorithm.
   * @param imageData - RGBA pixel data (4 bytes per pixel)
   * @param width - Image width in pixels
   * @param height - Image height in pixels
   * @param threshold - Luminance threshold (0-255) for binary classification
   * @returns Array of extracted contours with normalized coordinates
   */
  extract(
    imageData: Uint8Array,
    width: number,
    height: number,
    threshold: number
  ): Contour[] {
    this.width = width;
    this.height = height;
    this.visited.clear();
    this.contourId = 0;

    // Convert RGBA to binary grid based on threshold
    this.binaryGrid = this.createBinaryGrid(imageData, threshold);

    const contours: Contour[] = [];

    // Scan for contour starting points along edges and internal boundaries
    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        const caseIndex = this.getCaseIndex(x, y);

        // Skip if no contour edge or already visited
        if (caseIndex === 0 || caseIndex === 15) continue;

        const cellKey = this.getCellKey(x, y, caseIndex);
        if (this.visited.has(cellKey)) continue;

        // Trace the contour starting from this cell
        const points = this.traceContour(x, y);

        if (points.length >= 3) {
          const contour = this.buildContour(points);
          contours.push(contour);
        }
      }
    }

    return contours;
  }

  /**
   * Simplify a contour using the Ramer-Douglas-Peucker algorithm.
   * @param points - Array of contour points
   * @param epsilon - Maximum distance threshold for simplification
   * @returns Simplified array of contour points
   */
  simplify(points: ContourPoint[], epsilon: number): ContourPoint[] {
    if (points.length <= 2) return points;

    // Find the point with maximum distance from the line between first and last
    let maxDistance = 0;
    let maxIndex = 0;

    const start = points[0];
    const end = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
      const distance = this.perpendicularDistance(points[i], start, end);
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }

    // If max distance exceeds epsilon, recursively simplify
    if (maxDistance > epsilon) {
      const left = this.simplify(points.slice(0, maxIndex + 1), epsilon);
      const right = this.simplify(points.slice(maxIndex), epsilon);

      // Combine results, avoiding duplicate point at junction
      return [...left.slice(0, -1), ...right];
    }

    // Otherwise, keep only endpoints
    return [start, end];
  }

  /**
   * Create a binary grid from RGBA image data.
   */
  private createBinaryGrid(imageData: Uint8Array, threshold: number): Uint8Array {
    const grid = new Uint8Array(this.width * this.height);

    for (let i = 0; i < this.width * this.height; i++) {
      const pixelIndex = i * 4;
      // Use luminance formula: 0.299*R + 0.587*G + 0.114*B
      const r = imageData[pixelIndex];
      const g = imageData[pixelIndex + 1];
      const b = imageData[pixelIndex + 2];
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      grid[i] = luminance >= threshold ? 1 : 0;
    }

    return grid;
  }

  /**
   * Get the marching squares case index for a 2x2 cell.
   * Cases 0-15 based on which corners are "on".
   */
  private getCaseIndex(x: number, y: number): number {
    const tl = this.getPixel(x, y);
    const tr = this.getPixel(x + 1, y);
    const br = this.getPixel(x + 1, y + 1);
    const bl = this.getPixel(x, y + 1);

    // Binary encoding: TL=8, TR=4, BR=2, BL=1
    return (tl << 3) | (tr << 2) | (br << 1) | bl;
  }

  /**
   * Get binary pixel value at coordinates.
   */
  private getPixel(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    return this.binaryGrid[y * this.width + x];
  }

  /**
   * Generate a unique key for a cell/edge combination.
   */
  private getCellKey(x: number, y: number, direction: number): number {
    return y * this.width * 16 + x * 16 + direction;
  }

  /**
   * Trace a complete contour starting from the given cell.
   */
  private traceContour(startX: number, startY: number): ContourPoint[] {
    const points: ContourPoint[] = [];
    let x = startX;
    let y = startY;
    let prevDirection = -1;

    const maxIterations = this.width * this.height * 2;
    let iterations = 0;

    do {
      if (iterations++ > maxIterations) break;

      const caseIndex = this.getCaseIndex(x, y);
      if (caseIndex === 0 || caseIndex === 15) break;

      // Mark this cell as visited
      const cellKey = this.getCellKey(x, y, caseIndex);
      this.visited.add(cellKey);

      // Get the edge point for this case
      const edgePoint = this.getEdgePoint(x, y, caseIndex, prevDirection);
      if (edgePoint) {
        points.push(edgePoint);
      }

      // Get next direction based on case and previous direction
      const nextDir = this.getNextDirection(caseIndex, prevDirection);
      if (!nextDir || (nextDir.dx === 0 && nextDir.dy === 0)) break;

      // Move to next cell
      x += nextDir.dx;
      y += nextDir.dy;
      prevDirection = this.getEntryDirection(nextDir);

      // Check bounds
      if (x < 0 || x >= this.width - 1 || y < 0 || y >= this.height - 1) break;

      // Check if we've returned to start
      if (x === startX && y === startY) {
        // Close the contour
        const finalCase = this.getCaseIndex(x, y);
        const finalPoint = this.getEdgePoint(x, y, finalCase, prevDirection);
        if (finalPoint && points.length > 0) {
          // Only add if different from first point
          const first = points[0];
          if (
            Math.abs(finalPoint.x - first.x) > 0.001 ||
            Math.abs(finalPoint.y - first.y) > 0.001
          ) {
            points.push(finalPoint);
          }
        }
        break;
      }
    } while (true);

    return points;
  }

  /**
   * Get the edge interpolation point for a marching squares case.
   */
  private getEdgePoint(
    x: number,
    y: number,
    caseIndex: number,
    _prevDirection: number
  ): ContourPoint | null {
    // Calculate edge midpoints based on case
    // Using linear interpolation at cell edges
    let px = x;
    let py = y;

    switch (caseIndex) {
      case 1: // bottom-left corner
      case 14:
        px = x;
        py = y + 0.5;
        break;
      case 2: // bottom-right corner
      case 13:
        px = x + 0.5;
        py = y + 1;
        break;
      case 3: // bottom edge
      case 12:
        px = x + 0.5;
        py = y + 1;
        break;
      case 4: // top-right corner
      case 11:
        px = x + 1;
        py = y + 0.5;
        break;
      case 5: // saddle - diagonal from BL to TR
        px = x + 0.5;
        py = y + 0.5;
        break;
      case 6: // right edge
      case 9:
        px = x;
        py = y + 0.5;
        break;
      case 7: // only top-left outside
      case 8:
        px = x + 0.5;
        py = y;
        break;
      case 10: // saddle - diagonal from TL to BR
        px = x + 0.5;
        py = y + 0.5;
        break;
      default:
        return null;
    }

    // Normalize to 0-1 space
    return {
      x: px / (this.width - 1),
      y: py / (this.height - 1),
    };
  }

  /**
   * Get the next direction to traverse based on case and entry direction.
   */
  private getNextDirection(
    caseIndex: number,
    prevDirection: number
  ): { dx: number; dy: number } | null {
    // Handle saddle points (cases 5 and 10) based on entry direction
    if (caseIndex === 5) {
      // Saddle point: choose based on entry
      if (prevDirection === 0 || prevDirection === 2) {
        return { dx: 1, dy: 0 };
      }
      return { dx: 0, dy: 1 };
    }
    if (caseIndex === 10) {
      // Saddle point: choose based on entry
      if (prevDirection === 1 || prevDirection === 3) {
        return { dx: 0, dy: -1 };
      }
      return { dx: -1, dy: 0 };
    }

    return DIRECTION_LOOKUP[caseIndex];
  }

  /**
   * Convert a movement direction to an entry direction code.
   * 0=from left, 1=from top, 2=from right, 3=from bottom
   */
  private getEntryDirection(dir: { dx: number; dy: number }): number {
    if (dir.dx === 1) return 0; // entered from left
    if (dir.dx === -1) return 2; // entered from right
    if (dir.dy === 1) return 1; // entered from top
    if (dir.dy === -1) return 3; // entered from bottom
    return -1;
  }

  /**
   * Build a complete Contour object from extracted points.
   */
  private buildContour(points: ContourPoint[]): Contour {
    const centroid = this.calculateCentroid(points);
    const area = this.calculateArea(points);
    const boundingBox = this.calculateBoundingBox(points);

    return {
      id: this.contourId++,
      points,
      centroid,
      area,
      boundingBox,
    };
  }

  /**
   * Calculate the centroid (average position) of contour points.
   */
  private calculateCentroid(points: ContourPoint[]): ContourPoint {
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
   * Calculate the area using the shoelace formula.
   * Returns absolute area in normalized coordinates squared.
   */
  private calculateArea(points: ContourPoint[]): number {
    if (points.length < 3) return 0;

    let area = 0;
    const n = points.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }

    return Math.abs(area) / 2;
  }

  /**
   * Calculate the axis-aligned bounding box for contour points.
   */
  private calculateBoundingBox(
    points: ContourPoint[]
  ): { x: number; y: number; width: number; height: number } {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const point of points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Calculate perpendicular distance from a point to a line segment.
   */
  private perpendicularDistance(
    point: ContourPoint,
    lineStart: ContourPoint,
    lineEnd: ContourPoint
  ): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;

    // Handle degenerate case where start and end are the same
    const lineLengthSq = dx * dx + dy * dy;
    if (lineLengthSq === 0) {
      const pdx = point.x - lineStart.x;
      const pdy = point.y - lineStart.y;
      return Math.sqrt(pdx * pdx + pdy * pdy);
    }

    // Calculate perpendicular distance using cross product
    const numerator = Math.abs(
      dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x
    );
    const denominator = Math.sqrt(lineLengthSq);

    return numerator / denominator;
  }
}

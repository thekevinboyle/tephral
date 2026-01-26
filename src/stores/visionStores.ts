// Re-export all vision-related stores for convenient imports
export { useDetectionStore } from './detectionStore'
export type { Detection, BoundingBox } from './detectionStore'

export { useLandmarksStore } from './landmarksStore'
export type {
  Point2D,
  Point3D,
  Landmark,
  FaceLandmarks,
  HandLandmarks,
  PoseLandmarks,
  LandmarkMode,
} from './landmarksStore'

export { useDetectionOverlayStore, DEFAULT_DETECTION_OVERLAY_PARAMS } from './detectionOverlayStore'
export type { DetectionOverlayParams } from './detectionOverlayStore'

export { usePointNetworkStore, DEFAULT_POINT_NETWORK_PARAMS } from './pointNetworkStore'
export type { PointNetworkParams } from './pointNetworkStore'

export { useAsciiRenderStore, DEFAULT_ASCII_PARAMS, ASCII_CHAR_SETS } from './asciiRenderStore'
export type { AsciiRenderParams, AsciiMode } from './asciiRenderStore'

export { useStippleStore, DEFAULT_STIPPLE_PARAMS } from './stippleStore'
export type { StippleParams } from './stippleStore'

# Mobile App Phase 1 — Monorepo + Expo Scaffold + Camera Preview

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up a Turborepo monorepo with the existing web app and a new Expo iOS app that displays a live camera preview with a basic Skia frame processor.

**Architecture:** Convert the current single-package project into a monorepo with three packages: `shared` (stores, config, types, utils), `web` (existing Vite app), and `mobile` (new Expo app). The mobile app uses react-native-vision-camera with a Skia frame processor to render the live camera feed.

**Tech Stack:** Turborepo, Expo SDK 55, React Native, react-native-vision-camera, @shopify/react-native-skia, react-native-reanimated, zustand, TypeScript

---

### Task 1: Create monorepo root structure

**Files:**
- Create: `package.json` (root — workspace config)
- Create: `turbo.json`
- Rename: current project → `packages/web/`

**Step 1: Create root package.json for workspaces**

Create a new `package.json` at the repo root (the current one will move to `packages/web/`):

```json
{
  "name": "strand-tracer",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "dev:web": "turbo run dev --filter=web",
    "dev:mobile": "turbo run dev --filter=mobile",
    "build": "turbo run build",
    "build:web": "turbo run build --filter=web",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "turbo": "^2"
  }
}
```

**Step 2: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".expo/**"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "lint": {}
  }
}
```

**Step 3: Move existing project into packages/web/**

```bash
mkdir -p packages/web
# Move all existing source files (not monorepo root files)
git mv src packages/web/src
git mv public packages/web/public
git mv index.html packages/web/index.html
git mv vite.config.ts packages/web/vite.config.ts
git mv tsconfig.json packages/web/tsconfig.json
git mv tsconfig.node.json packages/web/tsconfig.node.json
# Move the current package.json to web (will be edited)
git mv package.json packages/web/package.json
```

**Step 4: Update packages/web/package.json name**

Change the `"name"` field:
```json
"name": "web"
```

**Step 5: Verify web app still works**

```bash
npm install  # from root — installs all workspaces
cd packages/web && npm run dev
```

Expected: Vite dev server starts, app loads at localhost:5173

**Step 6: Commit**

```bash
git add -A
git commit -m "chore: convert to Turborepo monorepo, move web app to packages/web"
```

---

### Task 2: Create shared package

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Move: stores, config, utils, types from web to shared

**Step 1: Create packages/shared/package.json**

```json
{
  "name": "@strand-tracer/shared",
  "version": "0.0.1",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "zustand": "*"
  },
  "devDependencies": {
    "typescript": "*"
  }
}
```

**Step 2: Create packages/shared/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

**Step 3: Move shared files from web to shared**

These files have zero web-specific dependencies (no Three.js, no DOM, no postprocessing):

```bash
mkdir -p packages/shared/src/{stores,config,utils}

# Config files (effect definitions, params registry)
cp packages/web/src/config/effects.ts packages/shared/src/config/
cp packages/web/src/config/effectParams.ts packages/shared/src/config/

# Utility files (no DOM dependencies)
cp packages/web/src/utils/faceEmotions.ts packages/shared/src/utils/
cp packages/web/src/utils/bjorklund.ts packages/shared/src/utils/
cp packages/web/src/utils/classifyParam.ts packages/shared/src/utils/
cp packages/web/src/utils/classifySection.ts packages/shared/src/utils/
cp packages/web/src/utils/effectControl.ts packages/shared/src/utils/
cp packages/web/src/utils/presetIO.ts packages/shared/src/utils/
```

Note: stores reference effect param types from the effects directory. For Phase 1, we keep stores in each app and share only config/utils. Stores will be extracted in a later phase once the mobile effect pipeline exists and the store imports can be decoupled from the effect classes.

**Step 4: Create packages/shared/src/index.ts barrel export**

```typescript
// Config
export * from './config/effects'

// Utils
export * from './utils/faceEmotions'
export * from './utils/bjorklund'
export * from './utils/classifyParam'
export * from './utils/classifySection'
export * from './utils/effectControl'
```

Note: effectParams.ts imports from stores which import from effect classes — skip it from the shared barrel for now. It'll move once stores are decoupled.

**Step 5: Add shared dependency to web package**

In `packages/web/package.json`, add:
```json
"dependencies": {
  "@strand-tracer/shared": "*"
}
```

**Step 6: Install and verify**

```bash
cd /path/to/repo/root
npm install
cd packages/web && npx tsc --noEmit
```

Expected: No type errors. Web app still imports from its local files — we haven't changed imports yet. The shared package just exists alongside for now.

**Step 7: Commit**

```bash
git add -A
git commit -m "chore: add shared package with config and utils"
```

---

### Task 3: Scaffold Expo mobile app

**Files:**
- Create: `packages/mobile/` (entire Expo app scaffold)

**Step 1: Create the Expo app**

```bash
cd packages
npx create-expo-app@latest mobile --template default@sdk-55
cd mobile
```

**Step 2: Update packages/mobile/package.json**

Change the name and add workspace dependency:
```json
{
  "name": "mobile",
  "dependencies": {
    "@strand-tracer/shared": "*"
  }
}
```

Also add scripts:
```json
"scripts": {
  "dev": "npx expo start",
  "build": "npx expo export",
  "typecheck": "tsc --noEmit"
}
```

**Step 3: Install from root**

```bash
cd /path/to/repo/root
npm install
```

**Step 4: Verify Expo app runs**

```bash
cd packages/mobile
npx expo start --ios
```

Expected: Expo dev server starts, iOS simulator opens with default Expo app.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(mobile): scaffold Expo app in packages/mobile"
```

---

### Task 4: Install camera and Skia dependencies

**Files:**
- Modify: `packages/mobile/package.json`
- Modify: `packages/mobile/app.json`

**Step 1: Install react-native-vision-camera**

```bash
cd packages/mobile
npx expo install react-native-vision-camera
```

**Step 2: Install Skia and Reanimated**

```bash
npx expo install @shopify/react-native-skia
npx expo install react-native-reanimated
```

**Step 3: Install react-native-worklets-core (required by vision-camera frame processors)**

```bash
npx expo install react-native-worklets-core
```

**Step 4: Configure app.json plugins**

Add to `packages/mobile/app.json` in the `"expo"` object:

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-vision-camera",
        {
          "cameraPermissionText": "Strand Tracer needs camera access for real-time effects",
          "enableMicrophonePermission": true,
          "microphonePermissionText": "Strand Tracer needs microphone access for video recording"
        }
      ],
      "react-native-reanimated/plugin"
    ]
  }
}
```

**Step 5: Configure babel.config.js for Reanimated**

Ensure `packages/mobile/babel.config.js` includes:

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
```

**Step 6: Prebuild iOS native project**

```bash
npx expo prebuild --platform ios --clean
```

Expected: Creates `ios/` directory with native Xcode project.

**Step 7: Verify build**

```bash
npx expo run:ios
```

Expected: App builds and runs on iOS simulator (camera won't work in simulator — that's expected, we'll test on device later).

**Step 8: Commit**

```bash
git add -A
git commit -m "feat(mobile): install vision-camera, skia, and reanimated"
```

---

### Task 5: Create camera permission screen

**Files:**
- Create: `packages/mobile/app/index.tsx`
- Create: `packages/mobile/hooks/usePermissions.ts`

**Step 1: Create permissions hook**

```typescript
// packages/mobile/hooks/usePermissions.ts
import { useEffect, useState } from 'react'
import { Camera } from 'react-native-vision-camera'

export type PermissionStatus = 'loading' | 'granted' | 'denied' | 'not-determined'

export function usePermissions() {
  const [status, setStatus] = useState<PermissionStatus>('loading')

  useEffect(() => {
    checkPermissions()
  }, [])

  async function checkPermissions() {
    const cameraPermission = Camera.getCameraPermissionStatus()
    if (cameraPermission === 'granted') {
      setStatus('granted')
    } else if (cameraPermission === 'denied') {
      setStatus('denied')
    } else {
      setStatus('not-determined')
    }
  }

  async function requestPermissions() {
    const result = await Camera.requestCameraPermission()
    setStatus(result === 'granted' ? 'granted' : 'denied')
  }

  return { status, requestPermissions }
}
```

**Step 2: Create main screen with permission handling**

```tsx
// packages/mobile/app/index.tsx
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { usePermissions } from '../hooks/usePermissions'
import { CameraScreen } from '../components/CameraScreen'

export default function Index() {
  const { status, requestPermissions } = usePermissions()

  if (status === 'loading') {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Loading...</Text>
      </View>
    )
  }

  if (status === 'granted') {
    return <CameraScreen />
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>STRAND TRACER</Text>
      <Text style={styles.text}>Camera access is required for real-time effects</Text>
      <Pressable style={styles.button} onPress={requestPermissions}>
        <Text style={styles.buttonText}>Enable Camera</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    color: '#00ffcc',
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'monospace',
    marginBottom: 16,
  },
  text: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#00ffcc',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  buttonText: {
    color: '#0a0a0a',
    fontSize: 16,
    fontWeight: '600',
  },
})
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat(mobile): add camera permission request screen"
```

---

### Task 6: Create live camera preview with Skia frame processor

**Files:**
- Create: `packages/mobile/components/CameraScreen.tsx`

This is the core of Phase 1 — a live camera feed rendered through a Skia frame processor.

**Step 1: Create CameraScreen component**

```tsx
// packages/mobile/components/CameraScreen.tsx
import { useCallback, useState } from 'react'
import { View, StyleSheet, Pressable, Text } from 'react-native'
import {
  useCameraDevice,
  useCameraFormat,
  Camera,
  type CameraPosition,
} from 'react-native-vision-camera'
import { useSkiaFrameProcessor } from 'react-native-vision-camera'
import { Skia } from '@shopify/react-native-skia'

export function CameraScreen() {
  const [facing, setFacing] = useState<CameraPosition>('back')
  const device = useCameraDevice(facing)

  const format = useCameraFormat(device, [
    { videoResolution: { width: 1920, height: 1080 } },
    { fps: 30 },
  ])

  const frameProcessor = useSkiaFrameProcessor((frame) => {
    'worklet'
    // Render the camera frame to the Skia canvas
    frame.render()

    // Draw a simple HUD overlay to prove Skia is working
    const paint = Skia.Paint()
    paint.setColor(Skia.Color('rgba(0, 255, 204, 0.8)'))

    const font = Skia.Font(null, 24)
    frame.drawText(
      'STRAND TRACER',
      20,
      50,
      paint,
      font,
    )

    // Draw corner brackets (proof of concept for HUD)
    const bracketPaint = Skia.Paint()
    bracketPaint.setColor(Skia.Color('#00ffcc'))
    bracketPaint.setStrokeWidth(2)
    bracketPaint.setStyle(2) // Stroke

    const margin = 40
    const bracketLen = 30
    const w = frame.width
    const h = frame.height

    // Top-left
    const tlPath = Skia.Path.Make()
    tlPath.moveTo(margin, margin + bracketLen)
    tlPath.lineTo(margin, margin)
    tlPath.lineTo(margin + bracketLen, margin)
    frame.drawPath(tlPath, bracketPaint)

    // Top-right
    const trPath = Skia.Path.Make()
    trPath.moveTo(w - margin - bracketLen, margin)
    trPath.lineTo(w - margin, margin)
    trPath.lineTo(w - margin, margin + bracketLen)
    frame.drawPath(trPath, bracketPaint)

    // Bottom-left
    const blPath = Skia.Path.Make()
    blPath.moveTo(margin, h - margin - bracketLen)
    blPath.lineTo(margin, h - margin)
    blPath.lineTo(margin + bracketLen, h - margin)
    frame.drawPath(blPath, bracketPaint)

    // Bottom-right
    const brPath = Skia.Path.Make()
    brPath.moveTo(w - margin - bracketLen, h - margin)
    brPath.lineTo(w - margin, h - margin)
    brPath.lineTo(w - margin, h - margin + bracketLen)
    frame.drawPath(brPath, bracketPaint)
  }, [])

  const flipCamera = useCallback(() => {
    setFacing(f => f === 'back' ? 'front' : 'back')
  }, [])

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No camera device found</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        format={format}
        isActive={true}
        frameProcessor={frameProcessor}
        pixelFormat="rgb"
      />

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <Pressable style={styles.flipButton} onPress={flipCamera}>
          <Text style={styles.flipText}>FLIP</Text>
        </Pressable>

        <View style={styles.recordButton}>
          <View style={styles.recordInner} />
        </View>

        <View style={styles.placeholder} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  text: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 100,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 30,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  flipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: '#00ffcc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipText: {
    color: '#00ffcc',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  recordButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ff0044',
  },
  placeholder: {
    width: 50,
  },
})
```

**Step 2: Test on physical iOS device**

```bash
cd packages/mobile
npx expo run:ios --device
```

Expected: App opens, requests camera permission, shows live camera feed with "STRAND TRACER" text and corner brackets rendered via Skia on top of the live feed. Camera flip button works.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat(mobile): live camera preview with Skia frame processor and HUD overlay"
```

---

### Task 7: Add a basic Skia RuntimeEffect shader (proof of concept)

**Files:**
- Create: `packages/mobile/effects-skia/InvertEffect.ts`
- Modify: `packages/mobile/components/CameraScreen.tsx`

This task proves the SkSL shader pipeline works by applying a simple invert effect.

**Step 1: Create a simple SkSL invert shader**

```typescript
// packages/mobile/effects-skia/InvertEffect.ts
import { Skia } from '@shopify/react-native-skia'

export const InvertShader = Skia.RuntimeEffect.Make(`
  uniform shader inputBuffer;
  uniform float effectMix;

  half4 main(float2 coord) {
    half4 color = inputBuffer.eval(coord);
    half4 inverted = half4(1.0 - color.r, 1.0 - color.g, 1.0 - color.b, color.a);
    return mix(color, inverted, effectMix);
  }
`)!
```

**Step 2: Apply shader in CameraScreen frame processor**

Update the `useSkiaFrameProcessor` in `CameraScreen.tsx` to apply the shader:

```tsx
import { InvertShader } from '../effects-skia/InvertEffect'

// Inside CameraScreen component, before the frameProcessor:
const [effectEnabled, setEffectEnabled] = useState(false)

const frameProcessor = useSkiaFrameProcessor((frame) => {
  'worklet'

  if (effectEnabled && InvertShader) {
    // Create an image shader from the frame
    const imageShader = frame.toShader()

    // Create shader with uniforms
    const shader = InvertShader.makeShaderWithChildren(
      [1.0], // effectMix = 1.0
      [imageShader],
    )

    const paint = Skia.Paint()
    paint.setShader(shader)

    // Draw the full frame with the shader applied
    frame.drawRect(
      Skia.XYWHRect(0, 0, frame.width, frame.height),
      paint,
    )
  } else {
    frame.render()
  }

  // HUD overlay (same as before)
  // ...
}, [effectEnabled])
```

Add a toggle button to the bottom bar:

```tsx
<Pressable
  style={[styles.flipButton, effectEnabled && styles.effectActive]}
  onPress={() => setEffectEnabled(e => !e)}
>
  <Text style={styles.flipText}>FX</Text>
</Pressable>
```

Add to styles:
```typescript
effectActive: {
  backgroundColor: '#00ffcc',
  borderColor: '#00ffcc',
},
```

**Step 3: Test on device**

```bash
npx expo run:ios --device
```

Expected: Tap "FX" button → camera feed inverts colors in real-time. Tap again → normal feed. This proves the full pipeline: camera → Skia frame → SkSL shader → display.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(mobile): proof of concept SkSL shader pipeline with invert effect"
```

---

### Task 8: Verify full Phase 1 and clean up

**Step 1: Run typecheck on all packages**

```bash
cd /path/to/repo/root
npx turbo run typecheck
```

Expected: All packages pass type checking.

**Step 2: Verify web app still works**

```bash
npx turbo run dev --filter=web
```

Expected: Web app loads at localhost:5173, all effects work as before.

**Step 3: Verify mobile app on device**

```bash
cd packages/mobile
npx expo run:ios --device
```

Expected:
1. Permission screen shows on first launch
2. Camera feed renders full-screen
3. "STRAND TRACER" text and corner brackets render via Skia
4. FX toggle applies invert shader in real-time
5. Camera flip works

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore(mobile): Phase 1 complete — monorepo, Expo scaffold, camera + Skia pipeline"
```

---

## Phase 1 Deliverables Summary

After completing all 8 tasks you will have:

1. **Turborepo monorepo** with `packages/web`, `packages/mobile`, `packages/shared`
2. **Existing web app** working unchanged in `packages/web`
3. **Shared package** with effect config and utilities
4. **Expo iOS app** with:
   - Camera permission handling
   - Live camera preview (front/back toggle)
   - Skia frame processor rendering camera frames
   - HUD overlay drawn via Skia (text + corner brackets)
   - Proof-of-concept SkSL shader (invert effect with toggle)
   - Bottom bar with flip, record (placeholder), and FX toggle
5. **Foundation for Phase 2**: The SkSL shader pipeline is proven — next phase ports real effects

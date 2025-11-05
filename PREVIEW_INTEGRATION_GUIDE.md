# SwiftUI Preview Integration Guide for XcodeBuildMCP

## Quick Reference

This document provides a condensed guide for implementing SwiftUI preview generation in XcodeBuildMCP based on the xcodebuild.nvim architecture.

## Core Architecture: 3-Part System

### Part 1: Flag-Based Signaling (Communication)
```
Orchestrator sets flag:        --xcodebuild-nvim-snapshot
App detects flag:              ProcessInfo.processInfo.arguments
Result:                        App enters "preview mode"
```

### Part 2: View Rendering (Snapshot Generation)
```
SwiftUI/UIKit/AppKit View
    ↓ Hosted in platform view
UIHostingController (iOS) or NSHostingView (macOS)
    ↓ Rendered to image
UIGraphicsImageRenderer (iOS) or NSBitmapImageRep (macOS)
    ↓ Encoded
UIImage.pngData() or NSBitmapImageRep.representation()
    ↓ Written
/tmp/xcodebuild.nvim/<product-name>.png
```

### Part 3: File-Based IPC (Communication)
```
App writes PNG to file
    ↓
Orchestrator polls every 500ms
    ↓
File detected within 30 seconds
    ↓
MCP client receives image
```

## Implementation Checklist

### Step 1: Create MCP Tool Definition

```typescript
// src/mcp/tools/swiftui-previews/generate_preview_ios_ws.ts

import { z } from 'zod';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/execution/index.js';
import { createErrorResponse, createTextResponse } from '../../../utils/responses/index.js';
import { log } from '../../../utils/logging/index.js';

const generatePreviewSchema = z.object({
  workspacePath: z.string().describe('Path to .xcworkspace file'),
  scheme: z.string().describe('Build scheme name'),
  destination: z.string().describe('Simulator UDID'),
  // Include timeout, hot reload options, etc.
});

type GeneratePreviewParams = z.infer<typeof generatePreviewSchema>;

export async function generatePreviewLogic(
  params: GeneratePreviewParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  // 1. Build validation
  // 2. Build project with xcodebuild
  // 3. Install app on simulator
  // 4. Launch with flag: --xcodebuild-nvim-snapshot
  // 5. Poll for PNG (max 30 seconds)
  // 6. Return PNG as base64 or resource URI
  
  try {
    // Build phase
    const buildCmd = [
      'xcodebuild', 'build',
      '-workspace', params.workspacePath,
      '-scheme', params.scheme,
      '-destination', `id=${params.destination}`,
      '-configuration', 'Release'
    ];

    const buildResult = await executor(buildCmd, 'Building for preview');
    if (!buildResult.success) {
      return createErrorResponse('Build failed', buildResult.error);
    }

    // Launch phase
    const launchCmd = [
      'xcrun', 'simctl', 'launch',
      '--terminate-running-process',
      '--console-pty',
      params.destination,
      // Bundle ID - extract from build output or config
      '--',
      '--xcodebuild-nvim-snapshot'  // THE CRITICAL FLAG
    ];

    await executor(launchCmd, 'Launching app for preview');

    // Poll phase
    const pngPath = await pollForFile(
      `/tmp/xcodebuild.nvim/<product-name>.png`,
      30000  // 30 second timeout
    );

    if (!pngPath) {
      return createErrorResponse('Preview timeout', 'No snapshot generated within 30 seconds');
    }

    // Return phase
    const pngData = await readFileAsBase64(pngPath);
    
    return {
      content: [{
        type: 'image',
        source: {
          type: 'base64',
          mediaType: 'image/png',
          data: pngData
        }
      }],
      isError: false
    };

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return createErrorResponse('Preview generation failed', message);
  }
}

export default {
  name: 'generate_preview_ios_ws',
  description: 'Generate a SwiftUI/UIKit preview snapshot for iOS app. Usage: generate_preview_ios_ws({ workspacePath: "...", scheme: "...", destination: "..." })',
  schema: generatePreviewSchema.shape,
  handler: createTypedTool(
    generatePreviewSchema,
    generatePreviewLogic,
    getDefaultCommandExecutor,
  ),
};
```

### Step 2: Create Variants

```
src/mcp/tools/swiftui-previews/
├── generate_preview_ios_ws.ts      ← iOS + Workspace
├── generate_preview_ios_proj.ts     ← iOS + Project
├── generate_preview_macos_ws.ts     ← macOS + Workspace
├── generate_preview_macos_proj.ts   ← macOS + Project
├── index.ts                         ← Workflow metadata
└── __tests__/
    └── generate_preview.test.ts
```

### Step 3: Workflow Metadata

```typescript
// src/mcp/tools/swiftui-previews/index.ts

export const workflow = {
  name: 'SwiftUI Preview Generation',
  description: 'Generate and capture previews of SwiftUI, UIKit, and AppKit views from your iOS and macOS apps',
  platforms: ['iOS', 'macOS'],
  targets: ['simulator'],
  projectTypes: ['workspace', 'project'],
  capabilities: ['preview', 'image-capture', 'ui-automation'],
};
```

### Step 4: Update Tests with DI Pattern

```typescript
// src/mcp/tools/swiftui-previews/__tests__/generate_preview.test.ts

import { describe, it, expect } from 'vitest';
import { generatePreviewLogic } from '../generate_preview_ios_ws.js';
import { createMockExecutor } from '../../../utils/execution/mock.js';

describe('generate_preview_ios_ws', () => {
  it('should generate preview successfully', async () => {
    const mockExecutor = createMockExecutor({
      success: true,
      output: 'Build succeeded'
    });

    const result = await generatePreviewLogic({
      workspacePath: '/path/to/App.xcworkspace',
      scheme: 'MyApp',
      destination: 'test-device-id'
    }, mockExecutor);

    expect(result.isError).toBe(false);
    expect(result.content[0].type).toBe('image');
  });

  it('should handle build failures', async () => {
    const mockExecutor = createMockExecutor({
      success: false,
      error: 'Build failed: compilation error'
    });

    const result = await generatePreviewLogic(params, mockExecutor);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Build failed');
  });

  it('should timeout after 30 seconds', async () => {
    // Mock file system that never creates the PNG
    const mockExecutor = createMockExecutor({ success: true });
    
    const result = await generatePreviewLogic(params, mockExecutor);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('timeout');
  });
});
```

### Step 5: Helper Utilities

```typescript
// src/mcp/tools/swiftui-previews/preview-utils.ts

import { existsSync, readFileSync } from 'fs';

export async function pollForFile(
  filePath: string,
  timeoutMs: number = 30000,
  intervalMs: number = 500
): Promise<string | null> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (existsSync(filePath)) {
      return filePath;
    }
    
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  return null;
}

export function getProductNameFromPath(workspacePath: string): string {
  // Extract product name from workspace path
  // E.g., "/path/to/MyApp.xcworkspace" → "MyApp"
  return workspacePath.split('/').pop()?.replace('.xcworkspace', '') || 'snapshot';
}

export async function readFileAsBase64(filePath: string): Promise<string> {
  const buffer = readFileSync(filePath);
  return buffer.toString('base64');
}

export function getLaunchCommand(
  destination: string,
  bundleId: string,
  platform: 'iOS' | 'macOS'
): string[] {
  if (platform === 'iOS') {
    return [
      'xcrun', 'simctl', 'launch',
      '--terminate-running-process',
      '--console-pty',
      destination,
      bundleId,
      '--',
      '--xcodebuild-nvim-snapshot'
    ];
  } else {
    // macOS variant would use 'open' command
    return ['open', bundleId, '--args', '--xcodebuild-nvim-snapshot'];
  }
}
```

## Key Implementation Details

### 1. The Critical Flag

```typescript
// This single flag is the entire communication protocol
const launchCommand = [
  'xcrun', 'simctl', 'launch',
  destination,
  bundleId,
  '--',  // Separator: everything after this is app args
  '--xcodebuild-nvim-snapshot'  // ← THIS IS IT
];
```

### 2. File-Based IPC

```typescript
// App writes here
const outputPath = '/tmp/xcodebuild.nvim/<product-name>.png';

// Orchestrator polls here
async function waitForSnapshot(path: string, timeout: number) {
  while (timeout > 0) {
    if (fs.existsSync(path)) {
      return fs.readFileSync(path);  // Return PNG binary
    }
    timeout -= 500;
    await sleep(500);
  }
  return null;
}
```

### 3. Platform-Specific Rendering

```swift
// In user's app code, not in XcodebuildMCP

// SwiftUI
import XcodebuildNvimPreview

@main
struct MyApp: App {
  var body: some Scene {
    WindowGroup {
      MainView()
        .setupNvimPreview { PreviewView() }  // Only renders when flag present
    }
  }
}

// UIKit
import XcodebuildNvimPreview

class AppDelegate: UIResponder, UIApplicationDelegate {
  func application(...) -> Bool {
    XcodebuildNvimPreview.setup(view: MainViewController().view)
    return true
  }
}
```

## Project Integration Requirements

### For XcodeBuildMCP Users

When enabling SwiftUI previews, users must:

1. **Add to their Xcode project**:
```swift
.package(url: "https://github.com/wojciech-kulik/xcodebuild-nvim-preview.git")
```

2. **Update their app code** to detect preview mode:
```swift
import XcodebuildNvimPreview

// SwiftUI: wrap root view
.setupNvimPreview { PreviewView() }

// UIKit: call in AppDelegate
XcodebuildNvimPreview.setup(view: view)
```

3. **No other setup needed** - XcodeBuildMCP handles the rest

### Build Configuration

```typescript
// Optimal build settings for preview
const buildArgs = [
  '-configuration', 'Release',  // Release builds are faster
  '-skipPackagePluginValidation',  // Skip unnecessary checks
  // Don't include unnecessary symbols/data
];
```

## Response Format Options

### Option A: Base64-Encoded PNG (Recommended for Claude/Cursor)

```typescript
return {
  content: [{
    type: 'image',
    source: {
      type: 'base64',
      mediaType: 'image/png',
      data: base64PngData
    }
  }],
  isError: false
};
```

**Pros**: Works everywhere, clients can display immediately  
**Cons**: Large data transfer, but acceptable for single preview

### Option B: File Path with snacks.nvim Integration

```typescript
return createTextResponse(`Preview saved: /tmp/xcodebuild.nvim/${productName}.png`);
```

**Pros**: Minimal data transfer, file can be reused  
**Cons**: Only works for file-aware clients

### Option C: MCP Resource URI

```typescript
return createTextResponse(`Preview available at xcodebuildmcp://preview/${bundleId}`);

// Then implement resource endpoint:
export default {
  uri: 'xcodebuildmcp://preview/<bundle-id>',
  handler(uri: URL) {
    const bundleId = uri.pathname.split('/').pop();
    const pngPath = `/tmp/xcodebuild.nvim/${bundleId}.png`;
    return { contents: [{ blob: fs.readFileSync(pngPath, 'base64') }] };
  }
};
```

**Pros**: RESTful, can cache previews  
**Cons**: Requires client to understand resources

## Testing Strategy

### DI Pattern (Required by XcodeBuildMCP)

```typescript
// ✅ CORRECT: Inject executor
const mockExecutor = createMockExecutor({
  success: true,
  output: 'Build succeeded'
});

const result = await generatePreviewLogic(params, mockExecutor);
expect(result.isError).toBe(false);

// ❌ FORBIDDEN: Vitest mocking
vi.mock('child_process');  // BANNED
vi.spyOn(fs, 'existsSync');  // BANNED
```

### Test Coverage

```typescript
describe('generate_preview_ios_ws', () => {
  describe('Parameter Validation', () => {
    it('should validate required parameters');
    it('should validate file paths exist');
  });

  describe('Build Phase', () => {
    it('should invoke xcodebuild with correct flags');
    it('should handle build failures gracefully');
  });

  describe('Launch Phase', () => {
    it('should launch with --xcodebuild-nvim-snapshot flag');
    it('should use correct simulator destination');
  });

  describe('Poll Phase', () => {
    it('should detect PNG file when created');
    it('should timeout after 30 seconds');
    it('should return base64-encoded PNG data');
  });
});
```

## Common Issues & Solutions

### Issue 1: "Preview timeout"
**Cause**: PNG not written by app within 30 seconds  
**Debug**:
1. Verify `--xcodebuild-nvim-snapshot` flag is being passed
2. Check app log: `log stream --predicate 'process == "[AppName]"'`
3. Verify `XcodebuildNvimPreview.setup()` is called in app
4. Check `/tmp/xcodebuild.nvim/` has write permissions

### Issue 2: "Build failed"
**Cause**: xcodebuild error  
**Debug**:
1. Run xcodebuild manually to check for errors
2. Verify workspace/scheme/destination are correct
3. Ensure project is configured correctly

### Issue 3: Wrong view rendered
**Cause**: `setupNvimPreview` wrapping wrong view  
**Solution**: Wrap the PREVIEW view, not the app root

## Performance Considerations

### Build Time
- Release builds are ~50% faster than Debug
- Incremental builds with xcodemake (future enhancement)
- Cache derived data across invocations

### PNG File Size
- Compression factor 1.0 for maximum compression
- Typical preview PNG: 50-200 KB
- No image optimization needed for Neovim display

### Polling Overhead
- 500ms interval × 60 seconds max = 120 polls max
- File existence check is O(1) on modern filesystems
- Negligible CPU/memory impact

## Future Enhancements

1. **Batch Previews**: Generate multiple views in one invocation
2. **Preview Caching**: Cache identical previews to speed up workflow
3. **Hot Reload Support**: Keep app running for code injection
4. **Device Previews**: Support generating previews on physical devices
5. **Video Capture**: Capture animations as MP4 instead of static PNG
6. **Dark Mode Support**: Generate light and dark mode previews
7. **Multi-language Previews**: Generate localized UI previews

## References

- **xcodebuild.nvim**: https://github.com/wojciech-kulik/xcodebuild.nvim
- **xcodebuild-nvim-preview**: https://github.com/wojciech-kulik/xcodebuild-nvim-preview
- **Full Analysis**: `SWIFTUI_PREVIEW_ANALYSIS.md` (this repo)

---

**Last Updated**: 2025-10-31  
**Status**: Ready for Implementation  
**Effort Estimate**: 3-5 days (4 tool variants + tests + docs)

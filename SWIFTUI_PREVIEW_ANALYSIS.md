# SwiftUI Preview Generation Architecture Analysis

## Executive Summary

The xcodebuild.nvim ecosystem demonstrates a sophisticated two-phase preview generation system:

1. **Orchestration Phase (Lua/Neovim)**: Triggers app build and execution with a special flag
2. **Snapshot Phase (Swift)**: Detects the flag and converts views to PNG files

This document provides a deep analysis of the architecture, communication protocol, platform abstractions, and integration patterns.

---

# Part 1: Architecture Overview

## System Components

### 1. xcodebuild.nvim (Lua/Neovim)
**Role**: Orchestration layer that manages the preview generation workflow
**Location**: `/Users/alexanderriccio/Documents/GitHub/xcodebuild.nvim`
**Key Module**: `lua/xcodebuild/core/previews.lua`

**Core Responsibilities**:
- Validate project configuration and prerequisites (snacks.nvim, app setup)
- Build the Xcode project in release/preview mode
- Launch the app with special `--xcodebuild-nvim-snapshot` flag
- Poll for PNG file appearance in `/tmp/xcodebuild.nvim/`
- Display PNG in Neovim split window using snacks.nvim
- Manage image cache for hot reload scenarios

### 2. xcodebuild-nvim-preview (Swift Package)
**Role**: Snapshot engine that converts app views to PNG
**Location**: `/Users/alexanderriccio/Documents/GitHub/xcodebuild-nvim-preview`
**Package Name**: `XcodebuildNvimPreview`
**Platform Support**: iOS (14+), macOS (14+), tvOS (14+), watchOS (6+), visionOS (1+)

**Core Responsibilities**:
- Detect `--xcodebuild-nvim-snapshot` flag in process arguments
- Generate snapshots from SwiftUI View, UIView, or NSView
- Write PNG files to `/tmp/xcodebuild.nvim/<product-name>.png`
- Support hot reload via Injection notification system
- Handle platform-specific rendering differences

---

# Part 2: Communication Flow

## Complete Preview Generation Sequence

### Phase 1: User Initiates Preview Request (Neovim)
```
User Command: :XcodebuildPreviewGenerateAndShow [hotReload]
    ↓
previews.lua::M.generate_preview(hotReload, callback)
```

### Phase 2: Validation (previews.lua)
```
validate()
  ├─ Check project is configured (XcodebuildSetup completed)
  ├─ Ensure platform is not physical device
  ├─ Verify snacks.nvim installed and image snack enabled
  └─ Return boolean success/failure
```

**Key Validations**:
```lua
-- From previews.lua lines 85-97
local function validate()
  if not projectConfig.is_app_configured() then
    notifications.send_error("The project is missing some details...")
    return false
  end
  
  if constants.is_device(projectConfig.settings.platform) then
    notifications.send_error("Previews are not supported on physical devices.")
    return false
  end
  
  return check_if_snacks_installed()
end
```

### Phase 3: Setup & Cleanup
```
previews.lua::M.generate_preview() (line 296)
  ├─ Create directory: mkdir -p /tmp/xcodebuild.nvim
  ├─ Delete old preview: rm /tmp/xcodebuild.nvim/<product-name>.png
  ├─ Kill existing app instance
  ├─ Clear snacks.nvim image cache (if configured)
  └─ Set up cache clear timer if hotReload=true (500ms interval)
```

### Phase 4: Build Project
```
projectBuilder.build_project_for_preview(callback)
  ├─ Calls xcode.build_project() with:
  │   ├─ workingDirectory
  │   ├─ destination (simulator UDID or device ID)
  │   ├─ projectFile (.xcworkspace or .xcodeproj)
  │   ├─ scheme
  │   └─ extraBuildArgs
  ├─ Suppresses stdout/stderr output
  └─ Calls callback with exit code
```

### Phase 5: Check Build Result
```
previews.lua::generate_mobile_preview() (line 174)
  ├─ If code == 143: Build was cancelled
  │   └─ Update progress: "Build Cancelled"
  ├─ If code != 0: Build failed
  │   └─ Update progress: "Build Failed"
  └─ If code == 0: Continue to app launch
```

### Phase 6: Install App (Mobile Only)
```
xcode.install_app_on_simulator(destination, appPath, true, callback)
  ├─ Command: xcrun simctl install <destination> <appPath>
  ├─ If error 149 (simulator not booted):
  │   └─ Boot simulator and retry
  └─ On success: Proceed to launch
```

### Phase 7: Launch App with Snapshot Flag
```
-- iOS/tvOS (previews.lua line 189)
vim.fn.jobstart({
  "xcrun", "simctl", "launch",
  "--terminate-running-process",
  "--console-pty",
  <destination>,
  <bundleId>,
  "--",
  "--xcodebuild-nvim-snapshot"  ← CRITICAL FLAG
})

-- macOS (previews.lua line 223)
vim.fn.jobstart({
  "open", <appPath>,
  "--args",
  "--xcodebuild-nvim-snapshot"  ← CRITICAL FLAG
})
```

**Command Explanation**:
- `simctl launch`: Launches app on simulator
- `--terminate-running-process`: Stops any running instance first
- `--console-pty`: Allocates pseudo-terminal for output
- `--`: Separator between simctl args and app launch args
- `--xcodebuild-nvim-snapshot`: Special flag passed to app

### Phase 8: App Detects Preview Mode (Swift)
```
XcodebuildNvimPreview.swift (line 11)
let isInPreview = ProcessInfo.processInfo.arguments
                    .contains("--xcodebuild-nvim-snapshot")
```

**Key Pattern**: Static property checked at app launch time

### Phase 9: View Setup (Platform-Specific)

#### SwiftUI Path
```
View+setup.swift (lines 12-24)
public func setupNvimPreview(view: @escaping () -> some View) -> some View {
  if XcodebuildNvimPreview.isInPreview {
    return AnyView(
      self
        .onAppear {
          DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            view().snapshot()  ← 500ms delay for layout
          }
        }
        .onReceive(observeHotReload()) { 
          view().snapshot()   ← Re-snapshot on hot reload
        }
    )
  }
  return AnyView(self)
}
```

**Integration in App**:
```swift
@main
struct MyApp: App {
  var body: some Scene {
    WindowGroup {
      MainView()
        .setupNvimPreview { HomeView() }
    }
  }
}
```

#### UIKit Path
```
XcodebuildNvimPreview+UIKit.swift (lines 12-18)
static func setup(view: UIView) {
  if isInPreview { view.snapshot() }
}

// Called in AppDelegate
func application(_ application: UIApplication,
                 didFinishLaunchingWithOptions launchOptions: [...]) -> Bool {
  XcodebuildNvimPreview.setup(view: MainView())
  return true
}
```

#### AppKit Path
```
XcodebuildNvimPreview+AppKit.swift (lines 12-18)
static func setup(view: NSView) {
  if isInPreview { view.snapshot() }
}

// Called in AppDelegate
func application(_ application: NSApplication,
                 didFinishLaunchingWithOptions launchOptions: [...]) -> Bool {
  XcodebuildNvimPreview.setup(view: MainView())
  return true
}
```

### Phase 10: Snapshot Generation (Platform-Specific)

#### SwiftUI → UIView/NSView Conversion
```
View+snapshot.swift (lines 12-25)

#if canImport(UIKit)
  extension View {
    func snapshot() {
      UIHostingController(rootView: self).view.snapshot()
    }
  }
#endif

#if canImport(AppKit)
  extension View {
    func snapshot() {
      NSHostingView(rootView: self).snapshot()
    }
  }
#endif
```

#### UIView Rendering to PNG
```
UIView+snapshot.swift (lines 12-26)

extension UIView {
  func snapshot() {
    // 1. Calculate appropriate size
    let targetSize = sizeThatFits(UIScreen.main.bounds.size)
    let bounds = CGRect(origin: .zero, size: targetSize)
    self.bounds = bounds
    
    // 2. Render to image using UIGraphicsImageRenderer
    let renderer = UIGraphicsImageRenderer(size: targetSize)
    let image = renderer.image { _ in
      drawHierarchy(in: bounds, afterScreenUpdates: true)
    }
    
    // 3. Extract product name for filename
    let name = Bundle.main.executableURL
      .flatMap { "\($0.lastPathComponent).png" }
      ?? "snapshot.png"
    
    // 4. Write PNG to standard location
    let url = URL(fileURLWithPath: "/tmp/xcodebuild.nvim/\(name)")
    try? image.pngData()?.write(to: url)
  }
}
```

**Key Points**:
- Uses `UIGraphicsImageRenderer` for high-quality rendering
- `drawHierarchy(in:afterScreenUpdates:)` captures entire view tree
- Writes PNG binary data directly to file
- Silent failure: `try?` means errors are not logged

#### NSView Rendering to PNG
```
NSView+snapshot.swift (lines 12-43)

extension NSView {
  func snapshot() {
    // 1. Get display scale factor (Retina support)
    let scale = NSScreen.main?.backingScaleFactor ?? 1
    let targetSize = fittingSize
    let bounds = CGRect(origin: .zero, size: targetSize)
    frame = bounds
    
    // 2. Create bitmap representation with high bit depth
    let bitmapRep = NSBitmapImageRep(
      bitmapDataPlanes: nil,
      pixelsWide: Int(targetSize.width * scale),
      pixelsHigh: Int(targetSize.height * scale),
      bitsPerSample: 16,           ← High precision
      samplesPerPixel: 4,           ← RGBA
      hasAlpha: true,
      isPlanar: false,
      colorSpaceName: .deviceRGB,
      bytesPerRow: 0,
      bitsPerPixel: 0
    )!
    
    // 3. Set logical size and render
    bitmapRep.size = targetSize
    cacheDisplay(in: bounds, to: bitmapRep)
    
    // 4. Create NSImage and write PNG
    let image = NSImage(size: targetSize)
    image.addRepresentation(bitmapRep)
    
    let pngData = bitmapRep.representation(
      using: .png,
      properties: [.compressionFactor: 1.0]
    )
    
    let name = Bundle.main.executableURL
      .flatMap { "\($0.lastPathComponent).png" }
      ?? "snapshot.png"
    let url = URL(fileURLWithPath: "/tmp/xcodebuild.nvim/\(name)")
    try? pngData?.write(to: url)
  }
}
```

**Key Differences from UIKit**:
- Uses `NSBitmapImageRep` for manual rendering control
- Account for display scale factor (Retina/5K displays)
- Higher bit depth (16-bit per sample vs 8-bit)
- Uses `cacheDisplay(in:to:)` instead of `drawHierarchy`
- Separate `NSImage` wrapper required

### Phase 11: Poll for PNG File (Neovim)
```
previews.lua::wait_for_preview() (lines 152-170)

previewTimer = vim.fn.timer_start(500, function()  ← Poll every 500ms
  if util.file_exists(get_path()) then
    stop_preview_timer()
    show_result(true)
    util.call(callback)
    
    if not hotReload then
      device.kill_app()  ← Kill app unless hot reload mode
    end
  elseif os.difftime(os.time(), startTime) > 30 then
    stop_preview_timer()
    show_result(false)
    device.kill_app()
  end
end, { ["repeat"] = -1 })  ← Infinite repeat
```

**Polling Algorithm**:
1. Check every 500ms if file exists at `/tmp/xcodebuild.nvim/<product>.png`
2. If found: stop polling, show success, optionally kill app
3. If not found within 30 seconds: timeout, show failure, kill app
4. File existence tested via Lua: `util.file_exists(path)`

### Phase 12: Display Preview (Neovim)
```
previews.lua::show_preview() (lines 235-259)

if not util.file_exists(get_path()) then
  update_progress("No preview available")
  return
end

local winid = vim.fn.bufwinid(get_path())
if winid == -1 then
  -- Open new split window using configured command
  -- Default: "vertical botright split +vertical\\ resize\\ 42 %s | wincmd p"
  vim.cmd(string.format(config.open_command, get_path()))
end

-- Switch to preview window
vim.defer_fn(function()
  local newWinid = vim.fn.bufwinid(get_path())
  if newWinid == -1 then return end
  
  vim.api.nvim_set_current_win(newWinid)
  vim.cmd("edit! | wincmd p")
end, 500)
```

**Window Layout**:
- Opens vertical split on right side
- Resizes to 42 columns width
- Returns to previous window
- Uses `snacks.nvim` image support to display PNG

### Phase 13: Hot Reload Loop (Optional)
```
previews.lua::M.generate_preview() (lines 314-316)

if hotReload then
  clearCacheTimer = vim.fn.timer_start(1000, clear_cache, 
    { ["repeat"] = -1 })
end
```

**Hot Reload Flow**:
1. App stays running after first snapshot
2. User edits code and triggers Inject hot reload
3. Inject broadcasts `INJECTION_BUNDLE_NOTIFICATION`
4. App receives notification via `observeHotReload()` (HotReload.swift)
5. App calls `view().snapshot()` again
6. Neovim polls and finds updated PNG
7. snacks.nvim cache cleared every 1 second
8. Display updates with new preview

---

# Part 3: Critical Code Patterns

## Pattern 1: Conditional Compilation Architecture

The Swift package uses platform-specific conditional compilation to avoid importing unavailable frameworks:

```swift
// XcodebuildNvimPreview.swift
import Foundation

public enum XcodebuildNvimPreview {
  static let isInPreview = ProcessInfo.processInfo.arguments
    .contains("--xcodebuild-nvim-snapshot")
}

// XcodebuildNvimPreview+UIKit.swift
#if canImport(UIKit)
  import UIKit
  
  public extension XcodebuildNvimPreview {
    static func setup(view: UIView) {
      if isInPreview { view.snapshot() }
    }
  }
#endif

// XcodebuildNvimPreview+AppKit.swift
#if canImport(AppKit)
  import AppKit
  
  public extension XcodebuildNvimPreview {
    static func setup(view: NSView) {
      if isInPreview { view.snapshot() }
    }
  }
#endif
```

**Benefits**:
- Single package supports iOS, tvOS, watchOS, macOS, visionOS
- No runtime platform checks needed
- Framework imports are compile-time decisions
- Zero overhead for unused code

## Pattern 2: Flag-Based Signaling

The core protocol uses command-line arguments for inter-process signaling:

```swift
// App checks this at startup
let isInPreview = ProcessInfo.processInfo.arguments
  .contains("--xcodebuild-nvim-snapshot")
```

**Why This Works**:
- `ProcessInfo.processInfo.arguments` captures argv from process launch
- Flag is deterministic and stateless
- Works across iOS simulator, macOS, physical devices
- No complex IPC required

**Equivalent Launch Commands**:
```bash
# iOS Simulator
xcrun simctl launch --terminate-running-process --console-pty \
  <device-id> <bundle-id> -- --xcodebuild-nvim-snapshot

# macOS
open /path/to/App.app --args --xcodebuild-nvim-snapshot

# Can pass multiple launch args
xcrun simctl launch <id> <bundle> -- --arg1 value1 --arg2 value2
```

## Pattern 3: File-Based IPC

Communication between app and Neovim happens via file system:

```lua
-- Neovim polls for file existence
get_path() = "/tmp/xcodebuild.nvim/" .. productName .. ".png"

-- App writes file when ready
let url = URL(fileURLWithPath: "/tmp/xcodebuild.nvim/\(name)")
try? image.pngData()?.write(to: url)

-- Neovim detects file
if util.file_exists(get_path()) then
  -- Display it
end
```

**Why File-Based**:
- No socket communication required
- Works on simulators and macOS without special permissions
- Simple polling mechanism (every 500ms)
- Timeout safety (30 second max wait)
- Atomic file writes (PNG data is complete when closed)

## Pattern 4: View→Image Rendering Pipeline

### UIKit Rendering
```swift
let renderer = UIGraphicsImageRenderer(size: targetSize)
let image = renderer.image { _ in
  drawHierarchy(in: bounds, afterScreenUpdates: true)
}
```

**Key Method**: `drawHierarchy(in:afterScreenUpdates:)`
- Renders view and all subviews to graphics context
- `afterScreenUpdates: true` ensures layout is complete
- Returns fully rendered UIImage
- Native API, optimal performance

### AppKit Rendering
```swift
let bitmapRep = NSBitmapImageRep(...)
bitmapRep.size = targetSize
cacheDisplay(in: bounds, to: bitmapRep)
```

**Key Method**: `cacheDisplay(in:to:)`
- Equivalent to `drawHierarchy` for macOS
- Renders to bitmap representation
- Requires manual scale factor handling
- More control over bit depth

## Pattern 5: SwiftUI Bridging

```swift
// View+snapshot.swift
extension View {
  func snapshot() {
    UIHostingController(rootView: self).view.snapshot()
  }
}
```

**How It Works**:
1. `UIHostingController` wraps SwiftUI View in UIViewController
2. Accessing `.view` forces layout and rendering
3. Then calls UIView's snapshot() extension
4. Effectively: SwiftUI → UIViewController → UIView → PNG

**Layout Delay**:
```swift
DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
  view().snapshot()  // 500ms delay for layout completion
}
```

500ms delay ensures:
- View layout is complete
- Animations (if any) have settled
- View hierarchy is fully constructed

## Pattern 6: Product Name Extraction

```swift
let name = Bundle.main.executableURL
  .flatMap { "\($0.lastPathComponent).png" }
  ?? "snapshot.png"
```

**Logic**:
1. Get executable URL from Bundle.main
2. Extract last path component (filename = product name)
3. Append `.png` extension
4. Fallback to `snapshot.png` if Bundle.main unavailable
5. Ensures filename matches app's executable name

---

# Part 4: Platform-Specific Implementation Details

## iOS/tvOS (UIKit-based)

### Rendering Pipeline
```
SwiftUI View
  ↓
UIHostingController(rootView:)
  ↓
.view (returns UIView)
  ↓
UIGraphicsImageRenderer
  ↓
drawHierarchy(in:afterScreenUpdates:true)
  ↓
UIImage
  ↓
UIImage.pngData()
  ↓
Binary PNG written to /tmp/xcodebuild.nvim/
```

### Size Calculation
```swift
let targetSize = sizeThatFits(UIScreen.main.bounds.size)
```

**Behavior**:
- `sizeThatFits` returns intrinsic size of view
- Constrained to screen bounds
- Adapts to device orientation
- Works with flexible layouts

### Rendering Quality
```swift
let renderer = UIGraphicsImageRenderer(size: targetSize)
let image = renderer.image { _ in
  drawHierarchy(in: bounds, afterScreenUpdates: true)
}
```

**Quality Features**:
- UIGraphicsImageRenderer automatically handles scale factor
- Retina displays get 2x/3x resolution
- afterScreenUpdates: true ensures latest layout
- Uses Core Graphics rendering pipeline

## macOS (AppKit)

### Rendering Pipeline
```
SwiftUI View
  ↓
NSHostingView(rootView:)
  ↓
NSView.snapshot()
  ↓
NSBitmapImageRep (high precision, 16-bit)
  ↓
cacheDisplay(in:to:) [equivalent to drawHierarchy]
  ↓
NSImage (wrapper)
  ↓
representation(using:.png)
  ↓
Binary PNG written to /tmp/xcodebuild.nvim/
```

### Display Scale Handling
```swift
let scale = NSScreen.main?.backingScaleFactor ?? 1

let bitmapRep = NSBitmapImageRep(
  bitmapDataPlanes: nil,
  pixelsWide: Int(targetSize.width * scale),    // Scale up pixels
  pixelsHigh: Int(targetSize.height * scale),   // Scale up pixels
  bitsPerSample: 16,                            // High precision
  samplesPerPixel: 4,                           // RGBA
  ...
)

bitmapRep.size = targetSize                     // Logical size stays same
```

**Why This Matters**:
- 5K displays have scale factor of 2.0 or higher
- Pixel dimensions must account for scale
- Logical size (bitmapRep.size) remains display size
- Ensures sharp rendering on high-DPI displays

### Compression
```swift
let pngData = bitmapRep.representation(
  using: .png,
  properties: [.compressionFactor: 1.0]
)
```

**Compression Factor**:
- 1.0 = maximum compression (slower, smaller files)
- 0.0 = no compression (faster, larger files)
- For preview files, max compression is chosen
- Reduces preview file size

## watchOS/visionOS

The package supports these platforms via conditional compilation but snapshot implementation would be specific to those platform's view systems. Core logic remains the same:

1. Detect flag
2. Setup view
3. Render to image
4. Write PNG

---

# Part 5: Hot Reload Implementation

## Notification-Based Signaling

The hot reload system uses the Injection notification pattern:

```swift
// HotReload.swift
public func observeHotReload() -> AnyPublisher<Void, Never> {
  NotificationCenter.default
    .publisher(for: .init("INJECTION_BUNDLE_NOTIFICATION"))
    .map { _ in }
    .eraseToAnyPublisher()
}
```

**Integration with SwiftUI**:
```swift
public func setupNvimPreview(view: @escaping () -> some View) -> some View {
  if XcodebuildNvimPreview.isInPreview {
    return AnyView(
      self
        .onAppear {
          DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            view().snapshot()
          }
        }
        .onReceive(observeHotReload()) {  // Listen for reload notification
          view().snapshot()                 // Re-snapshot on reload
        }
    )
  }
  return AnyView(self)
}
```

**How Injection Works**:
1. User saves code (hot reload trigger)
2. Inject framework recompiles changed code
3. Injects new code into running app
4. Broadcasts `INJECTION_BUNDLE_NOTIFICATION`
5. App receives notification
6. SwiftUI view calls `snapshot()` again
7. New PNG written to `/tmp/xcodebuild.nvim/`
8. Neovim polls and finds updated file (1 second cache clear timer)
9. snacks.nvim reloads image

**Requires External Tool**:
The hot reload feature requires integration with the [Inject](https://github.com/krzysztofzablocki/Inject) library for actual code reloading. The XcodebuildNvimPreview package only provides the Combine publisher for notification handling.

---

# Part 6: Neovim Integration Points

## Lua Module Architecture

```
lua/xcodebuild/
├── core/
│   └── previews.lua          ← Main preview orchestration
├── project/
│   └── builder.lua           ← Build invocation
├── platform/
│   └── device.lua            ← App launch/kill
├── core/
│   └── xcode.lua             ← xcodebuild CLI wrapper
└── broadcasting/
    └── notifications.lua     ← User feedback
```

## Key Lua Functions Flow

```
M.generate_preview(hotReload, callback)
  ├─ validate()
  ├─ mkdir -p /tmp/xcodebuild.nvim
  ├─ delete old file
  ├─ kill existing app
  ├─ clear snacks cache
  ├─ generate_mobile_preview() or generate_macos_preview()
  │   ├─ projectBuilder.build_project_for_preview(cb)
  │   │   └─ xcode.build_project(...) [blocking]
  │   ├─ xcode.install_app_on_simulator() [if mobile]
  │   └─ vim.fn.jobstart(launch_command) [non-blocking]
  └─ wait_for_preview(hotReload, callback)
      └─ vim.fn.timer_start(500, check_file_exists) [polling]
          └─ M.show_preview() when file found
```

## Configuration

```lua
-- lua/xcodebuild/core/config.lua
previews = {
  open_command = "vertical botright split +vertical\\ resize\\ 42 %s | wincmd p",
  show_notifications = true,
}
```

**open_command Pattern**:
- `%s` = file path placeholder
- `vertical botright split` = open vertical split on right
- `vertical resize 42` = resize to 42 columns
- `wincmd p` = switch to previous window

## Image Display

The actual image display is handled by `snacks.nvim`:

```lua
-- snacks.nvim renders PNG from path
-- Path is treated as buffer name: "/tmp/xcodebuild.nvim/<product>.png"
-- snacks.image detects .png extension and renders it
```

---

# Part 7: Integration Requirements for Projects

## Step 1: Add Package Dependency

In your Xcode project's Package.swift or via Xcode UI:

```swift
.package(url: "https://github.com/wojciech-kulik/xcodebuild-nvim-preview.git", branch: "main")
```

Then add to your target:
```swift
.product(name: "XcodebuildNvimPreview", package: "xcodebuild-nvim-preview")
```

## Step 2: SwiftUI Integration

```swift
import SwiftUI
import XcodebuildNvimPreview

@main
struct MyApp: App {
    var body: some Scene {
        WindowGroup {
            MainView()
              .setupNvimPreview { HomeView() }  // Wrap preview view
        }
    }
}
```

**Alternative: Direct View Pass**
```swift
MainView()
  .setupNvimPreview(view: { AnotherView() })
```

## Step 3: UIKit Integration

```swift
import UIKit
import XcodebuildNvimPreview
import Combine

class AppDelegate: UIResponder, UIApplicationDelegate {
    var cancellables = Set<AnyCancellable>()
    
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: 
                     [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        
        let controller = MainViewController()
        
        // Preview mode setup
        XcodebuildNvimPreview.setup(viewController: controller)
        
        // Optional: hot reload support
        observeHotReload()
            .sink { [weak controller] in
                if let controller = controller {
                    XcodebuildNvimPreview.setup(viewController: controller)
                }
            }
            .store(in: &cancellables)
        
        return true
    }
}
```

## Step 4: AppKit Integration

```swift
import AppKit
import XcodebuildNvimPreview

@main
struct MyApp: NSApplication {
    override func finishLaunching() {
        super.finishLaunching()
        
        let viewController = NSViewController()
        XcodebuildNvimPreview.setup(viewController: viewController)
        
        // Create window and set view controller
        let window = NSWindow()
        window.contentViewController = viewController
        window.makeKeyAndOrderFront(nil)
    }
}
```

## Step 5: Neovim Plugin Configuration

In your Neovim config (already done by xcodebuild.nvim):

```lua
require("xcodebuild").setup({
  previews = {
    open_command = "vertical botright split +vertical\\ resize\\ 42 %s | wincmd p",
    show_notifications = true,
  }
})
```

## Step 6: Optional - Hot Reload Setup

To enable hot reload functionality:

1. Integrate [Inject](https://github.com/krzysztofzablocki/Inject) into your app
2. The `observeHotReload()` function will work automatically
3. When code changes are injected, the notification fires
4. Preview regenerates automatically

---

# Part 8: Platform Abstractions

## View Protocol Implementation

The package achieves cross-platform support through:

### 1. Conditional Compilation
```swift
#if canImport(UIKit)
  // iOS, tvOS, watchOS
#endif

#if canImport(AppKit)
  // macOS
#endif
```

### 2. Extension-Based Overloading
```swift
// Multiple snapshot() implementations
extension UIView { func snapshot() { ... } }
extension NSView { func snapshot() { ... } }

// Multiple setup() implementations
extension XcodebuildNvimPreview {
  static func setup(view: UIView) { ... }
  static func setup(viewController: UIViewController) { ... }
  static func setup(view: NSView) { ... }
  static func setup(viewController: NSViewController) { ... }
}
```

### 3. Hosting Controller Abstraction
```swift
// SwiftUI → Platform View bridge
#if canImport(UIKit)
  UIHostingController(rootView: swiftUIView).view
#endif

#if canImport(AppKit)
  NSHostingView(rootView: swiftUIView)
#endif
```

## Shared Concepts Across Platforms

| Concept | iOS/tvOS | macOS | Implementation |
|---------|----------|-------|-----------------|
| Flag Detection | ProcessInfo.processInfo.arguments | Same | Shared: XcodebuildNvimPreview.swift |
| View Hosting | UIHostingController | NSHostingView | View+snapshot.swift |
| Rendering | UIGraphicsImageRenderer | NSBitmapImageRep | Platform-specific extensions |
| File Output | UIImage.pngData() | NSBitmapImageRep.representation() | UIView+snapshot.swift / NSView+snapshot.swift |
| Hot Reload | observeHotReload() | observeHotReload() | Shared: HotReload.swift |

---

# Part 9: Error Handling & Edge Cases

## Silent Error Handling

The snapshot writing uses silent error handling:

```swift
try? image.pngData()?.write(to: url)
```

**Implications**:
- File write failures are silently ignored
- Neovim will timeout after 30 seconds
- User sees "Failed to generate preview"
- No detailed error messages (by design)

**Possible Failure Scenarios**:
- Insufficient disk space in `/tmp`
- Permission denied on `/tmp/xcodebuild.nvim/`
- View rendering returned nil
- File system read-only

## Race Conditions

### Multiple Preview Requests
```lua
-- If user triggers preview twice before first completes:
-- 1. First request: delete old file, start polling
-- 2. Second request: delete first's PNG while polling!
-- 3. First's poll finds file gone, timeout
```

**Mitigation**:
- xcodebuild.nvim appears to handle this via single jobstart
- Only one build running at a time (enforced by builder)
- Polling is reliable despite file updates

### Hot Reload + Manual Preview
```lua
-- If user:
-- 1. Generates preview (app stays running)
-- 2. Manually edits code and injects changes
-- 3. Triggers preview again
-- Result: Kill old app, rebuild, etc. - all handled
```

## Timing Issues

### Layout Completion Delay
```swift
DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
  view().snapshot()
}
```

**Why 500ms**:
- SwiftUI layout is asynchronous
- Animations need time to settle
- View tree needs to be fully constructed
- Empirically determined timeout

### File System Write Timing
```lua
-- Polling every 500ms means:
-- 1. PNG write completes at T=N milliseconds
-- 2. Poll checks at T=N+500ms (worst case = 500ms delay)
-- 3. Display updates at T=N+500ms
-- Acceptable for development workflow
```

---

# Part 10: Potential Adaptations for XcodeBuildMCP

Based on this architecture, here's how to adapt this for MCP server use:

## Architecture Translation

### Current: Lua Orchestration → MCP Tool
```
Current:
Neovim (Lua) -> Build -> Launch App -> Poll File -> Display

MCP Adaptation:
Client -> MCP Tool: generate_preview -> Build -> Launch -> Poll -> Return PNG URI
```

### Tool Definition

```typescript
// Tool: generate_swiftui_preview
{
  name: "generate_swiftui_preview",
  description: "Generate and return a SwiftUI/UIKit/AppKit view preview",
  inputSchema: {
    type: "object",
    properties: {
      buildPath: {
        type: "string",
        description: "Path to .xcodeproj or .xcworkspace"
      },
      scheme: {
        type: "string",
        description: "Build scheme"
      },
      destination: {
        type: "string",
        description: "Simulator UDID or device ID"
      },
      platform: {
        type: "string",
        enum: ["iOS", "macOS"],
        description: "Target platform"
      }
    },
    required: ["buildPath", "scheme", "destination", "platform"]
  }
}
```

### Implementation Pattern

```typescript
export async function generateSwiftUIPreviewLogic(
  params: GeneratePreviewParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  // 1. Build validation
  const buildValidation = validateFileExists(params.buildPath);
  if (!buildValidation.isValid) return buildValidation.errorResponse;

  // 2. Build project
  const buildResult = await executor(
    ["xcodebuild", "-workspace", params.buildPath, ...],
    "Building project for preview"
  );
  
  if (!buildResult.success) {
    return createErrorResponse("Build failed", buildResult.error);
  }

  // 3. Launch with snapshot flag
  if (params.platform === "iOS") {
    await executor(
      ["xcrun", "simctl", "launch", params.destination, 
       params.bundleId, "--", "--xcodebuild-nvim-snapshot"],
      "Launching app for snapshot"
    );
  } else if (params.platform === "macOS") {
    await executor(
      ["open", params.appPath, "--args", "--xcodebuild-nvim-snapshot"],
      "Launching app for snapshot"
    );
  }

  // 4. Poll for PNG (max 30 seconds)
  const pngPath = await pollForSnapshotFile(
    `/tmp/xcodebuild.nvim/${params.bundleId}.png`,
    30000
  );

  if (!pngPath) {
    return createErrorResponse("Snapshot generation timeout");
  }

  // 5. Return file or content
  // Option A: Return PNG binary as base64
  const pngData = readFileSync(pngPath, 'base64');
  return {
    content: [{
      type: "image",
      source: {
        type: "base64",
        mediaType: "image/png",
        data: pngData
      }
    }],
    isError: false
  };
  
  // Option B: Return MCP Resource URI
  // return createTextResponse(`Preview: xcodebuildmcp://preview/${bundleId}`);
}
```

## File Structure in XcodeBuildMCP

```
src/mcp/tools/
├── ui-automation/           ← Could go here or new group
├── swiftui-previews/        ← New group for preview tools
│   ├── generate_preview_ios_ws.ts
│   ├── generate_preview_ios_proj.ts
│   ├── generate_preview_macos_ws.ts
│   ├── generate_preview_macos_proj.ts
│   └── __tests__/
│       └── preview.test.ts
└── ...
```

## MCP Resource Integration

```typescript
// src/mcp/resources/preview.ts
export default {
  uri: "xcodebuildmcp://preview/<bundle-id>",
  name: "swiftui_preview",
  description: "SwiftUI/UIKit preview image",
  mimeType: "image/png",
  async handler(uri: URL): Promise<{ contents: Array<{ blob?: string }> }> {
    const bundleId = uri.pathname.split('/').pop();
    const pngPath = `/tmp/xcodebuild.nvim/${bundleId}.png`;
    
    if (!existsSync(pngPath)) {
      throw new Error("Preview not available");
    }

    const pngData = readFileSync(pngPath, 'base64');
    return {
      contents: [{
        blob: pngData
      }]
    };
  }
};
```

## Key Differences from xcodebuild.nvim

| Aspect | xcodebuild.nvim | XcodeBuildMCP |
|--------|-----------------|---------------|
| Display | Neovim split window | MCP client (Claude, Cursor, etc.) |
| Timing | Interactive (user waits) | May be async or streamed |
| Error Reporting | Notifications | Tool response content |
| Hot Reload | Supported via Inject | Possible but not built-in |
| File Format | PNG to /tmp | PNG or base64 in response |
| State Management | Timers and global state | Tool invocation state |

## Testing Strategy for XcodeBuildMCP

Following the project's DI testing philosophy:

```typescript
import { describe, it, expect } from 'vitest';
import { generateSwiftUIPreviewLogic } from '../generate_preview.js';
import { createMockExecutor } from '../../../utils/test-common.js';

describe('generate_swiftui_preview', () => {
  it('should return PNG data on successful preview', async () => {
    const mockExecutor = createMockExecutor({
      success: true,
      output: ""
    });

    // Mock file system for PNG existence
    // (would need FileSystemExecutor mock as well)

    const result = await generateSwiftUIPreviewLogic({
      buildPath: "/path/to/project.xcworkspace",
      scheme: "MyApp",
      destination: "sim-id",
      platform: "iOS"
    }, mockExecutor);

    expect(result.isError).toBe(false);
    expect(result.content[0].type).toBe("image");
  });

  it('should handle build failures gracefully', async () => {
    const mockExecutor = createMockExecutor({
      success: false,
      error: "Build failed"
    });

    const result = await generateSwiftUIPreviewLogic(params, mockExecutor);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Build failed");
  });

  it('should timeout after 30 seconds of waiting', async () => {
    // Mock long delay
    // Should return error without hanging
  });
});
```

## Documentation Integration

Add to docs/TOOLS.md:

```markdown
### SwiftUI Preview Generation (`swiftui-previews`)
**Purpose**: Generate and display SwiftUI, UIKit, and AppKit view previews directly from MCP tools.

- `generate_preview_ios_ws` - Generate preview for iOS app from workspace
- `generate_preview_ios_proj` - Generate preview for iOS app from project
- `generate_preview_macos_ws` - Generate preview for macOS app from workspace
- `generate_preview_macos_proj` - Generate preview for macOS app from project

**Features**:
- Automatic build invocation
- Simulator/device app launch with special flag
- PNG snapshot capture and base64 encoding
- Support for SwiftUI, UIKit, and AppKit views
- Platform-specific rendering optimization
```

---

# Summary: Key Insights

## What Makes This Architecture Elegant

1. **Simple Flag-Based Protocol**: Single command-line argument to enable snapshot mode
2. **File-Based IPC**: No socket communication needed; works on simulators naturally
3. **Platform Abstractions**: Single package, platform-specific implementation via conditional compilation
4. **Polling Simplicity**: 500ms timer with 30-second timeout is robust and maintainable
5. **View Bridging**: SwiftUI→UIHostingController→UIView→PNG pipeline is elegant
6. **Hot Reload Support**: Combine publisher pattern integrates cleanly

## What Could Be Improved

1. **Silent Error Handling**: No logging makes debugging hard (intentional trade-off)
2. **Race Condition Potential**: Multiple snapshots might interfere
3. **Timing Assumptions**: 500ms delay and 30-second timeout are heuristics
4. **File System Coupling**: Depends on /tmp being writable and persistent
5. **Single View Model**: Can only snapshot one view at a time per product

## Adaptation Considerations for XcodeBuildMCP

1. **Async Nature**: MCP can handle async gracefully (unlike Neovim timers)
2. **Error Reporting**: Can provide detailed error messages instead of silent failures
3. **Resource URIs**: Preview images could be served as MCP resources
4. **Caching**: Could cache previews between requests
5. **Batch Previews**: Could generate multiple views in one invocation
6. **Progress Reporting**: Could stream build/snapshot progress to client

---

# Appendices

## Appendix A: File System Layout

```
/tmp/xcodebuild.nvim/
├── MyApp.png              # Generated snapshot from MyApp
├── AnotherApp.png         # Generated snapshot from AnotherApp
└── ...

Project Structure:
MyApp/
├── Sources/
│   └── MyApp/
│       ├── Views/
│       │   └── HomeView.swift
│       └── MainApp.swift
└── Package.swift
    dependencies: [
      .package(url: "xcodebuild-nvim-preview")
    ]
```

## Appendix B: Process Lifecycle

### App Launch Sequence
```
1. Neovim calls vim.fn.jobstart([launch command])
2. OS spawns process with --xcodebuild-nvim-snapshot arg
3. ProcessInfo.processInfo.arguments captured at app launch
4. XcodebuildNvimPreview.isInPreview becomes true
5. App initialization code runs
6. setupNvimPreview { } or .setup(view:) called
7. condition checks isInPreview
8. if true: snapshot() called
9. PNG written to /tmp/xcodebuild.nvim/
10. App continues running (unless hotReload=false → killed)
```

### File Write Sequence
```
1. View.snapshot() extension called
2. Platform-specific rendering (UIGraphicsImageRenderer or NSBitmapImageRep)
3. image.pngData() creates PNG binary
4. .write(to: url) writes atomically to filesystem
5. File appears at /tmp/xcodebuild.nvim/<name>.png
6. Neovim's polling timer detects file
7. vim.fn.bufwinid() opens window
8. snacks.nvim renders image
```

## Appendix C: Command Reference

### iOS Simulator Preview Launch
```bash
xcrun simctl launch \
  --terminate-running-process \
  --console-pty \
  <SIMULATOR_UDID> \
  <BUNDLE_ID> \
  -- \
  --xcodebuild-nvim-snapshot
```

### macOS Preview Launch
```bash
open /path/to/App.app --args --xcodebuild-nvim-snapshot
```

### Xcodebuild Invocation
```bash
xcodebuild build \
  -workspace MyApp.xcworkspace \
  -scheme MyApp \
  -destination "platform=iOS Simulator,id=<UDID>" \
  -derivedDataPath /path/to/derived/data \
  -configuration Release
```

## Appendix D: Data Flow Diagrams

### Complete Preview Flow
```
User: :XcodebuildPreviewGenerateAndShow
         ↓
Lua/Previews.lua::M.generate_preview()
    ├─ validate() ────────────────────────────────┐
    ├─ mkdir /tmp/xcodebuild.nvim                 │
    ├─ rm old file                                │
    ├─ kill app                                   │
    ├─ clear snacks cache                         │
    ├─ projectBuilder.build_project_for_preview() │
    │   └─ xcode.build_project()                  │
    ├─ xcode.install_app_on_simulator()           │
    ├─ vim.fn.jobstart(launch_command)            │
    │   └─ xcrun simctl launch ... --xcodebuild-nvim-snapshot
    │       └─ iOS Simulator                      │
    │           ├─ ProcessInfo.processInfo.arguments
    │           ├─ XcodebuildNvimPreview.isInPreview = true
    │           ├─ App initialization
    │           ├─ setupNvimPreview { view }
    │           ├─ View.snapshot()
    │           │   ├─ UIHostingController (SwiftUI)
    │           │   ├─ UIGraphicsImageRenderer
    │           │   ├─ drawHierarchy()
    │           │   ├─ UIImage.pngData()
    │           │   └─ FileManager.write()
    │           └─ /tmp/xcodebuild.nvim/MyApp.png ← File appears
    │
    ├─ wait_for_preview(hotReload, callback)     │
    │   └─ vim.fn.timer_start(500ms) [polling]   │
    │       └─ util.file_exists()                │
    │           └─ Found! ───────────────────────┼─→ show_result()
    │                                             │
    └─────────────────────────────────────────────┘
         ↓
    M.show_preview()
         ├─ vim.cmd(open_command)
         │   └─ "vertical botright split +vertical\ resize\ 42 %s | wincmd p"
         ├─ Open /tmp/xcodebuild.nvim/MyApp.png
         ├─ snacks.nvim detects .png extension
         └─ Image displayed in split window
```

### Hot Reload Flow
```
User edits code
    ↓
Inject framework detects change
    ↓
Recompiles + injects code into running app
    ↓
Broadcasts INJECTION_BUNDLE_NOTIFICATION
    ↓
observeHotReload() Combine publisher fires
    ↓
SwiftUI .onReceive() triggers
    ↓
view().snapshot() called again
    ↓
New PNG written to /tmp/xcodebuild.nvim/
    ↓
Neovim's timer detects file change
    ↓
snacks.nvim cache cleared (1s interval)
    ↓
Image reloaded in Neovim
```

---

# Document Version

- **Created**: 2025-10-31
- **Analysis Scope**: xcodebuild.nvim + xcodebuild-nvim-preview ecosystem
- **Codebase Status**: Current as of October 2025
- **Target Audience**: XcodeBuildMCP developers, architecture designers


# Invoking Apple's Preview Frameworks Directly

## Overview

Instead of reverse engineering the entire implementation to recreate it, this guide shows how to **directly invoke** Apple's private preview frameworks. This is significantly less work and leverages Apple's battle-tested code.

**Effort Comparison:**
- **Full Recreation**: 200+ hours of reverse engineering + implementation
- **Direct Invocation**: 20-40 hours of API discovery + integration

## Legal & Practical Considerations

### ⚠️ Important Caveats

**Risks:**
- 🔴 **Not App Store Safe**: Private framework usage violates App Store guidelines
- 🟡 **Fragile**: APIs can change between Xcode versions without warning
- 🟡 **No Support**: Apple provides no documentation or support
- 🟡 **Detection**: Apple could detect and block private API usage

**Allowed Use Cases:**
- ✅ **Developer Tools**: XcodeBuildMCP is a CLI tool, not an App Store app
- ✅ **Personal/Internal Tools**: Not distributed to end users
- ✅ **Research**: Understanding Apple's architecture
- ✅ **Prototyping**: Validate approach before clean-room implementation

**Similar Projects Using This Approach:**
- **libimobiledevice** - Uses private iOS protocols
- **ideviceinstaller** - Private MobileDevice framework
- **ios-deploy** - Private device management APIs
- **Hammerspoon** - Private macOS APIs

## Discovery Strategy (What to Reverse Engineer)

### Phase 1: API Surface Discovery (Easiest)

You only need to find:
1. **Entry point classes/functions** - How to start the preview system
2. **Method signatures** - Parameters and return types
3. **XPC protocol** (if used) - Message format
4. **Initialization sequence** - Required setup

**Tools Needed:**
- `class-dump` or `dsdump` - Extract headers
- `nm` - List symbols
- `strings` - Find string constants
- LLDB - Runtime inspection
- Hopper/Ghidra - Limited analysis of key functions only

### What We've Already Found

From our initial extraction, we discovered these key classes:

```swift
// PreviewsPipeline.framework
PreviewsPipeline.PreviewService
PreviewsPipeline.RunningAppPreviewManager
PreviewsPipeline.Pipeline
PreviewsPipeline.PreviewAgentCache
PreviewsPipeline.PreviewDeviceAgentInstaller

// Key method found:
PreviewService.makeRunningAppPreviewManager() -> RunningAppPreviewManager
PreviewService.invalidate() -> ()
```

## Detailed Discovery Steps

### Step 1: Extract Complete Symbol Information

#### Using `nm` for Symbol Discovery

```bash
# Extract all public symbols from PreviewsPipeline
nm -gU /Applications/Xcode.app/Contents/SharedFrameworks/PreviewsPipeline.framework/Versions/A/PreviewsPipeline > PreviewsPipeline_symbols.txt

# Filter for class definitions
grep " _OBJC_CLASS_" PreviewsPipeline_symbols.txt

# Filter for Swift type metadata (classes)
grep " _\$s16PreviewsPipeline.*CN$" PreviewsPipeline_symbols.txt
```

#### Using `dsdump` for Swift Classes (Better than class-dump)

Install dsdump (Swift-aware):
```bash
git clone https://github.com/DerekSelander/dsdump
cd dsdump && swift build -c release
sudo cp .build/release/dsdump /usr/local/bin/
```

Extract Swift interface:
```bash
dsdump --swift /Applications/Xcode.app/Contents/SharedFrameworks/PreviewsPipeline.framework/Versions/A/PreviewsPipeline > PreviewsPipeline_swift.txt
```

This gives you actual Swift signatures!

### Step 2: Runtime Inspection with LLDB

**Attach to Xcode during active preview:**

```bash
# Find Xcode PID
pgrep -x Xcode

# Attach LLDB
lldb -p <xcode-pid>
```

**Inspect loaded frameworks:**
```lldb
(lldb) image list | grep Preview
[  0] /Applications/Xcode.app/Contents/SharedFrameworks/PreviewsPipeline.framework/Versions/A/PreviewsPipeline
[  1] /Applications/Xcode.app/Contents/SharedFrameworks/PreviewsFoundationHost.framework/Versions/A/PreviewsFoundationHost
...
```

**Dump class information:**
```lldb
# Swift class introspection
(lldb) expr import PreviewsPipeline
(lldb) expr -l swift -- import PreviewsPipeline

# List all classes in module
(lldb) script
>>> import lldb
>>> for module in lldb.debugger.GetSelectedTarget().module_iter():
...     if 'PreviewsPipeline' in module.file.basename:
...         print(module.file.basename)
```

**Find method signatures at runtime:**
```lldb
# Set breakpoint on preview trigger
(lldb) rb PreviewService -s PreviewsPipeline

# Examine stack when hit
(lldb) bt

# Inspect parameters
(lldb) fr v
```

### Step 3: XPC Protocol Discovery

**Monitor XPC traffic with `log`:**

```bash
# Stream XPC-related log messages
log stream --predicate 'subsystem CONTAINS "preview" OR category CONTAINS "preview"' --level debug

# Or more targeted:
log stream --predicate 'processImagePath CONTAINS "Xcode" AND (message CONTAINS "XPC" OR message CONTAINS "preview")' --level debug
```

**Use `dtrace` for XPC calls:**

```bash
# Monitor xpc_connection_send_message calls
sudo dtrace -qn 'pid$target::xpc_connection_send_message*:entry { printf("%s\n", copyinstr(arg1)); }' -p $(pgrep Xcode)
```

**XPoCe Tool (Jonathan Levin):**

If available, use XPoCe to sniff XPC messages:
```bash
# XPoCe can intercept and decode XPC messages
# Find at: http://newosxbook.com/tools/XPoCe.html
```

### Step 4: Discover Initialization Sequence

**Find how Xcode initializes preview system:**

1. **Search for initialization patterns in strings:**
```bash
strings PreviewsPipeline | grep -i "init\|start\|setup\|configure"
```

2. **Look for singleton patterns:**
```bash
# Swift singleton patterns
strings PreviewsPipeline | grep -i "shared\|default\|instance"
```

3. **Check for environment variables:**
```bash
strings PreviewsPipeline | grep "XCODE\|PREVIEW\|DVT"
```

Expected findings:
- `XCODE_RUNNING_FOR_PREVIEWS`
- `DVT_ENABLE_PREVIEWS`
- Configuration paths, etc.

## Practical Invocation Strategies

### Strategy 1: Dynamic Library Loading (Simplest)

Load Apple's frameworks directly into your process:

```swift
// XcodeBuildMCP Swift Helper (hypothetical)
import Foundation

// Load the preview framework
let previewPipelinePath = "/Applications/Xcode.app/Contents/SharedFrameworks/PreviewsPipeline.framework/PreviewsPipeline"

guard let handle = dlopen(previewPipelinePath, RTLD_NOW) else {
    fatalError("Failed to load PreviewsPipeline: \(String(cString: dlerror()))")
}

// Get class reference using runtime
let previewServiceClass = NSClassFromString("PreviewsPipeline.PreviewService")

// Call methods using Objective-C runtime or Swift reflection
// Note: This requires knowing the method signatures from dsdump
```

**Challenges:**
- Swift classes are harder to call than Objective-C
- Need exact method signatures
- Type metadata can be tricky

### Strategy 2: XPC Client Implementation (Most Practical)

Instead of loading frameworks, **act as an XPC client** just like Xcode does:

#### Discover XPC Service Names

```bash
# Find XPC services in Xcode bundle
find /Applications/Xcode.app -name "*.xpc" | grep -i preview

# Expected location:
# /Applications/Xcode.app/Contents/XPCServices/com.apple.dt.Xcode.PreviewsService.xpc
```

#### Examine XPC Service Info.plist

```bash
plutil -p /Applications/Xcode.app/Contents/XPCServices/com.apple.dt.Xcode.PreviewsService.xpc/Contents/Info.plist
```

Look for:
- **Service name**: `CFBundleIdentifier`
- **Mach service**: `MachServices` key
- **Required entitlements**

#### Create XPC Client

```swift
import Foundation

// Connect to Xcode's preview XPC service
let connection = NSXPCConnection(
    serviceName: "com.apple.dt.Xcode.PreviewsService"
)

// Set interface (requires discovering protocol)
// This is the hard part - need to find @protocol definition
connection.remoteObjectInterface = NSXPCInterface(with: /* PreviewsServiceProtocol */)

connection.resume()

// Get remote proxy
let service = connection.remoteObjectProxy as! /* PreviewsServiceProtocol */

// Call methods
service.generatePreview(for: viewURL) { result in
    // Handle result
}
```

**Discovering XPC Protocol:**

1. **Extract protocol from headers:**
```bash
dsdump --protocols /Applications/Xcode.app/Contents/XPCServices/com.apple.dt.Xcode.PreviewsService.xpc/Contents/MacOS/PreviewsService
```

2. **Monitor XPC messages:**
Use `log stream` or dtrace to see what messages are sent

3. **Reverse engineer message format:**
Use Hopper/Ghidra to find protocol definition in XPC service binary

### Strategy 3: Process Spawning (Most Isolated)

Spawn Apple's preview agent process directly:

```typescript
// XcodeBuildMCP TypeScript
import { spawn } from 'child_process';

const previewAgentPath = '/Applications/Xcode.app/Contents/SharedFrameworks/PreviewsFoundationHost.framework/XPCServices/PreviewAgent.xpc/Contents/MacOS/PreviewAgent';

// Spawn the preview agent
const agent = spawn(previewAgentPath, [
  '--preview-mode',  // Hypothetical flags discovered from strings/analysis
  '--snapshot',
  '--output', '/tmp/preview.png'
], {
  env: {
    ...process.env,
    XCODE_RUNNING_FOR_PREVIEWS: '1'
  }
});

// Communicate via stdin/stdout
agent.stdin.write(JSON.stringify({
  command: 'render',
  viewPath: '/path/to/ContentView.swift'
}));

agent.stdout.on('data', (data) => {
  // Parse response
});
```

**Discovering Command-Line Arguments:**

```bash
# Extract help/usage strings
strings PreviewAgent | grep -E "^-|^--"

# Check for argument parsing
strings PreviewAgent | grep -i "usage\|argument\|option"

# Run with --help (might work!)
/path/to/PreviewAgent --help
```

## Minimal Reverse Engineering Required

### What You MUST Find

1. **Entry Point** ✅ (Found: `PreviewService.makeRunningAppPreviewManager()`)
   ```swift
   // How to start the preview system
   let service = PreviewService()
   let manager = service.makeRunningAppPreviewManager()
   ```

2. **Render/Capture Method** ⚠️ (Need to find)
   ```swift
   // How to trigger a preview render
   manager.renderPreview(for: someView, completion: { image in ... })
   ```

3. **Output Format** ⚠️ (Need to find)
   - Does it return `CGImage`? `UIImage`? `Data`?
   - Or does it write to a file?
   - Or send via XPC?

4. **Cleanup** ✅ (Found: `PreviewService.invalidate()`)
   ```swift
   service.invalidate()
   ```

### What You DON'T Need

- ❌ Understanding the rendering implementation
- ❌ Understanding hot-reload mechanism
- ❌ Understanding build integration
- ❌ Understanding internal state management
- ❌ Understanding optimization strategies

You just need to know **how to call the API**, not **how it works internally**.

## Practical Extraction Workflow

### Step-by-Step Plan

#### Day 1: Symbol Extraction & Analysis

```bash
# 1. Extract all symbols
./dump_preview_headers.sh

# 2. Install dsdump for Swift analysis
# Follow instructions in "Using dsdump" section above

# 3. Extract Swift interfaces
dsdump --swift PreviewsPipeline > PreviewsPipeline_interface.swift
dsdump --swift PreviewsFoundationHost > PreviewsFoundationHost_interface.swift

# 4. Search for key patterns
grep -E "render|capture|snapshot|generate" PreviewsPipeline_interface.swift
```

#### Day 2: XPC Service Discovery

```bash
# 1. Find XPC services
find /Applications/Xcode.app -name "*.xpc" | grep -i preview

# 2. Examine service bundles
for xpc in $(find /Applications/Xcode.app -name "*.xpc" | grep -i preview); do
  echo "=== $xpc ==="
  plutil -p "$xpc/Contents/Info.plist" | grep -E "CFBundleIdentifier|MachServices"
done

# 3. Extract XPC service binary symbols
dsdump --swift /path/to/PreviewsService.xpc/Contents/MacOS/PreviewsService > XPC_interface.swift
```

#### Day 3: Runtime Observation

```bash
# 1. Start Xcode with preview
# Open a SwiftUI project and show preview canvas

# 2. Attach LLDB to Xcode
lldb -p $(pgrep Xcode)

# 3. Set breakpoints on interesting functions
(lldb) rb PreviewService -s PreviewsPipeline
(lldb) rb render -s PreviewsPipeline
(lldb) rb capture -s PreviewsPipeline
(lldb) c

# 4. Trigger preview in Xcode
# Canvas should update, hitting breakpoints

# 5. Examine call stack and parameters
(lldb) bt
(lldb) fr v -a

# 6. Log findings
```

#### Day 4: Protocol Reconstruction

Based on findings from Days 1-3:

1. **Document discovered classes:**
```swift
// PreviewService.swift (our reconstruction)
class PreviewService {
    func makeRunningAppPreviewManager() -> RunningAppPreviewManager
    func invalidate()
}

class RunningAppPreviewManager {
    // Methods to discover
    func renderPreview(...) -> ...
}
```

2. **Create minimal interface:**
```swift
// MinimalPreviewsInterface.swift
@objc protocol PreviewsServiceProtocol {
    func generateSnapshot(
        viewPath: String,
        outputPath: String,
        completion: @escaping (Error?) -> Void
    )
}
```

3. **Test invocation:**
```swift
// Test calling the framework
let service = PreviewService()
let manager = service.makeRunningAppPreviewManager()
// ... try to call discovered methods
```

#### Day 5: Integration & Testing

1. **Create Swift helper binary:**
```swift
// preview-helper.swift
// Loads Apple frameworks and exposes simple CLI
// Usage: preview-helper render ContentView.swift output.png
```

2. **Call from XcodeBuildMCP:**
```typescript
// In TypeScript tool
const result = await executor([
  'preview-helper', 'render',
  viewPath, outputPath
], 'Preview Generation');
```

3. **Iterate on parameter discovery**

## Expected Findings

Based on similar reverse engineering projects, you'll likely find:

### Class Structure

```swift
// Expected API surface (to be confirmed)
class PreviewService {
    static let shared: PreviewService

    func makeRunningAppPreviewManager() -> RunningAppPreviewManager
    func invalidate()
}

class RunningAppPreviewManager {
    func startPreview(
        for viewPath: URL,
        target: PreviewTarget,
        completion: @escaping (Result<PreviewOutput, Error>) -> Void
    )

    func stopPreview()
}

struct PreviewTarget {
    let simulator: SimulatorInfo?
    let device: DeviceInfo?
    // ...
}

struct PreviewOutput {
    let image: CGImage
    let metadata: [String: Any]
}
```

### XPC Protocol

```swift
// Expected XPC protocol (to be confirmed)
@objc protocol PreviewsXPCProtocol {
    func generatePreview(
        request: [String: Any],
        reply: @escaping ([String: Any]?, Error?) -> Void
    )

    func cancelPreview(
        identifier: String,
        reply: @escaping (Error?) -> Void
    )
}
```

### Environment Variables

```bash
# Expected configuration
XCODE_RUNNING_FOR_PREVIEWS=1
DVT_ENABLE_PREVIEWS=YES
PREVIEWS_OUTPUT_PATH=/tmp/preview.png
```

## Implementation Options for XcodeBuildMCP

### Option A: Swift Helper Binary (Recommended)

**Pros:**
- Native framework integration
- Type-safe Swift code
- Direct access to Apple's APIs

**Cons:**
- Requires Swift toolchain
- Additional build complexity
- Must ship binary with XcodeBuildMCP

**Implementation:**
```
XcodeBuildMCP/
├── src/mcp/tools/previews/
│   ├── generate_preview.ts      # MCP tool
│   └── preview-helper/          # Swift binary
│       ├── Package.swift
│       ├── Sources/
│       │   └── main.swift       # Calls Apple frameworks
│       └── build.sh
```

### Option B: XPC Client (Most Elegant)

**Pros:**
- Clean separation from Xcode internals
- Process isolation
- Matches Apple's architecture

**Cons:**
- Hardest to reverse engineer
- XPC protocol discovery required
- Most fragile (protocol changes)

**Implementation:**
```typescript
// XcodeBuildMCP tool
import { NSXPCConnection } from 'objc'; // Using Node.js objc bridge

const connection = new NSXPCConnection('com.apple.dt.Xcode.PreviewsService');
connection.resume();

const service = connection.remoteObjectProxy;
await service.generatePreview({...});
```

### Option C: Process Spawn (Fallback)

**Pros:**
- Simplest integration
- Maximum isolation
- Works even if API changes

**Cons:**
- Requires finding command-line interface
- May not exist for all operations
- Least control

**Implementation:**
```typescript
// If PreviewAgent accepts CLI args
const result = await executor([
  '/Applications/Xcode.app/.../PreviewAgent',
  '--snapshot',
  '--view', viewPath,
  '--output', outputPath
], 'Preview Generation');
```

## Risk Mitigation

### Version Detection

```typescript
// Detect Xcode version
const xcodeVersion = await executor(['xcodebuild', '-version']);

// Load appropriate framework paths per version
const frameworkPath = FRAMEWORK_PATHS[xcodeVersion] || FRAMEWORK_PATHS.default;
```

### Graceful Fallback

```typescript
try {
  // Try Apple framework approach
  return await generatePreviewViaFramework(params);
} catch (error) {
  if (error.code === 'FRAMEWORK_NOT_FOUND') {
    // Fall back to xcodebuild.nvim approach
    return await generatePreviewViaSimulator(params);
  }
  throw error;
}
```

### Feature Detection

```typescript
// Check if framework is available
const hasPreviewFramework = fs.existsSync(
  '/Applications/Xcode.app/Contents/SharedFrameworks/PreviewsPipeline.framework'
);

if (hasPreviewFramework) {
  // Use fast Apple framework path
} else {
  // Use slower but compatible simulator path
}
```

## Success Metrics

You've succeeded when you can:

1. ✅ Load Apple's preview framework into a process
2. ✅ Create a preview service instance
3. ✅ Trigger a preview render for a SwiftUI view
4. ✅ Receive the rendered image (as file, data, or image object)
5. ✅ Clean up resources

**Minimum viable invocation:**
```swift
let service = PreviewService()
let manager = service.makeRunningAppPreviewManager()
let image = manager.render(viewAt: URL(fileURLWithPath: "/path/to/ContentView.swift"))
// image is CGImage or similar
```

## Recommended Approach for XcodeBuildMCP

### Phase 1: Quick Prototype (1-2 weeks)

1. **Extract complete Swift interfaces** using `dsdump`
2. **Create minimal Swift CLI** that loads frameworks
3. **Test basic invocation** (even if it crashes, you learn!)
4. **Document findings** in this repository

### Phase 2: Robust Integration (2-3 weeks)

1. **Implement Swift helper binary** with error handling
2. **Integrate with XcodeBuildMCP** TypeScript tools
3. **Add version detection** and fallback logic
4. **Test across Xcode versions**

### Phase 3: Optimization (Optional)

1. **Implement XPC client** if protocol is discovered
2. **Add caching** for repeated previews
3. **Hot-reload support** if possible

## Next Steps

1. **Install `dsdump`**: Get Swift-aware class dump tool
2. **Run extraction**: `dsdump --swift PreviewsPipeline > interface.swift`
3. **Analyze symbols**: Look for render/capture/generate methods
4. **Test invocation**: Create minimal Swift test program
5. **Document API**: Build our own interface definition
6. **Integrate**: Add to XcodeBuildMCP

The key insight: **You don't need to understand how it works, just how to call it.**

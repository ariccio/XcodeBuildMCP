# Advanced Features & Diagnostics

Complete reference for log capture, system diagnostics, dynamic tool discovery, and MCP resources.

## Log Capture for Simulators

### start_sim_log_cap
Starts log capture for an iOS simulator app.

```bash
npx reloaderoo@latest inspect call-tool start_sim_log_cap \
  --params '{"simulatorUuid": "SIMULATOR-UUID", "bundleId": "com.example.MyApp"}' \
  -q -- npx xcodebuildmcp@latest
```

**Returns:** Log session ID for stopping capture later.

**Use cases:**
- Debugging app issues
- Capturing crash logs
- Monitoring app behavior
- Automated testing with log validation

### stop_sim_log_cap
Stops log capture for a simulator and retrieves captured logs.

```bash
npx reloaderoo@latest inspect call-tool stop_sim_log_cap \
  --params '{"logSessionId": "SESSION-ID"}' \
  -q -- npx xcodebuildmcp@latest
```

**Returns:** Complete captured log output since `start_sim_log_cap`.

**Log format:** Timestamped log messages from the specified app.

## Log Capture for Physical Devices

### start_device_log_cap
Starts log capture for a physical device app.

```bash
npx reloaderoo@latest inspect call-tool start_device_log_cap \
  --params '{"deviceId": "DEVICE-UDID", "bundleId": "com.example.MyApp"}' \
  -q -- npx xcodebuildmcp@latest
```

**Returns:** Log session ID for stopping capture later.

**Requirements:**
- Device connected and unlocked
- Device paired with development Mac
- App running or about to launch

### stop_device_log_cap
Stops log capture for a physical device and retrieves logs.

```bash
npx reloaderoo@latest inspect call-tool stop_device_log_cap \
  --params '{"logSessionId": "SESSION-ID"}' \
  -q -- npx xcodebuildmcp@latest
```

**Returns:** Complete captured log output since `start_device_log_cap`.

## System Diagnostics

### doctor
Runs comprehensive system diagnostics for XcodeBuildMCP environment.

```bash
npx reloaderoo@latest inspect call-tool doctor --params '{}' -q -- npx xcodebuildmcp@latest
```

**Checks:**
- Xcode installation and version
- Command-line tools availability
- Simulator runtime availability
- Device connection status
- Code signing configuration
- Swift toolchain version
- System dependencies

**Returns:** Detailed diagnostic report with pass/fail status for each check.

**Use cases:**
- Troubleshooting setup issues
- Validating CI/CD environment
- Pre-flight checks before development
- System health monitoring

## Dynamic Tool Discovery

### discover_tools
Analyzes a task description and suggests relevant XcodeBuildMCP workflow groups.

```bash
npx reloaderoo@latest inspect call-tool discover_tools \
  --params '{"task_description": "I want to build and run my iOS app on a simulator."}' \
  -q -- npx xcodebuildmcp@latest
```

**Returns:** Recommended workflow groups and tools based on task analysis.

**Example tasks:**
- "Build and test my iOS app on a simulator"
- "Deploy to a physical device"
- "Run UI automation tests"
- "Build a macOS app"
- "Work with Swift packages"

**Use case:** When you're unsure which tools to use, let AI analyze your task and suggest the appropriate workflow.

## MCP Resources

XcodeBuildMCP exposes resources for common queries without requiring specific tool calls.

### Simulators Resource
Lists all available iOS simulators.

```bash
npx reloaderoo@latest inspect read-resource "xcodebuildmcp://simulators" -q -- npx xcodebuildmcp@latest
```

**Equivalent to:** `list_sims` tool

**Returns:** All simulators with UUIDs, names, device types, and states.

### Devices Resource
Lists all connected physical devices.

```bash
npx reloaderoo@latest inspect read-resource "xcodebuildmcp://devices" -q -- npx xcodebuildmcp@latest
```

**Equivalent to:** `list_devices` tool

**Returns:** All devices with UDIDs, names, models, and connection status.

### Doctor Resource
System diagnostics information.

```bash
npx reloaderoo@latest inspect read-resource "xcodebuildmcp://doctor" -q -- npx xcodebuildmcp@latest
```

**Equivalent to:** `doctor` tool

**Returns:** Complete diagnostic report for the development environment.

### Swift Packages Resource
Lists all running Swift package processes.

```bash
npx reloaderoo@latest inspect read-resource "xcodebuildmcp://swift-packages" -q -- npx xcodebuildmcp@latest
```

**Equivalent to:** `swift_package_list` tool

**Returns:** Running Swift package processes with PIDs and package names.

## Common Advanced Workflow Patterns

### Complete Log Capture Workflow (Simulator)
```bash
# 1. Launch app with log capture
npx reloaderoo@latest inspect call-tool launch_app_logs_sim \
  --params '{"simulatorId": "UUID", "bundleId": "com.example.MyApp"}' \
  -q -- npx xcodebuildmcp@latest
# Returns session ID automatically

# Alternative: Start capture separately
npx reloaderoo@latest inspect call-tool start_sim_log_cap \
  --params '{"simulatorUuid": "UUID", "bundleId": "com.example.MyApp"}' \
  -q -- npx xcodebuildmcp@latest
# Returns: {"logSessionId": "SESSION-ID"}

# 2. Perform test actions (use UI automation tools)
# ...

# 3. Stop capture and retrieve logs
npx reloaderoo@latest inspect call-tool stop_sim_log_cap \
  --params '{"logSessionId": "SESSION-ID"}' \
  -q -- npx xcodebuildmcp@latest
```

### Complete Log Capture Workflow (Device)
```bash
# 1. Start log capture
npx reloaderoo@latest inspect call-tool start_device_log_cap \
  --params '{"deviceId": "DEVICE-UDID", "bundleId": "com.example.MyApp"}' \
  -q -- npx xcodebuildmcp@latest
# Returns: {"logSessionId": "SESSION-ID"}

# 2. Launch the app
npx reloaderoo@latest inspect call-tool launch_app_device \
  --params '{"deviceId": "DEVICE-UDID", "bundleId": "com.example.MyApp"}' \
  -q -- npx xcodebuildmcp@latest

# 3. Perform test actions

# 4. Stop capture and retrieve logs
npx reloaderoo@latest inspect call-tool stop_device_log_cap \
  --params '{"logSessionId": "SESSION-ID"}' \
  -q -- npx xcodebuildmcp@latest
```

### Automated Testing with Log Validation
```bash
# 1. Build and run app with logs
npx reloaderoo@latest inspect call-tool build_run_sim \
  --params '{"projectPath": "/path/to/project.xcodeproj", "scheme": "MyScheme", "simulatorName": "iPhone 16"}' \
  -q -- npx xcodebuildmcp@latest

# 2. Start log capture
npx reloaderoo@latest inspect call-tool start_sim_log_cap \
  --params '{"simulatorUuid": "UUID", "bundleId": "com.example.MyApp"}' \
  -q -- npx xcodebuildmcp@latest

# 3. Perform UI automation (see 04-ui-automation.md)
npx reloaderoo@latest inspect call-tool tap \
  --params '{"simulatorUuid": "UUID", "x": 100, "y": 200}' \
  -q -- npx xcodebuildmcp@latest

# 4. Retrieve and validate logs
npx reloaderoo@latest inspect call-tool stop_sim_log_cap \
  --params '{"logSessionId": "SESSION-ID"}' \
  -q -- npx xcodebuildmcp@latest
# Parse logs to verify expected behavior
```

### CI/CD Pre-Flight Check
```bash
# Run doctor to validate environment
npx reloaderoo@latest inspect call-tool doctor --params '{}' -q -- npx xcodebuildmcp@latest

# Or use resource
npx reloaderoo@latest inspect read-resource "xcodebuildmcp://doctor" -q -- npx xcodebuildmcp@latest

# Check for any failures in output before proceeding with builds
```

### Resource-Based Discovery
```bash
# Quick check of available simulators without tool call
npx reloaderoo@latest inspect read-resource "xcodebuildmcp://simulators" -q -- npx xcodebuildmcp@latest

# Quick check of connected devices
npx reloaderoo@latest inspect read-resource "xcodebuildmcp://devices" -q -- npx xcodebuildmcp@latest

# Use for CI/CD validation or pre-flight checks
```

## Log Analysis Tips

### Filtering Logs
After capturing logs, you can:
- Search for specific keywords (errors, warnings, crashes)
- Filter by log level (debug, info, warning, error)
- Extract stack traces for crashes
- Identify performance bottlenecks

### Common Log Patterns
- **Crash logs**: Look for "SIGABRT", "SIGSEGV", or "Exception"
- **Network issues**: Search for "URLSession", "network error", or timeout messages
- **UI issues**: Search for "constraint", "layout", or "view hierarchy"
- **Performance**: Look for timestamps and duration between log events

## Troubleshooting Log Capture

### Session Not Found
- Verify session ID from `start_*_log_cap` response
- Don't reuse session IDs - each capture needs a new session
- Sessions may timeout after extended periods

### No Logs Captured
- Ensure app is actually running
- Verify bundle ID is correct
- Check that app has logging output
- Confirm device/simulator is in correct state

### Device Log Capture Failed
- Verify device is connected and unlocked
- Check device trust settings
- Ensure app is installed on device
- Try disconnecting and reconnecting device

## Doctor Diagnostics Interpretation

### Critical Issues
- Xcode not installed or too old
- Command-line tools missing
- No simulators available
- Swift toolchain issues

### Warnings
- Older Xcode version (may work but not optimal)
- Limited simulator runtimes
- Code signing configuration incomplete

### Info
- System version
- Available disk space
- Installed Xcode versions
- Available simulator runtimes

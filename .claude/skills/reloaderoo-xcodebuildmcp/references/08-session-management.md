# Session Management Workflows

Complete reference for managing session defaults that persist across tool calls within a single XcodeBuildMCP session.

## Overview

Session management tools allow setting default values for commonly-used parameters (project paths, simulators, schemes) once at the beginning of a session. Subsequent tool calls can then omit these parameters, using the session defaults instead.

**Benefits:**
- Reduced repetition in tool calls
- Simplified commands once project context is established
- Consistent targeting across related operations

## Session Configuration Tools

### session-set-defaults
Sets one or more session default values that persist for the duration of the MCP session.

```bash
npx reloaderoo@latest inspect call-tool session-set-defaults --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme", "simulatorName": "iPhone 16"}' -q -- npx xcodebuildmcp@latest
```

**Available Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `projectPath` | string | Path to `.xcodeproj` file |
| `workspacePath` | string | Path to `.xcworkspace` file |
| `scheme` | string | Xcode scheme name |
| `configuration` | string | Build configuration (Debug/Release) |
| `simulatorName` | string | Simulator name (e.g., "iPhone 16") |
| `simulatorId` | string | Simulator UUID |
| `deviceId` | string | Physical device UDID |
| `useLatestOS` | boolean | Use latest OS version for simulator |
| `arch` | enum | Architecture: `arm64` or `x86_64` |

**Mutual Exclusivity:**
- `projectPath` and `workspacePath` cannot both be set
- `simulatorId` and `simulatorName` cannot both be set

**Example - Set project context:**
```bash
npx reloaderoo@latest inspect call-tool session-set-defaults --params '{"projectPath": "/Users/me/MyApp/MyApp.xcodeproj", "scheme": "MyApp debug", "simulatorName": "iPhone 16"}' -q -- npx xcodebuildmcp@latest
```

### session-show-defaults
Displays the current session defaults.

```bash
npx reloaderoo@latest inspect call-tool session-show-defaults --params '{}' -q -- npx xcodebuildmcp@latest
```

**Returns:** JSON object with all currently set defaults.

### session-clear-defaults
Clears session defaults (all or specific keys).

**Clear all defaults:**
```bash
npx reloaderoo@latest inspect call-tool session-clear-defaults --params '{"all": true}' -q -- npx xcodebuildmcp@latest
```

**Clear specific defaults:**
```bash
npx reloaderoo@latest inspect call-tool session-clear-defaults --params '{"keys": ["simulatorName", "scheme"]}' -q -- npx xcodebuildmcp@latest
```

**Available Keys:**
- `projectPath`, `workspacePath`, `scheme`, `configuration`
- `simulatorName`, `simulatorId`, `deviceId`
- `useLatestOS`, `arch`

## Common Workflow Patterns

### Session Setup at Start of Development
```bash
# 1. Set project context at start of session
npx reloaderoo@latest inspect call-tool session-set-defaults --params '{"projectPath": "/path/to/MyApp.xcodeproj", "scheme": "MyApp", "simulatorName": "iPhone 16"}' -q -- npx xcodebuildmcp@latest

# 2. Now subsequent calls can omit these parameters!
npx reloaderoo@latest inspect call-tool build_sim --params '{}' -q -- npx xcodebuildmcp@latest

# 3. Verify current defaults at any time
npx reloaderoo@latest inspect call-tool session-show-defaults --params '{}' -q -- npx xcodebuildmcp@latest
```

### Switching Simulator Mid-Session
```bash
# 1. Clear simulator to test on a different device
npx reloaderoo@latest inspect call-tool session-clear-defaults --params '{"keys": ["simulatorName"]}' -q -- npx xcodebuildmcp@latest

# 2. Set new simulator
npx reloaderoo@latest inspect call-tool session-set-defaults --params '{"simulatorName": "iPhone 15 Pro Max"}' -q -- npx xcodebuildmcp@latest

# 3. Continue with builds using new simulator
npx reloaderoo@latest inspect call-tool build_run_sim --params '{}' -q -- npx xcodebuildmcp@latest
```

### Device vs Simulator Switching
```bash
# Currently using simulator
npx reloaderoo@latest inspect call-tool session-set-defaults --params '{"simulatorName": "iPhone 16"}' -q -- npx xcodebuildmcp@latest

# Switch to physical device (clears simulatorName automatically due to mutual exclusivity)
npx reloaderoo@latest inspect call-tool session-set-defaults --params '{"deviceId": "DEVICE-UDID-HERE"}' -q -- npx xcodebuildmcp@latest
```

## Session-Aware Tools

Many XcodeBuildMCP tools support session defaults. When defaults are set, these parameters become optional:

**Simulator Development:**
- `build_sim`, `build_run_sim`, `test_sim`, `get_sim_app_path`
- Support: projectPath/workspacePath, scheme, simulatorName/simulatorId

**Device Development:**
- `build_device`, `test_device`, `get_device_app_path`
- Support: projectPath/workspacePath, scheme, deviceId

**macOS Development:**
- `build_macos`, `build_run_macos`, `test_macos`, `get_mac_app_path`
- Support: projectPath/workspacePath, scheme

**Project Management:**
- `clean`, `list_schemes`, `show_build_settings`
- Support: projectPath/workspacePath, scheme

## Tips for Effective Session Usage

1. **Set defaults early**: Establish project context at the start of your development session
2. **Verify with show-defaults**: Check current state before complex operations
3. **Clear when switching**: Clear relevant keys when changing project context
4. **Leverage mutual exclusivity**: Setting simulatorName automatically clears simulatorId
5. **Combine with other workflows**: Session defaults work seamlessly with all workflow patterns

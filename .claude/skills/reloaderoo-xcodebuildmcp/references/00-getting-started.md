# Getting Started with Reloaderoo for XcodeBuildMCP

## Installation

Reloaderoo is available via npm and can be used with npx for universal compatibility:

```bash
# Check if reloaderoo is available
npx reloaderoo@latest --help

# No installation required - npx handles everything
```

## Core CLI Pattern

All Reloaderoo commands follow this structure:

```bash
npx reloaderoo@latest inspect call-tool <tool-name> --params '<json-params>' -q -- npx xcodebuildmcp@latest
```

**Components Explained:**
- `npx reloaderoo@latest` - Runs the latest version without global installation
- `inspect call-tool` - Invokes a specific MCP tool
- `<tool-name>` - The XcodeBuildMCP tool name (e.g., `list_sims`, `build_sim`)
- `--params '<json>'` - Tool parameters as a JSON string (single quotes required)
- `-q` - Quiet mode for cleaner output
- `-- npx xcodebuildmcp@latest` - The XcodeBuildMCP server command

## Common Parameters

Most tools accept these common parameter patterns:

### Project/Workspace Paths
```bash
# Project file
"projectPath": "/path/to/MyProject.xcodeproj"

# Workspace file
"workspacePath": "/path/to/MyWorkspace.xcworkspace"

# Scheme name
"scheme": "MyAppScheme"
```

### Simulator Identification
```bash
# By UUID (preferred for precision)
"simulatorId": "SIMULATOR-UUID-HERE"
"simulatorUuid": "SIMULATOR-UUID-HERE"

# By name (convenient but may match multiple)
"simulatorName": "iPhone 16"
"simulatorName": "iPhone 15 Pro Max"
```

### Device Identification
```bash
# Physical device UDID
"deviceId": "DEVICE-UDID-HERE"
```

### Bundle Identifiers
```bash
# App bundle ID
"bundleId": "com.example.MyApp"
```

### App Paths
```bash
# iOS/macOS app bundle
"appPath": "/path/to/MyApp.app"
```

## MCP Resources

XcodeBuildMCP provides resources for common queries:

```bash
# List all simulators (same as list_sims tool)
npx reloaderoo@latest inspect read-resource "xcodebuildmcp://simulators" -q -- npx xcodebuildmcp@latest

# List all physical devices (same as list_devices tool)
npx reloaderoo@latest inspect read-resource "xcodebuildmcp://devices" -q -- npx xcodebuildmcp@latest

# System diagnostics (same as doctor tool)
npx reloaderoo@latest inspect read-resource "xcodebuildmcp://doctor" -q -- npx xcodebuildmcp@latest
```

## Quick Examples

### List iOS Simulators
```bash
npx reloaderoo@latest inspect call-tool list_sims --params '{}' -q -- npx xcodebuildmcp@latest
```

### List Physical Devices
```bash
npx reloaderoo@latest inspect call-tool list_devices --params '{}' -q -- npx xcodebuildmcp@latest
```

### System Diagnostics
```bash
npx reloaderoo@latest inspect call-tool doctor --params '{}' -q -- npx xcodebuildmcp@latest
```

### Dynamic Tool Discovery
```bash
npx reloaderoo@latest inspect call-tool discover_tools \
  --params '{"task_description": "I want to build and run my iOS app on a simulator."}' \
  -q -- npx xcodebuildmcp@latest
```

## Tips for Success

1. **Single Quotes for JSON**: Always use single quotes around the JSON params
2. **Empty Params**: Use `'{}'` for tools that don't require parameters
3. **Path Escaping**: Paths with spaces need proper escaping in JSON
4. **UUIDs vs Names**: Use UUIDs for simulators when available (more reliable)
5. **Check Scheme Names**: Use `list_schemes` to verify available schemes

## Next Steps

Once you understand the basics:
- Load workflow-specific reference files based on your task
- Use the Python helper scripts for interactive tool calling
- Consult SKILL.md for workflow navigation guidance

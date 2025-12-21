# macOS Application Workflows

Complete reference for macOS application development, deployment, and testing.

## Build Workflows

### build_macos
Builds a macOS application.

```bash
npx reloaderoo@latest inspect call-tool build_macos \
  --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme"}' \
  -q -- npx xcodebuildmcp@latest
```

**Output:** Compiled macOS `.app` bundle ready for deployment or testing.

### get_mac_app_path
Gets the `.app` bundle path for a macOS build.

```bash
npx reloaderoo@latest inspect call-tool get_mac_app_path \
  --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme"}' \
  -q -- npx xcodebuildmcp@latest
```

**Use case:** Retrieve build output path for manual inspection or deployment.

## Launch & Run Workflows

### build_run_macos
Builds and runs a macOS application (all-in-one workflow).

```bash
npx reloaderoo@latest inspect call-tool build_run_macos \
  --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme"}' \
  -q -- npx xcodebuildmcp@latest
```

**Behavior:** Builds the app and immediately launches it on the local Mac.

### launch_mac_app
Launches a macOS application by path.

```bash
npx reloaderoo@latest inspect call-tool launch_mac_app \
  --params '{"appPath": "/Applications/Calculator.app"}' \
  -q -- npx xcodebuildmcp@latest
```

**Accepts:**
- System applications: `/Applications/AppName.app`
- User applications: `/Users/username/Applications/AppName.app`
- Custom build outputs: `/path/to/build/MyApp.app`

### stop_mac_app
Stops a running macOS application by name.

```bash
npx reloaderoo@latest inspect call-tool stop_mac_app \
  --params '{"appName": "Calculator"}' \
  -q -- npx xcodebuildmcp@latest
```

**Note:** Uses app name, not bundle ID or full path.

## Testing Workflows

### test_macos
Runs tests for a macOS project.

```bash
npx reloaderoo@latest inspect call-tool test_macos \
  --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme"}' \
  -q -- npx xcodebuildmcp@latest
```

**Requirements:**
- Test target configured in scheme
- Test scheme selected in project settings

## Common Workflow Patterns

### Complete Build-Run Workflow
```bash
# 1. Build and run in one step
npx reloaderoo@latest inspect call-tool build_run_macos \
  --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme"}' \
  -q -- npx xcodebuildmcp@latest
```

### Build and Manual Launch
```bash
# 1. Build the app
npx reloaderoo@latest inspect call-tool build_macos \
  --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme"}' \
  -q -- npx xcodebuildmcp@latest

# 2. Get the build output path
npx reloaderoo@latest inspect call-tool get_mac_app_path \
  --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme"}' \
  -q -- npx xcodebuildmcp@latest

# 3. Launch the built app
npx reloaderoo@latest inspect call-tool launch_mac_app \
  --params '{"appPath": "/path/to/build/MyApp.app"}' \
  -q -- npx xcodebuildmcp@latest
```

### Testing Workflow
```bash
# Run macOS tests
npx reloaderoo@latest inspect call-tool test_macos \
  --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme"}' \
  -q -- npx xcodebuildmcp@latest
```

### Development Iteration Workflow
```bash
# 1. Stop the running app (if needed)
npx reloaderoo@latest inspect call-tool stop_mac_app --params '{"appName": "MyApp"}' -q -- npx xcodebuildmcp@latest

# 2. Rebuild and run
npx reloaderoo@latest inspect call-tool build_run_macos \
  --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme"}' \
  -q -- npx xcodebuildmcp@latest
```

## Working with Bundle Identifiers

For macOS apps, you may need the bundle identifier for certain operations:

```bash
# Get bundle ID from a built app
npx reloaderoo@latest inspect call-tool get_mac_bundle_id \
  --params '{"appPath": "/Applications/Calculator.app"}' \
  -q -- npx xcodebuildmcp@latest
```

See `06-project-management.md` for more bundle ID utilities.

## Troubleshooting

### Build Issues
- Verify macOS deployment target matches your system
- Check code signing settings for macOS
- Ensure scheme is configured for macOS platform

### Launch Issues
- Confirm app path is correct and app exists
- Check app permissions and quarantine flags
- Verify app is not damaged or unsigned

### Stop Issues
- Use exact app name as shown in Activity Monitor
- App name may differ from bundle display name
- Try force-quitting via Activity Monitor if stop fails

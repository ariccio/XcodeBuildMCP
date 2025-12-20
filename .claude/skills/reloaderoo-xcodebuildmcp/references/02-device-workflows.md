# iOS Physical Device Workflows

Complete reference for iOS physical device development, deployment, and testing.

## Device Discovery

### list_devices
Lists all connected physical iOS devices with their UDIDs, names, and connection status.

```bash
npx reloaderoo@latest inspect call-tool list_devices --params '{}' -- node build/index.js
```

**Returns:** Device UDID, name, model, iOS version, and connection state.

## Build & Deploy Workflows

### build_device
Builds an app for a physical iOS device.

```bash
npx reloaderoo@latest inspect call-tool build_device \
  --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme"}' \
  -- node build/index.js
```

**Requirements:**
- Valid provisioning profile
- Code signing identity configured
- Device registered in developer portal

### get_device_app_path
Gets the `.app` bundle path for a device build.

```bash
npx reloaderoo@latest inspect call-tool get_device_app_path \
  --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme"}' \
  -- node build/index.js
```

**Use case:** Retrieve the built app path for manual inspection or deployment.

### install_app_device
Installs an app bundle on a connected physical device.

```bash
npx reloaderoo@latest inspect call-tool install_app_device \
  --params '{"deviceId": "DEVICE-UDID", "appPath": "/path/to/MyApp.app"}' \
  -- node build/index.js
```

**Requirements:**
- Device must be connected and unlocked
- App must be properly signed for the device
- Device must trust the developer certificate

## Launch & Run Workflows

### launch_app_device
Launches an installed app on a physical device.

```bash
npx reloaderoo@latest inspect call-tool launch_app_device \
  --params '{"deviceId": "DEVICE-UDID", "bundleId": "com.example.MyApp"}' \
  -- node build/index.js
```

**Note:** App must be already installed on the device.

### stop_app_device
Stops a running app on a physical device.

```bash
npx reloaderoo@latest inspect call-tool stop_app_device \
  --params '{"deviceId": "DEVICE-UDID", "processId": 12345}' \
  -- node build/index.js
```

**Getting Process ID:** Use device log capture or monitoring tools to find the app's process ID.

## Testing Workflows

### test_device
Runs tests on a connected physical device.

```bash
npx reloaderoo@latest inspect call-tool test_device \
  --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme", "deviceId": "DEVICE-UDID"}' \
  -- node build/index.js
```

**Requirements:**
- Test target configured in scheme
- Device properly provisioned
- Device connected and unlocked

## Common Workflow Patterns

### Complete Build-Deploy-Run Workflow
```bash
# 1. List connected devices to get UDID
npx reloaderoo@latest inspect call-tool list_devices --params '{}' -- node build/index.js

# 2. Build the app for device
npx reloaderoo@latest inspect call-tool build_device \
  --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme"}' \
  -- node build/index.js

# 3. Get the built app path
npx reloaderoo@latest inspect call-tool get_device_app_path \
  --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme"}' \
  -- node build/index.js

# 4. Install on device
npx reloaderoo@latest inspect call-tool install_app_device \
  --params '{"deviceId": "DEVICE-UDID", "appPath": "/path/to/build/MyApp.app"}' \
  -- node build/index.js

# 5. Launch the app
npx reloaderoo@latest inspect call-tool launch_app_device \
  --params '{"deviceId": "DEVICE-UDID", "bundleId": "com.example.MyApp"}' \
  -- node build/index.js
```

### Device Testing Workflow
```bash
# 1. Verify device connection
npx reloaderoo@latest inspect call-tool list_devices --params '{}' -- node build/index.js

# 2. Run tests on device
npx reloaderoo@latest inspect call-tool test_device \
  --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme", "deviceId": "DEVICE-UDID"}' \
  -- node build/index.js
```

## Troubleshooting Common Issues

### Device Not Found
- Ensure device is connected via USB
- Check that device is unlocked
- Verify device appears in Xcode's Devices window
- Try running `list_devices` to confirm connection

### Build Failed
- Check code signing configuration
- Verify provisioning profile is valid
- Ensure device UDID is registered in developer portal
- Check scheme configuration for device builds

### Installation Failed
- Verify app is properly signed
- Check device storage space
- Ensure developer mode is enabled on device (iOS 16+)
- Try uninstalling existing version first

### Launch Failed
- Confirm app is installed (`check via Xcode or device`)
- Verify bundle ID is correct
- Check device trust settings
- Ensure app isn't already running

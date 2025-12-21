# iOS Simulator Workflows

Complete reference for iOS Simulator development, testing, and management.

## Simulator Discovery & Management

### list_sims
Lists all available iOS simulators with their UUIDs, names, and states.

```bash
npx reloaderoo@latest inspect call-tool list_sims --params '{}' -q -- npx xcodebuildmcp@latest
```

### boot_sim
Boots a specific iOS simulator.

```bash
npx reloaderoo@latest inspect call-tool boot_sim \
  --params '{"simulatorId": "SIMULATOR-UUID"}' \
  -q -- npx xcodebuildmcp@latest
```

### open_sim
Opens the Simulator application (launches Simulator.app).

```bash
npx reloaderoo@latest inspect call-tool open_sim --params '{}' -q -- npx xcodebuildmcp@latest
```

### erase_sims
Erases simulator content and settings. Can target a specific simulator or all simulators.

```bash
# Erase a specific simulator by UDID
npx reloaderoo@latest inspect call-tool erase_sims --params '{"simulatorUdid": "SIMULATOR-UUID"}' -q -- npx xcodebuildmcp@latest

# Erase all simulators
npx reloaderoo@latest inspect call-tool erase_sims --params '{"all": true}' -q -- npx xcodebuildmcp@latest

# Erase with shutdown first (for booted simulators)
npx reloaderoo@latest inspect call-tool erase_sims --params '{"simulatorUdid": "SIMULATOR-UUID", "shutdownFirst": true}' -q -- npx xcodebuildmcp@latest
```

**Parameters:**
- `simulatorUdid`: UUID of simulator to erase (mutually exclusive with `all`)
- `all`: When `true`, erases all simulators (mutually exclusive with `simulatorUdid`)
- `shutdownFirst`: When `true`, shuts down the simulator before erasing

**Use cases:**
- Resetting simulator to clean state for testing
- Clearing all simulator data before release testing
- Freeing disk space from accumulated simulator data

## Build & Deploy Workflows

### build_sim
Builds an app for iOS Simulator (does not install or launch).

```bash
npx reloaderoo@latest inspect call-tool build_sim \
  --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme", "simulatorName": "iPhone 16"}' \
  -q -- npx xcodebuildmcp@latest
```

### get_sim_app_path
Gets the `.app` bundle path for a simulator build.

```bash
npx reloaderoo@latest inspect call-tool get_sim_app_path \
  --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme", "platform": "iOS Simulator", "simulatorName": "iPhone 16"}' \
  -q -- npx xcodebuildmcp@latest
```

### install_app_sim
Installs an app bundle on a simulator.

```bash
npx reloaderoo@latest inspect call-tool install_app_sim \
  --params '{"simulatorId": "SIMULATOR-UUID", "appPath": "/path/to/MyApp.app"}' \
  -q -- npx xcodebuildmcp@latest
```

## Launch & Run Workflows

### build_run_sim
Builds and runs an app on a simulator (all-in-one workflow).

```bash
npx reloaderoo@latest inspect call-tool build_run_sim \
  --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme", "simulatorName": "iPhone 16"}' \
  -q -- npx xcodebuildmcp@latest
```

### launch_app_sim
Launches an installed app on a simulator.

```bash
npx reloaderoo@latest inspect call-tool launch_app_sim \
  --params '{"simulatorName": "iPhone 16", "bundleId": "com.example.MyApp"}' \
  -q -- npx xcodebuildmcp@latest
```

### launch_app_logs_sim
Launches an app on a simulator with automatic log capture.

```bash
npx reloaderoo@latest inspect call-tool launch_app_logs_sim \
  --params '{"simulatorId": "SIMULATOR-UUID", "bundleId": "com.example.MyApp"}' \
  -q -- npx xcodebuildmcp@latest
```

### stop_app_sim
Stops a running app on a simulator.

```bash
npx reloaderoo@latest inspect call-tool stop_app_sim \
  --params '{"simulatorName": "iPhone 16", "bundleId": "com.example.MyApp"}' \
  -q -- npx xcodebuildmcp@latest
```

## Testing Workflows

### test_sim
Runs tests on an iOS simulator.

```bash
npx reloaderoo@latest inspect call-tool test_sim \
  --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme", "simulatorName": "iPhone 16"}' \
  -q -- npx xcodebuildmcp@latest
```

## Simulator Configuration

### set_sim_appearance
Sets a simulator's appearance mode (light/dark).

```bash
npx reloaderoo@latest inspect call-tool set_sim_appearance \
  --params '{"simulatorUuid": "SIMULATOR-UUID", "mode": "dark"}' \
  -q -- npx xcodebuildmcp@latest
```

**Modes:** `"light"`, `"dark"`

### set_sim_location
Sets a simulator's GPS location coordinates.

```bash
npx reloaderoo@latest inspect call-tool set_sim_location \
  --params '{"simulatorUuid": "SIMULATOR-UUID", "latitude": 37.7749, "longitude": -122.4194}' \
  -q -- npx xcodebuildmcp@latest
```

### reset_sim_location
Resets a simulator's location to default.

```bash
npx reloaderoo@latest inspect call-tool reset_sim_location \
  --params '{"simulatorUuid": "SIMULATOR-UUID"}' \
  -q -- npx xcodebuildmcp@latest
```

### sim_statusbar
Overrides a simulator's status bar appearance.

```bash
npx reloaderoo@latest inspect call-tool sim_statusbar \
  --params '{"simulatorUuid": "SIMULATOR-UUID", "dataNetwork": "wifi"}' \
  -q -- npx xcodebuildmcp@latest
```

**Common status bar options:**
- `"dataNetwork"`: `"wifi"`, `"3g"`, `"4g"`, `"lte"`, `"5g"`
- `"wifiMode"`: `"searching"`, `"active"`
- `"cellularMode"`: `"searching"`, `"active"`, `"notSupported"`
- `"batteryState"`: `"charging"`, `"charged"`, `"discharging"`
- `"batteryLevel"`: `0-100`

## Common Workflow Patterns

### Complete Build-Deploy-Run Workflow
```bash
# 1. List simulators to get UUID
npx reloaderoo@latest inspect call-tool list_sims --params '{}' -q -- npx xcodebuildmcp@latest

# 2. Boot the simulator
npx reloaderoo@latest inspect call-tool boot_sim --params '{"simulatorId": "UUID"}' -q -- npx xcodebuildmcp@latest

# 3. Build, install, and launch (all-in-one)
npx reloaderoo@latest inspect call-tool build_run_sim \
  --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme", "simulatorName": "iPhone 16"}' \
  -q -- npx xcodebuildmcp@latest
```

### Testing Workflow
```bash
# 1. Boot simulator
npx reloaderoo@latest inspect call-tool boot_sim --params '{"simulatorId": "UUID"}' -q -- npx xcodebuildmcp@latest

# 2. Run tests
npx reloaderoo@latest inspect call-tool test_sim \
  --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme", "simulatorName": "iPhone 16"}' \
  -q -- npx xcodebuildmcp@latest
```

### Screenshot Testing Workflow
```bash
# 1. Boot simulator
npx reloaderoo@latest inspect call-tool boot_sim --params '{"simulatorId": "UUID"}' -q -- npx xcodebuildmcp@latest

# 2. Set appearance mode
npx reloaderoo@latest inspect call-tool set_sim_appearance \
  --params '{"simulatorUuid": "UUID", "mode": "dark"}' \
  -q -- npx xcodebuildmcp@latest

# 3. Configure status bar
npx reloaderoo@latest inspect call-tool sim_statusbar \
  --params '{"simulatorUuid": "UUID", "dataNetwork": "wifi", "batteryLevel": 100}' \
  -q -- npx xcodebuildmcp@latest

# 4. Launch app and take screenshots (see UI automation workflows)
```

### Clean State Testing Workflow
```bash
# 1. Erase simulator to clean state
npx reloaderoo@latest inspect call-tool erase_sims --params '{"simulatorUdid": "UUID", "shutdownFirst": true}' -q -- npx xcodebuildmcp@latest

# 2. Boot fresh simulator
npx reloaderoo@latest inspect call-tool boot_sim --params '{"simulatorId": "UUID"}' -q -- npx xcodebuildmcp@latest

# 3. Build and run app on clean state
npx reloaderoo@latest inspect call-tool build_run_sim \
  --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme", "simulatorName": "iPhone 16"}' \
  -q -- npx xcodebuildmcp@latest
```

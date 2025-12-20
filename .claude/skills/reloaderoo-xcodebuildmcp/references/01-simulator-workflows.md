# iOS Simulator Workflows

Complete reference for iOS Simulator development, testing, and management.

## Simulator Discovery & Management

### list_sims
Lists all available iOS simulators with their UUIDs, names, and states.

```bash
npx reloaderoo@latest inspect call-tool list_sims --params '{}' -- node build/index.js
```

### boot_sim
Boots a specific iOS simulator.

```bash
npx reloaderoo@latest inspect call-tool boot_sim \
  --params '{"simulatorId": "SIMULATOR-UUID"}' \
  -- node build/index.js
```

### open_sim
Opens the Simulator application (launches Simulator.app).

```bash
npx reloaderoo@latest inspect call-tool open_sim --params '{}' -- node build/index.js
```

## Build & Deploy Workflows

### build_sim
Builds an app for iOS Simulator (does not install or launch).

```bash
npx reloaderoo@latest inspect call-tool build_sim \
  --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme", "simulatorName": "iPhone 16"}' \
  -- node build/index.js
```

### get_sim_app_path
Gets the `.app` bundle path for a simulator build.

```bash
npx reloaderoo@latest inspect call-tool get_sim_app_path \
  --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme", "platform": "iOS Simulator", "simulatorName": "iPhone 16"}' \
  -- node build/index.js
```

### install_app_sim
Installs an app bundle on a simulator.

```bash
npx reloaderoo@latest inspect call-tool install_app_sim \
  --params '{"simulatorId": "SIMULATOR-UUID", "appPath": "/path/to/MyApp.app"}' \
  -- node build/index.js
```

## Launch & Run Workflows

### build_run_sim
Builds and runs an app on a simulator (all-in-one workflow).

```bash
npx reloaderoo@latest inspect call-tool build_run_sim \
  --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme", "simulatorName": "iPhone 16"}' \
  -- node build/index.js
```

### launch_app_sim
Launches an installed app on a simulator.

```bash
npx reloaderoo@latest inspect call-tool launch_app_sim \
  --params '{"simulatorName": "iPhone 16", "bundleId": "com.example.MyApp"}' \
  -- node build/index.js
```

### launch_app_logs_sim
Launches an app on a simulator with automatic log capture.

```bash
npx reloaderoo@latest inspect call-tool launch_app_logs_sim \
  --params '{"simulatorId": "SIMULATOR-UUID", "bundleId": "com.example.MyApp"}' \
  -- node build/index.js
```

### stop_app_sim
Stops a running app on a simulator.

```bash
npx reloaderoo@latest inspect call-tool stop_app_sim \
  --params '{"simulatorName": "iPhone 16", "bundleId": "com.example.MyApp"}' \
  -- node build/index.js
```

## Testing Workflows

### test_sim
Runs tests on an iOS simulator.

```bash
npx reloaderoo@latest inspect call-tool test_sim \
  --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme", "simulatorName": "iPhone 16"}' \
  -- node build/index.js
```

## Simulator Configuration

### set_sim_appearance
Sets a simulator's appearance mode (light/dark).

```bash
npx reloaderoo@latest inspect call-tool set_sim_appearance \
  --params '{"simulatorUuid": "SIMULATOR-UUID", "mode": "dark"}' \
  -- node build/index.js
```

**Modes:** `"light"`, `"dark"`

### set_sim_location
Sets a simulator's GPS location coordinates.

```bash
npx reloaderoo@latest inspect call-tool set_sim_location \
  --params '{"simulatorUuid": "SIMULATOR-UUID", "latitude": 37.7749, "longitude": -122.4194}' \
  -- node build/index.js
```

### reset_sim_location
Resets a simulator's location to default.

```bash
npx reloaderoo@latest inspect call-tool reset_sim_location \
  --params '{"simulatorUuid": "SIMULATOR-UUID"}' \
  -- node build/index.js
```

### sim_statusbar
Overrides a simulator's status bar appearance.

```bash
npx reloaderoo@latest inspect call-tool sim_statusbar \
  --params '{"simulatorUuid": "SIMULATOR-UUID", "dataNetwork": "wifi"}' \
  -- node build/index.js
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
npx reloaderoo@latest inspect call-tool list_sims --params '{}' -- node build/index.js

# 2. Boot the simulator
npx reloaderoo@latest inspect call-tool boot_sim --params '{"simulatorId": "UUID"}' -- node build/index.js

# 3. Build, install, and launch (all-in-one)
npx reloaderoo@latest inspect call-tool build_run_sim \
  --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme", "simulatorName": "iPhone 16"}' \
  -- node build/index.js
```

### Testing Workflow
```bash
# 1. Boot simulator
npx reloaderoo@latest inspect call-tool boot_sim --params '{"simulatorId": "UUID"}' -- node build/index.js

# 2. Run tests
npx reloaderoo@latest inspect call-tool test_sim \
  --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme", "simulatorName": "iPhone 16"}' \
  -- node build/index.js
```

### Screenshot Testing Workflow
```bash
# 1. Boot simulator
npx reloaderoo@latest inspect call-tool boot_sim --params '{"simulatorId": "UUID"}' -- node build/index.js

# 2. Set appearance mode
npx reloaderoo@latest inspect call-tool set_sim_appearance \
  --params '{"simulatorUuid": "UUID", "mode": "dark"}' \
  -- node build/index.js

# 3. Configure status bar
npx reloaderoo@latest inspect call-tool sim_statusbar \
  --params '{"simulatorUuid": "UUID", "dataNetwork": "wifi", "batteryLevel": 100}' \
  -- node build/index.js

# 4. Launch app and take screenshots (see UI automation workflows)
```

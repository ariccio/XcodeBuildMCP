# Swift Package Manager Workflows

Complete reference for Swift Package Manager (SPM) operations including build, test, and run.

## Build Workflows

### swift_package_build
Builds a Swift package.

```bash
npx reloaderoo@latest inspect call-tool swift_package_build \
  --params '{"packagePath": "/path/to/package"}' \
  -q -- npx xcodebuildmcp@latest
```

**Requirements:**
- Valid `Package.swift` file in package directory
- Swift toolchain installed
- All dependencies resolvable

### swift_package_clean
Cleans build artifacts for a Swift package.

```bash
npx reloaderoo@latest inspect call-tool swift_package_clean \
  --params '{"packagePath": "/path/to/package"}' \
  -q -- npx xcodebuildmcp@latest
```

**Effect:** Removes `.build/` directory and derived data.

**Use cases:**
- Resolving build cache issues
- Clean state before release builds
- Debugging dependency resolution problems

## Testing Workflows

### swift_package_test
Runs tests for a Swift package.

```bash
npx reloaderoo@latest inspect call-tool swift_package_test \
  --params '{"packagePath": "/path/to/package"}' \
  -q -- npx xcodebuildmcp@latest
```

**Requirements:**
- Test targets defined in `Package.swift`
- Tests located in `Tests/` directory

**Output:** Test results with pass/fail status and coverage information.

## Run & Process Management

### swift_package_run
Runs an executable target from a Swift package.

```bash
npx reloaderoo@latest inspect call-tool swift_package_run \
  --params '{"packagePath": "/path/to/package"}' \
  -q -- npx xcodebuildmcp@latest
```

**Requirements:**
- Executable product defined in `Package.swift`
- Package must be built first (or will build automatically)

**Behavior:** Starts the executable as a background process and returns the process ID.

### swift_package_list
Lists all running Swift package processes.

```bash
npx reloaderoo@latest inspect call-tool swift_package_list --params '{}' -q -- npx xcodebuildmcp@latest
```

**Returns:** Process IDs and package names of running Swift executables.

**Use case:** Find process IDs for processes started with `swift_package_run`.

### swift_package_stop
Stops a running Swift package process.

```bash
npx reloaderoo@latest inspect call-tool swift_package_stop \
  --params '{"pid": 12345}' \
  -q -- npx xcodebuildmcp@latest
```

**Parameters:**
- `pid`: Process ID from `swift_package_run` or `swift_package_list`

## Common Workflow Patterns

### Complete Development Workflow
```bash
# 1. Clean previous builds
npx reloaderoo@latest inspect call-tool swift_package_clean \
  --params '{"packagePath": "/path/to/package"}' \
  -q -- npx xcodebuildmcp@latest

# 2. Build the package
npx reloaderoo@latest inspect call-tool swift_package_build \
  --params '{"packagePath": "/path/to/package"}' \
  -q -- npx xcodebuildmcp@latest

# 3. Run tests
npx reloaderoo@latest inspect call-tool swift_package_test \
  --params '{"packagePath": "/path/to/package"}' \
  -q -- npx xcodebuildmcp@latest
```

### Run and Monitor Workflow
```bash
# 1. Run the executable
npx reloaderoo@latest inspect call-tool swift_package_run \
  --params '{"packagePath": "/path/to/package"}' \
  -q -- npx xcodebuildmcp@latest
# Output: {"processId": 12345}

# 2. List running processes to verify
npx reloaderoo@latest inspect call-tool swift_package_list --params '{}' -q -- npx xcodebuildmcp@latest

# 3. Stop when done
npx reloaderoo@latest inspect call-tool swift_package_stop \
  --params '{"pid": 12345}' \
  -q -- npx xcodebuildmcp@latest
```

### CI/CD Testing Workflow
```bash
# 1. Clean state
npx reloaderoo@latest inspect call-tool swift_package_clean \
  --params '{"packagePath": "/path/to/package"}' \
  -q -- npx xcodebuildmcp@latest

# 2. Build (fails fast if compilation errors)
npx reloaderoo@latest inspect call-tool swift_package_build \
  --params '{"packagePath": "/path/to/package"}' \
  -q -- npx xcodebuildmcp@latest

# 3. Run tests (fails if tests fail)
npx reloaderoo@latest inspect call-tool swift_package_test \
  --params '{"packagePath": "/path/to/package"}' \
  -q -- npx xcodebuildmcp@latest
```

### Development Server Workflow
```bash
# 1. Stop any previous instance
npx reloaderoo@latest inspect call-tool swift_package_list --params '{}' -q -- npx xcodebuildmcp@latest
# Find the PID from output

npx reloaderoo@latest inspect call-tool swift_package_stop \
  --params '{"pid": OLD_PID}' \
  -q -- npx xcodebuildmcp@latest

# 2. Rebuild
npx reloaderoo@latest inspect call-tool swift_package_build \
  --params '{"packagePath": "/path/to/package"}' \
  -q -- npx xcodebuildmcp@latest

# 3. Start new instance
npx reloaderoo@latest inspect call-tool swift_package_run \
  --params '{"packagePath": "/path/to/package"}' \
  -q -- npx xcodebuildmcp@latest
```

## Package.swift Conventions

For these tools to work correctly, your `Package.swift` should follow standard conventions:

### Library Package
```swift
// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "MyLibrary",
    products: [
        .library(name: "MyLibrary", targets: ["MyLibrary"])
    ],
    targets: [
        .target(name: "MyLibrary"),
        .testTarget(name: "MyLibraryTests", dependencies: ["MyLibrary"])
    ]
)
```

### Executable Package
```swift
// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "MyExecutable",
    products: [
        .executable(name: "MyExecutable", targets: ["MyExecutable"])
    ],
    targets: [
        .executableTarget(name: "MyExecutable"),
        .testTarget(name: "MyExecutableTests", dependencies: ["MyExecutable"])
    ]
)
```

## Troubleshooting

### Build Failures
- Check Swift version compatibility in `Package.swift`
- Verify all dependencies are accessible
- Run `swift_package_clean` to clear cached data
- Check for syntax errors in Swift code

### Test Failures
- Ensure tests are in `Tests/` directory
- Verify test target dependencies in `Package.swift`
- Check test naming conventions (must start with `test`)
- Review test output for specific failure reasons

### Run Issues
- Confirm package defines an executable product
- Verify executable target exists in `Package.swift`
- Check that build completed successfully
- Ensure no conflicting processes on same port (for servers)

### Process Management
- Use `swift_package_list` to find orphaned processes
- Stop processes before rebuilding to avoid conflicts
- Monitor system resources if processes accumulate
- Check Console.app for process crash logs

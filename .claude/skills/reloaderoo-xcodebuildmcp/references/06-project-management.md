# Project Discovery & Management Workflows

Complete reference for Xcode project discovery, scaffolding, and configuration management.

## Project Discovery

### discover_projs
Discovers all Xcode projects and workspaces in a directory.

```bash
npx reloaderoo@latest inspect call-tool discover_projs \
  --params '{"workspaceRoot": "/path/to/workspace"}' \
  -q -- npx xcodebuildmcp@latest
```

**Returns:** List of discovered `.xcodeproj` and `.xcworkspace` files with full paths.

**Use cases:**
- Finding projects in monorepo structures
- Automated project scanning
- Validation of project organization

### list_schemes
Lists all schemes in a project or workspace.

```bash
npx reloaderoo@latest inspect call-tool list_schemes \
  --params '{"projectPath": "/path/to/MyProject.xcodeproj"}' \
  -q -- npx xcodebuildmcp@latest
```

**Returns:** All buildable schemes with their names.

**Tip:** Use this to verify scheme names before build/test operations.

### show_build_settings
Shows build settings for a specific scheme.

```bash
npx reloaderoo@latest inspect call-tool show_build_settings \
  --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme"}' \
  -q -- npx xcodebuildmcp@latest
```

**Returns:** Complete build configuration including:
- Bundle identifiers
- Code signing settings
- Deployment targets
- Build paths
- Compiler flags

**Use cases:**
- Debugging build configuration issues
- Extracting bundle IDs programmatically
- Validating code signing setup

## Bundle Identifier Discovery

### get_app_bundle_id
Gets an app's bundle identifier from the `.app` bundle.

```bash
npx reloaderoo@latest inspect call-tool get_app_bundle_id \
  --params '{"appPath": "/path/to/MyApp.app"}' \
  -q -- npx xcodebuildmcp@latest
```

**Returns:** Bundle ID (e.g., `com.example.MyApp`)

**Use case:** Extract bundle ID from built app for launch/install operations.

### get_mac_bundle_id
Gets a macOS app's bundle identifier.

```bash
npx reloaderoo@latest inspect call-tool get_mac_bundle_id \
  --params '{"appPath": "/Applications/Calculator.app"}' \
  -q -- npx xcodebuildmcp@latest
```

**Accepts:**
- System apps: `/Applications/AppName.app`
- User apps: `/Users/username/Applications/AppName.app`
- Custom builds: `/path/to/build/MyApp.app`

## Project Scaffolding

### scaffold_ios_project
Scaffolds a new iOS project with basic structure.

```bash
npx reloaderoo@latest inspect call-tool scaffold_ios_project \
  --params '{"projectName": "MyNewApp", "outputPath": "/path/to/projects"}' \
  -q -- npx xcodebuildmcp@latest
```

**Creates:**
- Xcode project file (`.xcodeproj`)
- Basic app structure
- Info.plist
- LaunchScreen.storyboard
- Basic Swift source files

**Use cases:**
- Quick prototyping
- Test project generation
- Template-based project creation

### scaffold_macos_project
Scaffolds a new macOS project with basic structure.

```bash
npx reloaderoo@latest inspect call-tool scaffold_macos_project \
  --params '{"projectName": "MyNewMacApp", "outputPath": "/path/to/projects"}' \
  -q -- npx xcodebuildmcp@latest
```

**Creates:**
- macOS-specific Xcode project
- AppDelegate and basic structure
- macOS Info.plist
- Basic Swift source files

## Build Artifact Management

### clean
Cleans build artifacts for a project or workspace.

```bash
# Clean a project
npx reloaderoo@latest inspect call-tool clean \
  --params '{"projectPath": "/path/to/MyProject.xcodeproj"}' \
  -q -- npx xcodebuildmcp@latest

# Clean a workspace with scheme
npx reloaderoo@latest inspect call-tool clean \
  --params '{"workspacePath": "/path/to/MyWorkspace.xcworkspace", "scheme": "MyScheme"}' \
  -q -- npx xcodebuildmcp@latest
```

**Effect:** Removes derived data and build artifacts.

**Use cases:**
- Resolving build cache issues
- Clean state before release builds
- Debugging mysterious build failures

## Common Workflow Patterns

### New Project Setup
```bash
# 1. Scaffold new iOS project
npx reloaderoo@latest inspect call-tool scaffold_ios_project \
  --params '{"projectName": "MyTestApp", "outputPath": "/Users/me/Projects"}' \
  -q -- npx xcodebuildmcp@latest

# 2. Discover created project
npx reloaderoo@latest inspect call-tool discover_projs \
  --params '{"workspaceRoot": "/Users/me/Projects/MyTestApp"}' \
  -q -- npx xcodebuildmcp@latest

# 3. List available schemes
npx reloaderoo@latest inspect call-tool list_schemes \
  --params '{"projectPath": "/Users/me/Projects/MyTestApp/MyTestApp.xcodeproj"}' \
  -q -- npx xcodebuildmcp@latest
```

### Project Configuration Audit
```bash
# 1. Discover all projects
npx reloaderoo@latest inspect call-tool discover_projs \
  --params '{"workspaceRoot": "/path/to/monorepo"}' \
  -q -- npx xcodebuildmcp@latest

# 2. For each project, list schemes
npx reloaderoo@latest inspect call-tool list_schemes \
  --params '{"projectPath": "/path/to/project1.xcodeproj"}' \
  -q -- npx xcodebuildmcp@latest

# 3. For each scheme, show build settings
npx reloaderoo@latest inspect call-tool show_build_settings \
  --params '{"projectPath": "/path/to/project1.xcodeproj", "scheme": "Scheme1"}' \
  -q -- npx xcodebuildmcp@latest
```

### Build Troubleshooting Workflow
```bash
# 1. Show build settings to check configuration
npx reloaderoo@latest inspect call-tool show_build_settings \
  --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme"}' \
  -q -- npx xcodebuildmcp@latest

# 2. Clean build artifacts
npx reloaderoo@latest inspect call-tool clean \
  --params '{"projectPath": "/path/to/MyProject.xcodeproj"}' \
  -q -- npx xcodebuildmcp@latest

# 3. Try building again (use appropriate build tool from other workflows)
```

### Extract Bundle ID for Launch
```bash
# 1. Build the app (using simulator or device workflow)
# ... build commands ...

# 2. Get the app path (using appropriate get_*_app_path tool)
# ... get path ...

# 3. Extract bundle ID
npx reloaderoo@latest inspect call-tool get_app_bundle_id \
  --params '{"appPath": "/path/to/build/MyApp.app"}' \
  -q -- npx xcodebuildmcp@latest

# 4. Use bundle ID for launch operations
```

## Monorepo and Multi-Project Patterns

### Discover All Projects
```bash
# Recursive discovery
npx reloaderoo@latest inspect call-tool discover_projs \
  --params '{"workspaceRoot": "/path/to/monorepo"}' \
  -q -- npx xcodebuildmcp@latest
```

### Workspace vs Project
- **Project** (`.xcodeproj`): Single-project development
- **Workspace** (`.xcworkspace`): Multi-project coordination

**Workspace benefits:**
- Share schemes across projects
- Coordinate dependencies
- Unified build settings

**When to use workspaces:**
- CocoaPods projects (automatic workspace creation)
- Multiple related projects
- Framework + app development

## Troubleshooting

### Discovery Issues
- Verify directory exists and is accessible
- Check file permissions
- Ensure `.xcodeproj`/`.xcworkspace` aren't corrupted

### Scheme Not Found
- Use `list_schemes` to verify scheme name
- Check scheme is marked as "Shared" in Xcode
- Verify scheme configuration isn't corrupted

### Bundle ID Extraction Failed
- Confirm `.app` bundle exists at path
- Check `Info.plist` exists in bundle
- Verify `CFBundleIdentifier` key in Info.plist

### Scaffolding Issues
- Ensure output directory exists and is writable
- Check project name follows naming conventions (no spaces or special chars)
- Verify Xcode command-line tools are installed

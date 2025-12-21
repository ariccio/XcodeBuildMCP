# UI Testing & Automation Workflows

Complete reference for UI testing, automation, and interaction on iOS simulators.

## UI Inspection

### describe_ui
Gets the complete UI hierarchy of the current screen.

```bash
npx reloaderoo@latest inspect call-tool describe_ui \
  --params '{"simulatorUuid": "SIMULATOR-UUID"}' \
  -q -- npx xcodebuildmcp@latest
```

**Returns:** Accessibility tree with element types, labels, coordinates, and identifiers.

**Use cases:**
- Finding UI elements for interaction
- Debugging UI layout issues
- Automated testing element discovery

### screenshot
Takes a screenshot of the current simulator screen.

```bash
npx reloaderoo@latest inspect call-tool screenshot \
  --params '{"simulatorUuid": "SIMULATOR-UUID"}' \
  -q -- npx xcodebuildmcp@latest
```

**Output:** Screenshot image data or file path.

## Touch & Gesture Interactions

### tap
Performs a single tap at specific coordinates.

```bash
npx reloaderoo@latest inspect call-tool tap \
  --params '{"simulatorUuid": "SIMULATOR-UUID", "x": 100, "y": 200}' \
  -q -- npx xcodebuildmcp@latest
```

**Coordinates:** Origin (0,0) is top-left corner.

### long_press
Performs a long press (tap and hold) at coordinates.

```bash
npx reloaderoo@latest inspect call-tool long_press \
  --params '{"simulatorUuid": "SIMULATOR-UUID", "x": 100, "y": 200, "duration": 1500}' \
  -q -- npx xcodebuildmcp@latest
```

**Duration:** Milliseconds to hold the press (default: 1000ms).

### swipe
Performs a swipe gesture between two points.

```bash
npx reloaderoo@latest inspect call-tool swipe \
  --params '{"simulatorUuid": "SIMULATOR-UUID", "x1": 100, "y1": 400, "x2": 100, "y2": 200}' \
  -q -- npx xcodebuildmcp@latest
```

**Parameters:**
- `x1, y1`: Starting coordinates
- `x2, y2`: Ending coordinates

**Common swipes:**
- Swipe up: `y1 > y2`
- Swipe down: `y1 < y2`
- Swipe left: `x1 > x2`
- Swipe right: `x1 < x2`

### touch
Simulates a touch down or touch up event at coordinates.

```bash
# Touch down
npx reloaderoo@latest inspect call-tool touch \
  --params '{"simulatorUuid": "SIMULATOR-UUID", "x": 100, "y": 200, "down": true}' \
  -q -- npx xcodebuildmcp@latest

# Touch up
npx reloaderoo@latest inspect call-tool touch \
  --params '{"simulatorUuid": "SIMULATOR-UUID", "x": 100, "y": 200, "down": false}' \
  -q -- npx xcodebuildmcp@latest
```

**Use case:** Low-level touch event simulation for custom gestures.

### gesture
Performs a pre-defined gesture preset.

```bash
npx reloaderoo@latest inspect call-tool gesture \
  --params '{"simulatorUuid": "SIMULATOR-UUID", "preset": "scroll-up"}' \
  -q -- npx xcodebuildmcp@latest
```

**Available presets:**
- `"scroll-up"` - Scroll content upward
- `"scroll-down"` - Scroll content downward
- `"scroll-left"` - Scroll content left
- `"scroll-right"` - Scroll content right
- `"pinch-open"` - Zoom in gesture
- `"pinch-close"` - Zoom out gesture

## Text Input

### type_text
Types text into the currently focused text field.

```bash
npx reloaderoo@latest inspect call-tool type_text \
  --params '{"simulatorUuid": "SIMULATOR-UUID", "text": "Hello, World!"}' \
  -q -- npx xcodebuildmcp@latest
```

**Requirements:** A text field must be focused (tap on text field first).

## Keyboard Interactions

### key_press
Simulates a single key press by key code.

```bash
npx reloaderoo@latest inspect call-tool key_press \
  --params '{"simulatorUuid": "SIMULATOR-UUID", "keyCode": 40}' \
  -q -- npx xcodebuildmcp@latest
```

**Common key codes:**
- Return/Enter: `40`
- Delete/Backspace: `42`
- Tab: `43`
- Space: `44`
- Escape: `41`

### key_sequence
Simulates a sequence of key presses.

```bash
npx reloaderoo@latest inspect call-tool key_sequence \
  --params '{"simulatorUuid": "SIMULATOR-UUID", "keyCodes": [40, 42, 44]}' \
  -q -- npx xcodebuildmcp@latest
```

**Use case:** Complex keyboard interactions or shortcuts.

## Hardware Button Simulation

### button
Simulates a hardware button press (Home, Lock, Volume, etc.).

```bash
npx reloaderoo@latest inspect call-tool button \
  --params '{"simulatorUuid": "SIMULATOR-UUID", "buttonType": "home"}' \
  -q -- npx xcodebuildmcp@latest
```

**Available buttons:**
- `"home"` - Home button (iPhone 8 and earlier simulators)
- `"lock"` - Lock/Power button
- `"volumeUp"` - Volume up button
- `"volumeDown"` - Volume down button
- `"siri"` - Siri button (if available)

## Common Automation Patterns

### Login Flow Automation
```bash
# 1. Describe UI to find text field coordinates
npx reloaderoo@latest inspect call-tool describe_ui \
  --params '{"simulatorUuid": "UUID"}' \
  -q -- npx xcodebuildmcp@latest

# 2. Tap on username field
npx reloaderoo@latest inspect call-tool tap \
  --params '{"simulatorUuid": "UUID", "x": 150, "y": 200}' \
  -q -- npx xcodebuildmcp@latest

# 3. Type username
npx reloaderoo@latest inspect call-tool type_text \
  --params '{"simulatorUuid": "UUID", "text": "testuser"}' \
  -q -- npx xcodebuildmcp@latest

# 4. Tap on password field
npx reloaderoo@latest inspect call-tool tap \
  --params '{"simulatorUuid": "UUID", "x": 150, "y": 280}' \
  -q -- npx xcodebuildmcp@latest

# 5. Type password
npx reloaderoo@latest inspect call-tool type_text \
  --params '{"simulatorUuid": "UUID", "text": "password123"}' \
  -q -- npx xcodebuildmcp@latest

# 6. Tap login button
npx reloaderoo@latest inspect call-tool tap \
  --params '{"simulatorUuid": "UUID", "x": 150, "y": 360}' \
  -q -- npx xcodebuildmcp@latest
```

### Scroll and Screenshot Testing
```bash
# 1. Take initial screenshot
npx reloaderoo@latest inspect call-tool screenshot \
  --params '{"simulatorUuid": "UUID"}' \
  -q -- npx xcodebuildmcp@latest

# 2. Scroll down
npx reloaderoo@latest inspect call-tool gesture \
  --params '{"simulatorUuid": "UUID", "preset": "scroll-down"}' \
  -q -- npx xcodebuildmcp@latest

# 3. Take screenshot after scroll
npx reloaderoo@latest inspect call-tool screenshot \
  --params '{"simulatorUuid": "UUID"}' \
  -q -- npx xcodebuildmcp@latest
```

### Navigation Testing
```bash
# 1. Tap a cell in a list
npx reloaderoo@latest inspect call-tool tap \
  --params '{"simulatorUuid": "UUID", "x": 200, "y": 150}' \
  -q -- npx xcodebuildmcp@latest

# 2. Wait and verify UI (describe_ui)
npx reloaderoo@latest inspect call-tool describe_ui \
  --params '{"simulatorUuid": "UUID"}' \
  -q -- npx xcodebuildmcp@latest

# 3. Go back (swipe from left edge or tap back button)
npx reloaderoo@latest inspect call-tool swipe \
  --params '{"simulatorUuid": "UUID", "x1": 10, "y1": 200, "x2": 200, "y2": 200}' \
  -q -- npx xcodebuildmcp@latest
```

### Form Testing with Keyboard
```bash
# 1. Tap first field
npx reloaderoo@latest inspect call-tool tap \
  --params '{"simulatorUuid": "UUID", "x": 150, "y": 200}' \
  -q -- npx xcodebuildmcp@latest

# 2. Type text
npx reloaderoo@latest inspect call-tool type_text \
  --params '{"simulatorUuid": "UUID", "text": "John Doe"}' \
  -q -- npx xcodebuildmcp@latest

# 3. Press Return to move to next field
npx reloaderoo@latest inspect call-tool key_press \
  --params '{"simulatorUuid": "UUID", "keyCode": 40}' \
  -q -- npx xcodebuildmcp@latest

# 4. Type in next field
npx reloaderoo@latest inspect call-tool type_text \
  --params '{"simulatorUuid": "UUID", "text": "john@example.com"}' \
  -q -- npx xcodebuildmcp@latest
```

## Tips for Effective UI Automation

1. **Use describe_ui First**: Always inspect the UI hierarchy to find accurate coordinates
2. **Coordinate Consistency**: Coordinates may vary by device/simulator size - use describe_ui dynamically
3. **Wait Between Actions**: Add delays between rapid interactions for UI to update
4. **Accessibility Identifiers**: Use describe_ui to find elements by accessibility ID (more reliable than coordinates)
5. **Screenshot for Debugging**: Take screenshots at each step to verify automation state

## Integration with Other Workflows

UI automation is commonly combined with:
- **Simulator Workflows** (`01-simulator-workflows.md`) - Launch and configure simulators
- **Advanced Features** (`07-advanced-features.md`) - Capture logs during automation
- **Project Management** (`06-project-management.md`) - Scaffold test projects

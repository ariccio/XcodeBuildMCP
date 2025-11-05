#!/bin/bash
# Script to locate Xcode preview-related binaries for reverse engineering

set -e

echo "🔍 Locating Xcode Preview Binaries for Reverse Engineering"
echo "==========================================================="
echo

XCODE_PATH="/Applications/Xcode.app"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_file() {
    local name="$1"
    local path="$2"

    if [ -f "$path" ]; then
        local size=$(du -h "$path" | cut -f1)
        echo -e "${GREEN}✓${NC} $name"
        echo "  Path: $path"
        echo "  Size: $size"

        # Check if it's a Mach-O binary
        if file "$path" | grep -q "Mach-O"; then
            local arch=$(file "$path" | grep -o "arm64\|x86_64" | head -1)
            echo "  Arch: $arch"
        fi
        echo
    else
        echo -e "${RED}✗${NC} $name"
        echo "  Path: $path"
        echo "  Status: NOT FOUND"
        echo
    fi
}

echo "=== PRIMARY TARGETS ==="
echo

check_file "XCPreviewKit.framework" \
    "$XCODE_PATH/Contents/SharedFrameworks/XCPreviewKit.framework/Versions/A/XCPreviewKit"

check_file "XCPreviewAgent (Process)" \
    "$XCODE_PATH/Contents/SharedFrameworks/XCPreviewKit.framework/Versions/A/XPCServices/XCPreviewAgent.xpc/Contents/MacOS/XCPreviewAgent"

check_file "DVTKit.framework" \
    "$XCODE_PATH/Contents/SharedFrameworks/DVTKit.framework/Versions/A/DVTKit"

check_file "IDESwiftUI.framework" \
    "$XCODE_PATH/Contents/Frameworks/IDESwiftUI.framework/Versions/A/IDESwiftUI"

check_file "ViewFoundation.framework (System)" \
    "/System/Library/PrivateFrameworks/ViewFoundation.framework/Versions/A/ViewFoundation"

echo "=== SECONDARY TARGETS ==="
echo

check_file "DebugHierarchyFoundation.framework" \
    "$XCODE_PATH/Contents/SharedFrameworks/DebugHierarchyFoundation.framework/Versions/A/DebugHierarchyFoundation"

check_file "Xcode Main Binary" \
    "$XCODE_PATH/Contents/MacOS/Xcode"

echo "=== ADDITIONAL FRAMEWORKS OF INTEREST ==="
echo

check_file "DTDeviceKitBase.framework" \
    "$XCODE_PATH/Contents/SharedFrameworks/DTDeviceKitBase.framework/Versions/A/DTDeviceKitBase"

check_file "IDEFoundation.framework" \
    "$XCODE_PATH/Contents/Frameworks/IDEFoundation.framework/Versions/A/IDEFoundation"

check_file "SwiftUI.framework (System)" \
    "/System/Library/Frameworks/SwiftUI.framework/Versions/A/SwiftUI"

echo "==========================================================="
echo "💡 Tips for Ghidra Analysis:"
echo "   1. Start with XCPreviewKit.framework (highest signal)"
echo "   2. Load XCPreviewAgent to understand process architecture"
echo "   3. Use Ghidra's Swift demangling: Edit → Tool Options → Demangler"
echo "   4. Search for strings containing 'Preview', 'Thunk', 'Snapshot', 'Render'"
echo "   5. Look for XPC service names and method names"
echo "   6. Cross-reference between binaries for complete picture"
echo

echo "🛠️  Creating Ghidra project import list..."

# Create a file list for easy importing
OUTPUT_FILE="preview_binaries.txt"
> "$OUTPUT_FILE"

add_if_exists() {
    if [ -f "$1" ]; then
        echo "$1" >> "$OUTPUT_FILE"
    fi
}

add_if_exists "$XCODE_PATH/Contents/SharedFrameworks/XCPreviewKit.framework/Versions/A/XCPreviewKit"
add_if_exists "$XCODE_PATH/Contents/SharedFrameworks/XCPreviewKit.framework/Versions/A/XPCServices/XCPreviewAgent.xpc/Contents/MacOS/XCPreviewAgent"
add_if_exists "$XCODE_PATH/Contents/SharedFrameworks/DVTKit.framework/Versions/A/DVTKit"
add_if_exists "$XCODE_PATH/Contents/Frameworks/IDESwiftUI.framework/Versions/A/IDESwiftUI"
add_if_exists "/System/Library/PrivateFrameworks/ViewFoundation.framework/Versions/A/ViewFoundation"
add_if_exists "$XCODE_PATH/Contents/SharedFrameworks/DebugHierarchyFoundation.framework/Versions/A/DebugHierarchyFoundation"

echo "✓ Binary list saved to: $OUTPUT_FILE"
echo

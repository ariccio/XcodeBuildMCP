#!/bin/bash
# Extract Objective-C class headers from preview frameworks

set -e

OUTPUT_DIR="./preview_headers"
mkdir -p "$OUTPUT_DIR"

echo "🔍 Dumping Objective-C Headers from Preview Frameworks"
echo "======================================================="
echo

FRAMEWORKS=(
    "/Applications/Xcode.app/Contents/SharedFrameworks/PreviewsPipeline.framework/Versions/A/PreviewsPipeline"
    "/Applications/Xcode.app/Contents/SharedFrameworks/PreviewsFoundationHost.framework/Versions/A/PreviewsFoundationHost"
    "/Applications/Xcode.app/Contents/PlugIns/PreviewsXcode.framework/Versions/A/PreviewsXcode"
    "/Applications/Xcode.app/Contents/SharedFrameworks/PreviewsMessagingHost.framework/Versions/A/PreviewsMessagingHost"
    "/Applications/Xcode.app/Contents/SharedFrameworks/PreviewsUI.framework/Versions/A/PreviewsUI"
)

for framework in "${FRAMEWORKS[@]}"; do
    if [ -f "$framework" ]; then
        name=$(basename "$framework")
        echo "📄 Dumping: $name"

        # Try class-dump
        if command -v class-dump >/dev/null 2>&1; then
            class-dump -H "$framework" -o "$OUTPUT_DIR/${name}_headers" 2>/dev/null || {
                echo "  ⚠️  class-dump failed (might be Swift-only binary)"
            }
        else
            echo "  ⚠️  class-dump not installed (brew install class-dump)"
        fi

        # Extract strings for additional context
        echo "  📝 Extracting strings..."
        strings "$framework" | grep -E "(Preview|Render|Capture|Snapshot|XPC)" | sort -u > "$OUTPUT_DIR/${name}_strings.txt"

        # List exported symbols
        echo "  🔗 Extracting symbols..."
        nm -g "$framework" 2>/dev/null | grep " T " | cut -d' ' -f3 > "$OUTPUT_DIR/${name}_symbols.txt"

        echo "  ✓ Complete"
        echo
    else
        echo "  ✗ Not found: $framework"
        echo
    fi
done

echo "======================================================="
echo "✓ Headers saved to: $OUTPUT_DIR/"
echo
echo "📊 Summary:"
find "$OUTPUT_DIR" -type f -name "*.h" -o -name "*.txt" | while read file; do
    count=$(wc -l < "$file" 2>/dev/null || echo "0")
    printf "  %-60s %6d lines\n" "$(basename "$file")" "$count"
done

#!/usr/bin/env python3
"""
List all available XcodeBuildMCP tools via Reloaderoo.

This script queries the MCP server to list all available tools, optionally filtered
by category. It provides a quick way to discover tools without loading full documentation.

Usage:
    python list_tools.py                    # List all tools
    python list_tools.py --category sim     # List simulator tools only
    python list_tools.py --format json      # Output as JSON
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional


def run_reloaderoo_command(command: List[str]) -> Dict:
    """
    Execute a Reloaderoo inspect command and return parsed JSON result.

    Args:
        command: Command arguments to pass to reloaderoo

    Returns:
        Parsed JSON response from the server
    """
    try:
        # Build full command
        full_cmd = ['npx', 'reloaderoo@latest'] + command + ['--', 'node', 'build/index.js']

        # Execute command
        result = subprocess.run(
            full_cmd,
            capture_output=True,
            text=True,
            check=True
        )

        # Parse JSON response
        return json.loads(result.stdout)

    except subprocess.CalledProcessError as e:
        print(f"Error executing reloaderoo: {e.stderr}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON response: {e}", file=sys.stderr)
        print(f"Raw output: {result.stdout}", file=sys.stderr)
        sys.exit(1)


def categorize_tools(tools: List[Dict]) -> Dict[str, List[Dict]]:
    """
    Categorize tools by workflow based on tool name patterns.

    Args:
        tools: List of tool dictionaries with 'name' and 'description' fields

    Returns:
        Dictionary mapping category names to lists of tools
    """
    categories = {
        'Simulator Development': [],
        'Device Development': [],
        'macOS Development': [],
        'UI Automation': [],
        'Swift Packages': [],
        'Project Management': [],
        'Log Capture': [],
        'System Diagnostics': [],
        'Utilities': []
    }

    # Category keywords for classification
    sim_keywords = ['sim', 'simulator']
    device_keywords = ['device', 'dev']
    macos_keywords = ['mac', 'macos']
    ui_keywords = ['tap', 'swipe', 'screenshot', 'describe_ui', 'gesture', 'button', 'key_', 'touch', 'type_text']
    swift_keywords = ['swift_package']
    project_keywords = ['discover_proj', 'list_scheme', 'show_build', 'scaffold', 'get_app_bundle', 'get_mac_bundle']
    log_keywords = ['log_cap']
    diagnostic_keywords = ['doctor']

    for tool in tools:
        name = tool['name'].lower()
        categorized = False

        # Check each category
        if any(kw in name for kw in sim_keywords):
            categories['Simulator Development'].append(tool)
            categorized = True
        if any(kw in name for kw in device_keywords):
            categories['Device Development'].append(tool)
            categorized = True
        if any(kw in name for kw in macos_keywords):
            categories['macOS Development'].append(tool)
            categorized = True
        if any(kw in name for kw in ui_keywords):
            categories['UI Automation'].append(tool)
            categorized = True
        if any(kw in name for kw in swift_keywords):
            categories['Swift Packages'].append(tool)
            categorized = True
        if any(kw in name for kw in project_keywords):
            categories['Project Management'].append(tool)
            categorized = True
        if any(kw in name for kw in log_keywords):
            categories['Log Capture'].append(tool)
            categorized = True
        if any(kw in name for kw in diagnostic_keywords):
            categories['System Diagnostics'].append(tool)
            categorized = True

        # Catch-all for uncategorized tools
        if not categorized:
            categories['Utilities'].append(tool)

    # Remove empty categories
    return {k: v for k, v in categories.items() if v}


def filter_by_category(tools: List[Dict], category_filter: Optional[str]) -> List[Dict]:
    """
    Filter tools by category keyword.

    Args:
        tools: List of tool dictionaries
        category_filter: Category keyword to filter by (e.g., 'sim', 'device')

    Returns:
        Filtered list of tools
    """
    if not category_filter:
        return tools

    filter_lower = category_filter.lower()
    return [tool for tool in tools if filter_lower in tool['name'].lower()]


def format_text_output(tools: List[Dict], categorized: bool = False) -> str:
    """
    Format tools as human-readable text.

    Args:
        tools: List of tool dictionaries
        categorized: Whether to categorize tools

    Returns:
        Formatted text string
    """
    if categorized:
        categories = categorize_tools(tools)
        output = []
        for category, category_tools in categories.items():
            output.append(f"\n{category} ({len(category_tools)} tools)")
            output.append("=" * (len(category) + 10))
            for tool in sorted(category_tools, key=lambda x: x['name']):
                output.append(f"  • {tool['name']}")
                if tool.get('description'):
                    # Truncate long descriptions
                    desc = tool['description']
                    if len(desc) > 80:
                        desc = desc[:77] + "..."
                    output.append(f"    {desc}")
                output.append("")
        return "\n".join(output)
    else:
        output = [f"\nAll Tools ({len(tools)} total)"]
        output.append("=" * 30)
        for tool in sorted(tools, key=lambda x: x['name']):
            output.append(f"  • {tool['name']}")
            if tool.get('description'):
                desc = tool['description']
                if len(desc) > 80:
                    desc = desc[:77] + "..."
                output.append(f"    {desc}")
            output.append("")
        return "\n".join(output)


def main():
    parser = argparse.ArgumentParser(
        description='List all available XcodeBuildMCP tools',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                        List all tools (categorized)
  %(prog)s --category sim         List simulator tools only
  %(prog)s --format json          Output as JSON
  %(prog)s --no-categorize        List all tools alphabetically
        """
    )
    parser.add_argument(
        '--category',
        type=str,
        help='Filter tools by category keyword (e.g., sim, device, macos, ui, swift)'
    )
    parser.add_argument(
        '--format',
        choices=['text', 'json'],
        default='text',
        help='Output format (default: text)'
    )
    parser.add_argument(
        '--no-categorize',
        action='store_true',
        help='Don\'t categorize tools (list alphabetically)'
    )

    args = parser.parse_args()

    # Query the MCP server for tool list
    print("Querying XcodeBuildMCP server for available tools...", file=sys.stderr)
    response = run_reloaderoo_command(['inspect', 'list-tools'])

    # Extract tools from response
    tools = response.get('data', {}).get('tools', [])

    if not tools:
        print("No tools found.", file=sys.stderr)
        sys.exit(1)

    # Filter by category if specified
    if args.category:
        tools = filter_by_category(tools, args.category)
        if not tools:
            print(f"No tools found matching category: {args.category}", file=sys.stderr)
            sys.exit(1)

    # Output in requested format
    if args.format == 'json':
        print(json.dumps(tools, indent=2))
    else:
        output = format_text_output(tools, categorized=not args.no_categorize)
        print(output)


if __name__ == '__main__':
    main()

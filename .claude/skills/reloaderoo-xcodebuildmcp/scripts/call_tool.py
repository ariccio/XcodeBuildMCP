#!/usr/bin/env python3
"""
Simplified wrapper for calling XcodeBuildMCP tools via Reloaderoo.

This script makes it easier to call MCP tools by handling JSON parameter escaping,
providing interactive parameter prompts, and validating tool existence.

Usage:
    python call_tool.py list_sims
    python call_tool.py boot_sim --param simulatorId=UUID-HERE
    python call_tool.py build_sim --param projectPath=/path/to/project --param scheme=MyScheme
    python call_tool.py tap --param simulatorUuid=UUID --param x=100 --param y=200
"""

import argparse
import json
import subprocess
import sys
from typing import Dict, List, Optional


def run_reloaderoo_inspect(command: List[str]) -> Dict:
    """
    Execute a Reloaderoo inspect command and return parsed JSON result.

    Args:
        command: Command arguments to pass to reloaderoo inspect

    Returns:
        Parsed JSON response from the server
    """
    try:
        # Build full command
        full_cmd = ['npx', 'reloaderoo@latest', 'inspect'] + command + ['-q', '--', 'npx', 'xcodebuildmcp@latest']

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


def get_tool_list() -> List[str]:
    """
    Get list of all available tool names.

    Returns:
        List of tool names
    """
    response = run_reloaderoo_inspect(['list-tools'])
    tools = response.get('data', {}).get('tools', [])
    return [tool['name'] for tool in tools]


def parse_params(param_list: List[str]) -> Dict:
    """
    Parse parameter key=value pairs into a dictionary.

    Args:
        param_list: List of strings in format "key=value"

    Returns:
        Dictionary of parsed parameters
    """
    params = {}
    for param_str in param_list:
        if '=' not in param_str:
            print(f"Invalid parameter format: {param_str}", file=sys.stderr)
            print("Parameters must be in format: key=value", file=sys.stderr)
            sys.exit(1)

        key, value = param_str.split('=', 1)

        # Try to infer type
        if value.lower() == 'true':
            params[key] = True
        elif value.lower() == 'false':
            params[key] = False
        elif value.isdigit():
            params[key] = int(value)
        elif is_float(value):
            params[key] = float(value)
        else:
            params[key] = value

    return params


def is_float(value: str) -> bool:
    """
    Check if a string represents a float.

    Args:
        value: String to check

    Returns:
        True if string can be converted to float
    """
    try:
        float(value)
        return True
    except ValueError:
        return False


def call_tool(tool_name: str, params: Dict) -> Dict:
    """
    Call an MCP tool with specified parameters.

    Args:
        tool_name: Name of the tool to call
        params: Dictionary of parameters

    Returns:
        Tool response
    """
    # Convert params to JSON string
    params_json = json.dumps(params)

    # Build reloaderoo command
    command = ['call-tool', tool_name, '--params', params_json]

    print(f"Calling tool: {tool_name}", file=sys.stderr)
    print(f"Parameters: {params_json}", file=sys.stderr)
    print("", file=sys.stderr)

    response = run_reloaderoo_inspect(command)
    return response


def format_response(response: Dict) -> str:
    """
    Format tool response for display.

    Args:
        response: Response dictionary from tool call

    Returns:
        Formatted string
    """
    if response.get('success'):
        data = response.get('data', {})
        # Pretty print the response data
        return json.dumps(data, indent=2)
    else:
        error = response.get('error', {})
        return f"Error: {error.get('message', 'Unknown error')}"


def main():
    parser = argparse.ArgumentParser(
        description='Simplified wrapper for calling XcodeBuildMCP tools',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s list_sims
  %(prog)s boot_sim --param simulatorId=ABC123
  %(prog)s build_sim --param projectPath=/path/to/project.xcodeproj --param scheme=MyScheme --param simulatorName="iPhone 16"
  %(prog)s tap --param simulatorUuid=UUID --param x=100 --param y=200

Parameter Types:
  Strings: key=value
  Booleans: key=true or key=false
  Numbers: key=42 or key=3.14

Special Characters:
  Use quotes for values with spaces: --param name="iPhone 15 Pro"
        """
    )
    parser.add_argument(
        'tool_name',
        type=str,
        help='Name of the tool to call'
    )
    parser.add_argument(
        '--param',
        '-p',
        action='append',
        default=[],
        dest='params',
        help='Parameter in format key=value (can be specified multiple times)'
    )
    parser.add_argument(
        '--validate-only',
        action='store_true',
        help='Only validate tool exists, don\'t execute'
    )
    parser.add_argument(
        '--raw',
        action='store_true',
        help='Output raw JSON response'
    )

    args = parser.parse_args()

    # Validate tool exists
    print("Validating tool...", file=sys.stderr)
    available_tools = get_tool_list()

    if args.tool_name not in available_tools:
        print(f"Error: Tool '{args.tool_name}' not found.", file=sys.stderr)
        print(f"\nDid you mean one of these?", file=sys.stderr)
        # Find similar tools
        similar = [t for t in available_tools if args.tool_name.lower() in t.lower()]
        if similar:
            for tool in similar[:5]:
                print(f"  • {tool}", file=sys.stderr)
        else:
            print(f"  No similar tools found.", file=sys.stderr)
            print(f"\nRun 'python list_tools.py' to see all available tools.", file=sys.stderr)
        sys.exit(1)

    if args.validate_only:
        print(f"✓ Tool '{args.tool_name}' exists.", file=sys.stderr)
        sys.exit(0)

    # Parse parameters
    params = parse_params(args.params) if args.params else {}

    # Call the tool
    response = call_tool(args.tool_name, params)

    # Output response
    if args.raw:
        print(json.dumps(response, indent=2))
    else:
        print(format_response(response))


if __name__ == '__main__':
    main()

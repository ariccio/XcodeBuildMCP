#!/usr/bin/env python3
"""
Retrieve parameter schema for a specific XcodeBuildMCP tool.

This script queries the MCP server to get the parameter schema for a tool,
showing required/optional parameters with their descriptions and types.

Usage:
    python get_schema.py build_sim
    python get_schema.py tap --format json
    python get_schema.py list_sims --verbose
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
        full_cmd = ['npx', 'reloaderoo@latest', 'inspect'] + command + ['--', 'node', 'build/index.js']

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


def get_server_info() -> Dict:
    """
    Get server information including tool schemas.

    Returns:
        Server info dictionary
    """
    response = run_reloaderoo_inspect(['server-info'])
    return response.get('data', {})


def find_tool_schema(tool_name: str, server_info: Dict) -> Optional[Dict]:
    """
    Find schema for a specific tool.

    Args:
        tool_name: Name of the tool
        server_info: Server info dictionary

    Returns:
        Tool schema dictionary or None if not found
    """
    # Check in tools list
    tools = server_info.get('capabilities', {}).get('tools', [])

    for tool in tools:
        if tool.get('name') == tool_name:
            return tool

    return None


def format_schema_text(tool_name: str, schema: Dict, verbose: bool = False) -> str:
    """
    Format tool schema as human-readable text.

    Args:
        tool_name: Name of the tool
        schema: Tool schema dictionary
        verbose: Whether to include verbose details

    Returns:
        Formatted text string
    """
    output = []
    output.append(f"\nTool: {tool_name}")
    output.append("=" * (len(tool_name) + 6))

    # Description
    description = schema.get('description', 'No description available')
    output.append(f"\n{description}\n")

    # Parameters
    input_schema = schema.get('inputSchema', {})
    properties = input_schema.get('properties', {})
    required = input_schema.get('required', [])

    if not properties:
        output.append("No parameters required.\n")
        return "\n".join(output)

    output.append("Parameters:")
    output.append("-" * 60)

    # Sort parameters: required first, then optional
    sorted_params = sorted(
        properties.items(),
        key=lambda x: (x[0] not in required, x[0])
    )

    for param_name, param_schema in sorted_params:
        is_required = param_name in required
        req_marker = "* REQUIRED" if is_required else "  (optional)"

        param_type = param_schema.get('type', 'unknown')
        param_desc = param_schema.get('description', 'No description')

        output.append(f"\n  {param_name}  {req_marker}")
        output.append(f"    Type: {param_type}")
        output.append(f"    Description: {param_desc}")

        # Verbose: Show additional schema details
        if verbose:
            # Enum values
            if 'enum' in param_schema:
                output.append(f"    Allowed values: {', '.join(map(str, param_schema['enum']))}")

            # Default value
            if 'default' in param_schema:
                output.append(f"    Default: {param_schema['default']}")

            # Min/max for numbers
            if param_type in ['number', 'integer']:
                if 'minimum' in param_schema:
                    output.append(f"    Minimum: {param_schema['minimum']}")
                if 'maximum' in param_schema:
                    output.append(f"    Maximum: {param_schema['maximum']}")

            # String length constraints
            if param_type == 'string':
                if 'minLength' in param_schema:
                    output.append(f"    Min length: {param_schema['minLength']}")
                if 'maxLength' in param_schema:
                    output.append(f"    Max length: {param_schema['maxLength']}")
                if 'pattern' in param_schema:
                    output.append(f"    Pattern: {param_schema['pattern']}")

    output.append("\n" + "-" * 60)

    # Example usage
    output.append("\nExample usage:")
    example_params = {}
    for param_name in required:
        example_params[param_name] = f"<{param_name}>"

    if example_params:
        example_json = json.dumps(example_params, indent=2)
        output.append(f"  npx reloaderoo@latest inspect call-tool {tool_name} \\")
        output.append(f"    --params '{example_json}' \\")
        output.append(f"    -- node build/index.js")
    else:
        output.append(f"  npx reloaderoo@latest inspect call-tool {tool_name} --params '{{}}' -- node build/index.js")

    output.append("")

    return "\n".join(output)


def main():
    parser = argparse.ArgumentParser(
        description='Retrieve parameter schema for a specific XcodeBuildMCP tool',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s build_sim               Show schema for build_sim tool
  %(prog)s tap --verbose            Show detailed schema with constraints
  %(prog)s list_sims --format json  Output schema as JSON
        """
    )
    parser.add_argument(
        'tool_name',
        type=str,
        help='Name of the tool to get schema for'
    )
    parser.add_argument(
        '--format',
        choices=['text', 'json'],
        default='text',
        help='Output format (default: text)'
    )
    parser.add_argument(
        '--verbose',
        '-v',
        action='store_true',
        help='Show verbose schema details (constraints, defaults, etc.)'
    )

    args = parser.parse_args()

    # Get server info with tool schemas
    print("Querying XcodeBuildMCP server for tool schemas...", file=sys.stderr)
    server_info = get_server_info()

    # Find the requested tool
    schema = find_tool_schema(args.tool_name, server_info)

    if not schema:
        print(f"Error: Tool '{args.tool_name}' not found.", file=sys.stderr)
        print("\nRun 'python list_tools.py' to see all available tools.", file=sys.stderr)
        sys.exit(1)

    # Output in requested format
    if args.format == 'json':
        print(json.dumps(schema, indent=2))
    else:
        output = format_schema_text(args.tool_name, schema, verbose=args.verbose)
        print(output)


if __name__ == '__main__':
    main()

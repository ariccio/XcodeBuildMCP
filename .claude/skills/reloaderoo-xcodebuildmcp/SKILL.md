---
name: reloaderoo-xcodebuildmcp
description: This skill should be used when you need to interact with XcodeBuildMCP tools via Reloaderoo CLI to save context window space. Provides workflow-specific tool catalogs and helper scripts for efficient tool usage without requiring an active MCP server connection.
---

# Reloaderoo for XcodeBuildMCP

## Overview

This skill provides efficient CLI-based access to XcodeBuildMCP tools using Reloaderoo, optimized for context window conservation. Instead of loading the full MCP server and all 87+ tools into context, load only the workflow-specific catalogs needed for your task.

**Key Benefits:**
- **Context Efficient**: Load only relevant workflow catalogs (~30-55 lines each)
- **No MCP Connection Required**: Direct CLI access to all XcodeBuildMCP capabilities
- **Progressive Disclosure**: Start with getting-started, load advanced features as needed
- **Script-Enhanced**: Python utilities for common meta-tasks

## When to Use This Skill

Use this skill when:
- MCP server connection is unavailable or impractical
- Context window space is critical and you need specific XcodeBuildMCP tools
- Making one-off tool calls for testing or exploration
- Working in environments where the full MCP server is overkill
- Developing or testing XcodeBuildMCP tools themselves

**Do NOT use this skill when:**
- You have an active MCP server connection with tool discovery available
- You need to make many sequential tool calls (MCP server is more efficient)
- The context window space savings don't justify the CLI overhead

## Core Pattern

All Reloaderoo commands follow this structure:

```bash
npx reloaderoo@latest inspect call-tool <tool-name> --params '<json-params>' -q -- npx xcodebuildmcp@latest
```

**Components:**
- `npx reloaderoo@latest` - Runs Reloaderoo without global installation
- `inspect call-tool` - Invokes a specific MCP tool
- `<tool-name>` - The XcodeBuildMCP tool to call
- `--params '<json>'` - Tool parameters as JSON string (single quotes required)
- `-q` - Quiet mode for cleaner output
- `-- npx xcodebuildmcp@latest` - The XcodeBuildMCP server command

**Example:**
```bash
npx reloaderoo@latest inspect call-tool list_sims --params '{}' -q -- npx xcodebuildmcp@latest
```

## Deployment Contexts

This skill supports two deployment modes:

**External Projects (Default):**
Use `npx xcodebuildmcp@latest` for portable access from any project:
```bash
npx reloaderoo@latest inspect call-tool list_sims --params '{}' -q -- npx xcodebuildmcp@latest
```

**XcodeBuildMCP Development:**
When developing XcodeBuildMCP itself, use `node build/index.js`:
```bash
npx reloaderoo@latest inspect call-tool list_sims --params '{}' -q -- node build/index.js
```

## Workflow Navigation

### Choose Your Workflow

Each reference file contains 6-13 tools focused on a specific development workflow:

**Starting Out?**
- `references/00-getting-started.md` - Installation, basic patterns, resources

**iOS Development Workflows:**
- `references/01-simulator-workflows.md` - Simulator management, build, test, run (13 tools)
- `references/02-device-workflows.md` - Physical device development (7 tools)

**Platform Workflows:**
- `references/03-macos-workflows.md` - macOS app development (6 tools)
- `references/05-swift-packages.md` - Swift Package Manager operations (6 tools)

**Testing & Automation:**
- `references/04-ui-automation.md` - UI testing and automation (11 tools)
- `references/07-advanced-features.md` - Log capture, diagnostics, resources

**Project Management:**
- `references/06-project-management.md` - Discovery, scaffolding, utilities (8 tools)

**Session Configuration:**
- `references/08-session-management.md` - Session defaults for reduced repetition (3 tools)

### Quick Workflow Selection

**"I want to build and test my iOS app on a simulator"**
→ Read `references/01-simulator-workflows.md`

**"I need to deploy to a physical device"**
→ Read `references/02-device-workflows.md`

**"I'm doing UI testing and automation"**
→ Read `references/04-ui-automation.md`

**"I'm working with Swift packages"**
→ Read `references/05-swift-packages.md`

**"I need to scaffold a new project or discover existing ones"**
→ Read `references/06-project-management.md`

**"I'm debugging and need log capture"**
→ Read `references/07-advanced-features.md`

**"I want to set defaults so I don't repeat project/simulator parameters"**
→ Read `references/08-session-management.md`

## Using the Helper Scripts

The `scripts/` directory contains Python utilities for common tasks:

### List Available Tools
```bash
python scripts/list_tools.py
python scripts/list_tools.py --category simulator
```
Queries the MCP server to list all tools, optionally filtered by category.

### Call Tools Interactively
```bash
python scripts/call_tool.py list_sims
python scripts/call_tool.py boot_sim --param simulatorId=UUID
```
Simplified tool invocation with automatic JSON parameter handling.

### Get Tool Schema
```bash
python scripts/get_schema.py build_sim
```
Retrieves parameter schema for a specific tool, showing required/optional parameters.

## Progressive Loading Strategy

**Typical Usage Pattern:**

1. **First Time**: Read `references/00-getting-started.md` to understand the basics
2. **Select Workflow**: Choose the appropriate workflow reference file
3. **Execute**: Use the CLI commands from that reference
4. **Advanced**: Load additional references only if needed

**Context Estimate:**
- SKILL.md: ~200 lines (this file)
- Getting Started: ~40 lines
- Single Workflow: ~30-55 lines
- **Total**: ~270-295 lines for focused workflow access

Compare to loading full MCP server: ~500+ lines for tool definitions alone.

## Working with XcodeBuildMCP Projects

### Dynamic Tool Discovery

For the initial workflow selection, you can use the `discover_tools` tool:

```bash
npx reloaderoo@latest inspect call-tool discover_tools \
  --params '{"task_description": "I want to build and run my iOS app on a simulator."}' \
  -q -- npx xcodebuildmcp@latest
```

This analyzes your task and suggests the most relevant workflow group.

### Resource Access

XcodeBuildMCP provides resources for common queries:

```bash
# List all simulators
npx reloaderoo@latest inspect read-resource "xcodebuildmcp://simulators" -q -- npx xcodebuildmcp@latest

# List all devices
npx reloaderoo@latest inspect read-resource "xcodebuildmcp://devices" -q -- npx xcodebuildmcp@latest

# System diagnostics
npx reloaderoo@latest inspect read-resource "xcodebuildmcp://doctor" -q -- npx xcodebuildmcp@latest
```

## Bundled Resources

### scripts/
Python utilities that can be executed without loading into context:
- `list_tools.py` - Query and categorize available tools
- `call_tool.py` - Simplified interactive tool invocation
- `get_schema.py` - Retrieve tool parameter schemas

### references/
Workflow-specific tool catalogs loaded on-demand:
- `00-getting-started.md` - Core concepts and patterns
- `01-simulator-workflows.md` - iOS simulator development
- `02-device-workflows.md` - Physical device development
- `03-macos-workflows.md` - macOS application development
- `04-ui-automation.md` - UI testing and automation
- `05-swift-packages.md` - Swift Package Manager
- `06-project-management.md` - Project discovery and scaffolding
- `07-advanced-features.md` - Log capture, diagnostics, resources
- `08-session-management.md` - Session defaults for reduced repetition

### assets/
Currently empty - no asset files needed for this skill.

## Tips for Efficient Usage

1. **Start Minimal**: Only load the reference files you actually need
2. **Use Scripts**: The Python utilities are more context-efficient than loading documentation
3. **Batch Similar Operations**: If doing multiple simulator operations, load that one reference
4. **Combine with Grep**: Search reference files for specific tool names before loading
5. **Clean Up Context**: Remove loaded reference content once you've executed the commands

## Relationship to Full MCP Server

This skill is **complementary** to the full XcodeBuildMCP MCP server:

**Use the full MCP server when:**
- You need many sequential tool calls
- AI needs to discover and select tools dynamically
- Working in IDE with MCP integration

**Use this Reloaderoo skill when:**
- Context window space is critical
- Making one-off or exploratory tool calls
- MCP server connection unavailable
- Testing or debugging XcodeBuildMCP tools

Both approaches access the same XcodeBuildMCP capabilities - choose based on your context and workflow needs.

# Archived Documentation

This directory contains documentation that has been superseded by newer approaches.

## RELOADEROO_FOR_XCODEBUILDMCP.md

**Status:** Superseded by Claude Code skill

**Original Purpose:** Single-file reference for using Reloaderoo with XcodeBuildMCP to save context window space.

**Replaced By:** `.claude/skills/reloaderoo-xcodebuildmcp/`

**Why Archived:**
The original document was a 310-line monolithic reference that warned:
> "providing the entire document will give you no actual benefits. You will end up using more context than just using MCP server directly."

**New Approach:**
The Reloaderoo skill uses **progressive disclosure** to solve this problem:
- **SKILL.md**: Lean core guidance (~212 lines)
- **8 Reference Files**: Workflow-specific catalogs loaded on-demand (~30-55 lines each)
- **3 Python Scripts**: Context-efficient utilities for meta-tasks

**Benefits:**
- ✅ Load only needed workflows (saves ~70% context)
- ✅ Modular organization (easier to maintain)
- ✅ Script-enhanced (deterministic tool calling)
- ✅ Progressive disclosure (start minimal, expand as needed)

**When to Use the Archived Version:**
- If you need a quick single-file reference outside Claude Code
- For historical reference or comparison
- If the skill system is unavailable

**Recommended:** Use the skill at `.claude/skills/reloaderoo-xcodebuildmcp/` for optimal context efficiency.

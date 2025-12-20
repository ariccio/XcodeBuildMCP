# Anthropic Skill Writer

This directory contains the official Anthropic skill-creator tool for building Claude Code skills.

## Source

Downloaded from: https://github.com/anthropics/skills/tree/main/skill-creator

## Contents

- `SKILL.md` - Main skill definition template and comprehensive guide
- `LICENSE.txt` - License terms
- `scripts/` - Python automation tools:
  - `init_skill.py` - Creates new skill templates
  - `package_skill.py` - Packages skills into distributable .zip files
  - `quick_validate.py` - Validates skill structure and metadata

## Quick Start

### 1. Create a New Skill

```bash
python3 skill-creator/scripts/init_skill.py my-new-skill --path .claude/skills
```

This creates a complete skill directory structure with:
- `SKILL.md` with YAML frontmatter and TODO placeholders
- `scripts/` directory for Python/shell scripts
- `references/` directory for documentation
- `assets/` directory for templates and resources

### 2. Develop Your Skill

Edit the generated `SKILL.md` file:
- Fill in the YAML frontmatter (name, description, etc.)
- Write your skill instructions
- Add any Python scripts to the `scripts/` directory
- Add reference documentation to `references/`
- Add templates/assets to `assets/`

### 3. Validate Your Skill

```bash
python3 skill-creator/scripts/quick_validate.py .claude/skills/my-new-skill
```

This checks:
- SKILL.md file exists
- YAML frontmatter is valid
- Required fields are present (name, description)
- Naming conventions are followed (hyphen-case)

### 4. Package Your Skill

```bash
python3 skill-creator/scripts/package_skill.py .claude/skills/my-new-skill --output-dir dist
```

Creates a distributable `.zip` file containing your complete skill.

## Usage Examples

### Create a Testing Skill

```bash
python3 skill-creator/scripts/init_skill.py running-e2e-tests-efficiently --path .claude/skills
```

### Validate Before Committing

```bash
python3 skill-creator/scripts/quick_validate.py .claude/skills/running-e2e-tests-efficiently
```

### Package for Distribution

```bash
python3 skill-creator/scripts/package_skill.py .claude/skills/running-e2e-tests-efficiently
```

## Skill Naming Requirements

- **Format**: Hyphen-case (e.g., `my-skill-name`)
- **Characters**: Lowercase letters, digits, and hyphens only
- **Length**: Maximum 40 characters
- **Match**: Directory name must match skill name exactly

## Skill Structure

Every skill includes:

```
my-skill/
├── SKILL.md              # Main definition with YAML frontmatter
├── scripts/              # Optional executable scripts
├── references/           # Optional documentation
└── assets/               # Optional templates and resources
```

## YAML Frontmatter Fields

Required fields in `SKILL.md`:

```yaml
---
name: my-skill-name
description: Brief description for AI
---
```

Optional fields:

```yaml
---
name: my-skill-name
description: Brief description for AI
version: 1.0.0
author: Your Name
tags: [testing, automation]
---
```

## Skill Design Patterns

### Progressive Disclosure

For complex workflows:
1. Start with high-level questions
2. Gather context incrementally
3. Guide user through workflow steps
4. Provide examples and explanations
5. Validate inputs before execution
6. Offer choices rather than assumptions

### Best Practices

1. **Ask Questions First**: Understand user intent before acting
2. **Provide Context**: Explain what the skill does and why
3. **Show Examples**: Include usage examples in descriptions
4. **Validate Inputs**: Check requirements before executing
5. **Handle Errors Gracefully**: Provide helpful error messages
6. **Document Thoroughly**: Include references and guides

## Integration with XcodeBuildMCP

### Creating XcodeBuildMCP Skills

```bash
# Create a skill for E2E testing workflow
python3 skill-creator/scripts/init_skill.py xcodebuild-testing --path .claude/skills

# Create a skill for simulator management
python3 skill-creator/scripts/init_skill.py simulator-workflow --path .claude/skills

# Create a skill for release process
python3 skill-creator/scripts/init_skill.py release-automation --path .claude/skills
```

### Recommended Skill Structure for XcodeBuildMCP

```
.claude/skills/
├── xcodebuild-testing/
│   ├── SKILL.md
│   └── scripts/
│       └── run_tests.py
├── simulator-workflow/
│   ├── SKILL.md
│   └── scripts/
│       └── manage_simulators.py
└── release-automation/
    ├── SKILL.md
    ├── scripts/
    │   └── prepare_release.py
    └── references/
        └── release-checklist.md
```

## Development Workflow

1. **Initialize**: `python3 skill-creator/scripts/init_skill.py skill-name --path .claude/skills`
2. **Develop**: Edit SKILL.md and add supporting files
3. **Validate**: `python3 skill-creator/scripts/quick_validate.py .claude/skills/skill-name`
4. **Test**: Use the skill in Claude Code
5. **Iterate**: Refine based on usage
6. **Package**: `python3 skill-creator/scripts/package_skill.py .claude/skills/skill-name`
7. **Distribute**: Share the .zip file or commit to repository

## Resources

- **Official Guide**: See `SKILL.md` for comprehensive documentation
- **Anthropic Skills Repo**: https://github.com/anthropics/skills
- **Claude Code Docs**: https://docs.claude.com/en/docs/claude-code

## License

See `LICENSE.txt` for license terms from Anthropic.

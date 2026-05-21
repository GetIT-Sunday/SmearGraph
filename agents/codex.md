# Cartographer — Architecture Analysis Skill

## Description

Analyze any codebase and generate ASCII architecture diagrams. Extracts classes/functions with docstrings, groups into components, renders as clean box diagrams.

## Trigger

- "analyze the architecture"
- "draw an architecture diagram"
- "understand this codebase"
- "what's the component structure"

## Instructions

1. Run `cartographer analyze <project_dir> -f json -o /tmp/cartographer_analysis.json`
2. Read the JSON to understand symbols (name, kind, docstring, filePath)
3. Group symbols into logical components with descriptive names
4. Identify data flows between components (direction → ← ↔)
5. Draw ASCII diagram using `─ │ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ▶ ▼ ◀ ▲`
6. Present the diagram to the user

### Layout Rules
- Outer box = project name
- Main components horizontal left-to-right
- Support components below
- Details indented 2 spaces

### Example Output

```
┌──────────────────────────────────────────┐
│              ProjectName                  │
│  ┌──────────────┐    ┌──────────────┐    │
│  │ Component A  │───▶│ Component B  │    │
│  │ - does X     │    │ - does Y     │    │
│  └──────────────┘    └──────────────┘    │
│  12 files · 3500 LOC · 68 symbols        │
└──────────────────────────────────────────┘
```

## Installation

```bash
npm install -g cartographer
```

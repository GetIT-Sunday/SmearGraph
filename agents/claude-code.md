# SmearGraph — Architecture Analysis

## Description

Analyze any codebase and generate ASCII architecture diagrams. This skill scans a project, extracts classes/functions with docstrings, groups them into components, and renders them as clean ASCII box diagrams.

## When to Use

- User asks "analyze the architecture of X"
- User wants to understand a codebase's structure
- User asks for a component diagram or data flow diagram

## Instructions

### Step 1: Extract symbols

Run the smeargraph CLI to get structured data:

```bash
smeargraph analyze <project_dir> -f json -o /tmp/smeargraph_analysis.json
```

### Step 2: Read the JSON

Read `/tmp/smeargraph_analysis.json`. Key fields:
- `symbols[].name` — class/function name
- `symbols[].kind` — class, function, method, interface
- `symbols[].docstring` — what it does
- `symbols[].filePath` — which file it's in

### Step 3: Group into Components

Group related symbols into logical components. Each component should have:
- A descriptive name (e.g., "BackboneLoader", "GraphBuilder")
- A one-sentence description of what it does
- 2-5 key responsibilities

### Step 4: Identify Data Flows

Between components, identify:
- Which calls which
- What data passes (e.g., "embeddings", "DataFrame", "predictions")
- Direction: → forward, ← backward, ↔ bidirectional

### Step 5: Draw ASCII Diagram

Render using box-drawing characters:
```
─ │ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ▶ ▼ ◀ ▲
```

Layout:
- Outer box = project name
- Main components horizontal, connected with `───▶`
- Support components below
- Details indented 2 spaces inside boxes

### Example Output

```
┌──────────────────────────────────────────┐
│              ProjectName                  │
│                                          │
│  ┌──────────────┐    ┌──────────────┐    │
│  │ Component A  │───▶│ Component B  │    │
│  │ - does X     │    │ - does Y     │    │
│  └──────────────┘    └──────────────┘    │
│                                          │
│  12 files · 3500 LOC · 68 symbols        │
└──────────────────────────────────────────┘
```

## Installation

```bash
npm install -g smeargraph
```

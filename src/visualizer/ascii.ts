import type { AnalysisResult, CodeSymbol, Component, DataFlow } from "../types/index.js";

interface BoxLayout {
  name: string;
  description: string;
  details: string[];
  width: number;
  height: number;
  x: number;
  y: number;
}

const BOX_WIDTH = 58;
const HORIZONTAL_GAP = 6;
const VERTICAL_GAP = 3;
const MAX_LINE_WIDTH = BOX_WIDTH - 6;

function wrapText(text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (test.length <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word.length > maxWidth ? word.slice(0, maxWidth) : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function layoutBoxes(components: Component[], dataFlows: DataFlow[]): BoxLayout[] {
  const primary = components.filter((c) => c.isPrimary);
  const secondary = components.filter((c) => !c.isPrimary);

  const boxes: BoxLayout[] = [];

  if (primary.length === 0 && components.length > 0) {
    primary.push(components[0]);
    secondary.splice(secondary.indexOf(components[0]), 1);
  }

  const primaryDetails = (c: Component): string[] => {
    const lines: string[] = [];
    if (c.responsibilities.length > 0) {
      lines.push(...c.responsibilities.map((r) => `- ${r}`));
    }
    if (c.symbols.length > 0 && c.symbols.length <= 6) {
      lines.push(...c.symbols.map((s) => `  ${s.name}(${s.kind})`));
    } else if (c.symbols.length > 6) {
      lines.push(`  ${c.symbols.length} symbols`);
    }
    return lines.map((l) => wrapText(l, MAX_LINE_WIDTH)).flat();
  };

  let x = 2;
  let y = 1;

  for (const comp of primary) {
    const details = primaryDetails(comp);
    const descLines = wrapText(comp.description, MAX_LINE_WIDTH);
    const height = 2 + descLines.length + (details.length > 0 ? 1 + details.length : 0);
    boxes.push({
      name: comp.name,
      description: comp.description,
      details,
      width: BOX_WIDTH,
      height,
      x,
      y,
    });
    x += BOX_WIDTH + HORIZONTAL_GAP;
  }

  x = 2;
  y += boxes.reduce((max, b) => Math.max(max, b.height), 0) + 2;

  for (const comp of secondary.slice(0, Math.min(8, secondary.length))) {
    const details = primaryDetails(comp);
    const descLines = wrapText(comp.description, MAX_LINE_WIDTH);
    const height = 2 + descLines.length + (details.length > 0 ? 1 + details.length : 0);
    const w = Math.max(28, Math.min(BOX_WIDTH, comp.name.length + 10));

    boxes.push({
      name: comp.name,
      description: comp.description,
      details,
      width: w,
      height,
      x,
      y,
    });
    x += w + 4;
    if (x > 100) { x = 2; y += height + 2; }
  }

  return boxes;
}

function buildGrid(boxes: BoxLayout[]): { grid: string[][]; width: number; height: number } {
  const maxX = boxes.reduce((m, b) => Math.max(m, b.x + b.width), 0) + 2;
  const maxY = boxes.reduce((m, b) => Math.max(m, b.y + b.height), 0) + 2;

  const grid: string[][] = Array.from({ length: maxY + 1 }, () =>
    Array(maxX + 1).fill(" ")
  );

  const H = "─";
  const V = "│";
  const TL = "┌";
  const TR = "┐";
  const BL = "└";
  const BR = "┘";

  for (const box of boxes) {
    for (let dx = 1; dx < box.width - 1; dx++) grid[box.y][box.x + dx] = H;
    for (let dx = 1; dx < box.width - 1; dx++) grid[box.y + box.height - 1][box.x + dx] = H;
    for (let dy = 1; dy < box.height - 1; dy++) grid[box.y + dy][box.x] = V;
    for (let dy = 1; dy < box.height - 1; dy++) grid[box.y + dy][box.x + box.width - 1] = V;
    grid[box.y][box.x] = TL;
    grid[box.y][box.x + box.width - 1] = TR;
    grid[box.y + box.height - 1][box.x] = BL;
    grid[box.y + box.height - 1][box.x + box.width - 1] = BR;

    let lineY = box.y + 1;
    const nameText = box.name.length <= box.width - 4
      ? box.name
      : box.name.slice(0, box.width - 7) + "...";
    const nameX = box.x + Math.floor((box.width - nameText.length) / 2);
    for (let i = 0; i < nameText.length; i++) {
      grid[lineY][nameX + i] = nameText[i];
    }
    lineY++;

    const descLines = wrapText(box.description, box.width - 4);
    for (const line of descLines) {
      const padded = line.slice(0, box.width - 4);
      for (let i = 0; i < padded.length; i++) {
        grid[lineY][box.x + 2 + i] = padded[i];
      }
      lineY++;
    }

    if (box.details.length > 0) {
      lineY++;
      for (const detail of box.details.slice(0, box.height - lineY + box.y - 1)) {
        const text = detail.slice(0, box.width - 4);
        for (let i = 0; i < text.length; i++) {
          grid[lineY][box.x + 2 + i] = text[i];
        }
        lineY++;
        if (lineY >= box.y + box.height - 1) break;
      }
    }
  }

  return { grid, width: maxX, height: maxY };
}

function renderArrows(
  grid: string[][],
  boxes: BoxLayout[],
  dataFlows: DataFlow[]
): void {
  const boxMap = new Map(boxes.map((b) => [b.name, b]));

  for (const flow of dataFlows) {
    const from = boxMap.get(flow.from);
    const to = boxMap.get(flow.to);
    if (!from || !to) continue;

    let fromX: number, fromY: number, toX: number, toY: number;

    if (from.x + from.width <= to.x) {
      fromX = from.x + from.width;
      fromY = from.y + Math.floor(from.height / 2);
      toX = to.x - 1;
      toY = to.y + Math.floor(to.height / 2);
    } else if (to.x + to.width <= from.x) {
      fromX = from.x - 1;
      fromY = from.y + Math.floor(from.height / 2);
      toX = to.x + to.width;
      toY = to.y + Math.floor(to.height / 2);
    } else if (from.y + from.height <= to.y) {
      fromX = from.x + Math.floor(from.width / 2);
      fromY = from.y + from.height - 0;
      toX = to.x + Math.floor(to.width / 2);
      toY = to.y;
    } else {
      fromX = from.x + Math.floor(from.width / 2);
      fromY = from.y;
      toX = to.x + Math.floor(to.width / 2);
      toY = to.y + to.height - 0;
    }

    drawFlowArrow(grid, fromX, fromY, toX, toY, flow);
  }
}

function drawFlowArrow(
  grid: string[][], x1: number, y1: number,
  x2: number, y2: number, flow: DataFlow
): void {
  if (Math.abs(x2 - x1) > Math.abs(y2 - y1)) {
    const dir = x2 > x1 ? 1 : -1;
    for (let x = x1 + dir; x !== x2; x += dir) {
      const c = grid[y1]?.[x];
      if (!c || c === " ") grid[y1][x] = "─";
    }
    const arrowChar = dir > 0 ? "▶" : "◀";
    grid[y2][x2] = arrowChar;

    if (y2 !== y1) {
      const midY = Math.min(y1, y2);
      const dy = y2 > y1 ? 1 : -1;
      for (let y = y1 + dy; y !== y2; y += dy) {
        const c = grid[y]?.[x2 - dir];
        if (!c || c === " ") grid[y][x2 - dir] = "│";
      }
      grid[y1][x2 - dir] = y2 > y1 ? "┐" : "┘";
      grid[y2][x2 - dir] = y2 > y1 ? "└" : "┌";
    }
  } else {
    const dir = y2 > y1 ? 1 : -1;
    for (let y = y1 + dir; y !== y2; y += dir) {
      const c = grid[y]?.[x1];
      if (!c || c === " ") grid[y][x1] = "│";
    }
    const arrowChar = dir > 0 ? "▼" : "▲";
    grid[y2][x2] = arrowChar;

    if (x2 !== x1) {
      const dx = x2 > x1 ? 1 : -1;
      for (let x = x1 + dx; x !== x2; x += dx) {
        const c = grid[y2 - dir]?.[x];
        if (!c || c === " ") grid[y2 - dir][x] = "─";
      }
      grid[y2 - dir][x1] = x2 > x1 ? "└" : "┘";
      grid[y2 - dir][x2] = x2 > x1 ? "┐" : "┌";
    }
  }

  const label = flow.description || flow.dataType;
  if (label && label.length < 20) {
    const midX = Math.floor((x1 + x2) / 2);
    const midY = Math.floor((y1 + y2) / 2);
    if (Math.abs(x2 - x1) > Math.abs(y2 - y1)) {
      for (let i = 0; i < label.length; i++) {
        grid[midY][midX + i - Math.floor(label.length / 2)] = label[i];
      }
    } else {
      const labelY = Math.min(midY + 1, grid.length - 1);
      for (let i = 0; i < label.length; i++) {
        grid[labelY][midX + i - Math.floor(label.length / 2)] = label[i];
      }
    }
  }
}

export function renderAsciiDiagram(
  result: AnalysisResult,
  components: Component[],
  dataFlows: DataFlow[]
): string {
  const boxes = layoutBoxes(components, dataFlows);
  const { grid, width, height } = buildGrid(boxes);
  renderArrows(grid, boxes, dataFlows);

  const lines: string[] = [];
  for (let y = 0; y <= height; y++) {
    let line = grid[y].slice(0, width + 1).join("");
    line = line.replace(/\s+$/, "");
    lines.push(line);
  }

  const header = `┌${"─".repeat(Math.min(width, 70))}┐`;
  const title = `│  ${result.projectName.padEnd(Math.min(width, 70) - 4)}${" ".repeat(Math.max(0, width - result.projectName.length - 4))}│`;

  const statsLine = `${result.stats.totalFiles} files · ${result.stats.totalLOC} LOC · ${result.stats.totalSymbols} symbols`;
  const footer = `│  ${statsLine.padEnd(Math.min(width, 70) - 4)}│`;
  const bottom = `└${"─".repeat(Math.min(width, 70))}┘`;

  return [header, title, ...lines.map((l) => `│ ${l}`), footer, bottom].join("\n");
}

export function analyzeAndRender(result: AnalysisResult, components: Component[], dataFlows: DataFlow[]): string {
  if (components.length === 0) {
    return renderNoComponents(result);
  }
  return renderAsciiDiagram(result, components, dataFlows);
}

function renderNoComponents(result: AnalysisResult): string {
  const lines: string[] = [];
  lines.push(`┌${"─".repeat(58)}┐`);
  lines.push(`│  ${result.projectName.padEnd(56)}│`);
  lines.push(`├${"─".repeat(58)}┤`);
  lines.push(`│  Raw symbol data (use JSON output for full details):${" ".repeat(5)}│`);
  lines.push(`│${" ".repeat(58)}│`);

  for (const sym of result.symbols.slice(0, 20)) {
    const doc = sym.docstring.slice(0, 40);
    const line = `  ${sym.name} (${sym.kind})  ${doc}`;
    lines.push(`│  ${line.slice(0, 54).padEnd(54)}  │`);
  }

  if (result.symbols.length > 20) {
    lines.push(`│  ... and ${result.symbols.length - 20} more symbols${" ".repeat(20)}│`);
  }

  lines.push(`│${" ".repeat(58)}│`);
  lines.push(`│  Stats: ${result.stats.totalFiles} files · ${result.stats.totalLOC} LOC${" ".repeat(14)}│`);
  lines.push(`└${"─".repeat(58)}┘`);
  return lines.join("\n");
}

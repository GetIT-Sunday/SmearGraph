import type { AnalysisResult, CodeSymbol, Component, DataFlow } from "../types/index.js";

interface BoxLayout { name: string; description: string; details: string[]; width: number; height: number; x: number; y: number; }

function wrapText(text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/); const lines: string[] = []; let current = "";
  for (const word of words) { const test = current ? current+" "+word : word; if (test.length <= maxWidth) current = test; else { if (current) lines.push(current); current = word; } }
  if (current) lines.push(current); return lines;
}

const BOX_WIDTH = 58;

function layoutBoxes(components: Component[], dataFlows: DataFlow[]): BoxLayout[] {
  const primary = components.filter(c => c.isPrimary); const secondary = components.filter(c => !c.isPrimary);
  if (primary.length === 0 && components.length > 0) { primary.push(components[0]); secondary.splice(secondary.indexOf(components[0]),1); }
  const boxes: BoxLayout[] = [];
  const details = (c: Component): string[] => c.responsibilities.map(r => "- "+r).concat(c.symbols.length>0&&c.symbols.length<=6?c.symbols.map(s=>"  "+s.name+"("+s.kind+")"):c.symbols.length>6?["  "+c.symbols.length+" symbols"]:[]).flatMap(l=>wrapText(l,BOX_WIDTH-6));
  let x=2,y=1;
  for (const comp of primary) { const d=details(comp); const dl=wrapText(comp.description,BOX_WIDTH-6); boxes.push({name:comp.name,description:comp.description,details:d,width:BOX_WIDTH,height:2+dl.length+(d.length>0?1+d.length:0),x,y}); x+=BOX_WIDTH+4; }
  x=2; y+=boxes.reduce((m,b)=>Math.max(m,b.height),0)+2;
  for (const comp of secondary.slice(0,8)) { const d=details(comp); const dl=wrapText(comp.description,BOX_WIDTH-6); const w=Math.max(28,Math.min(BOX_WIDTH,comp.name.length+10)); boxes.push({name:comp.name,description:comp.description,details:d,width:w,height:2+dl.length+(d.length>0?1+d.length:0),x,y}); x+=w+4; if (x>100) { x=2; y+=boxes[boxes.length-1].height+2; } }
  return boxes;
}

function buildGrid(boxes: BoxLayout[]): { grid: string[][]; width: number; height: number } {
  const maxX = boxes.reduce((m,b)=>Math.max(m,b.x+b.width),0)+2; const maxY = boxes.reduce((m,b)=>Math.max(m,b.y+b.height),0)+2;
  const grid: string[][] = Array.from({length:maxY+1},()=>Array(maxX+1).fill(" "));
  for (const box of boxes) {
    for (let dx=1;dx<box.width-1;dx++) grid[box.y][box.x+dx]="─";
    for (let dx=1;dx<box.width-1;dx++) grid[box.y+box.height-1][box.x+dx]="─";
    for (let dy=1;dy<box.height-1;dy++) grid[box.y+dy][box.x]="│";
    for (let dy=1;dy<box.height-1;dy++) grid[box.y+dy][box.x+box.width-1]="│";
    grid[box.y][box.x]="┌"; grid[box.y][box.x+box.width-1]="┐";
    grid[box.y+box.height-1][box.x]="└"; grid[box.y+box.height-1][box.x+box.width-1]="┘";
    let ly=box.y+1;
    const nt=box.name.length<=box.width-4?box.name:box.name.slice(0,box.width-7)+"...";
    for (let i=0;i<nt.length;i++) grid[ly][box.x+Math.floor((box.width-nt.length)/2)+i]=nt[i]; ly++;
    for (const l of wrapText(box.description,box.width-4)) { for (let i=0;i<l.length;i++) grid[ly][box.x+2+i]=l[i]; ly++; }
    if (box.details.length>0) { ly++; for (const d of box.details) { if (ly>=box.y+box.height-1) break; for (let i=0;i<d.slice(0,box.width-4).length;i++) grid[ly][box.x+2+i]=d[i]; ly++; } }
  }
  return {grid,width:maxX,height:maxY};
}

function drawFlowArrow(grid:string[][],x1:number,y1:number,x2:number,y2:number,flow:DataFlow):void {
  if (Math.abs(x2-x1)>Math.abs(y2-y1)) { const d=x2>x1?1:-1; for(let x=x1+d;x!==x2;x+=d){if(grid[y1]?.[x]===" ")grid[y1][x]="─";} grid[y2][x2]=d>0?"▶":"◀"; if(y2!==y1){for(let y=Math.min(y1,y2)+1;y<Math.max(y1,y2);y++){if(grid[y]?.[x2-d]===" ")grid[y][x2-d]="│";} grid[Math.min(y1,y2)][x2-d]=y2>y1?"┌":"└"; grid[Math.max(y1,y2)][x2-d]=y2>y1?"└":"┌";} }
  else { const d=y2>y1?1:-1; for(let y=y1+d;y!==y2;y+=d){if(grid[y]?.[x1]===" ")grid[y][x1]="│";} grid[y2][x2]=d>0?"▼":"▲"; if(x2!==x1){for(let x=Math.min(x1,x2)+1;x<Math.max(x1,x2);x++){if(grid[y2-d]?.[x]===" ")grid[y2-d][x]="─";} const mx=Math.min(x1,x2);grid[y2-d][mx]=x2>x1?"└":"┘";grid[y2-d][Math.max(x1,x2)]=x2>x1?"┐":"┌";} }
  const label=flow.description||flow.dataType; if(label&&label.length<20){const mx=Math.floor((x1+x2)/2),my=Math.floor((y1+y2)/2);for(let i=0;i<label.length;i++)grid[my][mx+i-Math.floor(label.length/2)]=label[i];}
}

export function renderAsciiDiagram(result:AnalysisResult,components:Component[],dataFlows:DataFlow[]):string {
  const boxes=layoutBoxes(components,dataFlows); const {grid,width,height}=buildGrid(boxes);
  for (const flow of dataFlows) { const fb=boxes.find(b=>b.name===flow.from),tb=boxes.find(b=>b.name===flow.to); if(fb&&tb) drawFlowArrow(grid,fb.x+(fb.x+fb.width<=tb.x?fb.width:fb.x>tb.x+tb.width?-1:Math.floor(fb.width/2)),fb.y+(fb.y+fb.height<=tb.y?fb.height-0:fb.y>tb.y+tb.height?0:Math.floor(fb.height/2)),tb.x+(fb.x+fb.width<=tb.x?-1:tb.x>tb.x+tb.width?tb.width:Math.floor(tb.width/2)),tb.y+(fb.y+fb.height<=tb.y?0:tb.y>tb.y+tb.height?tb.height-0:Math.floor(tb.height/2)),flow); }
  const lines:string[]=[];
  for (let y=0;y<=height;y++) lines.push(grid[y].slice(0,width+1).join("").replace(/\s+$/,""));
  const header="┌"+"─".repeat(Math.min(width-2,68))+"┐";
  const title="│  "+result.projectName.padEnd(Math.min(width-2,68)-4)+"  │";
  const statsLine=result.stats.totalFiles+" files · "+result.stats.totalLOC.toLocaleString()+" LOC · "+result.stats.totalSymbols+" symbols";
  const footer="│  "+statsLine.padEnd(Math.min(width-2,68)-4)+"│";
  return [header,title,"│"+" ".repeat(Math.min(width-2,68))+"│",...lines.map(l=>"│ "+l),footer,"└"+"─".repeat(Math.min(width-2,68))+"┘"].join("\n");
}

export function analyzeAndRender(result:AnalysisResult,components:Component[],dataFlows:DataFlow[]):string {
  if (components.length===0) return renderSymbolList(result);
  return renderAsciiDiagram(result,components,dataFlows);
}

function renderSymbolList(result:AnalysisResult):string {
  const lines:string[]=[];
  lines.push("┌"+"─".repeat(58)+"┐"); lines.push("│  "+result.projectName.padEnd(56)+"│"); lines.push("├"+"─".repeat(58)+"┤");
  for (const s of result.symbols.slice(0,20)) { const doc=s.docstring.slice(0,40); lines.push("│  "+("["+s.kind+"] "+s.name).slice(0,54).padEnd(54)+"  │"); }
  if (result.symbols.length>20) lines.push("│  ... and "+(result.symbols.length-20)+" more symbols"+" ".repeat(20)+"│");
  lines.push("│"+" ".repeat(58)+"│"); lines.push("│  Stats: "+result.stats.totalFiles+" files · "+result.stats.totalLOC+" LOC"+" ".repeat(14)+"│");
  lines.push("└"+"─".repeat(58)+"┘"); return lines.join("\n");
}

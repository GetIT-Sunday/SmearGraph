import type { AnalysisResult } from "../types/index.js";

export function renderInteractiveHTML(result: AnalysisResult): string {
  const components = buildComponents(result);
  const compEdges = buildComponentEdges(result, components);

  return "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<title>SmearGraph — " + esc(result.projectName) + "</title>\n<style>\n" +
    ":root{--bg:#0d1117;--surface:#161b22;--border:#30363d;--text:#c9d1d9;--dim:#8b949e;--accent:#58a6ff;--green:#3fb950;--orange:#d2991d;--red:#f85149;--radius:6px}\n" +
    "*{margin:0;padding:0;box-sizing:border-box}\n" +
    "body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;background:var(--bg);color:var(--text);height:100vh;display:flex;overflow:hidden}\n" +
    ".sidebar{width:260px;min-width:260px;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden}\n" +
    ".sidebar-header{padding:14px;border-bottom:1px solid var(--border)}\n" +
    ".sidebar-header h1{font-size:15px;font-weight:600;color:var(--accent)}\n" +
    ".sidebar-header .stats{font-size:11px;color:var(--dim);margin-top:2px}\n" +
    ".breadcrumb{padding:8px 14px;font-size:11px;border-bottom:1px solid var(--border);color:var(--accent);cursor:pointer;display:none}\n" +
    ".breadcrumb.show{display:block}\n" +
    ".breadcrumb:hover{text-decoration:underline}\n" +
    ".comp-list{flex:1;overflow-y:auto;padding:8px 10px;font-size:12px}\n" +
    ".comp-item{padding:6px 8px;border-radius:4px;cursor:pointer;display:flex;align-items:center;gap:6px;transition:background .15s;margin-bottom:2px}\n" +
    ".comp-item:hover{background:rgba(88,166,255,.1)}\n" +
    ".comp-item.active{background:rgba(88,166,255,.18);color:var(--accent)}\n" +
    ".comp-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}\n" +
    ".comp-info{flex:1;overflow:hidden}\n" +
    ".comp-name{font-weight:500}\n" +
    ".comp-meta{font-size:10px;color:var(--dim)}\n" +
    ".main{flex:1;display:flex;flex-direction:column;position:relative}\n" +
    ".toolbar{padding:6px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;font-size:11px}\n" +
    ".toolbar .btn{padding:3px 8px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);color:var(--text);cursor:pointer;font-size:11px;transition:all .15s}\n" +
    ".toolbar .btn:hover,.toolbar .btn.on{border-color:var(--accent);color:var(--accent)}\n" +
    "#graph{flex:1;cursor:grab}\n" +
    "#graph:active{cursor:grabbing}\n" +
    ".detail{border-top:1px solid var(--border);background:var(--surface);max-height:200px;overflow-y:auto;padding:12px 14px;font-size:12px;display:none}\n" +
    ".detail.open{display:block}\n" +
    ".detail h3{font-size:13px;color:var(--accent);margin-bottom:4px}\n" +
    ".detail .row{display:flex;gap:16px;margin-bottom:6px}\n" +
    ".detail .col{flex:1}\n" +
    ".detail .label{color:var(--dim);font-size:10px;text-transform:uppercase}\n" +
    ".detail .val{font-size:12px}\n" +
    ".docstring{color:var(--dim);font-style:italic;margin-top:4px;line-height:1.4;font-size:11px}\n" +
    ".tip{position:absolute;padding:7px 10px;background:#161b22;border:1px solid var(--accent);border-radius:6px;font-size:11px;pointer-events:none;z-index:100;display:none;max-width:280px;box-shadow:0 4px 12px rgba(0,0,0,.4);color:#c9d1d9}\n" +
    ".file-list{padding:8px 0}\n" +
    ".file-item{padding:3px 8px 3px 20px;font-size:11px;cursor:pointer;border-radius:3px;transition:background .15s}\n" +
    ".file-item:hover{background:rgba(88,166,255,.1)}\n" +
    "</style>\n</head>\n<body>\n" +
    "<div class=\"sidebar\"><div class=\"sidebar-header\"><h1>" + esc(result.projectName) + "</h1><div class=\"stats\">" + components.length + " components · " + result.stats.totalFiles + " files</div></div>\n" +
    "<div class=\"breadcrumb\" id=\"breadcrumb\" onclick=\"zoomOut()\">← All Components</div>\n" +
    "<div class=\"comp-list\" id=\"complist\"></div></div>\n" +
    "<div class=\"main\"><div class=\"toolbar\"><button class=\"btn on\" id=\"btnComp\" onclick=\"showComponents()\">Components</button><span id=\"info\"></span></div>\n" +
    "<svg id=\"graph\"></svg><div class=\"detail\" id=\"detail\"></div><div class=\"tip\" id=\"tip\"></div></div>\n" +
    "<script src=\"https://d3js.org/d3.v7.min.js\"></script>\n<script>\n" +
    "const comps=" + JSON.stringify(components) + ";\n" +
    "const compEdges=" + JSON.stringify(compEdges) + ";\n" +
    "const stats=" + JSON.stringify(result.stats) + ";\n" +
    renderJS() +
    "</script>\n</body>\n</html>";
}

function renderJS(): string {
  return [
    "const svg=d3.select('#graph'),W=()=>svg.node().clientWidth,H=()=>svg.node().clientHeight;svg.attr('width',W()).attr('height',H());",
    "let g=svg.append('g'),zoom=d3.zoom().scaleExtent([0.1,4]).on('zoom',e=>g.attr('transform',e.transform)),sim=null,mode='comp';",
    "svg.call(zoom);svg.call(zoom.transform,d3.zoomIdentity.translate(W()/2,H()/2));",
    "window.addEventListener('resize',()=>{svg.attr('width',W()).attr('height',H())});",

    "function renderGraph(nodes,edges,isComp){",
    "  g.selectAll('*').remove();if(sim)sim.stop();",
    "  const link=g.append('g').selectAll('line').data(edges).join('line').attr('stroke','#475569').attr('stroke-width',d=>isComp?2:1).attr('opacity',d=>isComp?0.6:0.3);",
    "  const ng=g.append('g').selectAll('g').data(nodes).join('g').call(d3.drag().on('start',(e,d)=>{if(!e.active)sim.alphaTarget(0.3).restart();d.fx=d.x;d.fy=d.y}).on('drag',(e,d)=>{d.fx=e.x;d.fy=e.y}).on('end',(e,d)=>{if(!e.active)sim.alphaTarget(0);d.fx=null;d.fy=null}));",
    "  ng.append('circle').attr('r',d=>isComp?Math.max(14,Math.min(50,10+Math.sqrt(d.files||d.symbols||1)*3)):Math.max(5,Math.min(22,4+Math.sqrt(d.symbols||1)*1.2)))",
    "    .attr('fill',d=>d.color||'var(--accent)').attr('stroke','var(--border)').attr('stroke-width',1).attr('opacity',0.9)",
    "    .on('mouseover',(e,d)=>{const t=document.getElementById('tip');t.style.display='block';t.innerHTML=isComp?'<b>'+d.name+'</b><br>'+d.files+' files · '+d.symbols+' symbols<br><small>'+d.desc+'</small>':'<b>'+d.name+'</b><br>'+d.symbols+' symbols<br><small>'+d.path+'</small>';t.style.left=(e.pageX+12)+'px';t.style.top=(e.pageY-10)+'px'})",
    "    .on('mouseout',()=>document.getElementById('tip').style.display='none')",
    "    .on('click',(e,d)=>{e.stopPropagation();if(isComp)drillIn(d);else selectFile(d)});",
    "  ng.append('text').text(d=>d.name).attr('dy',d=>(isComp?Math.max(14,Math.min(50,10+Math.sqrt(d.files||1)*3)):Math.max(5,Math.min(22,4+Math.sqrt(d.symbols||1)*1.2)))+13).attr('text-anchor','middle').attr('font-size',d=>isComp?11:8).attr('fill','var(--dim)').style('pointer-events','none');",
    "  sim=d3.forceSimulation(nodes).force('link',d3.forceLink(edges).id(d=>d.id).distance(isComp?160:80)).force('charge',d3.forceManyBody().strength(isComp?-400:-200)).force('center',d3.forceCenter(0,0)).force('collide',d3.forceCollide().radius(d=>(isComp?Math.max(14,Math.min(50,10+Math.sqrt(d.files||1)*3)):Math.max(5,Math.min(22,4+Math.sqrt(d.symbols||1)*1.2)))+10)).on('tick',()=>{link.attr('x1',d=>d.source.x).attr('y1',d=>d.source.y).attr('x2',d=>d.target.x).attr('y2',d=>d.target.y);ng.attr('transform',d=>'translate('+d.x+','+d.y+')')});",
    "  svg.on('click',()=>{document.getElementById('detail').classList.remove('open')});",
    "}",

    "function selectFile(d){const p=document.getElementById('detail');p.classList.add('open');p.innerHTML='<h3>'+d.name+'</h3><div class=row><div class=col><div class=label>Path</div><div class=val>'+d.path+'</div></div><div class=col><div class=label>Symbols</div><div class=val>'+d.symbols+'</div></div></div>'+(d.doc?'<div class=docstring>'+d.doc+'</div>':'');}",
    "function drillIn(comp){mode='file';document.getElementById('breadcrumb').classList.add('show');document.getElementById('breadcrumb').textContent='← '+comp.name+' ('+comp.files+' files)';document.getElementById('btnComp').classList.remove('on');const fNodes=comp.fileNodes.map((n,i)=>({...n,id:i}));const fEdges=comp.fileEdges.map(e=>({source:fNodes.findIndex(n=>n.path===e.from),target:fNodes.findIndex(n=>n.path===e.to)})).filter(e=>e.source>=0&&e.target>=0&&e.source!==e.target);document.getElementById('info').textContent=fNodes.length+' files · '+fEdges.length+' deps';renderFileList(comp.fileNodes);renderGraph(fNodes,fEdges,false);}",
    "function zoomOut(){mode='comp';document.getElementById('breadcrumb').classList.remove('show');document.getElementById('btnComp').classList.add('on');document.getElementById('detail').classList.remove('open');const cn=comps.map((c,i)=>({...c,id:i}));renderCompList();renderGraph(cn,compEdges,true);document.getElementById('info').textContent=comps.length+' components · '+stats.totalFiles+' files';}",
    "function showComponents(){if(mode==='file')zoomOut();}",

    "function renderCompList(){var h='';comps.forEach(c=>{h+='<div class=comp-item data-idx='+comps.indexOf(c)+' onclick=drillIn(comps['+comps.indexOf(c)+'])><span class=comp-dot style=background:'+(c.color||'var(--accent)')+'></span><div class=comp-info><div class=comp-name>'+c.name+'</div><div class=comp-meta>'+c.files+' files · '+c.symbols+' symbols</div></div></div>'});document.getElementById('complist').innerHTML=h;}",
    "function renderFileList(files){var h='<div class=file-list>';files.forEach(f=>{h+='<div class=file-item>'+f.name+' ('+f.symbols+')</div>'});h+='</div>';document.getElementById('complist').innerHTML=h;}",
    "const cn=comps.map((c,i)=>({...c,id:i}));renderCompList();renderGraph(cn,compEdges,true);document.getElementById('info').textContent=comps.length+' components · '+stats.totalFiles+' files';",
  ].join("\n");
}

interface CompNode { name: string; desc: string; files: number; symbols: number; color: string; paths: string[]; fileNodes: { name: string; path: string; symbols: number; doc: string }[]; fileEdges: { from: string; to: string }[]; }
interface CompEdge { source: number; target: number; }

const COMP_COLORS = ["#58a6ff","#3fb950","#d2991d","#f85149","#bc8cff","#79c0ff","#56d364","#e3b341"];

function buildComponents(result: AnalysisResult): CompNode[] {
  const byName: Record<string, { files: Set<string>; symbols: number; doc: string; priority: number }> = {};

  for (const s of result.symbols) {
    const key = componentKey(s.filePath, result.projectRoot);
    byName[key] = byName[key] || { files: new Set(), symbols: 0, doc: "", priority: keyPriority(key) };
    byName[key].files.add(s.filePath);
    byName[key].symbols++;
    if (s.docstring && !byName[key].doc) byName[key].doc = s.docstring.slice(0, 80);
  }
  for (const dep of result.rawDeps) {
    if (!dep.from) continue;
    const key = componentKey(dep.from, result.projectRoot);
    byName[key] = byName[key] || { files: new Set(), symbols: 0, doc: "", priority: keyPriority(key) };
    byName[key].files.add(dep.from);
  }

  let sorted = Object.entries(byName)
    .sort((a, b) => b[1].priority - a[1].priority || b[1].files.size - a[1].files.size)
    .slice(0, 18);

  const comps: CompNode[] = [];
  const fileToComp = new Map<string, number>();
  for (let i = 0; i < sorted.length; i++) {
    const [name, info] = sorted[i];
    comps.push({ name, desc: info.doc, files: info.files.size, symbols: info.symbols, color: COMP_COLORS[i % COMP_COLORS.length], paths: [...info.files], fileNodes: [], fileEdges: [] });
    for (const f of info.files) fileToComp.set(f, i);
  }

  for (const comp of comps) {
    comp.fileNodes = comp.paths.slice(0, 30).map(p => {
      const syms = result.symbols.filter(s => s.filePath === p);
      const doc = syms.find(s => s.docstring)?.docstring?.slice(0, 120) || "";
      return { name: p.split("/").pop() || p, path: p, symbols: syms.length, doc };
    });
  }

  return comps;
}

function componentKey(filePath: string, root: string): string {
  const rel = filePath.startsWith(root) ? filePath.slice(root.length).replace(/^\//, "") : filePath;
  const parts = rel.split("/");

  const knownRoots: Record<string, string> = {
    "layers/feature_extraction": "Feature Extraction",
    "layers/grammar_analysis": "Grammar Analysis",
    "layers/semantic_analysis": "Semantic (E2E)",
    "layers/pragmatic_analysis": "Pragmatic (DL)",
    "layers/grounding": "Grounding",
    "layers/visualization": "Visualization",
    "configuration": "Configuration",
    "configs": "Configuration",
    "web_api": "Web API",
    "biogsp": "CLI / Entry",
    "core": "Core",
    "scripts": "Scripts",
    "tests": "Tests",
    "data": "Data",
    "docs": "Docs",
    "home": "Legacy Web",
    "rongyu": "Archived",
  };

  for (const [prefix, label] of Object.entries(knownRoots)) {
    if (rel.startsWith(prefix)) return label;
  }

  if (parts.length >= 2) {
    const parent = parts.slice(0, -1).join("/");
    for (const [prefix, label] of Object.entries(knownRoots)) {
      if (parent.startsWith(prefix)) return label;
    }
  }

  return parts[0] || "Other";
}

function keyPriority(key: string): number {
  const order: Record<string, number> = {
    "CLI / Entry": 100, "Feature Extraction": 90, "Grammar Analysis": 80,
    "Semantic (E2E)": 85, "Pragmatic (DL)": 75, "Grounding": 70,
    "Visualization": 65, "Configuration": 60, "Core": 55,
    "Web API": 50, "Scripts": 40, "Tests": 30, "Data": 20,
  };
  return order[key] || 0;
}

function buildComponentEdges(result: AnalysisResult, comps: CompNode[]): CompEdge[] {
  const fileToComp = new Map<string, number>();
  for (let i = 0; i < comps.length; i++) for (const p of comps[i].paths) fileToComp.set(p, i);

  const seen = new Set<string>();
  const edges: CompEdge[] = [];
  const builtins = new Set(["os","sys","re","json","typing","io","pathlib","datetime","collections","argparse","logging","__future__","numpy","pandas","torch","matplotlib","warnings","traceback","itertools","functools","subprocess","shutil","tempfile","copy","hashlib","random","csv","math","time","abc","dataclasses","enum","textwrap","pprint","types","inspect","contextlib"]);
  for (const dep of result.rawDeps) {
    if (builtins.has(dep.to.split(".")[0])) continue;
    const fc = fileToComp.get(dep.from);
    if (fc === undefined) continue;

    let toPath = dep.to;
    if (toPath.startsWith(".")) {
      const fromDir = dep.from.substring(0, dep.from.lastIndexOf("/"));
      const base = fromDir.split("/");
      if (toPath.includes("/")) { for (const p of toPath.split("/")) { if (p === "..") base.pop(); else if (p !== ".") base.push(p); } }
      else { const pkg = toPath.replace(/^\.+/, ""); if (pkg) base.push(pkg + ".py"); }
      toPath = base.join("/");
    } else {
      toPath = result.projectRoot + "/" + toPath.replace(/\./g, "/") + ".py";
    }
    if (!toPath.startsWith("/")) toPath = result.projectRoot + "/" + toPath;
    toPath = toPath.replace(/\.js$/, ".ts").replace(/\.jsx$/, ".tsx").replace(/\.pyc$/, ".py");

    let tc = fileToComp.get(toPath);
    if (tc === undefined) tc = fileToComp.get(toPath + "/__init__.py") || undefined;
    if (tc === undefined) {
      for (let i = 0; i < comps.length; i++) {
        if (i === fc) continue;
        for (const p of comps[i].paths) {
          if (p.startsWith(toPath.replace(/\.py$/, "")) || toPath.includes(p.split("/").slice(-2, -1)[0] || "")) {
            tc = i; break;
          }
        }
        if (tc !== undefined) break;
      }
    }
    if (tc !== undefined && tc !== fc) {
      const key = fc + "->" + tc;
      if (!seen.has(key)) { seen.add(key); edges.push({ source: fc, target: tc }); }
    }
  }
  return edges;
}

function esc(s: string): string { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

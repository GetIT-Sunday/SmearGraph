import type { AnalysisResult } from "../types/index.js";

export function renderInteractiveHTML(result: AnalysisResult): string {
  const nodes = buildNodes(result);
  const edges = buildEdges(result);

  return "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<title>SmearGraph — " + escapeHtml(result.projectName) + "</title>\n" +
    "<style>\n" +
    ":root{--bg:#0d1117;--surface:#161b22;--border:#30363d;--text:#c9d1d9;--dim:#8b949e;--accent:#58a6ff;--green:#3fb950;--orange:#d2991d;--red:#f85149;--radius:8px}\n" +
    "*{margin:0;padding:0;box-sizing:border-box}\n" +
    "body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;background:var(--bg);color:var(--text);height:100vh;display:flex;overflow:hidden}\n" +
    ".sidebar{width:280px;min-width:280px;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden}\n" +
    ".sidebar-header{padding:16px;border-bottom:1px solid var(--border)}\n" +
    ".sidebar-header h1{font-size:16px;font-weight:600;color:var(--accent)}\n" +
    ".sidebar-header .stats{font-size:11px;color:var(--dim);margin-top:4px}\n" +
    ".search-box{margin:10px 12px}\n" +
    ".search-box input{width:100%;padding:7px 10px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);font-size:12px;outline:none;transition:border-color .2s}\n" +
    ".search-box input:focus{border-color:var(--accent)}\n" +
    ".tree{flex:1;overflow-y:auto;padding:0 10px 10px;font-size:12px}\n" +
    ".tree-item{padding:3px 6px;border-radius:4px;cursor:pointer;display:flex;align-items:center;gap:5px;transition:background .15s;white-space:nowrap}\n" +
    ".tree-item:hover{background:rgba(88,166,255,.1)}\n" +
    ".tree-item.active{background:rgba(88,166,255,.2);color:var(--accent)}\n" +
    ".tree-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}\n" +
    ".tree-name{overflow:hidden;text-overflow:ellipsis}\n" +
    ".main{flex:1;display:flex;flex-direction:column;position:relative}\n" +
    ".toolbar{padding:6px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;font-size:11px}\n" +
    ".toolbar .btn{padding:3px 8px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);color:var(--text);cursor:pointer;font-size:11px;transition:all .15s}\n" +
    ".toolbar .btn:hover{border-color:var(--accent)}\n" +
    ".toolbar .legend{display:flex;gap:10px;margin-left:auto}\n" +
    ".toolbar .legend span{display:flex;align-items:center;gap:3px}\n" +
    ".toolbar .legend .dot{width:7px;height:7px;border-radius:50%}\n" +
    "#graph{flex:1;cursor:grab}\n" +
    "#graph:active{cursor:grabbing}\n" +
    ".detail{border-top:1px solid var(--border);background:var(--surface);max-height:180px;overflow-y:auto;padding:10px 14px;font-size:12px;display:none}\n" +
    ".detail.open{display:block}\n" +
    ".detail h3{font-size:13px;color:var(--accent);margin-bottom:4px}\n" +
    ".detail .row{display:flex;gap:16px;margin-bottom:6px}\n" +
    ".detail .col{flex:1}\n" +
    ".detail .label{color:var(--dim);font-size:10px;text-transform:uppercase;margin-bottom:1px}\n" +
    ".detail .val{font-size:12px}\n" +
    ".docstring{color:var(--dim);font-style:italic;margin-top:4px;line-height:1.4;font-size:11px}\n" +
    ".node-tooltip{position:absolute;padding:7px 10px;background:var(--surface);border:1px solid var(--accent);border-radius:6px;font-size:11px;pointer-events:none;z-index:100;display:none;max-width:260px;box-shadow:0 4px 12px rgba(0,0,0,.4)}\n" +
    "</style>\n</head>\n<body>\n" +
    "<div class=\"sidebar\"><div class=\"sidebar-header\"><h1>" + escapeHtml(result.projectName) + "</h1><div class=\"stats\">" + result.stats.totalFiles + " files · " + result.stats.totalLOC.toLocaleString() + " LOC · " + result.stats.totalSymbols + " symbols</div></div>\n" +
    "<div class=\"search-box\"><input type=\"text\" id=\"search\" placeholder=\"Search files...\" oninput=\"filterNodes(this.value)\"></div>\n" +
    "<div class=\"tree\" id=\"tree\"></div></div>\n" +
    "<div class=\"main\"><div class=\"toolbar\"><button class=\"btn\" onclick=\"resetZoom()\">Fit</button><span id=\"nodeCount\"></span>" +
    "<div class=\"legend\"><span><span class=\"dot\" style=\"background:var(--green)\"></span>entry</span><span><span class=\"dot\" style=\"background:var(--accent)\"></span>module</span><span><span class=\"dot\" style=\"background:var(--orange)\"></span>util</span><span><span class=\"dot\" style=\"background:var(--dim)\"></span>config</span></div></div>\n" +
    "<svg id=\"graph\"></svg><div class=\"detail\" id=\"detail\"></div><div class=\"node-tooltip\" id=\"tooltip\"></div></div>\n" +
    "<script src=\"https://d3js.org/d3.v7.min.js\"></script>\n" +
    "<script>\n" +
    "const rawData=" + JSON.stringify({ nodes, edges, stats: result.stats }) + ";\n" +
    "const colorMap={entry:'var(--green)',module:'var(--accent)',util:'var(--orange)',config:'var(--dim)'};\n" +
    "const nodes=rawData.nodes.map((n,i)=>({...n,id:i}));\n" +
    "const links=rawData.edges.map(e=>{let si=nodes.findIndex(n=>n.path===e.from);if(si<0){let alt=e.from;if(alt.endsWith('.py'))alt=alt.slice(0,-3)+'/__init__.py';si=nodes.findIndex(n=>n.path===alt||n.path===e.from+'/__init__.py'||n.path===e.from+'.py')}let ti=nodes.findIndex(n=>n.path===e.to);if(ti<0){ti=nodes.findIndex(n=>n.path===e.to+'/__init__.py'||n.path===e.to+'.py')}return{source:si,target:ti}}).filter(e=>e.source>=0&&e.target>=0&&e.source!==e.target);\n" +
    "const svg=d3.select('#graph');const W=()=>document.getElementById('graph').clientWidth;const H=()=>document.getElementById('graph').clientHeight;\n" +
    "svg.attr('width',W()).attr('height',H());\n" +
    "const g=svg.append('g');const zoom=d3.zoom().scaleExtent([0.1,4]).on('zoom',e=>g.attr('transform',e.transform));svg.call(zoom);svg.call(zoom.transform,d3.zoomIdentity.translate(W()/2,H()/2));\n" +
    "const link=g.append('g').selectAll('line').data(links).join('line').attr('stroke','var(--border)').attr('stroke-width',1).attr('opacity',0.4);\n" +
    "const nodeG=g.append('g').selectAll('g').data(nodes).join('g').call(d3.drag().on('start',(e,d)=>{if(!e.active)sim.alphaTarget(0.3).restart();d.fx=d.x;d.fy=d.y}).on('drag',(e,d)=>{d.fx=e.x;d.fy=e.y}).on('end',(e,d)=>{if(!e.active)sim.alphaTarget(0);d.fx=null;d.fy=null}));\n" +
    "nodeG.append('circle').attr('r',d=>Math.max(5,Math.min(28,4+Math.sqrt(d.loc||1)*1.4))).attr('fill',d=>colorMap[d.category]||'var(--dim)').attr('stroke','var(--border)').attr('stroke-width',1).attr('opacity',0.85).on('mouseover',showTip).on('mouseout',hideTip).on('click',selectNode);\n" +
    "nodeG.append('text').text(d=>d.name).attr('dy',d=>Math.max(5,Math.min(28,4+Math.sqrt(d.loc||1)*1.4))+13).attr('text-anchor','middle').attr('font-size',8).attr('fill','var(--dim)').style('pointer-events','none');\n" +
    "const sim=d3.forceSimulation(nodes).force('link',d3.forceLink(links).id(d=>d.id).distance(90)).force('charge',d3.forceManyBody().strength(-220)).force('center',d3.forceCenter(0,0)).force('collide',d3.forceCollide().radius(d=>Math.max(5,Math.min(28,4+Math.sqrt(d.loc||1)*1.4))+7)).on('tick',()=>{link.attr('x1',d=>d.source.x).attr('y1',d=>d.source.y).attr('x2',d=>d.target.x).attr('y2',d=>d.target.y);nodeG.attr('transform',d=>'translate('+d.x+','+d.y+')')});\n" +
    "window.addEventListener('resize',()=>{svg.attr('width',W()).attr('height',H())});\n" +
    "function showTip(e,d){const t=document.getElementById('tooltip');t.style.display='block';t.innerHTML='<strong>'+d.name+'</strong><br>'+d.loc+' LOC · '+d.symbols+' symbols<br><small>'+d.path+'</small>';t.style.left=(e.pageX+12)+'px';t.style.top=(e.pageY-10)+'px'}\n" +
    "function hideTip(){document.getElementById('tooltip').style.display='none'}\n" +
    "function selectNode(e,d){e.stopPropagation();const p=document.getElementById('detail');p.classList.add('open');p.innerHTML='<h3>'+d.name+'</h3><div class=row><div class=col><div class=label>Path</div><div class=val>'+d.path+'</div></div><div class=col><div class=label>LOC</div><div class=val>'+d.loc+'</div></div><div class=col><div class=label>Symbols</div><div class=val>'+d.symbols+'</div></div><div class=col><div class=label>Category</div><div class=val>'+d.category+'</div></div></div>'+(d.docstring?'<div class=docstring>'+d.docstring+'</div>':'');highlightNode(d);document.querySelectorAll('.tree-item').forEach(el=>el.classList.remove('active'));var ti=document.querySelector('[data-path=\"'+CSS.escape(d.path)+'\"]');if(ti)ti.classList.add('active')}\n" +
    "function highlightNode(d){nodeG.select('circle').attr('opacity',0.15);link.attr('opacity',0.08);nodeG.filter(n=>n.id===d.id).select('circle').attr('opacity',1).attr('stroke','var(--accent)').attr('stroke-width',2);link.filter(l=>l.source.id===d.id||l.target.id===d.id).attr('opacity',0.8).attr('stroke','var(--accent)');nodeG.filter(n=>links.some(l=>(l.source.id===d.id&&l.target.id===n.id)||(l.target.id===d.id&&l.source.id===n.id))).select('circle').attr('opacity',0.6)}\n" +
    "svg.on('click',()=>{nodeG.select('circle').attr('opacity',0.85).attr('stroke','var(--border)').attr('stroke-width',1);link.attr('opacity',0.4).attr('stroke','var(--border)');document.getElementById('detail').classList.remove('open');document.querySelectorAll('.tree-item').forEach(el=>el.classList.remove('active'))});\n" +
    "function resetZoom(){svg.transition().duration(500).call(zoom.transform,d3.zoomIdentity.translate(W()/2,H()/2))}\n" +
    "function filterNodes(q){var t=q.toLowerCase();nodeG.select('circle').attr('opacity',d=>d.name.toLowerCase().includes(t)||d.path.toLowerCase().includes(t)?0.85:0.06)}\n" +
    "buildTree();function buildTree(){var tree=document.getElementById('tree'),byDir={};nodes.forEach(n=>{var p=n.path.split('/');p.pop();var d=p.join('/')||'root';byDir[d]=byDir[d]||[];byDir[d].push(n)});var dirs=Object.keys(byDir).sort(),h='';dirs.forEach(d=>{var f=byDir[d],l=d.split('/').pop()||d;h+='<div style=\"padding:4px 6px;font-size:10px;color:var(--dim);margin-top:3px\">'+l+' ('+f.length+')</div>';f.forEach(n=>{h+='<div class=tree-item data-path=\"'+n.path.replace(/\"/g,'&quot;')+'\" onclick=\"clickTree(event)\"><span class=tree-dot style=background:'+(colorMap[n.category]||'var(--dim)')+'></span><span class=tree-name>'+n.name+'</span></div>'})});tree.innerHTML=h}\n" +
    "window.clickTree=function(e){var p=e.currentTarget.dataset.path,n=nodes.find(n=>n.path===p);if(n)selectNode(e,n)};\n" +
    "document.getElementById('nodeCount').textContent=nodes.length+' nodes · '+links.length+' edges';\n" +
    "</script>\n</body>\n</html>";
}

interface HtmlNode { name: string; path: string; loc: number; symbols: number; category: string; docstring: string; }
interface HtmlEdge { from: string; to: string; }

function buildNodes(result: AnalysisResult): HtmlNode[] {
  const byFile: Record<string, { loc: number; symbols: number; category: string; docstring: string }> = {};
  for (const s of result.symbols) {
    byFile[s.filePath] = byFile[s.filePath] || { loc: 0, symbols: 0, category: "module", docstring: "" };
    byFile[s.filePath].symbols++;
    if (s.docstring && !byFile[s.filePath].docstring) byFile[s.filePath].docstring = s.docstring.slice(0, 200);
  }
  for (const f of result.symbols) {
    if (byFile[f.filePath]) byFile[f.filePath].loc = Math.max(byFile[f.filePath].loc, 1);
  }
  for (const d of result.rawDeps) {
    if (d.from && !byFile[d.from]) byFile[d.from] = { loc: 0, symbols: 0, category: "module", docstring: "" };
  }

  return Object.entries(byFile).map(([path, info]) => {
    const name = path.split("/").pop() || path;
    let category = "module";
    if (/^(main|index|app|cli|server|run)\.[a-z]+$/.test(name)) category = "entry";
    else if (/(util|helper|common|shared|base)/.test(path)) category = "util";
    else if (/(config|setting|constant|env)/.test(path)) category = "config";
    return { name, path, loc: info.loc, symbols: info.symbols, category, docstring: info.docstring };
  });
}

function buildEdges(result: AnalysisResult): HtmlEdge[] {
  const seen = new Set<string>();
  const nodePaths = new Set<string>();
  for (const s of result.symbols) nodePaths.add(s.filePath);

  const PYTHON_BUILTINS = new Set([
    "os","sys","re","json","math","time","datetime","collections","itertools","functools",
    "typing","io","pathlib","shutil","subprocess","argparse","logging","unittest","abc",
    "dataclasses","enum","hashlib","random","csv","copy","tempfile","threading","warnings",
    "ast","textwrap","urllib","http","xml","email","base64","uuid","pickle","struct","socket",
    "traceback","inspect","types","contextlib","string","pprint","weakref","operator",
    "__future__","numpy","np","pandas","pd","torch","tensorflow","tf","sklearn",
    "matplotlib","seaborn","scipy","matplotlib.pyplot","plt",
  ]);

  return result.rawDeps
    .filter(d => d.from && d.to)
    .filter(d => {
      const key = d.from + "|||" + d.to;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(d => {
      let toPath = d.to;
      if (PYTHON_BUILTINS.has(toPath.split(".")[0])) return null;
      if (toPath.startsWith(".")) {
        const fromDir = d.from.substring(0, d.from.lastIndexOf("/"));
        const base = fromDir.split("/");
        if (toPath.includes("/")) {
          for (const p of toPath.split("/")) {
            if (p === "..") base.pop();
            else if (p !== ".") base.push(p);
          }
        } else {
          const pkg = toPath.replace(/^\.+/, "");
          if (pkg) base.push(pkg + ".py");
        }
        toPath = base.join("/");
      } else if (!toPath.includes("/") && !toPath.startsWith("/")) {
        return null;
      }
      if (!toPath.startsWith("/")) {
        toPath = result.projectRoot + "/" + toPath;
      }
      toPath = toPath.replace(/\.js$/, ".ts").replace(/\.jsx$/, ".tsx").replace(/\.pyc$/, ".py");
      return { from: d.from, to: toPath };
    })
    .filter((e): e is HtmlEdge => e !== null);
}

function escapeHtml(s: string): string { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

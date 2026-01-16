// js/corr_matrix.js
// Renders either:
// - Pearson correlation heatmap for numeric vars
// - Cramér's V heatmap for categorical vars
export function createCorrelationMatrix(allData, dispatcher) {
  const numericVars = [
    "age",
    "education_num",
    "capital_gain",
    "capital_loss",
    "hours_per_week",
  ];

  const categoricalVars = [
    "workclass",
    "education",
    "marital_status",
    "occupation",
    "relationship",
    "race",
    "sex",
    "native_country",
    "income",
  ];

  const controls = d3.select("#corr-controls");
  const container = d3.select("#corr-matrix-viz");

  
   container.style("position", "relative");

  if (controls.empty() || container.empty()) {
    console.warn("Correlation matrix: containers not found (#corr-controls, #corr-matrix-viz).");
  return;
    }

  controls.selectAll("*").remove();
  container.selectAll("*").remove();

  // --- UI state
  let mode = "pearson"; // "pearson" | "cramersv"
  let selected = [...numericVars]; // default

  // --- UI: mode select
  const row = controls.append("div")
  .style("display", "flex")
  .style("flex-direction", "column")
  .style("gap", "14px");


  row.append("label")
    .style("font-weight", "600")
    .text("Measure:");

  const modeSelect = row.append("select")
    .on("change", function () {
      mode = this.value;

      selected = mode === "pearson"
        ? [...numericVars]
        : [...categoricalVars];

      // re-render selectors + chart
      renderVarSelector();
      render();
    });

  modeSelect.selectAll("option")
    .data([
      { value: "pearson", text: "Pearson (numeric)" },
      { value: "cramersv", text: "Cramér's V (categorical)" },
    ])
    .join("option")
    .attr("value", d => d.value)
    .property("selected", d => d.value === mode)
    .text(d => d.text);

  // --- UI: variable multi-select
  const selectorWrap = row.append("div")
  .style("display", "flex")
  .style("flex-direction", "column")
  .style("gap", "8px");
  selectorWrap.append("label").style("font-weight", "600").text("Variables:");

  const varSelect = selectorWrap.append("select")
  .attr("multiple", true)
  .style("width", "100%")
  .style("height", "95px");

varSelect.on("mousedown", function (event) {
  const option = event.target;
  if (option.tagName === "OPTION") {
    event.preventDefault();           
    option.selected = !option.selected;

    selected = Array.from(this.options)
      .filter(o => o.selected)
      .map(o => o.value);

    render();
  }
});


  const buttonWrap = selectorWrap.append("div")
  .style("display", "flex")
  .style("flex-direction", "column")
  .style("gap", "6px");

  buttonWrap.selectAll("button")
  .style("width", "100%");

  buttonWrap.append("button")
    .text("Select all")
    .on("click", () => {
      selected = mode === "pearson" ? [...numericVars] : [...categoricalVars];
      renderVarSelector(true);
      render();
    });

  buttonWrap.append("button")
    .text("Clear")
    .on("click", () => {
      selected = [];
      renderVarSelector(true);
      render(); // will show empty
    });

  function renderVarSelector(forceSetSelected = false) {
    const vars = mode === "pearson" ? numericVars : categoricalVars;

    const opts = varSelect.selectAll("option")
      .data(vars, d => d);

    opts.join("option")
      .attr("value", d => d)
      .text(d => d);

    if (forceSetSelected) {
      varSelect.selectAll("option")
        .property("selected", d => selected.includes(d));
    } else {
      // initial / mode switch: select default set
      varSelect.selectAll("option")
        .property("selected", d => selected.includes(d));
    }
  }

  // --- Stats helpers
  function pearson(x, y) {
    const n = Math.min(x.length, y.length);
    const mx = d3.mean(x);
    const my = d3.mean(y);
    let num = 0, dx = 0, dy = 0;

    for (let i = 0; i < n; i++) {
      const a = x[i] - mx;
      const b = y[i] - my;
      num += a * b;
      dx += a * a;
      dy += b * b;
    }
    const denom = Math.sqrt(dx * dy);
    return denom === 0 ? 0 : (num / denom);
  }

  function cramersV(data, colA, colB) {
    // levels
    const levelsA = Array.from(new Set(data.map(d => d[colA]).filter(v => v !== undefined && v !== null && `${v}`.trim() !== "")));
    const levelsB = Array.from(new Set(data.map(d => d[colB]).filter(v => v !== undefined && v !== null && `${v}`.trim() !== "")));

    const n = data.length;
    if (n === 0 || levelsA.length < 2 || levelsB.length < 2) return 0;

    // counts
    const counts = new Map(); // "a|||b" -> count
    const rowSums = new Map(levelsA.map(a => [a, 0]));
    const colSums = new Map(levelsB.map(b => [b, 0]));

    for (const d of data) {
      const a = d[colA];
      const b = d[colB];
      if (!rowSums.has(a) || !colSums.has(b)) continue;
      const key = `${a}|||${b}`;
      counts.set(key, (counts.get(key) || 0) + 1);
      rowSums.set(a, rowSums.get(a) + 1);
      colSums.set(b, colSums.get(b) + 1);
    }

    // chi-square
    let chi2 = 0;
    for (const a of levelsA) {
      for (const b of levelsB) {
        const o = counts.get(`${a}|||${b}`) || 0;
        const e = (rowSums.get(a) * colSums.get(b)) / n;
        if (e > 0) chi2 += (o - e) ** 2 / e;
      }
    }

    const r = levelsA.length;
    const k = levelsB.length;
    const denom = n * Math.min(r - 1, k - 1);
    return denom > 0 ? Math.sqrt(chi2 / denom) : 0;
  }

  function buildMatrix() {
    if (!selected.length) return [];

    if (mode === "pearson") {
      // vectors for each selected numeric var
      const vectors = Object.fromEntries(
        selected.map(v => [v, allData.map(d => +d[v]).filter(Number.isFinite)])
      );

      const cells = [];
      for (const y of selected) {
        for (const x of selected) {
          const value = pearson(vectors[x], vectors[y]);
          cells.push({ x, y, value });
        }
      }
      return cells;
    }

    // mode === "cramersv"
    const cells = [];
    for (const y of selected) {
      for (const x of selected) {
        const value = (x === y) ? 1 : cramersV(allData, x, y);
        cells.push({ x, y, value });
      }
    }
    return cells;
  }

  function render() {
    container.selectAll("*").remove();

    if (!selected.length) {
      container.append("div").text("Select at least one variable.").style("opacity", 0.7);
      return;
    }

    const data = buildMatrix();

    const vars = [...selected];

    const panelW = container.node().clientWidth;
  const maxSize = Math.min(700, panelW - 220); // 220 ~ margins + legend
const cellSize = Math.max(16, Math.floor(maxSize / vars.length));
const size = cellSize * vars.length;
    

    const margin = { top: 120, right: 80, bottom: 20, left: 120 };

    const svg = container.append("svg")
      .attr("viewBox", [0, 0, margin.left + size + margin.right, margin.top + size + margin.bottom])
      .style("width", "100%")
      .style("height", "auto");

    const x = d3.scaleBand().domain(vars).range([0, size]);
    const y = d3.scaleBand().domain(vars).range([0, size]);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

  
    const color = mode === "pearson"
      ? d3.scaleDiverging([-1, 0, 1], d3.interpolateRdBu)
      : d3.scaleSequential([0, 1], d3.interpolateBlues);

 
    const tip = container.append("div")
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("background", "rgba(255,255,255,0.95)")
      .style("border", "1px solid #ddd")
      .style("border-radius", "6px")
      .style("padding", "6px 8px")
      .style("font-size", "12px")
      .style("display", "none");

    const fmt = mode === "pearson"
      ? (v) => v.toFixed(3)
      : (v) => v.toFixed(3);

    g.selectAll("rect")
  .data(data)
  .join("rect")
  .attr("x", d => x(d.x))
  .attr("y", d => y(d.y))
  .attr("width", x.bandwidth())
  .attr("height", y.bandwidth())
  .attr("fill", d => color(d.value))
  .attr("stroke", "white")

  .on("mouseenter", (event, d) => {

    const label = mode === "pearson" ? "r (Pearson)" : "V (Cramér's)";
    tip
      .style("display", "block")
      .html(`
        <div style="font-weight:600; margin-bottom:4px;">
          ${d.y} vs ${d.x}
        </div>
        <div style="margin-bottom:6px;">
          ${label}: <span style="font-weight:600;">${fmt(d.value)}</span>
        </div>
        <div id="tip-scatter" style="width:260px; height:180px;"></div>
      `);


    if (dispatcher) {
      dispatcher.call("corrHover", null, { xVar: d.x, yVar: d.y, mode, value: d.value });
    }
  })

  .on("mousemove", (event) => {
  const [mx, my] = d3.pointer(event, container.node());

  const tooltipWidth = 300;   
  const tooltipHeight = 240; 
  const padding = 12;

  const containerNode = container.node();
  const containerWidth = containerNode.clientWidth;
  const containerHeight = containerNode.clientHeight;

  let left = mx + padding;
  let top = my + padding;


  if (left + tooltipWidth > containerWidth) {
    left = mx - tooltipWidth - padding;
  }

  
  if (top + tooltipHeight > containerHeight) {
    top = my - tooltipHeight - padding;
  }

  tip
    .style("left", `${left}px`)
    .style("top", `${top}px`);
})


  .on("mouseleave", () => {
    tip.style("display", "none");
  });






    
    svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)
      .selectAll("text")
      .data(vars)
      .join("text")
      .attr("x", d => x(d) + x.bandwidth() / 2)
      .attr("y", -8)
      .attr("text-anchor", "start")
      .attr("transform", d => `rotate(-45, ${x(d) + x.bandwidth() / 2}, -8)`)
      .style("font-size", "11px")
      .text(d => d);

    // Y labels
    svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)
      .selectAll("text")
      .data(vars)
      .join("text")
      .attr("x", -8)
      .attr("y", d => y(d) + y.bandwidth() / 2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .style("font-size", "11px")
      .text(d => d);

    // Title line
    svg.append("text")
      .attr("x", margin.left)
      .attr("y", 24)
      .style("font-size", "14px")
      .style("font-weight", "600")
      .text(mode === "pearson" ? "Pearson correlation matrix (numeric variables)" : "Cramér's V association matrix (categorical variables)");
  
const legendHeight = size;
const legendWidth = 14;

const legendScale = mode === "pearson"
  ? d3.scaleLinear().domain([-1, 1]).range([legendHeight, 0])
  : d3.scaleLinear().domain([0, 1]).range([legendHeight, 0]);

const legendAxis = d3.axisRight(legendScale)
  .ticks(5);

const legendG = svg.append("g")
  .attr(
    "transform",
    `translate(${margin.left + size + 20}, ${margin.top})`
  );

// Gradient definition
const defs = svg.append("defs");
const gradientId = mode === "pearson" ? "grad-pearson" : "grad-cramers";

const gradient = defs.append("linearGradient")
  .attr("id", gradientId)
  .attr("x1", "0%")
  .attr("y1", "100%")
  .attr("x2", "0%")
  .attr("y2", "0%");

if (mode === "pearson") {
  gradient.append("stop").attr("offset", "0%").attr("stop-color", color(-1));
  gradient.append("stop").attr("offset", "50%").attr("stop-color", color(0));
  gradient.append("stop").attr("offset", "100%").attr("stop-color", color(1));
} else {
  gradient.append("stop").attr("offset", "0%").attr("stop-color", color(0));
  gradient.append("stop").attr("offset", "100%").attr("stop-color", color(1));
}

// Legend rectangle
legendG.append("rect")
  .attr("width", legendWidth)
  .attr("height", legendHeight)
  .style("fill", `url(#${gradientId})`)
  .style("stroke", "#ccc");

// Legend axis
legendG.append("g")
  .attr("transform", `translate(${legendWidth}, 0)`)
  .call(legendAxis);

// Legend label
legendG.append("text")
  .attr("x", legendWidth + 30)
  .attr("y", -10)
  .attr("text-anchor", "middle")
  .style("font-size", "11px")
  .style("font-weight", "600")
  .text(mode === "pearson" ? "Correlation (r)" : "Cramér's V");

  }

  // initial
  renderVarSelector(true);
  render();
}


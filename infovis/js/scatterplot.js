export function createScatterplot(allData, dispatcher, colors) {

  function renderIntoTooltip(xVar, yVar, mode) {
    const container = d3.select("#tip-scatter");
    if (container.empty()) return; // Tooltip evtl. schon weg

    container.selectAll("*").remove();

    if (mode !== "pearson") {
      // Für kategoriale Variablen kein Scatterplot
      container
        .append("div")
        .style("opacity", 0.65)
        .style("font-size", "12px")
        .text("Kein Scatterplot für kategoriale Variablen.");
      return;
    }

    const margin = { top: 20, right: 20, bottom: 30, left: 50 };
    const width = 260;
    const height = 180;
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const pts = allData
      .map(d => ({ x: +d[xVar], y: +d[yVar] }))
      .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));

    const MAX_POINTS = 1500;

    let plotPts = pts;
    if (pts.length > MAX_POINTS) {
       const step = Math.ceil(pts.length / MAX_POINTS);
       plotPts = pts.filter((_, i) => i % step === 0); // gleichmäßiges Sampling
    }

    if (pts.length === 0) {
      container.append("div")
        .style("opacity", 0.65)
        .style("font-size", "12px")
        .text("Keine numerischen Daten für diesen Scatterplot.");
      return;
    }

    const svg = container.append("svg")
      .attr("width", width)
      .attr("height", height);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
      .domain(d3.extent(pts, p => p.x)).nice()
      .range([0, innerW]);

    const y = d3.scaleLinear()
      .domain(d3.extent(pts, p => p.y)).nice()
      .range([innerH, 0]);

    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(4));

    g.append("g")
      .call(d3.axisLeft(y).ticks(4));

    g.selectAll("circle")
      .data(plotPts)
      .join("circle")
      .attr("r", 1.8)
      .attr("cx", p => x(p.x))
      .attr("cy", p => y(p.y))
      .attr("fill", colors("<=50K"))
      .attr("opacity", 0.18);
  }

  dispatcher.on("corrHover.tooltipScatter", ({ xVar, yVar, mode }) => {
    renderIntoTooltip(xVar, yVar, mode);
  });
}

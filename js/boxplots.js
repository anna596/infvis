export function createBoxplot(data) {
    const fullData = data; 

    // consider only numerical variables
    const numericalVars = [
        {key: "age", label: "Age", get: d => +d.age},
        {key: "education_num", label: "Education Number", get: d => +d.education_num},
        {key: "capital_gain", label: "Capital Gain", get: d => +d.capital_gain},
        {key: "capital_loss", label: "Capital Loss", get: d => +d.capital_loss},
        {key: "hours_per_week", label: "Hours per Week", get: d => +d.hours_per_week},
    ];

    // multiselction tool, start with none selected
    let selectedVars = [];

	function rerender() {
        renderBoxplot(fullData, selectedVars, numericalVars);
	}

    createMultiselection("boxplot-picker", numericalVars, (keys) => {
        selectedVars = keys;
        rerender();
    });

    // intial render
    rerender();

}

// Create Multiselection tool
function createMultiselection(containerId, items, onSelectionChange) {

    // start with none selected
    const selected = new Set();

    const container = d3.select(`#${containerId}`);
    // Clear previous render
	container.selectAll("*").remove();

    const rows = container
        .selectAll("lable")
        .data(items, d => d.key)
        .join("lable")
    ;
    
    // render
    rows.append("input")
        .attr("type","checkbox")
        .property("checked", false) // intitally all checkboxes are unchecked
        .on("change", function(event, d) {
            if (this.checked) selected.add(d.key);
            else selected.delete(d.key);

            onSelectionChange([...selected]); // rerenders;  [...set] convert set to array
        })
    ;

    rows.append("span").text(d => `${d.label}`); // for every <label> in rows add text thats shown

    // intital render, with none selected
    onselectionchange([]);
}

function renderBoxplot(fullData, selectedKeys, numericalVars) {
	const width = 300, height = 260;
	const margins = {top: 8, right: 20, bottom: 50, left: 50};

    const container = d3.select("#boxplot-viz");
	// Clear previous render
	container.selectAll("*").remove();

    // If nothing selcted --> massage
    if (!selectedKeys || selectedKeys.length == 0){
        container.append("div")
            .style("font-size", "10px")
            .text("No variables are selected.");
        return;
    }

    const active = numericalVars.filter(d => selectedKeys.includes(d.key));

    const series = active.map(m => {
        const values = fullData.map(m.get).filter(Number.isFinite);
        return {key: m.key, label: m.label, values};
    }).filter(s => s.values.length > 0);

    if (series.length == 0) {
        container.append("div")
            .style("font-size", "10px")
            .text("No boxplots available for current selection.");
        return;
    }

    // helper fct. for boxplot stats
    function computeBoxStats(values) {
        const v = values.slice().sort(d3.ascending); // slice() to make copy, so original stays in tact
        const q1 = d3.quantile(v, 0.25);
        const med = d3.quantile(v, 0.5);
        const q3 = d3.quantile(v, 0.75);
        const iqr = q3 - q1;

        const loWhisk = q1 - 1.5*iqr;
        const hiWhisk = q3 + 1.5*iqr;

        const inliers = v.filter(x => x >= loWhisk && x <= hiWhisk);
        const lo = d3.min(inliers);
        const hi = d3.max(inliers);

        const outliers = v.filter(x => x < lo || x > hi);

        return {q1, med, q3, lo, hi, outliers};
    }

    series.forEach(s => {s.stats = computeBoxStats(s.values); });

    // --- svg ---

    const svg = container.append("svg")
		.attr("viewBox", [0, 0, width, height])
    ;
    
    const innerW = width - margins.left - margins.right;
    const innerH = height - margins.top - margins.bottom;

	// Scales
	const xScale = d3.scaleBand()
		.domain(series.map(d => d.label)) 
		.range([margins.left, margins.left + innerW])
		.padding(0.3)
    ;

    const allVals = series.flatMap(d => d.values)
	const yScale = d3.scaleLinear()
		.domain(d3.extent(allVals))
        .nice() // natural numbers for domain
		.range([margins.top + innerH, margins.top]);
	
	// axes
    // y-axis
	svg.append("g")
		.attr("transform", `translate(${margins.left},0)`)
		.call(d3.axisLeft(yScale).ticks(5))
    ;

    // y-axis
	svg.append("g")
		.attr("transform", `translate(0,${margins.top + innerH})`)
		.call(d3.axisBottom(xScale))
		.selectAll("text")
		.style("font-size", "10px")
        .attr("transform", "rotate(-20)")
        .style("text-anchor", "end");
    ;

    //plots
    const fmt = d3.format(",");

    const plots = svg.append("g").attr("class", "plots");

    const boxes = plots.selectAll("g.box")
        .data(series, d => d.key)
        .join("g")
        .attr("class", "box")
    ;

    boxes.each(function(d) {
        const g = d3.select(this);

        const bw = xScale.bandwidth();
        const x0 = xScale(d.label);
        const cx = x0 + bw / 2; // center of box

        // colors
        const boxFill = "#5380b6";
        const lineStroke = "#000"; 
        const capW = bw * 0.5; // width of fence caps

        // whiskers (vertical line)
        g.append("line")
        .attr("class", "whiskers")
        .attr("x1", cx).attr("x2", cx)
        .attr("y1", yScale(d.stats.lo))
        .attr("y2", yScale(d.stats.hi))
        .attr("stroke", lineStroke);

        // horizontal line at lo anf hi
        g.append("line")
            .attr("class", "fence-low")
            .attr("x1", cx - capW/2).attr("x2", cx + capW/2)
            .attr("y1", yScale(d.stats.lo))
            .attr("y2", yScale(d.stats.lo))
            .attr("stroke", lineStroke)
        ;

        g.append("line")
            .attr("class", "fence-high")
            .attr("x1", cx - capW/2).attr("x2", cx + capW/2)
            .attr("y1", yScale(d.stats.hi))
            .attr("y2", yScale(d.stats.hi))
            .attr("stroke", lineStroke)
        ;

        // IQR box
        g.append("rect")
            .attr("class", "iqr")
            .attr("x", x0)
            .attr("width", bw)
            .attr("y", yScale(d.stats.q3))
            .attr("height", Math.max(0, yScale(d.stats.q1) - yScale(d.stats.q3)))
            .attr("fill", boxFill)
            .attr("stroke", lineStroke);;

        // median (visible)
        g.append("line")
            .attr("class", "median")
            .attr("x1", x0).attr("x2", x0 + bw)
            .attr("y1", yScale(d.stats.med))
            .attr("y2", yScale(d.stats.med))
            .attr("stroke", lineStroke)
        ;

        // median hover area + title tooltip
        g.append("line")
            .attr("class", "median-hit")
            .attr("x1", x0).attr("x2", x0 + bw)
            .attr("y1", yScale(d.stats.med))
            .attr("y2", yScale(d.stats.med))
            .style("stroke", "transparent")
            .style("stroke-width", 14)
            .style("pointer-events", "stroke")
            .append("title")
            .text(`q1: ${fmt(d.stats.q1)} | median: ${fmt(d.stats.med)} | q3: ${fmt(d.stats.q3)}`);

        // outliers
        g.append("g")
            .attr("class", "outliers")
            .selectAll("circle")
            .data(d.stats.outliers)
            .join("circle")
            .attr("r", 2.5)
            .attr("cx", cx)
            .attr("cy", v => yScale(v))
            .append("title")
            .text(v => `value: ${fmt(v)}`);
  });
}
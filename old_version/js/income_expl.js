// Bar chart visualization
export function createIncomeExploration(data, colors) {
	const fullData = data; 

	const minAge = d3.min(data, d => +d.age);
	const maxAge = d3.max(data, d => +d.age);	

	let filters = {
		age: [minAge, maxAge],
		race: '',
		education: '',
		occupation: '',
		workclass: '',
		marital: '',
		relationship: ''
	};

	// apply current filters to the full dataset
	function applyFilters(fullData) {
  		return fullData.filter(d => {
			const age = +d.age;
			return age >= filters.age[0] && age <= filters.age[1] &&
			(!filters.race || d.race === filters.race) &&
			(!filters.education || d.education === filters.education) &&
			(!filters.occupation || d.occupation === filters.occupation) &&
			(!filters.workclass || d.workclass === filters.workclass) &&
			(!filters.marital || d.marital_status === filters.marital) &&
			(!filters.relationship || d.relationship === filters.relationship);
		});
	}

	function rerender() {
		const filtered = applyFilters(fullData);
		renderBarChart(filtered, colors);
		renderDonut(filtered, colors);

	}

	renderLegend(colors);

	// add age slider
	createAgeSlider('age-slider', minAge, maxAge, (val) => {
		filters.age = val;
		rerender();
	});

	// add dropdown filters
	createDropdown('race-picker', data, 'race', (value) => {
		filters.race = value;
  		rerender();
	});

	createDropdown('education-picker', data, 'education', (value) => {
		filters.education = value;
		rerender();
	});

	createDropdown('occupation-picker', data, 'occupation', (value) => {
		filters.occupation = value;
		rerender();
	});

	createDropdown('workclass-picker', data, 'workclass', (value) => {
		filters.workclass = value;
		rerender();
	});

	createDropdown('relationship-picker', data, 'relationship', (value) => {
		filters.relationship = value;
		rerender();
	});

	createDropdown('marital-picker', data, 'marital_status', (value) => {
		filters.marital_status = value;
		rerender();
	});

	rerender();

}


function createAgeSlider(containerId, minAge, maxAge, onChange) {
	const ageContainer = d3.select(`#${containerId}`);

	// Helper: compute slider track width
	const getSliderPixelWidth = () => {
		const cw = ageContainer.node().clientWidth;
		return cw - 35; // 35px total for padding + translate offset
	};

	// Create the slider instance
	const sliderRange = d3
		.sliderBottom()
		.min(minAge)
		.max(maxAge)
		.default([minAge, maxAge])
		.fill("#b1d9f6")
		.width(getSliderPixelWidth());
		
	// Render slider SVG
	function renderSlider() {
		sliderRange.width(getSliderPixelWidth()).ticks(3);

		const svg = ageContainer.select('svg');
		if (svg.empty()) {
			// Initial render
			ageContainer.append('svg')
				.attr('width', '100%') // CSS controls width via container clamp
				.attr('height', 70)
				.append('g')
				.attr('transform', 'translate(10,10)')
				.call(sliderRange);
		} else {
			// Update on resize
			ageContainer.select('g').call(sliderRange);
		}
  }

  // Initial render
  renderSlider();

  // Responsive: re-render on window resize
  window.addEventListener('resize', renderSlider);

  // change callback
  sliderRange.on('onchange', (val) => {
    onChange(val);
  });
}

// Render legend for income categories
function renderLegend(colors) {
  const panel = d3.select('.viz-panel');
  if (panel.empty()) return;

  // Clear any existing legend 
  panel.selectAll('.legend').remove();

  const legend = panel.append('div').attr('class', 'legend');

  ["<=50K", ">50K"].forEach(key => {
    const item = legend.append('div').attr('class', 'legend-item');
    item.append('span')
      .attr('class', 'legend-swatch')
      .style('background-color', colors(key));
    item.append('span').text(key);
  });
}

// Create a dropdown filter
function createDropdown(containerId, dataArray, fieldName, onFilterChange) {
  // Get unique values from the field
  const uniqueValues = [...new Set(dataArray.map(d => d[fieldName]))].filter(v => v && v.trim());
  
  // Create options: " " + unique values
  const options = [
    { value: '', text: ` ` },
    ...uniqueValues.map(v => ({ value: v, text: v }))
  ];

  // Render dropdown
  const menu = d3.select(`#${containerId}`)
    .append('select')
    .on('change', function(event) {
      onFilterChange(this.value);
    });

  // fill out the options
  menu
    .selectAll('option')
    .data(options)
    .join('option')
    .attr('value', d => d.value)
    .text(d => d.text);
}

function renderBarChart(filtered, colors) {
	const width = 300, height = 260;
	const margins = {top: 8, right: 20, bottom: 50, left: 40};

	// Recompute grouped/percentages from the filtered subset
	const grouped = d3.rollup(filtered, v => v.length, d => d.sex, d => d.income);

	// Calculate percentages for each sex
	const chartData = [];
	grouped.forEach((incomeMap, sex) => {
		const total = d3.sum(incomeMap.values());
		const low = (incomeMap.get("<=50K") || 0) / total * 100;
		const high = (incomeMap.get(">50K") || 0) / total * 100;
		chartData.push({sex: sex, "<=50K": low, ">50K": high});
	});

	const container = d3.select("#income-expl-viz");
	
	// Clear previous render
	container.selectAll("*").remove();
	
	const svg = container.append("svg")
		.attr("viewBox", [0, 0, width, height]);
	
	// Scales
	const xScale = d3.scaleBand()
		.domain(chartData.map(d => d.sex)) 
		.range([margins.left, width - margins.right])
		.padding(0.3);

	const yScale = d3.scaleLinear()
		.domain([0, 100])
		.range([height - margins.bottom, margins.top]);
	
	// Draw stacked bars
	svg.append("g")
		.selectAll("g")
		.data(d3.stack().keys(["<=50K", ">50K"])(chartData))
		.join("g")
		.attr("fill", d => colors(d.key))
		.selectAll("rect")
		.data(d => d)
		.join("rect")
		.attr("x", d => xScale(d.data.sex))
		.attr("y", d => yScale(d[1]))
		.attr("height", d => yScale(d[0]) - yScale(d[1]))
		.attr("width", xScale.bandwidth())
		.append('title')
		.text((d) => {
			const percentage = (d[1] - d[0]).toFixed(1);
			
			// Find which key this belongs to based on the data values
			const key = d.data["<=50K"] === (d[1] - d[0]) ? "<=50K" : ">50K";
			return `${key}: ${percentage}%`;
		});

	svg.append("g")
		.attr("transform", `translate(${margins.left},0)`)
		.call(d3.axisLeft(yScale).ticks(5).tickFormat(d => d + "%"));

	svg.append("g")
		.attr("transform", `translate(0,${height - margins.bottom})`)
		.call(d3.axisBottom(xScale))
		.selectAll("text")
		.style("font-size", "10px")
		.style("max-width", `${width}px`)
		.style("max-height", `${height}px`);
}


function renderDonut (data, colors) {
	console.log("Rendering donut chart with data:", data);
	const incomeCounts = d3.rollup(data, v => v.length, d => d.income);
	const donutData = ["<=50K", ">50K"].map(k => ({
		key: k, value: incomeCounts.get(k) || 0
	}));


	const height = 200;
	const width = 200;
	const radius = Math.min(width, height) / 2;

	const arc = d3.arc()
		.innerRadius(radius * 0.5)
		.outerRadius(radius - 1);

	const pie = d3.pie()
		.padAngle(1 / radius)
		.sort(null)
		.value(d => d.value);

	const container = d3.select("#donut-chart");
 	container.selectAll("*").remove();

	const svg = container.append("svg")
		.attr("width", width)
		.attr("height", height)
		.attr("viewBox", [-width / 2, -height / 2, width, height])
		.style("display", "block")
  		.style("margin", "0 auto") // centers the SVG
		.style("max-width", `${width}px`); 
		
	const total = d3.sum(donutData, d => d.value);

	svg.append("g")
		.selectAll("path")
		.data(pie(donutData))
		.join("path")
		.attr("fill", d => colors(d.data.key))
		.attr("d", arc)
		.append("title")
		.text(d => `${d.data.key}: ${((d.value / total) * 100).toFixed(1)}%`);
}




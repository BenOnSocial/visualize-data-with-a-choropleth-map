const us = await d3.json(
  'https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/counties.json'
);
const education = await d3.json(
  'https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/for_user_education.json'
);
const bachelorMin = d3.min(education, (d) => d.bachelorsOrHigher);
const bachelorMax = d3.max(education, (d) => d.bachelorsOrHigher);

const svgDim = { margin: 50, width: 1024, height: 768 };
const elements = {};

elements.svg = d3
  .select('body')
  .append('svg')
  .attr('width', svgDim.width + svgDim.margin)
  .attr('height', svgDim.height + 2 * svgDim.margin);

const color = createColorScale();
createTooltip();
createMap();
createLegend();

// Ensure tooltip is stacked on top
elements.tooltip.raise();

function createColorScale() {
  return d3
    .scaleSequential()
    .domain([bachelorMin, bachelorMax])
    .interpolator(d3.interpolateYlGnBu);
}

function createLegend() {
  const defs = elements.svg.append('defs');
  const legendDim = { width: 300, height: 20 };
  const numRects = 4;
  const rectWidth = legendDim.width / numRects;
  const legend = elements.svg.append('g').attr('id', 'legend');
  const gradients = [];

  for (let i = 1; i <= numRects; i++) {
    gradients.push(
      defs
        .append('linearGradient')
        .attr('id', `gradient${i}`)
        .attr('x1', '0%')
        .attr('x2', '100%')
    );
  }

  gradients.forEach((gradient, i) => {
    gradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', color(i * 25));
    gradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', color((i + 1) * 25));
  });

  for (let i = 0; i < numRects; i++) {
    legend
      .append('rect')
      .attr('x', svgDim.width - legendDim.width + i * rectWidth)
      .attr('y', 25)
      .attr('width', rectWidth)
      .attr('height', legendDim.height)
      .style('fill', `url(#gradient${i + 1})`);
  }

  const xLegend = d3
    .scaleLinear()
    .domain([bachelorMin, bachelorMax])
    .range([0, legendDim.width])
    .nice();
  const axisLegend = d3
    .axisBottom(xLegend)
    .ticks(8)
    .tickFormat((d) => `${Math.round(d)}%`);
  legend
    .append('g')
    .attr(
      'transform',
      `translate(${svgDim.width - legendDim.width}, ${legendDim.height + 25})`
    )
    .call(axisLegend);
}

function createTooltip() {
  elements.tooltip = elements.svg
    .append('g')
    .attr('id', 'tooltip')
    .attr('class', 'tooltip')
    .style('display', 'none');
  elements.tooltipRect = elements.tooltip
    .append('rect')
    .attr('width', 120)
    .attr('height', 50)
    .attr('fill', 'white')
    .attr('stroke', 'lightgray')
    .attr('rx', 5)
    .attr('ry', 5);
  elements.tooltipText = elements.tooltip
    .append('text')
    .attr('x', 10)
    .attr('y', 20)
    .attr('dy', '.35em')
    .style('font-size', '.8em');
}

function createMap() {
  const dataGroup = elements.svg
    .append('g')
    .attr('transform', `translate(${svgDim.margin}, ${svgDim.margin})`);

  // Configure pan and zoom
  d3.zoom().on('zoom', function () {
    dataGroup.attr('transform', d3.zoomTransform(this));
  })(elements.svg);

  const projection = d3
    .geoMercator()
    .scale(500)
    .translate([svgDim.width, svgDim.height / 4]);

  const path = d3.geoPath();

  dataGroup
    .append('g')
    .attr('class', 'counties')
    .selectAll('path')
    .data(topojson.feature(us, us.objects.counties).features)
    .enter()
    .append('path')
    .attr('class', 'county')
    .attr('data-fips', (d) => d.id)
    .attr('data-education', (d) => {
      const result = education.filter((obj) => obj.fips === d.id);
      return result[0] ? result[0].bachelorsOrHigher : 0;
    })
    .attr('fill', (d) => {
      const result = education.filter((obj) => obj.fips === d.id);
      return result[0]
        ? color(result[0].bachelorsOrHigher)
        : color(bachelorMin);
    })
    .attr('d', path)
    .on('mouseover', (event, d) => {
      const result = education.filter((obj) => obj.fips === d.id);
      if (result[0]) {
        elements.tooltip
          .style('display', null)
          .attr('data-education', result[0].bachelorsOrHigher);
        const [x, y] = d3.pointer(event);
        elements.tooltip.attr('transform', `translate(${x + 10}, ${y - 10})`);
        elements.tooltipText.text(
          `${result[0].area_name}, ${result[0].state}: ${result[0].bachelorsOrHigher}%`
        );
        const bbox = elements.tooltipText.node().getBBox();
        elements.tooltipRect
          .attr('width', bbox.width + 20)
          .attr('height', bbox.height + 20);
      }
    })
    .on('mouseout', () => {
      elements.tooltip.style('display', 'none');
    });
}

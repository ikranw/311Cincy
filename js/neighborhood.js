let neighborhoodChart;

class NeighborhoodChart {
  constructor(_config, _data) {
    this.config = {
      parentElement: _config.parentElement,
      margin: { top: 8, right: 24, bottom: 40, left: 130 },
      height: 300
    };
    this.data = _data;
    this.selectedNeighborhoods = new Set();
    this.initVis();
  }

  initVis() {
    const vis = this;
    vis.container = document.querySelector(vis.config.parentElement);

    if (!vis.container) return;

    vis.width = vis.container.clientWidth || 500;
    vis.height = vis.config.height;
    vis.innerWidth =
      vis.width - vis.config.margin.left - vis.config.margin.right;
    vis.innerHeight =
      vis.height - vis.config.margin.top - vis.config.margin.bottom;

    vis.svg = d3.select(vis.config.parentElement)
      .append("svg")
      .attr("width", vis.width)
      .attr("height", vis.height);

    vis.chart = vis.svg.append("g")
      .attr(
        "transform",
        `translate(${vis.config.margin.left},${vis.config.margin.top})`
      );

    vis.xAxisGroup = vis.chart.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${vis.innerHeight})`);

    vis.yAxisGroup = vis.chart.append("g")
      .attr("class", "y-axis");

    vis.xAxisLabel = vis.chart.append("text")
      .attr("class", "axis-label")
      .attr("x", vis.innerWidth / 2)
      .attr("y", vis.innerHeight + 32)
      .attr("text-anchor", "middle")
      .text("# of Requests");

    vis.yAxisLabel = vis.chart.append("text")
      .attr("class", "axis-label")
      .attr("transform", "rotate(-90)")
      .attr("x", -(vis.innerHeight / 2))
      .attr("y", -120)
      .attr("text-anchor", "middle")
      .text("Neighborhoods");

    vis.tooltip = d3.select("#tooltip");

    vis.updateVis();
  }

  updateData(newData, selectedNeighborhoods = new Set()) {
    this.data = newData;
    this.selectedNeighborhoods = new Set(selectedNeighborhoods);
    this.updateVis();
  }

  updateVis() {
    const vis = this;

    if (!vis.container) return;

    vis.chartData = d3.rollups(
      vis.data.filter((d) => d.NEIGHBORHOOD && d.NEIGHBORHOOD.trim() !== ""),
      (values) => values.length,
      (d) => d.NEIGHBORHOOD.trim()
    )
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => d3.descending(a.count, b.count))
      .slice(0, 11);

    vis.chart.selectAll(".empty-state").remove();

    
    vis.xScale = d3.scaleLinear()
      .domain([0, d3.max(vis.chartData, (d) => d.count)])
      .nice()
      .range([0, vis.innerWidth]);

    vis.yScale = d3.scaleBand()
      .domain(vis.chartData.map((d) => d.name))
      .range([0, vis.innerHeight])
      .padding(0.2);

    vis.xAxisGroup.call(
      d3.axisBottom(vis.xScale).ticks(5).tickFormat(d3.format("d"))
    );

    vis.yAxisGroup.call(d3.axisLeft(vis.yScale));

    vis.xAxisLabel.attr("x", vis.innerWidth / 2);
    vis.yAxisLabel.attr("x", -(vis.innerHeight / 2));

    vis.bars = vis.chart.selectAll(".neighborhood-bar")
      .data(vis.chartData, (d) => d.name)
      .join("rect")
      .attr("class", "neighborhood-bar")
      .attr("x", 0)
      .attr("y", (d) => vis.yScale(d.name))
      .attr("width", (d) => vis.xScale(d.count))
      .attr("height", vis.yScale.bandwidth())
      .attr("fill", (d) =>
        vis.selectedNeighborhoods.size === 0 || vis.selectedNeighborhoods.has(d.name)
          ? "#6b93c4"
          : "#e6edf5"
      )
      .attr("opacity", (d) =>
        vis.selectedNeighborhoods.size === 0 || vis.selectedNeighborhoods.has(d.name)
          ? 1
          : 0.5
      )
      .on("mouseover", (event, d) => {
        vis.tooltip
          .style("opacity", 1)
          .html(`${d.name}<br><strong>${d.count}</strong> requests`);
      })
      .on("mousemove", (event) => {
        vis.tooltip
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY + 10}px`);
      })
      .on("mouseleave", () => {
        vis.tooltip.style("opacity", 0);
      })
      .on("click", (event, d) => {
        document.dispatchEvent(
          new CustomEvent("chartselectionchange", {
            detail: { chart: "neighborhood", value: d.name },
          })
        );
      });

    vis.chart.selectAll(".neighborhood-value")
      .data(vis.chartData, (d) => d.name)
      .join("text")
      .attr("class", "neighborhood-value")
      .attr("x", (d) => vis.xScale(d.count) + 6)
      .attr("y", (d) => vis.yScale(d.name) + vis.yScale.bandwidth() / 2)
      .attr("dy", "0.35em")
      .text((d) => d.count);
  }
}

function initNeighborhoodChart(data, selectedNeighborhoods = new Set()) {
  d3.select("#neighborhood-container").selectAll("*").remove();
  neighborhoodChart = new NeighborhoodChart(
    { parentElement: "#neighborhood-container" },
    data
  );
  neighborhoodChart.updateData(data, selectedNeighborhoods);
}

function updateNeighborhoodChart(data, selectedNeighborhoods = new Set()) {
  if (!neighborhoodChart) {
    initNeighborhoodChart(data, selectedNeighborhoods);
    return;
  }

  neighborhoodChart.updateData(data, selectedNeighborhoods);
}

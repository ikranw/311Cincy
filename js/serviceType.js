let serviceTypeChart;

class ServiceTypeChart {
  constructor(_config, _data) {
    this.config = {
      parentElement: _config.parentElement,
      margin: { top: 12, right: 24, bottom: 42, left: 180 },
      height: 280
    };
    this.data = _data;
    this.selectedServiceTypes = new Set();
    this.initVis();
  }

  initVis() {
    const vis = this;
    vis.container = document.querySelector(vis.config.parentElement);
    if (!vis.container) return;
    vis.width = vis.container.clientWidth || 500;
    vis.height = vis.config.height;
    vis.innerWidth = vis.width - vis.config.margin.left - vis.config.margin.right;
    vis.innerHeight = vis.config.height - vis.config.margin.top - vis.config.margin.bottom;

    vis.svg = d3.select(vis.config.parentElement)
      .append("svg")
      .attr("width", vis.width)
      .attr("height", vis.height);

    vis.chart = vis.svg.append("g")
      .attr("transform", `translate(${vis.config.margin.left},${vis.config.margin.top})`);

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
      .attr("y", -160)
      .attr("text-anchor", "middle")
      .text("Service Type");

    vis.tooltip = d3.select("#tooltip");
    vis.updateVis();
  }

  updateData(newData, selectedServiceTypes = new Set()) {
    this.data = newData;
    this.selectedServiceTypes = new Set(selectedServiceTypes);
    this.updateVis();
  }

  updateVis() {
    const vis = this;
    if (!vis.container) return

    vis.chartData = d3.rollups(
      vis.data.filter((d) => d.serviceTypeLabel && d.serviceTypeLabel.trim() !== ""),
      (values) => values.length,
      (d) => d.serviceTypeLabel.trim()
    )
      .map(([serviceType, count]) => ({ serviceType, count }))
      .sort((a, b) => d3.descending(a.count, b.count));

    vis.chart.selectAll(".empty-state").remove();

    vis.xScale = d3.scaleLinear()
      .domain([0, d3.max(vis.chartData, (d) => d.count) || 1])
      .nice()
      .range([0, vis.innerWidth]);

    vis.yScale = d3.scaleBand()
      .domain(vis.chartData.map((d) => d.serviceType))
      .range([0, vis.innerHeight])
      .padding(0.2);

    vis.xAxisGroup.call(
      d3.axisBottom(vis.xScale).ticks(5).tickFormat(d3.format("d"))
    );
    vis.yAxisGroup.call(d3.axisLeft(vis.yScale));

    // Remove old bars
    vis.chart.selectAll(".service-type-bar").remove();
    vis.chart.selectAll(".service-type-value").remove();

    if (vis.chartData.length === 0) {
      vis.chart.append("text")
        .attr("class", "empty-state")
        .attr("x", vis.innerWidth / 2)
        .attr("y", vis.innerHeight / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "#666")
        .text("No service type data available.");
      return;
    }

    // Draw bars
    vis.chart.selectAll(".service-type-bar")
      .data(vis.chartData, (d) => d.serviceType)
      .enter()
      .append("rect")
      .attr("class", "service-type-bar")
      .attr("x", 0)
      .attr("y", (d) => vis.yScale(d.serviceType))
      .attr("width", (d) => vis.xScale(d.count))
      .attr("height", vis.yScale.bandwidth())
      .attr("fill", (d) =>
        vis.selectedServiceTypes.size === 0 || vis.selectedServiceTypes.has(d.serviceType)
          ? "#59a14f"
          : "#dcebd9"
      )
      .attr("opacity", (d) =>
        vis.selectedServiceTypes.size === 0 || vis.selectedServiceTypes.has(d.serviceType)
          ? 1
          : 0.45
      )
      .on("mouseover", function (event, d) {
        d3.select(this).attr("fill", "#27632a");
        vis.tooltip
          .style("opacity", 1)
          .html(`<strong>Service Type:</strong> ${d.serviceType}<br><strong>Requests:</strong> ${d.count}`)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mousemove", (event) => {
        vis.tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", function () {
        d3.select(this).attr("fill", (d) =>
          vis.selectedServiceTypes.size === 0 || vis.selectedServiceTypes.has(d.serviceType)
            ? "#59a14f"
            : "#dcebd9"
        );
        vis.tooltip.style("opacity", 0);
      })
      .on("click", (event, d) => {
        document.dispatchEvent(
          new CustomEvent("chartselectionchange", {
            detail: { chart: "serviceType", value: d.serviceType },
          })
        );
      });

    // Draw values
    vis.chart.selectAll(".service-type-value")
      .data(vis.chartData, (d) => d.serviceType)
      .enter()
      .append("text")
      .attr("class", "service-type-value")
      .attr("x", (d) => vis.xScale(d.count) + 6)
      .attr("y", (d) => vis.yScale(d.serviceType) + vis.yScale.bandwidth() / 2 + 4)
      .attr("fill", "#333")
      .attr("opacity", (d) =>
        vis.selectedServiceTypes.size === 0 || vis.selectedServiceTypes.has(d.serviceType)
          ? 1
          : 0.45
      )
      .text((d) => d.count);
  }
}

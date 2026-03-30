let departmentChart;

class DepartmentChart {
  constructor(_config, _data) {
    this.config = {
      parentElement: _config.parentElement,
      margin: { top: 12, right: 24, bottom: 42, left: 160 },
      height: 280
    };
    this.data = _data;
    this.selectedDepartments = new Set();
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
      .text("Number of Requests");

    vis.yAxisLabel = vis.chart.append("text")
      .attr("class", "axis-label")
      .attr("transform", "rotate(-90)")
      .attr("x", -(vis.innerHeight / 2))
      .attr("y", -140)
      .attr("text-anchor", "middle")
      .text("Service Department");

    vis.tooltip = d3.select("#tooltip");

    vis.updateVis();
  }

  updateData(newData, selectedDepartments = new Set()) {
    this.data = newData;
    this.selectedDepartments = new Set(selectedDepartments);
    this.updateVis();
  }

  updateVis() {
    const vis = this;

    if (!vis.container) return;

    vis.chartData = d3.rollups(
      vis.data.filter((d) => d.DEPT_NAME && d.DEPT_NAME.trim() !== ""),
      (values) => values.length,
      (d) => d.DEPT_NAME.trim()
    )
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => d3.descending(a.count, b.count))
      .slice(0, 10);

    vis.chart.selectAll(".empty-state").remove();

    if (vis.chartData.length === 0) {
      vis.chart.selectAll(".department-stick").remove();
      vis.chart.selectAll(".department-dot").remove();
      vis.chart.selectAll(".department-value").remove();
      vis.xAxisGroup.call(d3.axisBottom(d3.scaleLinear().domain([0, 1]).range([0, vis.innerWidth])));
      vis.yAxisGroup.call(d3.axisLeft(d3.scaleBand().domain([]).range([0, vis.innerHeight])));

      vis.chart.append("text")
        .attr("class", "empty-state")
        .attr("x", vis.innerWidth / 2)
        .attr("y", vis.innerHeight / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "#666")
        .text("No department data available.");
      return;
    }

    vis.xScale = d3.scaleLinear()
      .domain([0, d3.max(vis.chartData, (d) => d.count)])
      .nice()
      .range([0, vis.innerWidth]);

    vis.yScale = d3.scaleBand()
      .domain(vis.chartData.map((d) => d.department))
      .range([0, vis.innerHeight])
      .padding(0.55);

    vis.xAxisGroup.call(
      d3.axisBottom(vis.xScale).ticks(5).tickFormat(d3.format("d"))
    );

    vis.yAxisGroup.call(d3.axisLeft(vis.yScale));
    vis.xAxisLabel.attr("x", vis.innerWidth / 2);
    vis.yAxisLabel.attr("x", -(vis.innerHeight / 2));

    vis.chart.selectAll(".department-stick")
      .data(vis.chartData, (d) => d.department)
      .join("line")
      .attr("class", "department-stick")
      .attr("x1", 0)
      .attr("x2", (d) => vis.xScale(d.count))
      .attr("y1", (d) => vis.yScale(d.department) + vis.yScale.bandwidth() / 2)
      .attr("y2", (d) => vis.yScale(d.department) + vis.yScale.bandwidth() / 2)
      .attr("stroke", (d) =>
        vis.selectedDepartments.size === 0 || vis.selectedDepartments.has(d.department)
          ? "#a8c4e0"
          : "#d9e2ec"
      )
      .attr("stroke-width", 3)
      .on("click", (event, d) => {
        document.dispatchEvent(
          new CustomEvent("chartselectionchange", {
            detail: { chart: "department", value: d.department },
          })
        );
      });

    vis.chart.selectAll(".department-dot")
      .data(vis.chartData, (d) => d.department)
      .join("circle")
      .attr("class", "department-dot")
      .attr("cx", (d) => vis.xScale(d.count))
      .attr("cy", (d) => vis.yScale(d.department) + vis.yScale.bandwidth() / 2)
      .attr("r", 7)
      .attr("fill", (d) =>
        vis.selectedDepartments.size === 0 || vis.selectedDepartments.has(d.department)
          ? "#3a6ea8"
          : "#cfd8e3"
      )
      .on("mouseover", (event, d) => {
        vis.tooltip
          .style("opacity", 1)
          .html(`${d.department}<br><strong>${d.count}</strong> requests`);
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
            detail: { chart: "department", value: d.department },
          })
        );
      });

    vis.chart.selectAll(".department-value")
      .data(vis.chartData, (d) => d.department)
      .join("text")
      .attr("class", "department-value")
      .attr("x", (d) => vis.xScale(d.count) + 10)
      .attr("y", (d) => vis.yScale(d.department) + vis.yScale.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("fill", "#333")
      .attr("font-size", 11)
      .attr("opacity", (d) =>
        vis.selectedDepartments.size === 0 || vis.selectedDepartments.has(d.department)
          ? 1
          : 0.45
      )
      .text((d) => d.count);
  }
}

function initDepartmentChart(data, selectedDepartments = new Set()) {
  d3.select("#department-container").selectAll("*").remove();
  departmentChart = new DepartmentChart(
    { parentElement: "#department-container" },
    data
  );
  departmentChart.updateData(data, selectedDepartments);
}

function updateDepartmentChart(data, selectedDepartments = new Set()) {
  if (!departmentChart) {
    initDepartmentChart(data, selectedDepartments);
    return;
  }

  departmentChart.updateData(data, selectedDepartments);
}

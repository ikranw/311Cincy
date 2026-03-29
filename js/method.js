let methodChart;

class MethodChart {
  constructor(_config, _data) {
    this.config = {
      parentElement: _config.parentElement,
      margin: { top: 12, right: 12, bottom: 12, left: 12 },
      width: 360,
      height: 240
    };
    this.data = _data;
    this.initVis();
  }

  initVis() {
    const vis = this;
    vis.container = document.querySelector(vis.config.parentElement);

    if (!vis.container) return;

    vis.width = vis.container.clientWidth || vis.config.width;
    vis.height = vis.config.height;
    vis.radius = Math.min(vis.width, vis.height) / 2 - 20;

    vis.svg = d3.select(vis.config.parentElement)
      .append("svg")
      .attr("width", vis.width)
      .attr("height", vis.height);

    vis.chart = vis.svg.append("g")
      .attr("transform", `translate(${vis.width / 2},${vis.height / 2})`);

    vis.colorScale = d3.scaleOrdinal(d3.schemeTableau10);
    vis.pie = d3.pie().value((d) => d.count).sort(null);
    vis.arc = d3.arc().innerRadius(vis.radius * 0.45).outerRadius(vis.radius);
    vis.outerArc = d3.arc().innerRadius(vis.radius * 1.05).outerRadius(vis.radius * 1.05);
    vis.tooltip = d3.select("#tooltip");

    vis.updateVis();
  }

  updateData(newData) {
    this.data = newData;
    this.updateVis();
  }

  updateVis() {
    const vis = this;

    if (!vis.container) return;

    vis.chartData = d3.rollups(
      vis.data.filter((d) => d.METHOD_RECEIVED && d.METHOD_RECEIVED.trim() !== ""),
      (values) => values.length,
      (d) => d.METHOD_RECEIVED.trim()
    )
      .map(([method, count]) => ({ method, count }))
      .sort((a, b) => d3.descending(a.count, b.count));

    vis.chart.selectAll(".empty-state").remove();

    if (vis.chartData.length === 0) {
      vis.chart.selectAll(".method-slice").remove();
      vis.chart.selectAll(".method-label").remove();
      vis.chart.selectAll(".method-line").remove();
      vis.chart.append("text")
        .attr("class", "empty-state")
        .attr("text-anchor", "middle")
        .attr("fill", "#666")
        .text("No method data available.");
      return;
    }

    const pieData = vis.pie(vis.chartData);
    vis.colorScale.domain(vis.chartData.map((d) => d.method));

    vis.chart.selectAll(".method-slice")
      .data(pieData, (d) => d.data.method)
      .join("path")
      .attr("class", "method-slice")
      .attr("d", vis.arc)
      .attr("fill", (d) => vis.colorScale(d.data.method))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .on("mouseover", (event, d) => {
        vis.tooltip
          .style("opacity", 1)
          .html(
            `${d.data.method}<br><strong>${d.data.count}</strong> requests`
          );
      })
      .on("mousemove", (event) => {
        vis.tooltip
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY + 10}px`);
      })
      .on("mouseleave", () => {
        vis.tooltip.style("opacity", 0);
      });

    vis.chart.selectAll(".method-line")
      .data(pieData, (d) => d.data.method)
      .join("polyline")
      .attr("class", "method-line")
      .attr("fill", "none")
      .attr("stroke", "#999")
      .attr("stroke-width", 1.25)
      .attr("points", (d) => {
        const arcPoint = vis.arc.centroid(d);
        const outerPoint = vis.outerArc.centroid(d);
        const labelPoint = vis.outerArc.centroid(d);
        const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
        labelPoint[0] = vis.radius * 1.22 * (midAngle < Math.PI ? 1 : -1);
        return [arcPoint, outerPoint, labelPoint];
      });

    vis.chart.selectAll(".method-label")
      .data(pieData, (d) => d.data.method)
      .join("text")
      .attr("class", "method-label")
      .attr("transform", (d) => {
        const pos = vis.outerArc.centroid(d);
        const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
        pos[0] = vis.radius * 1.28 * (midAngle < Math.PI ? 1 : -1);
        return `translate(${pos})`;
      })
      .attr("text-anchor", (d) => {
        const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
        return midAngle < Math.PI ? "start" : "end";
      })
      .attr("dy", "0.35em")
      .attr("fill", "#555")
      .attr("font-size", 10)
      .attr("font-weight", 500)
      .text((d) => d.data.method);
  }
}

function initMethodChart(data) {
  d3.select("#method-container").selectAll("*").remove();
  methodChart = new MethodChart(
    { parentElement: "#method-container" },
    data
  );
}

function updateMethodChart(data) {
  if (!methodChart) {
    initMethodChart(data);
    return;
  }

  methodChart.updateData(data);
}

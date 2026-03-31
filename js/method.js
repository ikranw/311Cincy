let methodChart;

class MethodChart {
  constructor(_config, _data) {
    this.config = {
      parentElement: _config.parentElement,
      margin: { top: 12, right: 12, bottom: 12, left: 12 },
      width: 560,
      height: 210
    };
    this.data = _data;
    this.selectedMethods = new Set();
    this.initVis();
  }

  getDisplayMethodLabel(method) {
    return method === "CUSTOMER SERVICE RESPONSE"
      ? "CUSTOMER SERVICE"
      : method;
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

  updateData(newData, selectedMethods = new Set()) {
    this.data = newData;
    this.selectedMethods = new Set(selectedMethods);
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

    function toggleMethodSelection(method) {
      if (vis.selectedMethods.has(method)) {
        vis.selectedMethods.delete(method);
      } else {
        vis.selectedMethods.add(method);
      }

      vis.updateVis();
      document.dispatchEvent(
        new CustomEvent("chartselectionchange", {
          detail: { chart: "method", value: method },
        })
      );
    }

    const pieData = vis.pie(vis.chartData);
    vis.colorScale.domain(vis.chartData.map((d) => d.method));

    const minLabelY = -vis.radius * 0.95;
    const maxLabelY = vis.radius * 0.95;

    const labelData = pieData.map((d) => {
      const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
      const side = midAngle < Math.PI ? "right" : "left";
      const outerPoint = vis.outerArc.centroid(d);

      return {
        ...d,
        side,
        labelX: vis.radius * (side === "right" ? 1.45 : -1.45),
        labelY: outerPoint[1],
      };
    });

    function spreadLabelPositions(items) {
      if (items.length === 0) return;

      items.sort((a, b) => a.labelY - b.labelY);

      if (items.length === 1) {
        items[0].labelY = Math.max(minLabelY, Math.min(maxLabelY, items[0].labelY));
        return;
      }

      const step = (maxLabelY - minLabelY) / (items.length - 1);
      items.forEach((item, index) => {
        item.labelY = minLabelY + index * step;
      });
    }

    spreadLabelPositions(labelData.filter((d) => d.side === "left"));
    spreadLabelPositions(labelData.filter((d) => d.side === "right"));

    vis.chart.selectAll(".method-slice")
      .data(labelData, (d) => d.data.method)
      .join("path")
      .attr("class", "method-slice")
      .attr("d", vis.arc)
      .attr("fill", (d) => vis.colorScale(d.data.method))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .attr("opacity", (d) =>
        vis.selectedMethods.size === 0 || vis.selectedMethods.has(d.data.method)
          ? 1
          : 0.35
      )
      .on("mouseover", (event, d) => {
        vis.tooltip
          .style("opacity", 1)
          .html(
            `${vis.getDisplayMethodLabel(d.data.method)}<br><strong>${d.data.count}</strong> requests`
          );
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
        toggleMethodSelection(d.data.method);
      });

    vis.chart.selectAll(".method-line")
      .data(labelData, (d) => d.data.method)
      .join("polyline")
      .attr("class", "method-line")
      .attr("fill", "none")
      .attr("stroke", "#999")
      .attr("stroke-width", 1.25)
      .attr("opacity", (d) =>
        vis.selectedMethods.size === 0 || vis.selectedMethods.has(d.data.method)
          ? 1
          : 0.35
      )
      .attr("points", (d) => {
        const arcPoint = vis.arc.centroid(d);
        const outerPoint = vis.outerArc.centroid(d);
        const labelPoint = [
          d.labelX + (d.side === "right" ? -10 : 10),
          d.labelY,
        ];
        return [arcPoint, outerPoint, labelPoint];
      });

    vis.chart.selectAll(".method-label")
      .data(labelData, (d) => d.data.method)
      .join("text")
      .attr("class", "method-label")
      .attr("transform", (d) => {
        return `translate(${d.labelX},${d.labelY})`;
      })
      .attr("text-anchor", (d) => d.side === "right" ? "start" : "end")
      .attr("dy", "0.35em")
      .attr("fill", "#555")
      .attr("font-size", 10)
      .attr("font-weight", 500)
      .style("cursor", "pointer")
      .attr("opacity", (d) =>
        vis.selectedMethods.size === 0 || vis.selectedMethods.has(d.data.method)
          ? 1
          : 0.45
      )
      .text((d) => vis.getDisplayMethodLabel(d.data.method))
      .on("click", (event, d) => {
        toggleMethodSelection(d.data.method);
      });
  }
}

function initMethodChart(data, selectedMethods = new Set()) {
  d3.select("#method-container").selectAll("*").remove();
  methodChart = new MethodChart(
    { parentElement: "#method-container" },
    data
  );
  methodChart.updateData(data, selectedMethods);
}

function updateMethodChart(data, selectedMethods = new Set()) {
  if (!methodChart) {
    initMethodChart(data, selectedMethods);
    return;
  }

  methodChart.updateData(data, selectedMethods);
}

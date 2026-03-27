const TL = {
  margin: { top: 36, right: 30, bottom: 52, left: 52 },
  height: 230
};

const parseDate = d3.timeParse("%Y %b %d %I:%M:%S %p");

function initTimeline(rawData) {
  const data = rawData
    .map(d => ({ ...d, date: parseDate(d.DATE_CREATED) }))
    .filter(d => d.date !== null);
  drawTimeline(data);
}

function drawTimeline(data) {
  const [minDate, maxDate] = d3.extent(data, d => d.date);

  const bins = d3.timeWeek.range(
    d3.timeWeek.floor(minDate),
    d3.timeWeek.ceil(maxDate)
  ).map(weekStart => {
    const weekEnd = d3.timeWeek.offset(weekStart, 1);
    const count = data.filter(d => d.date >= weekStart && d.date < weekEnd).length;
    return { week: weekStart, count };
  });

  const container = document.getElementById("timeline-container");
  const totalWidth  = container.clientWidth || 960;
  const innerWidth  = totalWidth  - TL.margin.left - TL.margin.right;
  const innerHeight = TL.height   - TL.margin.top  - TL.margin.bottom;

  const svg = d3.select("#timeline-container")
    .append("svg")
      .attr("width",  totalWidth)
      .attr("height", TL.height)
    .append("g")
      .attr("transform", `translate(${TL.margin.left},${TL.margin.top})`);

  const xScale = d3.scaleTime()
    .domain([bins[0].week, d3.timeWeek.offset(bins[bins.length - 1].week, 1)])
    .range([0, innerWidth]);

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(bins, d => d.count)])
    .nice()
    .range([innerHeight, 0]);

  svg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale).ticks(d3.timeMonth.every(1)).tickFormat(d3.timeFormat("%b")));

  svg.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(yScale).ticks(5));

  svg.append("text")
    .attr("class", "axis-label")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 44)
    .attr("text-anchor", "middle")
    .text("Week (2025)");

  svg.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -(innerHeight / 2))
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .text("# of Requests");

  svg.append("text")
    .attr("class", "chart-title")
    .attr("x", innerWidth / 2)
    .attr("y", -14)
    .attr("text-anchor", "middle")
    .text("Flooding-Related 311 Requests by Week — Cincinnati, 2025");

  const barWidth = xScale(d3.timeWeek.offset(bins[0].week, 1)) - xScale(bins[0].week) - 1;

  const bars = svg.selectAll(".bar")
    .data(bins)
    .join("rect")
      .attr("class",   "bar")
      .attr("x",       d => xScale(d.week))
      .attr("y",       d => yScale(d.count))
      .attr("width",   barWidth)
      .attr("height",  d => innerHeight - yScale(d.count))
      .attr("fill",    "#6b93c4")
      .attr("opacity", 0.85);

  const tooltip = d3.select("#tooltip");
  const fmtWeek = d3.timeFormat("%b %d");

  bars
    .on("mouseover", (event, d) => {
      const weekEnd = d3.timeWeek.offset(d.week, 1);
      tooltip
        .style("opacity", 1)
        .html(`
          <span class="tooltip-label">Week of</span><br>
          ${fmtWeek(d.week)} &ndash; ${fmtWeek(weekEnd)}<br>
          <strong>${d.count} request${d.count !== 1 ? "s" : ""}</strong>
        `);
      d3.select(event.currentTarget).attr("fill", "#3a6ea8");
    })
    .on("mousemove", event => {
      tooltip
        .style("left", (event.pageX + 14) + "px")
        .style("top",  (event.pageY - 32) + "px");
    })
    .on("mouseleave", (event) => {
      tooltip.style("opacity", 0);
      d3.select(event.currentTarget)
        .attr("fill", d => d._selected ? "#3a6ea8" : "#6b93c4");
    });

  const brush = d3.brushX()
    .extent([[0, 0], [innerWidth, innerHeight]])
    .on("end", onBrushEnd);

  const brushGroup = svg.append("g")
    .attr("class", "brush")
    .call(brush);

  brushGroup.select(".overlay").style("pointer-events", "none");

  const toggleBtn = document.getElementById("brush-toggle");
  const clearBtn  = document.getElementById("brush-clear");
  let brushEnabled = false;

  toggleBtn.addEventListener("click", () => {
    brushEnabled = !brushEnabled;
    if (brushEnabled) {
      brushGroup.select(".overlay").style("pointer-events", "all");
      toggleBtn.textContent = "Disable Date Filter";
      toggleBtn.classList.add("active");
    } else {
      brushGroup.call(brush.move, null);
      brushGroup.select(".overlay").style("pointer-events", "none");
      toggleBtn.textContent = "Enable Date Filter";
      toggleBtn.classList.remove("active");
      clearBtn.classList.add("hidden");
      resetBarHighlight();
      dispatchBrushEvent(null, null);
    }
  });

  clearBtn.addEventListener("click", () => {
    brushGroup.call(brush.move, null);
    clearBtn.classList.add("hidden");
    resetBarHighlight();
    dispatchBrushEvent(null, null);
  });

  function onBrushEnd(event) {
    if (!event.selection) {
      clearBtn.classList.add("hidden");
      resetBarHighlight();
      dispatchBrushEvent(null, null);
      return;
    }
    const [x0, x1]  = event.selection;
    const dateStart  = xScale.invert(x0);
    const dateEnd    = xScale.invert(x1);
    clearBtn.classList.remove("hidden");
    highlightBars(dateStart, dateEnd);
    dispatchBrushEvent(dateStart, dateEnd);
  }

  function highlightBars(dateStart, dateEnd) {
    bars.each(function(d) {
      const weekEnd = d3.timeWeek.offset(d.week, 1);
      const inRange = d.week >= dateStart && weekEnd <= dateEnd;
      d._selected   = inRange;
      d3.select(this)
        .attr("fill",    inRange ? "#3a6ea8" : "#6b93c4")
        .attr("opacity", inRange ? 1.0       : 0.35);
    });
  }

  function resetBarHighlight() {
    bars.each(function(d) { d._selected = false; })
        .attr("fill",    "#6b93c4")
        .attr("opacity", 0.85);
  }
}

function dispatchBrushEvent(dateStart, dateEnd) {
  document.dispatchEvent(new CustomEvent("timelinebrush", { detail: { dateStart, dateEnd } }));
}

class LeafletMap {
  constructor(_config, _data) {
    this.config = {
      parentElement: _config.parentElement,
    };
    this.data = _data;
    this.serviceOverlayData = [];
    this.selectedServiceTypes = new Set(["Flooding"]);
    this.serviceTypeColors = {};
    this.filteredDataSet = null;
    this.initVis();
    this.mapChoice = "neighborhood";
    this.brushEnabled = false;
    this.hasActiveBrush = false;
    this.heatVisible = false;
  }

  initVis(background = null) {
    let vis = this;

    //ESRI
    vis.esriUrl =
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
    vis.esriAttr =
      "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community";

    // vis.stadiaUrl =
    //   "https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.{ext}";
    // vis.stadiaAttr =
    //   '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    vis.stadiaUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
    vis.stadiaAttr = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

//     var OpenStreetMap_Mapnik = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
// 	maxZoom: 19,
// 	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
// });



    vis.base_layer = L.tileLayer(vis.stadiaUrl, {
      attribution: vis.stadiaAttr,
      ext: "png",
    });

    vis.theMap = L.map("my-map", {
      center: [39.15, -84.515],
      zoom: 12,
      layers: [vis.base_layer],
    });

    //initialize svg for d3 to add to map
    L.svg({ clickable: true }).addTo(vis.theMap); // we have to make the svg layer clickable
    vis.overlay = d3.select(vis.theMap.getPanes().overlayPane);
    vis.svg = vis.overlay.select("svg").attr("pointer-events", "auto");

    let range = [];

    vis.data.forEach((item, index) => {
      if (!range.includes(item.NEIGHBORHOOD)) {
        range.push(item.NEIGHBORHOOD);
      }
    });

    vis.colorPalette = d3
      .scaleOrdinal()
      .domain(range)
      .range(d3.schemeCategory10);

    vis.colorAccessor = (d) => vis.colorPalette(d.NEIGHBORHOOD);

    vis.Dots = vis.svg
      .selectAll("circle")
      .data(vis.data)
      .join("circle")
      .attr("fill", vis.colorAccessor)
      .attr("stroke", "black")
      .attr(
        "cx",
        (d) => vis.theMap.latLngToLayerPoint([d.latitude, d.longitude]).x,
      )
      .attr(
        "cy",
        (d) => vis.theMap.latLngToLayerPoint([d.latitude, d.longitude]).y,
      )
      .attr("r", (d) => 8) // --- TO DO- want to make radius proportional to earthquake size?
      .on("mouseover", function (event, d) {
        //function to add mouseover event
        d3.select(this)
          .transition() //D3 selects the object we have moused over in order to perform operations on it
          .duration("150") //how long we are transitioning between the two states (works like keyframes)
          .attr("fill", (d) => d3.color(vis.colorAccessor(d)).brighter(1))
          .attr("r", 10); //change radius

        //create a tool tip
        d3.select("#tooltip")
          .style("opacity", 1)
          .style("z-index", 1000000)
          // Format number with million and thousand separator
          //***** TO DO- change this tooltip to show useful information about the quakes
          .html(
            `<div class="tooltip-label"><p>Neighborhood: ${d.NEIGHBORHOOD}</p><p>Date Created: ${d3.utcFormat("%B %d, %Y")(new Date(d.DATE_CREATED))}</p><p>Date Closed: ${d3.utcFormat("%B %d, %Y")(new Date(d.DATE_CLOSED))}</p><p>Priority: ${d.PRIORITY == "" ? "Not Specified" : d.PRIORITY}</p><p>Responding Department: ${d.DEPT_NAME}</p></div>`,
          );
      })
      .on("mousemove", (event) => {
        //position the tooltip
        d3.select("#tooltip")
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY + 10 + "px");
      })
      .on("mouseleave", function () {
        //function to add mouseover event
        d3.select(this)
          .transition() //D3 selects the object we have moused over in order to perform operations on it
          .duration("150") //how long we are transitioning between the two states (works like keyframes)
          .attr("fill", (d) => vis.colorAccessor(d))
          .attr("r", 8); //change radius

        d3.select("#tooltip").style("opacity", 0); //turn off the tooltip
      });

    vis.serviceDots = vis.svg.append("g").attr("class", "service-dot-layer");

    vis.brushRadius = 75;
    vis.brushEnabled = true;

    // Create brush circle
    vis.brushCircle = vis.svg
      .append("g")
      .append("circle")
      .attr("cx", 325) // initial x position
      .attr("cy", 225) // initial y position
      .attr("r", vis.brushRadius)
      .attr("fill", "rgba(168, 196, 224, 0.35)")
      .attr("stroke", "#6b93c4")
      .attr("stroke-width", 2)
      .style("cursor", "move")
      .style("display", "none")
      .call(
        d3
          .drag()
          .on("start", () => {
            if (!vis.brushEnabled) return;
            vis.theMap.dragging.disable();
          })

          .on("drag", (event) => {
            if (!vis.brushEnabled) return;
            vis.hasActiveBrush = true;
            vis.brushCircle.attr("cx", event.x).attr("cy", event.y);
            vis.updateBrushedItems(false);
          })

          .on("end", () => {
            if (!vis.brushEnabled) return;
            vis.theMap.dragging.enable();
            vis.updateBrushedItems(true);
          }),
      );

    vis.toggleBrush = () => {
      vis.brushEnabled = !vis.brushEnabled;
      vis.brushCircle.style("display", vis.brushEnabled ? "block" : "none");
    };

    const heatPoints = vis.data.map((d) => [d.latitude, d.longitude, 0.1]);
    vis.heatLayer = L.heatLayer(heatPoints, {
      radius: 80,
      blur: 20,
      max: 0.1,
    }).addTo(vis.theMap);
    vis.heatLayer.remove();

    vis.theMap.on("zoom move", () => {
      vis.updateVis();
      vis.updateBrushedItems(false);
    });

    vis.theMap.on("zoomend moveend", () => {
      vis.updateBrushedItems(true);
    });
  }

  updateVis(choice = null) {
    let vis = this;

    if (choice) {
      vis.mapChoice = choice;
    }

    let range = [];

    vis.colorPalette = d3.scaleOrdinal(d3.schemeCategory10);

    if (vis.mapChoice == "neighborhood") {
      vis.data.forEach((item, index) => {
        if (!range.includes(item.NEIGHBORHOOD)) {
          range.push(item.NEIGHBORHOOD);
        }
      });

      vis.colorPalette = d3
        .scaleOrdinal()
        .domain(range)
        .range(d3.schemeCategory10);

      vis.colorAccessor = (d) => vis.colorPalette(d.NEIGHBORHOOD);
    } else if (vis.mapChoice == "priority") {
      vis.data.forEach((item, index) => {
        if (!range.includes(item.PRIORITY)) {
          range.push(item.PRIORITY);
        }
      });

      vis.colorPalette = d3
        .scaleOrdinal()
        .domain(range)
        .range(d3.schemeCategory10);

      vis.colorAccessor = (d) => vis.colorPalette(d.PRIORITY);
    } else if (vis.mapChoice == "agency") {
      vis.data.forEach((item, index) => {
        if (!range.includes(item.DEPT_NAME)) {
          range.push(item.DEPT_NAME);
        }
      });

      vis.colorAccessor = (d) => vis.colorPalette(d.DEPT_NAME);
    } else if (vis.mapChoice == "daysToComplete") {
      vis.colorPalette = d3
        .scaleThreshold()
        .domain([6, 11])
        .range(["#1f77b4", "#ff7f0e", "#2ca02c"]);

      vis.colorAccessor = (d) => vis.colorPalette(d.daysToComplete);
    }

    //redraw based on new zoom- need to recalculate on-screen position
    vis.Dots.attr(
      "cx",
      (d) => vis.theMap.latLngToLayerPoint([d.latitude, d.longitude]).x,
    )
      .attr(
        "cy",
        (d) => vis.theMap.latLngToLayerPoint([d.latitude, d.longitude]).y,
      )
      .attr("fill", vis.colorAccessor)
      .attr("r", 8);

    vis.updateServiceDots();

    vis.addLegend();
  }

  setServiceTypeOverlayData(serviceOverlayData) {
    let vis = this;
    vis.serviceOverlayData = serviceOverlayData;
    vis.updateServiceDots();
  }

  setSelectedServiceTypes(selectedServiceTypes) {
    let vis = this;
    vis.selectedServiceTypes = new Set(selectedServiceTypes);
    vis.updateServiceDots();
  }

  setServiceTypeColors(serviceTypeColors) {
    let vis = this;
    vis.serviceTypeColors = { ...serviceTypeColors };
    vis.updateServiceDots();
  }

  updateServiceDots() {
    let vis = this;
    const ignoreFilteredSet = vis.brushEnabled && vis.hasActiveBrush;

    const visibleServiceData = vis.serviceOverlayData.filter((d) =>
      d.serviceTypeLabel !== "Flooding" &&
      vis.selectedServiceTypes.has(d.serviceTypeLabel) &&
      (ignoreFilteredSet || vis.filteredDataSet === null || vis.filteredDataSet.has(d))
    );

    vis.serviceDots
      .selectAll(".service-dot")
      .data(visibleServiceData, (d) => `${d.serviceTypeLabel}-${d.SR_ID || d.DATE_CREATED}-${d.latitude}-${d.longitude}`)
      .join(
        (enter) =>
          enter
            .append("circle")
            .attr("class", "service-dot")
            .attr("stroke", "black")
            .attr("r", 8)
            .on("mouseover", function (event, d) {
              d3.select(this)
                .transition()
                .duration("150")
                .attr("fill", d3.color(vis.serviceTypeColors[d.serviceTypeLabel] || "#666").brighter(0.8))
                .attr("r", 10);

              d3.select("#tooltip")
                .style("opacity", 1)
                .style("z-index", 1000000)
                .html(
                  `<div class="tooltip-label"><p>Service Type: ${d.serviceTypeLabel}</p><p>Neighborhood: ${d.NEIGHBORHOOD}</p><p>Date Created: ${d3.utcFormat("%B %d, %Y")(new Date(d.DATE_CREATED))}</p><p>Priority: ${d.PRIORITY == "" ? "Not Specified" : d.PRIORITY}</p><p>Responding Department: ${d.DEPT_NAME}</p></div>`,
                );
            })
            .on("mousemove", (event) => {
              d3.select("#tooltip")
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY + 10 + "px");
            })
            .on("mouseleave", function (event, d) {
              d3.select(this)
                .transition()
                .duration("150")
                .attr("fill", vis.serviceTypeColors[d.serviceTypeLabel] || "#666")
                .attr("r", 8);

              d3.select("#tooltip").style("opacity", 0);
            }),
        (update) => update,
        (exit) => exit.remove(),
      )
      .attr(
        "cx",
        (d) => vis.theMap.latLngToLayerPoint([d.latitude, d.longitude]).x,
      )
      .attr(
        "cy",
        (d) => vis.theMap.latLngToLayerPoint([d.latitude, d.longitude]).y,
      )
      .attr("fill", (d) => vis.serviceTypeColors[d.serviceTypeLabel] || "#666")
      .attr("display", vis.heatVisible ? "none" : null);
  }

  changeBasemap(type) {
    let vis = this;

    vis.theMap.removeLayer(vis.base_layer);

    if (type === "esri") {
      vis.base_layer = L.tileLayer(vis.esriUrl, {
        attribution: vis.esriAttr,
        ext: "png",
      });
    } else {
      vis.base_layer = L.tileLayer(vis.stadiaUrl, {
        attribution: vis.stadiaAttr,
        ext: "png",
      });
    }
    vis.base_layer.addTo(vis.theMap);
  }

  getBrushedItems(data = null) {
    let vis = this;
    const sourceData = data || vis.data;

    const cx = parseFloat(vis.brushCircle.attr("cx"));
    const cy = parseFloat(vis.brushCircle.attr("cy"));
    const r = parseFloat(vis.brushCircle.attr("r"));

    return sourceData.filter((d) => {
      const p = vis.theMap.latLngToLayerPoint([d.latitude, d.longitude]);
      const dx = p.x - cx;
      const dy = p.y - cy;
      return Math.sqrt(dx * dx + dy * dy) <= r;
    });
  }

  updateBrushedItems(dispatch = false) {
    let vis = this;

    if (!vis.brushEnabled) return;

    const cx = parseFloat(vis.brushCircle.attr("cx"));
    const cy = parseFloat(vis.brushCircle.attr("cy"));
    const r = vis.brushRadius;

    const brushedData = vis.data.filter((d) => {
      const p = vis.theMap.latLngToLayerPoint([d.latitude, d.longitude]);
      const dx = p.x - cx;
      const dy = p.y - cy;
      return Math.sqrt(dx * dx + dy * dy) <= r;
    });

    vis.Dots.classed("selected", (d) => brushedData.includes(d));

    if (dispatch) {
      document.dispatchEvent(
        new CustomEvent("mapbrush", {
          detail: { brushedData },
        }),
      );
    }
  }

  toggleBrush() {
    let vis = this;

    vis.brushEnabled = !vis.brushEnabled;
    vis.hasActiveBrush = false;
    vis.brushCircle.style("display", vis.brushEnabled ? "block" : "none");
    vis.Dots.classed("selected", false);
  }

  toggleHeat() {
    let vis = this;
    vis.heatVisible = !vis.heatVisible;

    if (vis.heatVisible) {
      vis.heatLayer.addTo(vis.theMap);
      vis.Dots.attr("display", "none");
      vis.serviceDots.selectAll(".service-dot").attr("display", "none");
    } else {
      vis.heatLayer.remove();
      vis.Dots.attr("display", null);
      vis.updateServiceDots();
    }
  }

  setFilteredData(filteredData) {
    let vis = this;
    vis.filteredDataSet = new Set(filteredData);

    vis.Dots.attr("display", (d) => {
      if (vis.heatVisible) return "none";

      if (vis.brushEnabled) return null;

      return filteredData.includes(d) ? null : "none";
    });

    vis.updateServiceDots();
  }

  addLegend() {
    let vis = this;

    if (vis.legend) {
      vis.theMap.removeControl(vis.legend);
    }

    if (vis.mapChoice === "neighborhood") {
      return;
    }

    vis.legend = L.control({ position: "bottomleft" });

    vis.legend.onAdd = function (map) {
      const div = L.DomUtil.create("div", "info legend");
      div.style.background = "white";
      div.style.padding = "6px";
      div.style.borderRadius = "4px";
      div.style.boxShadow = "0 0 15px rgba(0,0,0,0.2)";
      div.style.fontSize = "12px";

      let labels = [];

      if (vis.mapChoice === "daysToComplete") {
        const ranges = [
          { label: "0-5 days", color: "#1f77b4" },
          { label: "6-10 days", color: "#ff7f0e" },
          { label: "11+ days", color: "#2ca02c" },
        ];

        ranges.forEach((r) => {
          labels.push(
            `<i style="background:${r.color}; width:12px; height:12px; display:inline-block; margin-right:5px;"></i> ${r.label}`,
          );
        });
      } else {
        const categories = vis.colorPalette.domain();
        categories.forEach((cat) => {
          const color = vis.colorPalette(cat);
          labels.push(
            `<i style="background:${color}; width:12px; height:12px; display:inline-block; margin-right:5px;"></i> ${cat}`,
          );
        });
      }

      div.innerHTML = labels.join("<br>");
      return div;
    };

    vis.legend.addTo(vis.theMap);
  }
}

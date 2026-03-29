let leafletMap, mapChoice;

d3.csv("data/subset_data_edited.csv")
  .then((_data) => {
    const floodingData = _data.filter(
      (d) =>
        d.SR_TYPE_DESC === "FLOODING, IN STREET" ||
        d.SR_TYPE_DESC === "FLOODING, OVERLAND",
    );

    floodingData.forEach((d) => {
      d.latitude = +d.LATITUDE;
      d.longitude = +d.LONGITUDE;

      d.daysToComplete = getDays(d.DATE_CREATED, d.DATE_CLOSED);
    });
    console.log(floodingData);

    // Leaflet Map
    leafletMap = new LeafletMap({ parentElement: "#my-map" }, floodingData);

    d3.select("#stadia-map").on("click", () => {
      leafletMap.changeBasemap("stadia");

      document.getElementById("stadia-map").classList.add("button-active");
      document.getElementById("esri-map").classList.remove("button-active");
    });

    d3.select("#esri-map").on("click", () => {
      leafletMap.changeBasemap("esri");

      document.getElementById("stadia-map").classList.remove("button-active");
      document.getElementById("esri-map").classList.add("button-active");
    });

    d3.select("#map").on("change", (event) => {
      let mapChoice = event.target.value;
      console.log(mapChoice);
      leafletMap.updateVis(mapChoice);
    });

    // display brush
    d3.select("#brushToggle").on("click", () => {
      leafletMap.toggleBrush();

      let element = document.getElementById("brushToggle");

      if (!leafletMap.brushEnabled) {
        element.classList.remove("button-active");

        const container = document.getElementById("timeline-container");
        container.innerHTML = "";

        initTimeline(floodingData);
        initNeighborhoodChart(floodingData);
        initMethodChart(floodingData);
        initDepartmentChart(floodingData);
      } else {
        element.classList.add("button-active");
        updateGraphs(leafletMap.getBrushedItems());
      }
    });

    d3.select("#heatToggle").on("click", () => {
      leafletMap.toggleHeat()

      let element = document.getElementById("heatToggle");

      if(!leafletMap.heatVisible) {
        element.classList.remove("button-active");
      } else {
        element.classList.add("button-active");
      }
    })

    document.addEventListener("mapbrush", (event) => {
      const brushedData = leafletMap.getBrushedItems();

      updateGraphs(brushedData);
    });

    // UPDATE OTHER VISUALIZATIONS WITH GRAPH BRUSHED DATA
    function updateGraphs(brushedData) {
      console.log("Brushed Items: ", brushedData);

      filterTimelineByData(brushedData);
      updateNeighborhoodChart(brushedData);
      updateMethodChart(brushedData);
      updateDepartmentChart(brushedData);
    }

    initTimeline(floodingData);
    initNeighborhoodChart(floodingData);
    initMethodChart(floodingData);
    initDepartmentChart(floodingData);

    const parseDate = d3.timeParse("%Y %b %d %I:%M:%S %p");
    floodingData.forEach((d) => {
      d.date = parseDate(d.DATE_CREATED);
    });

    document.addEventListener("timelinebrush", (event) => {
      const { dateStart, dateEnd } = event.detail;
      leafletMap.Dots.attr("display", (d) => {
        if (dateStart === null) return null;
        if (d.date === null) return "none";
        return d.date >= dateStart && d.date <= dateEnd ? null : "none";
      });
    });
  })
  .catch((error) => console.error(error));

function getDays(date1, date2) {
  date1 = new Date(date1);
  date2 = new Date(date2);
  const d1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());

  const differenceMs = Math.abs(d2 - d1);

  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const days = Math.floor(differenceMs / millisecondsPerDay);

  return days;
}

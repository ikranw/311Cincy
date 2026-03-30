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

      if(d.PRIORITY === "") {
        d.PRIORITY = "Not Specified"
      }
    });

    const parseDate = d3.timeParse("%Y %b %d %I:%M:%S %p");
    floodingData.forEach((d) => {
      d.date = parseDate(d.DATE_CREATED);
    });

    const linkedSelections = {
      neighborhood: new Set(),
      method: new Set(),
      department: new Set(),
    };
    let timelineFilter = { dateStart: null, dateEnd: null };

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
        renderLinkedViews();
      } else {
        element.classList.add("button-active");
        renderLinkedViews();
      }
    });

    d3.select("#heatToggle").on("click", () => {
      leafletMap.toggleHeat();

      let element = document.getElementById("heatToggle");

      if (!leafletMap.heatVisible) {
        element.classList.remove("button-active");
      } else {
        element.classList.add("button-active");
      }
    });

    document.addEventListener("mapbrush", () => {
      renderLinkedViews();
    });

    document.addEventListener("chartselectionchange", (event) => {
      const { chart, value } = event.detail;

      if (!linkedSelections[chart]) return;

      if (linkedSelections[chart].has(value)) {
        linkedSelections[chart].delete(value);
      } else {
        linkedSelections[chart].add(value);
      }

      renderLinkedViews();
    });

    function getMapFilteredData() {
      if (leafletMap.brushEnabled && leafletMap.hasActiveBrush) {
        return leafletMap.getBrushedItems();
      }

      return floodingData;
    }

    function filterByTimelineSelection(data) {
      if (timelineFilter.dateStart === null || timelineFilter.dateEnd === null) {
        return data;
      }

      return data.filter((d) => {
        if (d.date === null) return false;
        return d.date >= timelineFilter.dateStart && d.date <= timelineFilter.dateEnd;
      });
    }

    function filterByLinkedSelections(data, excludedChart = null) {
      return data.filter((d) => {
        if (
          excludedChart !== "neighborhood" &&
          linkedSelections.neighborhood.size > 0 &&
          !linkedSelections.neighborhood.has(d.NEIGHBORHOOD)
        ) {
          return false;
        }

        if (
          excludedChart !== "method" &&
          linkedSelections.method.size > 0 &&
          !linkedSelections.method.has(d.METHOD_RECEIVED)
        ) {
          return false;
        }

        if (
          excludedChart !== "department" &&
          linkedSelections.department.size > 0 &&
          !linkedSelections.department.has(d.DEPT_NAME)
        ) {
          return false;
        }

        return true;
      });
    }

    // UPDATE OTHER VISUALIZATIONS WITH LINKED MAP, TIMELINE, AND CHART FILTERED DATA
    function renderLinkedViews() {
      const mapFilteredData = getMapFilteredData();
      const baseData = filterByTimelineSelection(mapFilteredData);
      const fullyFilteredData = filterByLinkedSelections(baseData);

      filterTimelineByData(fullyFilteredData);
      leafletMap.setFilteredData(fullyFilteredData);

      console.log(fullyFilteredData)

      updateNeighborhoodChart(
        filterByLinkedSelections(baseData, "neighborhood"),
        linkedSelections.neighborhood
      );
      updateMethodChart(
        filterByLinkedSelections(baseData, "method"),
        linkedSelections.method
      );
      updateDepartmentChart(
        filterByLinkedSelections(baseData, "department"),
        linkedSelections.department
      );

      // add charts to be linked/brushed
      // updateFutureChart(filterByLinkedSelections(baseData, "futureChartKey"), linkedSelections.futureChartKey);
    }

    initTimeline(floodingData);
    initNeighborhoodChart(floodingData, linkedSelections.neighborhood);
    initMethodChart(floodingData, linkedSelections.method);
    initDepartmentChart(floodingData, linkedSelections.department);
    renderLinkedViews();

    document.addEventListener("timelinebrush", (event) => {
      const { dateStart, dateEnd } = event.detail;
      timelineFilter = { dateStart, dateEnd };
      renderLinkedViews();
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

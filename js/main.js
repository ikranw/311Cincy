let leafletMap, mapChoice;

const serviceTypeDefinitions = [
  {
    key: "Flooding",
    defaultColor: "#6b93c4",
    match: (d) =>
      d.SR_TYPE_DESC === "FLOODING, IN STREET" ||
      d.SR_TYPE_DESC === "FLOODING, OVERLAND",
  },
  {
    key: "Potholes",
    defaultColor: "#f28e2b",
    match: (d) => d.SR_TYPE === "PTHOLE",
  },
  {
    key: "Slippery Streets",
    defaultColor: "#b07aa1",
    match: (d) => d.SR_TYPE === "SLPYST",
  },
  {
    key: "Leaks",
    defaultColor: "#4e79a7",
    match: (d) => d.SR_TYPE === "WTRLKSBK",
  },
  {
    key: "Fire Hydrant Repair",
    defaultColor: "#e15759",
    match: (d) => d.SR_TYPE === "FRHYDNTR",
  },
  {
    key: "Street Lights Repair",
    defaultColor: "#edc948",
    match: (d) => d.SR_TYPE === "STRTLITE",
  },
  {
    key: "Public Litter",
    defaultColor: "#59a14f",
    match: (d) => d.SR_TYPE === "LTRSTPNH",
  },
];

d3.csv("data/subset_data_edited.csv")
  .then((_data) => {
    const serviceData = _data
      .map((d) => {
        const serviceType = serviceTypeDefinitions.find((item) => item.match(d));
        if (!serviceType) return null;

        return {
          ...d,
          serviceTypeLabel: serviceType.key,
        };
      })
      .filter((d) => d !== null);

    const floodingData = serviceData.filter(
      (d) => d.serviceTypeLabel === "Flooding",
    );

    const parseDate = d3.timeParse("%Y %b %d %I:%M:%S %p");
    serviceData.forEach((d) => {
      d.latitude = +d.LATITUDE;
      d.longitude = +d.LONGITUDE;
      d.daysToComplete = getDays(d.DATE_CREATED, d.DATE_CLOSED);

      if (d.PRIORITY === "") {
        d.PRIORITY = "Not Specified";
      }
      d.date = parseDate(d.DATE_CREATED);
    });

    const selectedServiceTypes = new Set(["Flooding"]);
    const serviceTypeColors = Object.fromEntries(
      serviceTypeDefinitions.map((item) => [item.key, item.defaultColor]),
    );

    const linkedSelections = {
      neighborhood: new Set(),
      method: new Set(),
      department: new Set(),
      serviceType: new Set(),
      priority: new Set(),
    };
    let timelineFilter = { dateStart: null, dateEnd: null };
    let monthFilter = null;

    // Populate month dropdown from data
    const monthFmt = d3.timeFormat("%B");
    const uniqueMonths = Array.from(
      new Set(
        floodingData
          .filter(d => d.date !== null)
          .map(d => d3.timeMonth.floor(d.date).getTime())
      )
    ).sort();
    const monthSelect = document.getElementById("month-filter");
    uniqueMonths.forEach(ts => {
      const opt = document.createElement("option");
      opt.value = ts;
      opt.textContent = monthFmt(new Date(ts));
      monthSelect.appendChild(opt);
    });
    monthSelect.addEventListener("change", () => {
      const val = monthSelect.value;
      monthFilter = val ? new Date(+val) : null;
      renderLinkedViews();
    });

    function filterByMonth(data) {
      if (monthFilter === null) return data;
      return data.filter(d => {
        if (!d.date) return false;
        return d3.timeMonth.floor(d.date).getTime() === monthFilter.getTime();
      });
    }

    console.log(floodingData);

    // Leaflet Map
    leafletMap = new LeafletMap({ parentElement: "#my-map" }, floodingData);
    leafletMap.setServiceTypeOverlayData(serviceData);
    leafletMap.setSelectedServiceTypes(selectedServiceTypes);
    leafletMap.setServiceTypeColors(serviceTypeColors);
    priorityChart = new PriorityChart(
      { parentElement: "#priority-container" },
      getSelectedServiceData(),
    );
    serviceTypeChart = new ServiceTypeChart(
      { parentElement: "#service-container" },
      getSelectedServiceData(),
    );
    initServiceTypeControls();

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

        initTimeline(getSelectedServiceData());
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

    function getSelectedServiceData() {
      return serviceData.filter((d) => selectedServiceTypes.has(d.serviceTypeLabel));
    }

    function getMapFilteredData() {
      const selectedServiceData = getSelectedServiceData();

      if (leafletMap.brushEnabled && leafletMap.hasActiveBrush) {
        return leafletMap.getBrushedItems(selectedServiceData);
      }

      return selectedServiceData;
    }

    function filterByTimelineSelection(data) {
      if (
        timelineFilter.dateStart === null ||
        timelineFilter.dateEnd === null
      ) {
        return data;
      }

      return data.filter((d) => {
        if (d.date === null) return false;
        return (
          d.date >= timelineFilter.dateStart && d.date <= timelineFilter.dateEnd
        );
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
        if (
          excludedChart !== "serviceType" &&
          linkedSelections.serviceType.size > 0 &&
          !linkedSelections.serviceType.has(d.serviceTypeLabel)
        )
          return false;

        if (
          excludedChart !== "priority" &&
          linkedSelections.priority.size > 0 &&
          !linkedSelections.priority.has(d.PRIORITY)
        )
          return false;

        return true;
      });
    }

    // UPDATE OTHER VISUALIZATIONS WITH LINKED MAP, TIMELINE, AND CHART FILTERED DATA
    function renderLinkedViews() {
      const mapFilteredData = getMapFilteredData();
      const timeFiltered = filterByTimelineSelection(mapFilteredData);
      const baseData = filterByMonth(timeFiltered);
      const fullyFilteredData = filterByLinkedSelections(baseData);

      filterTimelineByData(fullyFilteredData);
      leafletMap.setFilteredData(fullyFilteredData);

      const badge = document.getElementById("count-badge");
      if (badge) {
        badge.textContent = `Showing ${fullyFilteredData.length} of ${floodingData.length} flooding requests.`;
      }

      console.log(fullyFilteredData);

      updateNeighborhoodChart(
        filterByLinkedSelections(baseData, "neighborhood"),
        linkedSelections.neighborhood,
      );
      updateMethodChart(
        filterByLinkedSelections(baseData, "method"),
        linkedSelections.method,
      );
      updateDepartmentChart(
        filterByLinkedSelections(baseData, "department"),
        linkedSelections.department,
      );

      if (priorityChart) {
        priorityChart.updateData(fullyFilteredData, linkedSelections.priority);
      }

      if (serviceTypeChart) {
        serviceTypeChart.updateData(fullyFilteredData, linkedSelections.serviceType);
      }

      // add charts to be linked/brushed
      // updateFutureChart(filterByLinkedSelections(baseData, "futureChartKey"), linkedSelections.futureChartKey);
    }

    initTimeline(getSelectedServiceData());
    initNeighborhoodChart(getSelectedServiceData(), linkedSelections.neighborhood);
    initMethodChart(getSelectedServiceData(), linkedSelections.method);
    initDepartmentChart(getSelectedServiceData(), linkedSelections.department);
    renderLinkedViews();

    document.addEventListener("timelinebrush", (event) => {
      const { dateStart, dateEnd } = event.detail;
      timelineFilter = { dateStart, dateEnd };
      renderLinkedViews();
    });

    function initServiceTypeControls() {
      const toggleButton = document.getElementById("serviceTypeToggle");
      const panel = document.getElementById("serviceTypePanel");

      panel.innerHTML = "";

      serviceTypeDefinitions.forEach((definition) => {
        const option = document.createElement("div");
        option.className = "service-type-option";
        option.innerHTML = definition.key === "Flooding"
          ? `
            <input type="checkbox" checked disabled>
            <label>${definition.key}</label>
            <span></span>
          `
          : `
            <input type="checkbox">
            <label>${definition.key}</label>
            <input type="color" value="${serviceTypeColors[definition.key]}">
          `;

        const checkbox = option.querySelector('input[type="checkbox"]');
        const colorPicker = option.querySelector('input[type="color"]');

        if (definition.key !== "Flooding") {
          checkbox.addEventListener("change", () => {
            if (checkbox.checked) {
              selectedServiceTypes.add(definition.key);
            } else {
              selectedServiceTypes.delete(definition.key);
            }

            linkedSelections.serviceType.forEach((serviceType) => {
              if (!selectedServiceTypes.has(serviceType)) {
                linkedSelections.serviceType.delete(serviceType);
              }
            });

            leafletMap.setSelectedServiceTypes(selectedServiceTypes);
            const container = document.getElementById("timeline-container");
            container.innerHTML = "";
            initTimeline(getSelectedServiceData());
            renderLinkedViews();
          });
        }

        if (colorPicker) {
          colorPicker.addEventListener("input", () => {
            serviceTypeColors[definition.key] = colorPicker.value;
            leafletMap.setServiceTypeColors(serviceTypeColors);
          });
        }

        panel.appendChild(option);
      });

      toggleButton.addEventListener("click", () => {
        panel.classList.toggle("hidden");
      });
    }
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

let leafletMap;

d3.csv("data/subset_data.csv")
  .then((_data) => {

    const floodingData = _data.filter(d =>
      d.SR_TYPE_DESC === "FLOODING, IN STREET" ||
      d.SR_TYPE_DESC === "FLOODING, OVERLAND"
    );

    floodingData.forEach(d => {
      d.latitude  = +d.LATITUDE;
      d.longitude = +d.LONGITUDE;
    });

    initTimeline(floodingData);
    leafletMap = new LeafletMap({ parentElement: "#my-map" }, floodingData);

    const parseDate = d3.timeParse("%Y %b %d %I:%M:%S %p");
    floodingData.forEach(d => { d.date = parseDate(d.DATE_CREATED); });

    document.addEventListener("timelinebrush", (event) => {
      const { dateStart, dateEnd } = event.detail;
      leafletMap.Dots.attr("display", d => {
        if (dateStart === null) return null;
        if (d.date === null)    return "none";
        return (d.date >= dateStart && d.date <= dateEnd) ? null : "none";
      });
    });

  })
  .catch(error => console.error(error));

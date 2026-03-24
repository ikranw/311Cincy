let leafletMap;

d3.csv("data/subset_potholes.csv")
    .then((_data) => {
        mapData = _data

    mapData.forEach(d => {
      d.latitude = +d.LATITUDE; //make sure these are not strings
      d.longitude = +d.LONGITUDE; //make sure these are not strings
    });
    console.log(mapData);

    leafletMap = new LeafletMap({ parentElement: '#my-map'}, mapData);

    })
    .catch((error) => console.error(error));

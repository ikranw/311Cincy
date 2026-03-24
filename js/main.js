let leafletMap;

d3.csv("data/subset_data.csv")
    .then((_data) => {
        floodingData = _data.filter(item => item.SR_TYPE_DESC === 'FLOODING, IN STREET' || item.SR_TYPE_DESC === 'FLOODING, OVERLAND')

    floodingData.forEach(d => {
      d.latitude = +d.LATITUDE; //make sure these are not strings
      d.longitude = +d.LONGITUDE; //make sure these are not strings
    });
    console.log(floodingData);

    leafletMap = new LeafletMap({ parentElement: '#my-map'}, floodingData);

    })
    .catch((error) => console.error(error));

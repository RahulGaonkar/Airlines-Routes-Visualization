let store = {};

function loadData() {
    return Promise.all([
        d3.csv("data/airlineRoutes.csv"),
        d3.json("data/countries.geo.json")
    ]).then(datasets => {
        store.routes = datasets[0];
        store.geoJSON = datasets[1]
        return store;
    })
}

function groupByAirline(data) {
//Iterate over each route, producing a dictionary where the keys is are the ailines ids and the values are the information of the airline.
    let result = data.reduce((result, d) => {
    let currentData = result[d.AirlineID] || {
      "AirlineID": d.AirlineID,
      "AirlineName": d.AirlineName,
      "Count": 0
    }

    currentData.Count += 1;

    result[d.AirlineID] = currentData;

    return result;
    }, {})

//We use this to convert the dictionary produced by the code above, into a list, that will make it easier to create the visualization.
    result = Object.keys(result).map(key => result[key]);
    result = result.sort((a,b) => {
      return d3.descending(a.Count,b.Count);
    });
    return result;
}

function groupByAirport(data) {
//We use reduce to transform a list into a object where each key points to an airport. This way makes it easy to check if it is the first time we are seeing the airport.
    let result = data.reduce((result, d) => {
//The || sign in the line below means that in case the first option is anything that Javascript consider false (this include undefined, null and 0), the second option will be used. Here if result[d.DestAirportID] is false, it means that this is the first time we are seeing the airport, so we will create a new one (second part after ||)

    let currentDest = result[d.DestAirportID] || {
      "AirportID": d.DestAirportID,
      "Airport": d.DestAirport,
      "Latitude": +d.DestLatitude,
      "Longitude": +d.DestLongitude,
      "City": d.DestCity,
      "Country": d.DestCountry,
      "Count": 0
    }
    currentDest.Count += 1
    result[d.DestAirportID] = currentDest

//After doing for the destination airport, we also update the airport the airplane is departing from.
    let currentSource = result[d.SourceAirportID] || {
      "AirportID": d.SourceAirportID,
      "Airport": d.SourceAirport,
      "Latitude": +d.SourceLatitude,
      "Longitude": +d.SourceLongitude,
      "City": d.SourceCity,
      "Country": d.SourceCountry,
      "Count": 0
    }
    currentSource.Count += 1
    result[d.SourceAirportID] = currentSource

    return result
    }, {})

//We map the keys to the actual airports, this is an way to transform the object we got in the previous step into a list.
    result = Object.keys(result).map(key => result[key])
    return result
}

function getAirlinesChartConfig() {
    let width = 350;
    let height = 400;
    let margin = {
      top: 10,
      bottom: 50,
      left: 130,
      right: 10
    }

//The body is the area that will be occupied by the bars.
    let bodyHeight = height - margin.top - margin.bottom;
    let bodyWidth = width - margin.left - margin.right;

//The container is the SVG where we will draw the chart. In our HTML it is the svg with the id AirlinesChart
    let container = d3.select("#AirlinesChart")
    container
      .attr("width", width)
      .attr("height", height)

    return { width, height, margin, bodyHeight, bodyWidth, container }
}

function getAirlinesChartScales(airlines, config) {
    let { bodyWidth, bodyHeight } = config;
    let maximumCount = d3.max(airlines, d=>{
      return d.Count;
    });

    let xScale = d3.scaleLinear()
        .range([0, bodyWidth])
        .domain([0, maximumCount])

    let yScale = d3.scaleBand()
        .range([0, bodyHeight])
        .domain(airlines.map(a => a.AirlineName)) //The domain is the list of airlines names
        .padding(0.2)

    return { xScale, yScale }
}

function drawBarsAirlinesChart(airlines, scales, config) {
    let {margin, container} = config; // this is equivalent to 'let margin = config.margin; let container = config.container'
    let {xScale, yScale} = scales;
    let body = container.append("g")
        .style("transform",
              `translate(${margin.left}px,${margin.top}px)`
        )

    let bars = body.selectAll(".bar")
        .data(airlines)

    //Adding a rect tag for each airline
    bars.enter().append("rect")
        .attr("height", yScale.bandwidth())
        .attr("y", (d) => yScale(d.AirlineName))
        .attr("width", (d) => xScale(d.Count))
        .attr("fill", "#2a5599")
}

function drawAxesAirlinesChart(airlines, scales, config){
    let {xScale, yScale} = scales;
    let {container, margin, height} = config;
    let axisX = d3.axisBottom(xScale)
                  .ticks(5)

    container.append("g")
          .style("transform",
                      `translate(${margin.left}px,${height - margin.bottom}px)`
          )
          .call(axisX)

    let axisY = d3.axisLeft(yScale)

    container.append("g")
          .style("transform",
                      `translate(${margin.left}px,${margin.top}px)`
          )
          .call(axisY)
}

function drawAirlinesChart(airlines) {
    let config = getAirlinesChartConfig();
    let scales = getAirlinesChartScales(airlines, config);
    drawBarsAirlinesChart(airlines, scales, config);
    drawAxesAirlinesChart(airlines, scales, config)
}

function getMapConfig() {
    let width = 600;
    let height = 400;
    let container = d3.select("#Map");
    container
      .attr("width", width)
      .attr("height", height)
    return {width, height, container}
}

function getMapProjection(config) {
    let {width, height} = config;
    let projection = d3.geoMercator()
    projection.scale(97)
          .translate([width / 2, height / 2 + 20])
    store.mapProjection = projection;
    return projection;
}

function drawBaseMap(container, countries, projection) {
    let path = d3.geoPath().projection(projection);

    container.selectAll("path").data(countries)
        .enter().append("path")
        .attr("d", d => path(d))
        .attr("stroke", "#ccc")
        .attr("fill", "#eee")
}

function drawMap(geoJeon) {
    let config = getMapConfig();
    let projection = getMapProjection(config)
    drawBaseMap(config.container, geoJeon.features, projection)
}

function drawAirports(airports) {
    let config = getMapConfig(); //get the config
    let projection = getMapProjection(config); //get the projection
    let container = config.container; //get the container

    let circles = container.selectAll("circle");
    circles.data(airports)
           .enter()
           .append("circle")
           .attr("r", 1)
           .attr("cx", d=> projection([d.Longitude,d.Latitude])[0])
           .attr("cy", d=> projection([d.Longitude,d.Latitude])[1])
           .attr("fill", "#2a5599")
}

function showData() {
    //Get the routes from our store variable
    let routes = store.routes
    // Compute the number of routes per airline.
    let airlines = groupByAirline(store.routes);
    console.log(airlines)
    drawAirlinesChart(airlines)
    drawMap(store.geoJSON)

    let airports = groupByAirport(store.routes);
    drawAirports(airports)
}

loadData().then(showData);

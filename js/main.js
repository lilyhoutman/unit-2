//declare map var in global scope
var map;
//declare minValue var in global scope
var dataStats = {};
//function to instantiate the leaflet map
function createMap(){
    //create the map
    map = L.map('mapid', {
        center: [38,-95],
        zoom: 4,
        //constrain zoom to United States
        maxZoom: 6,
        minZoom: 3,
        //constrain pan to United States
        maxBounds: [
          [53, -135],
          [23, -55]
          ]
    });

    //add own custom base tilelayer, designed for this project
     L.tileLayer('https://api.mapbox.com/styles/v1/lhoutman/ckliuno690b3518qsf71lihof/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoibGhvdXRtYW4iLCJhIjoiY2tmem9vbnNkMDFlMDJ6bW0zaW9zNHdtdCJ9.G_cKYjWRvel1WdDwhQ9z1A', {
        tileSize: 512,
        zoomOffset: -1,
        attribution: '&copy <a href="https://www.mapbox.com/map-feedback/">Mapbox</a> &copy <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    //call getData function
    getData(map);
};

function calcStats(data){
    //create empty array to store all data values
    var allValues = [];
    //loop through each city
    for(var city of data.features){
        //loop through each year
        for(var year = 2008; year <= 2020; year+=1){
              //get number of bars for current year
              var value = city.properties["Bars_"+ String(year)];
              //add value to array
              allValues.push(value);
        }
    }
    //define for years with no bars
    dataStats.zero = 0;
    //define minimum value as 1, even though there are some locations with 0
    dataStats.min = 1;
    dataStats.max = 7;
    //due to the nature of my data, the mean is 0.77 which obviously will not work, so i'll define it as 2
    dataStats.three = 3;
}

//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
  //define radius for points with a value
    if (attValue >= 1){
    //constant factor adjusts symbol sizes evenly
    var minRadius = 5;
    //Flannery Apperance Compensation formula
    var radius = 1.0083 * Math.pow(attValue/dataStats.min,0.5715) * minRadius
    return radius;
    //define radius for points with no bars
  } else {
    var radius = 1;
    return radius;
  };
};

//create popup content
function PopupContent(properties, attribute){
  this.properties = properties;
  this.attribute = attribute;
  this.year = attribute.split("_")[1];
  this.bars = this.properties[attribute];
  this.formatted = "<p><b>City:</b> " + this.properties.city + "</p><p><b>Number of Bars in " + this.year + ":</b> " + this.bars + "</p>";
}

//function to convert markers to circle markers and add popups
function pointToLayer(feature, latlng, attributes){
    //Determine which attribute to visualize with proportional symbols
    var attribute = attributes[0];
    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);

    //create marker options
    var options = {
        fillColor: "#D464A4",
        color: '#ffffff',
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.8
     };
    //Give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRadius(attValue);
    //create circle marker layer
    var layer = L.circleMarker(latlng, options);
    //build popup content string starting with city...Example 2.1 line 24
    var popupContent = new PopupContent(feature.properties, attribute);
    //bind the popup to the circle marker
    layer.bindPopup(popupContent.formatted, {
          offset: new L.Point(0,-options.radius)
      });
    //return the circle marker to the L.geoJson pointToLayer option
    return layer;
  };

//create proportional symbols
function createPropSymbols(data, attributes){
    //create a Leaflet GeoJSON layer and add it to the map
    L.geoJson(data, {
        pointToLayer: function(feature, latlng){
            return pointToLayer(feature, latlng, attributes);
        }
    }).addTo(map);
};

//Resize proportional symbols according to new attribute values
function updatePropSymbols(attribute){
  var year = attribute.split("_")[1];
    //update temporal legend
    $("span.year").html(year);
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
          //access feature properties
           var props = layer.feature.properties;
           //update each feature's radius based on new attribute values
           var radius = calcPropRadius(props[attribute]);
           layer.setRadius(radius);
           //add city to popup content string
           var popupContent = new PopupContent(props, attribute);
           //update popup with new content
           popup = layer.getPopup();
           popup.setContent(popupContent.formatted).update();
        };
    });
};

function processData(data){
    //empty array to hold attributes
    var attributes = [];
    //properties of the first feature in the dataset
    var properties = data.features[0].properties;
    //push each attribute name into attributes array
    for (var attribute in properties){
        //only take attributes with population values
        if (attribute.indexOf("Bars") > -1){
            attributes.push(attribute);
        };
    };
    return attributes;
};

//Create new sequence controls
function createSequenceControls(attributes){
var SequenceControl = L.Control.extend({
        options: {
            position: 'bottomleft'
        },

        onAdd: function () {
            // create the control container div with a particular class name
            var container = L.DomUtil.create('div', 'sequence-control-container');

            //disable any mouse event listeners for the container
            L.DomEvent.disableClickPropagation(container);

            //create range input element (slider)
            $(container).append('<input class="range-slider" type="range">');

             //add skip buttons
            $(container).append('<button class="step" id="reverse" title="Reverse"><img src="img/backward-01.png"></button>');
            $(container).append('<button class="step" id="forward" title="Forward"><img src="img/forward-01.png"></button>');

            return container;

        }
    });

    map.addControl(new SequenceControl());

    //set slider attributes
    $('.range-slider').attr({
        max: 12,
        min: 0,
        value: 0,
        step: 1
    });
//click listener for buttons
    $('.step').click(function(){

      //get the old index value
      var index = $('.range-slider').val();

      //increment or decrement depending on button clicked
      if ($(this).attr('id') == 'forward'){
          index++;
          //if past the last attribute, wrap around to first attribute
          index = index > 12 ? 0 : index;
      } else if ($(this).attr('id') == 'reverse'){
          index--;
          //if past the first attribute, wrap around to last attribute
          index = index < 0 ? 12 : index;
      };

      //update slider
      $('.range-slider').val(index);
      //pass new attribute to update symbols
        updatePropSymbols(attributes[index]);
    });

    //input listener for slider
    $('.range-slider').on('input', function(){
      //get the new index value
      var index = $(this).val();
      //pass new attribute to update symbols
        updatePropSymbols(attributes[index]);
    });
  };

//create legend
function createLegend(attributes){
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },

        onAdd: function () {
            // create the control container with a particular class name
            var container = L.DomUtil.create('div', 'legend-control-container');

            $(container).append('<div class="temporal-legend">Number of Bars in <span class="year">2008</span></div>');

            //start attribute legend svg string
            var svg = '<svg id="attribute-legend" width="160px" height="53px">';

            //array of circle names to base loop on
            var circles = ["max", "three", "min", "zero"];

            //loop to add each circle and text to svg string
            for (var i=0; i<circles.length; i++){

              var radius = calcPropRadius(dataStats[circles[i]]);  
              var cy = 38 - radius;

                //circle string
                svg += '<circle class="legend-circle" id="' + circles[i] + '" r="' + radius + '"cy="' + cy + '" fill="#D464A4" fill-opacity="0.8" stroke="#ffffff" cx="30"/>';  

            //evenly space out labels            
            var textY = i * 12.5 + 12.5;

            //text string            
            svg += '<text id="' + circles[i] + '-text" x="60" y="' + textY + '">' + Math.round(dataStats[circles[i]]*100)/100 + " remaining" + '</text>';
        };

            //close svg string
            svg += "</svg>";

            //add attribute legend svg to container
            $(container).append(svg);

            return container;
        }
    });

    map.addControl(new LegendControl());

};

function getData(map){
    //load the data
    $.getJSON("data/lesbianbardecline.geojson", function(response){

            var attributes = processData(response);
            calcStats(response);
            //call function to create proportional symbols
            createPropSymbols(response,attributes);
            createSequenceControls(attributes);
            createLegend(attributes);
    });
};

$(document).ready(createMap);
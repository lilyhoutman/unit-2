//declare map var in global scope
var map;
//declare minValue var in global scope
var minValue;
//function to instantiate the leaflet map
function createMap(){
    //create the map
    map = L.map('mapid', {
        center: [38,-95],
        zoom: 4
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

function calcMinValue(data){
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
    //define minimum value as 1, even though there are some locations with 0
    var minValue = 1;

    return minValue;
}

//calculate the radius of each proportional symbol

function calcPropRadius(attValue) {
  //define radius for points with a value
    if (attValue >= 1){
    //constant factor adjusts symbol sizes evenly
    var minRadius = 5;
    //Flannery Apperance Compensation formula
    var radius = 1.0083 * Math.pow(attValue/minValue,0.5715) * minRadius
    return radius;
    //define radius for points with no bars
  } else {
    var radius = 1;
    return radius;
  };
};

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
    var popupContent = "<p><b>City:</b> " + feature.properties.city + "</p>";
    //add formatted attribute to popup content string
    var year = attribute.split("_")[1];
    popupContent += "<p><b>Number of Bars in " + year + ":</b> " + feature.properties[attribute] + "</p>";
    //bind the popup to the circle marker
    layer.bindPopup(popupContent, {
          offset: new L.Point(0,-options.radius)
      });
    //return the circle marker to the L.geoJson pointToLayer option
    return layer;
  };

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
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
          //access feature properties
           var props = layer.feature.properties;
           //update each feature's radius based on new attribute values
           var radius = calcPropRadius(props[attribute]);
           layer.setRadius(radius);
           //add city to popup content string
           var popupContent = "<p><b>City:</b> " + props.city + "</p>";
           //add number of bars attribute to panel content string
           var year = attribute.split("_")[1];
           popupContent += "<p><b>Number of Bars in " + year + ":</b> " + props[attribute] + "</p>";
           //update popup with new content
           popup = layer.getPopup();
           popup.setContent(popupContent).update();
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
    //create range input element (slider)
    $('#panel').append('<input class="range-slider" type="range">');
    //set slider attributes
    $('.range-slider').attr({
        max: 12,
        min: 0,
        value: 0,
        step: 1
    });
    //add step buttons
    $('#panel').append('<button class="step" id="reverse">Reverse</button>');
    $('#panel').append('<button class="step" id="forward">Forward</button>');
  //replace button content with images
   $('#reverse').html('<img src="img/backward-01.png">');
   $('#forward').html('<img src="img/forward-01.png">');
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

function getData(map){
    //load the data
    $.getJSON("data/lesbianbardecline.geojson", function(response){

            var attributes = processData(response);
            minValue = calcMinValue(response);
            //call function to create proportional symbols
            createPropSymbols(response,attributes);
            createSequenceControls(attributes);
    });
};

$(document).ready(createMap);
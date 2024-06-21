require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/GraphicsLayer",
  "esri/widgets/Sketch/SketchViewModel",
  "utils/evalScripts.js",
  "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js",
  "esri/rest/geometryService",
  "esri/rest/support/ProjectParameters"
], function (Map, MapView, GraphicsLayer, SketchViewModel, evalScripts, Chart, geometryService, ProjectParameters) {
  const map = new Map({
    basemap: "streets-navigation-vector",
  });

  const view = new MapView({
    container: "viewDiv",
    map: map,
    center: [-74.297333, 4.570868], // Longitude, latitude (centered in Colombia)
    zoom: 6,
  });

  const graphicsLayer = new GraphicsLayer();
  map.add(graphicsLayer);

  const sketchViewModel = new SketchViewModel({
    view: view,
    layer: graphicsLayer,
    polygonSymbol: {
      type: "simple-fill",
      color: [150, 150, 150, 0.5],
      style: "solid",
      outline: {
        color: "white",
        width: 1,
      },
    },
  });

  const drawAoiButton = document.createElement("button");
  drawAoiButton.className = "custom-button";
  drawAoiButton.innerHTML = `<calcite-icon icon="polygon" scale="s"></calcite-icon><span>Draw AOI</span>`;
  view.ui.add(drawAoiButton, "top-right");

  const timeSeriesButton = document.createElement("button");
  timeSeriesButton.className = "custom-button";
  timeSeriesButton.innerHTML = `<calcite-icon icon="graph-time-series" scale="s"></calcite-icon><span>Time Series</span>`;
  timeSeriesButton.disabled = true;
  view.ui.add(timeSeriesButton, "top-right");

  let aoiGeometry;

   drawAoiButton.addEventListener("click", () => {
    // Clear any existing graphics
    graphicsLayer.removeAll();

    // Start a new polygon drawing
    sketchViewModel.create("polygon");

    sketchViewModel.on("create", async (event) => {
      if (event.state === "complete") {
        timeSeriesButton.disabled = false;

        const url = "https://sampleserver6.arcgisonline.com/arcgis/rest/services/Utilities/Geometry/GeometryServer";
        // Define the input geometry
        const params = new ProjectParameters({
            geometries: [event.graphic.geometry],
            outSpatialReference: {wkid: 4326} ,
          });

        try {
            
            geometryService.project(url, params).then(function(response){
                aoiGeometry = response[0].rings
                console.log("results: ", response[0].rings);
              });
        
            // aoiGeometry = response
          } catch (error) {
            console.error("Error projecting geometry:", error);
            throw error;
          }
      }
    });
  });

  timeSeriesButton.addEventListener("click", () => {
    const dialog = document.getElementById("timeSeriesDialog");
    dialog.style.display = "block";

    // Center the dialog on the screen
    dialog.style.position = "fixed";
    dialog.style.top = "50%";
    dialog.style.left = "50%";
    dialog.style.transform = "translate(-50%, -50%)";

    let myChart;

    // Function to generate chart
    function generateChart(labels, meanValues) {
      // Destroy current chart if it exists
      if (myChart) {
        myChart.destroy();
      }

      // Process labels to remove time and 'Z'
      const processedLabels = labels.map((label) => label.split("T")[0]);

      const ctx = document.getElementById("timeSeriesChart").getContext("2d");
      myChart = new Chart(ctx, {
        type: "line",
        data: {
          labels: processedLabels,
          datasets: [
            {
              label: "Mean Values",
              data: meanValues,
              borderColor: "blue",
              borderWidth: 1,
              fill: false,
            },
          ],
        },
      });
    }
    // Add event listeners for the buttons
    document
      .getElementById("generateChartButton")
      .addEventListener("click", async () => {
        generateChartButton.disabled = true;
        const icon = generateChartButton.querySelector("calcite-icon");
        const originalIcon = icon.getAttribute("icon");
        icon.setAttribute("icon", "spinner");
        icon.setAttribute("active", "true");

        try {
          const indexSelect = document.getElementById("indexSelect").value;
          const evalScript = evalScripts[indexSelect];
          const body = JSON.stringify({
            input: {
              bounds: {
                geometry: { type: "Polygon", coordinates: aoiGeometry },
              },
              data: [
                {
                  dataFilter: {},
                  type: "sentinel-2-l2a",
                },
              ],
            },
            aggregation: {
              timeRange: {
                from: "2024-01-01T00:00:00Z",
                to: "2024-06-19T00:00:00Z",
              },
              aggregationInterval: {
                of: "P1M",
                lastIntervalBehavior: "SHORTEN",
              },
              width: 512,
              height: 349.389,
              evalscript: evalScript,
            },
            calculations: {
              default: {},
            },
          });

          const response = await fetch("http://localhost:3000/get-statistics", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: body,
          });

          const statisticsData = await response.json();
          console.log(statisticsData)
          const labels = [];
          const meanValues = [];

          statisticsData.data.forEach((item) => {
            labels.push(item.interval.from); //
            meanValues.push(item.outputs.data.bands.B0.stats.mean); //
          });

          // Generate chart with processed data
          generateChart(labels, meanValues);
        } catch (error) {
          console.error("Error fetching statistics:", error);
        } finally {
          icon.setAttribute("icon", originalIcon);
          icon.removeAttribute("active");
          generateChartButton.disabled = false;
        }
      });

    document
      .getElementById("closeDialogButton")
      .addEventListener("click", () => {
        dialog.style.display = "none";
        if (myChart) {
            myChart.destroy();
          }
      });
  });
});

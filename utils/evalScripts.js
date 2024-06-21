define(function () {
  return {
    NDVI:
      `//VERSION=3
      function setup() {
        return {
          input: ["B04", "B08", "SCL", "dataMask"],
          output: [{ id: "data", bands: 1 }, { id: "dataMask", bands: 1 }]
        };
      }
    
      function evaluatePixel(sample) {
      let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
      var validNDVIMask = 1;

      if (sample.B08 + sample.B04 == 0) {
        validNDVIMask = 0;
      }

      var noWaterMask = 1;
      if (sample.SCL == 6) {
        noWaterMask = 0;
      }
      return {
        data: [ndvi],
        // Exclude nodata pixels, pixels where ndvi is not defined and water pixels from statistics:
        dataMask: [sample.dataMask * validNDVIMask * noWaterMask],
      };
      }`
    ,
    GNDVI:
      `//VERSION=3
      function setup() {
        return {
          input: ["B03", "B08", "SCL", "dataMask"],
          output: [{ id: "data", bands: 1 }, { id: "dataMask", bands: 1 }]
        };
      }
    
      function evaluatePixel(sample) {
      let gndvi = (sample.B08 - sample.B03) / (sample.B08 + sample.B03);
      var validGNDVIMask = 1;

      if (sample.B08 + sample.B03 == 0) {
        validGNDVIMask = 0;
      }

      var noWaterMask = 1;
      if (sample.SCL == 6) {
        noWaterMask = 0;
      }
      return {
        data: [gndvi],
        // Exclude nodata pixels, pixels where ndvi is not defined and water pixels from statistics:
        dataMask: [sample.dataMask * validGNDVIMask * noWaterMask],
      };
      }`,
  };
});

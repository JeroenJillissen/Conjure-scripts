const { GarminConnect } = require('garmin-connect');
const cron = require("node-cron");
const { DateTime } = require("luxon");
const https = require('https');


//Garmin Connect login information
const gcUsername = "ADD_EMAIL_ADDRESS";
const gcPassword = "ADD_PASSWORD";

//Conjure variables
const apiToken = "ADD_API_TOKEN";
const measurementId = "ADD_CONJURE_MEASUREMENT_ID";

// Has to be run in an async function to be able to use the await keyword
const main = async () => {
  var yesterday = DateTime.local().setZone('America/Los_Angeles').minus({ days: 1 });
  var yesterdayStr = yesterday.toFormat('yyyy-MM-dd')
  var yesterdayMidnight = DateTime.now().setZone('America/Los_Angeles').set({ hour: 23, minute: 59 }).minus({days:1}).toISO();

  // Create a new Garmin Connect Client
  const GCClient = new GarminConnect();

  // Uses credentials from garmin.config.json or uses supplied params
  await GCClient.login(gcUsername, gcPassword);

  // Get user info
  const info = await GCClient.getUserInfo();

  // Get total steps
  const stepcount = await GCClient.getSteps(new Date(yesterdayStr));

  var totalStepCount = 0;
  for(let i=0; i < stepcount.length; i++){
    totalStepCount += stepcount[i].steps;
  } 

  console.log("Yesterday: "+yesterday);
  console.log("Total steps: "+totalStepCount);

  // Send to Conjure
  var qstring = {
    "query":"mutation measurementCreate($input: MeasurementCreateMutationInput!) {\n  measurementCreate(input: $input) {\n    success\n    errors {\n      ...ValidationErrorsFields\n      __typename\n    }\n    measurement {\n      ...MeasurementFields\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment ValidationErrorsFields on ValidationErrors {\n  messages {\n    attribute\n    messages\n    __typename\n  }\n  fullMessages\n  __typename\n}\n\nfragment MeasurementFields on Measurement {\n  id\n  measureId\n  measureType\n  comment\n  timestamp\n  timestampRelative\n  timestampOffset\n  values\n  meta {\n    key\n    value\n    __typename\n  }\n  createdAt\n  updatedAt\n  __typename\n}\n","variables":{"input":{"measureId":measurementId,"attributes":{"timestamp":"2022-12-22T23:59:59.000-08:00","comment":"","values":{"value":50}}}},"operationName":"measurementCreate"
  };
  qstring.variables.input.attributes.values.value = totalStepCount;
  qstring.variables.input.attributes.timestamp = yesterdayMidnight;
      
  var data = JSON.stringify(qstring);
  var options = {
    hostname: 'api.conjure.so',
    path: '/graphql',
    method: 'POST',
    headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length,
          'Authorization': apiToken
    
        }
  };
  
  const req = https.request(options, (res) => {
      console.log(`statusCode: ${res.statusCode}`)
    
      res.on('data', (d) => {
        process.stdout.write(d)
      })
  })
  
  req.on('error', (error) => {
    console.error(error)
  })
  
  req.write(data)
  req.end()
};


// Run the code
cron.schedule('10 15 * * *', () => {
    console.log('running a task daily at 15:10 UCT');
    main();
});




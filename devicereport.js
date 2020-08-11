const fs           = require('fs');
const path         = require('path');
const http         = require("http");
// const https      = require("https");
const express      = require('express');
const SmartApp     = require('@smartthings/smartapp');
const request      = require('request');
const util         = require('util');
const cookieParser = require('cookie-parser');
// load supporting modules
var utils = require("./utils");

// const ngrok      = require('ngrok');
const PORT       = 8181;
const baseUrl    = "https://api.smartthings.com";

var appId;

var GLB = {};
// var clients = [];
var allthings = {};

var app = express();
app.use(express.json());
var dir = path.join(__dirname, '');
app.use(express.static(dir));
app.use(cookieParser());

// var key = fs.readFileSync("client-1.local.key");
// var crt = fs.readFileSync("client-1.local.crt");
// var credentials = {key: key, cert: crt};
var httpServer = http.createServer(app);
// var httpsServer = https.createServer(credentials, app);

// function setCookie(res, thevar, theval, days) {
//     var options = {SameSite: "lax"};
//     if ( !days ) {
//         days = 365;
//     }
//     options.maxAge = days*24*3600*1000;
//     res.cookie(thevar, theval, options);
// }

function curl_call(host, headertype, nvpstr, formdata, calltype, callback) {
    var opts = {url: host};
    if ( !calltype ) {
        calltype = "GET";
    }
    opts.method = calltype;
    
    if ( nvpstr && typeof nvpstr === "object" ) {
        opts.form = nvpstr;
    } else if ( nvpstr && typeof nvpstr === "string" ) {
        opts.url = host + "?" + nvpstr;
    }
    
    if (formdata) {
        opts.formData = formdata;
    }
    
    if ( headertype ) {
        opts.headers = headertype;
    }
    request(opts, callback);
}

function ddbg() {
    var d = new Date();
    var dstr = d.toLocaleDateString() + "  " + d.toLocaleTimeString() + " ";
    return dstr;
}

function ignore(subid) {
    // thanks to the authors of HomeBridge for this list
    const ignore = [
        'DeviceWatch-DeviceStatus', 'DeviceWatch-Enroll', 'checkInterval', 'devTypeVer', 'dayPowerAvg', 'apiStatus', 'yearCost', 'yearUsage','monthUsage', 'monthEst', 'weekCost', 'todayUsage',
        'supportedPlaybackCommands', 'groupPrimaryDeviceId', 'groupId', 'supportedTrackControlCommands', 'presets',
        'maxCodeLength', 'maxCodes', 'readingUpdated', 'maxEnergyReading', 'monthCost', 'maxPowerReading', 'minPowerReading', 'monthCost', 'weekUsage', 'minEnergyReading',
        'codeReport', 'scanCodes', 'verticalAccuracy', 'horizontalAccuracyMetric', 'altitudeMetric', 'latitude', 'distanceMetric', 'closestPlaceDistanceMetric',
        'closestPlaceDistance', 'leavingPlace', 'currentPlace', 'codeChanged', 'codeLength', 'lockCodes', 'healthStatus', 'horizontalAccuracy', 'bearing', 'speedMetric',
        'speed', 'verticalAccuracyMetric', 'altitude', 'indicatorStatus', 'todayCost', 'longitude', 'distance', 'previousPlace','closestPlace', 'places', 'minCodeLength',
        'arrivingAtPlace', 'lastUpdatedDt'
    ];
    return ignore.includes(subid);
}

/* Define the SmartApp */
const smartapp = new SmartApp()
    // If you do not have it yet, omit publicKey()
    // the value stored in the .pub file is the AppID found on the Automation Connector webpage in the Workspace
    // clinet ID = 43bf50e9-8e07-4a55-9c8d-c8fdb815da2b
    // client Secret = 4964ee22-051d-46a3-b471-478ee32b7f48
    .publicKey('@devicereport.pub') // optional until app verified
    // .enableEventLogging(2) // logs all lifecycle event requests and responses as pretty-printed JSON. Omit in production
    // .configureI18n()
    .page('mainPage', (context, page, configData) => {
        page.section("Welcome to HousePanel", section => {
            section.paragraphSetting("---------------")
            .name("HousePanel Configuration")
            .description("this is where you select the items to display");
        });
        page.section('Switches and Lights', section => {
            section.deviceSetting('switch').name("Which switches?").capability('switch').multiple(true).required(false).permissions('rx');
            section.deviceSetting('switchLevel').name("Which dimmers?").capability('switchLevel').multiple(true).required(false).permissions('rx');
            section.deviceSetting('colorControl').name("Which color bulbs?").capability('colorControl').multiple(true).required(false).permissions('rx');
            section.deviceSetting('button').name("Which buttons?").capability("button").multiple(true).required(false).permissions('rx');
        });
        page.section('Presence and Motion', section => {
            section.deviceSetting('presence').name("Which presence?").capability('presenceSensor').multiple(true).required(false).permissions('r');
            section.deviceSetting('motionSensor').name("Which motion sensors?").capability('motionSensor').multiple(true).required(false).permissions('r');
        });
        page.section('Contacts and Doors', section => {
            section.deviceSetting('contactSensor').name("Which contact sensors?").capability('contactSensor').multiple(true).required(false).permissions('r');
            section.deviceSetting('doorControl').name("Which door controllers?").capability('doorControl').multiple(true).required(false).permissions('rx');
            section.deviceSetting('lock').name("Which locks?").capability('lock').multiple(true).required(false).permissions('rx');
        });
        page.section('Thermostat and Weather', section => {
            section.deviceSetting('thermostat').name("Which thermostats?").capability('thermostat').multiple(true).required(false).permissions('rx');
            section.deviceSetting('temperatureMeasurement').name("Which temperature measurements?").capability('temperatureMeasurement').multiple(true).required(false);
            section.deviceSetting('illuminanceMeasurement').name("Which illuminance measurements?").capability('illuminanceMeasurement').multiple(true).required(false);
        });
        page.section ("Water, Sprinklers & Smoke", section => {
            section.deviceSetting("waterSensor").name("Which water sensors").capability("waterSensor").multiple(true).required(false).permissions('rx');
            section.deviceSetting("valve").name("Which valves").capability("valve").multiple(true).required(false).permissions('rx');
            section.deviceSetting("smokeDetector").name("Which smoke sensors").capability("smokeDetector").multiple(true).required(false).permissions('r');
        });
        page.section ("Music & Autio", section => {
            section.paragraphSetting("Music Info").name("About Music Things").description("Music things use the legacy Sonos device handler. Audio things use the new Audio handler that works with multiple audio device types including Sonos.");
            section.deviceSetting("musicPlayer").name("Which Music Players").capability("musicPlayer").multiple(true).required(false).permissions('rx');
            section.deviceSetting("audioNotification").name("Which Audio Devices").capability("audioNotification").multiple(true).required(false).permissions('rx');
        });
        page.section ("Other Sensors & Actuators", section => {
            section.paragraphSetting("Other Info").name("About Sensors and Actuators").description("Any thing can be added as an Other sensor or actuator. Other sensors and actuators bring in ALL fields and commands supported by the device.");
            section.deviceSetting("sensor").name("Which Other Sensors").capability("sensor").multiple(true).required(false).permissions('r');
            section.deviceSetting("actuator").name("Which Other Actuators").capability("actuator").multiple(true).required(false).permissions('rx');
        });
    })
    .updated(async (context, updateData) => {

        // Called for both INSTALLED and UPDATED lifecycle events if there is no separate installed() handler
        var updatedId = updateData.installedApp.installedAppId;
        console.log("appId: ", appId, " updatedId: ", updatedId);
        appId = updatedId;
        await context.api.subscriptions.unsubscribeAll(updatedId);

        var myids = {switch: "switch", switchlevel: "switchLevel", bulb: "colorControl", button: "button",
                     presence: "presence", motion: "motionSensor", 
                     contact: "contactSensor", door: "doorControl", lock: "lock",
                     thermostat: "thermostat", temperature: "temperatureMeasurement", illuminance: "illuminanceMeasurement",
                     water: "waterSensor", valve: "valve", smoke: "smokeDetector",
                     music: "musicPlayer", audio: "audioNotification",
                     other: "other", actuator: "actuator" };
        for ( var swtype in myids ) {
    
            var id = myids[swtype];
            var devmap = await context.configDevicesWithState(id);
            if ( devmap ) {
                devmap.forEach( function(device) {
                    // save the device into our allthings array
                    var idx = swtype + "|" + device.deviceId;
                    allthings[idx] = {id: device.deviceId, name: device.label, type: swtype, hubnum: appId};
                    allthings[idx]["value"] = {name: device.label};
                    // console.log((ddbg()),  util.inspect(device, false, null, true) );

                    // loop through all capabilities and save in main array
                    for (var capability in device.state) {
                        for (var subid in device.state[capability]) {
                            if ( !ignore(subid) && device.state[capability][subid]["value"]!== null ) {
                                allthings[idx]["value"][subid] = device.state[capability][subid]["value"];
                            }
                        }
                    }
                });
            }
        }
        console.log((ddbg()), "allthings: ", util.inspect(allthings, false, null, false));

        var switches = [];
        for (var item in context.config ) {
            var devices = context.config[item];
            switches = switches.concat(devices);
        }
        context.api.subscriptions.subscribeToDevices(switches, '*', '*', 'switchEventHandler');


    })
    .subscribedDeviceEventHandler('switchEventHandler', (context, event) => {
        if ( event.stateChange===true && !ignore(event.attribute) ) {
            handleEvent(context, event);
        }
    });

function handleEvent(context, event) {
    var thing = null;
    for ( var idx in allthings ) {
        if ( allthings[idx].id === event.deviceId ) {
            thing = allthings[idx];
            break;
        }
    }
    if ( thing ) {
        console.log((ddbg()), "Known Event triggered: name: ", thing.name," type: ", thing.type, "event: ", event);
    } else {
        console.log((ddbg()), "Unknown Event triggered: event: ", event);
    }
        // context.api.devices.sendCommands(context.config.lights, 'switch', value);
}

// async function getngrok(port) {
//     var url = await ngrok.connect(port);
//     console.log((ddbg()), "Use this ngrok based URL to register the SmartApp: ", url);
// };

// define all the mime types that can be rendered
var mime = {
    html: 'text/html',
    txt: 'text/plain',
    css: 'text/css',
    gif: 'image/gif',
    jpg: 'image/jpeg',
    png: 'image/png',
    svg: 'image/svg+xml',
    js: 'application/javascript'
};

app.get('*', function (req, res) {
        
    var $tc = "";
    GLB.returnURL = req.protocol + "://" + req.headers.host;

    if ( req.path==="/" || typeof req.path==="undefined" || req.path==="/undefined" || req.path==="undefined" ) {


        // load our user setup and render page
        // readRoomThings("main", uname);
        // $tc = mainPage(uname, req.headers.host, req.path);
        $tc = utils.getHeader();
        $tc = $tc + "URL: " + GLB.returnURL + "<br />";
        for ( var idx in allthings ) {
            $tc = $tc + "<div class=\"filteroption\">" + allthings[idx].name;
            for (var subid in allthings[idx].value)  {
                $tc = $tc + "<div>" + subid + ": " + allthings[idx].value[subid] + "</div>";
            }
            $tc = $tc + "</div>";
        }
        $tc = $tc + utils.getFooter();

        res.send($tc);
        res.end();


    } else {
        var file = path.join(dir, req.path.replace(/\/$/, '/index.html'));
        if (file.indexOf(dir + path.sep) !== 0) {
            res.status(403).end('Forbidden');
        }
        var type = mime[path.extname(file).slice(1)] || 'text/plain';
        var s = fs.createReadStream(file);
        s.on('open', function () {
            res.set('Content-Type', type);
            // res.type(type)
            s.pipe(res);
        });
        s.on('error', function () {
            res.set('Content-Type', 'text/plain');
            res.status(404).end(req + ' Not found');
        });
    }
});

/* Handle POST requests */
app.post('/', function(req, res) {
    appId = req.body.appId;
    var evt = req.body;
    var lifecycle = evt.lifecycle;
    if ( lifecycle === "CONFIRMATION" ) {
        var host = req.body.confirmationData.confirmationUrl;
        curl_call(host, false, false, false, "GET", function(err, res, body) {
            console.log((ddbg()), "Confirmation: ", body);
        });
    } else {
        smartapp.handleHttpCallback(req, res);
    }
});


/* Start listening at your defined PORT */
httpServer.listen(PORT, () => {
    console.log((ddbg()), "Server is up and running on port: ", PORT);
    // getngrok(PORT);
});

// httpsServer.listen(S_PORT, () => {
//     console.log((ddbg()), "Secure server is up and running on port: ", S_PORT);
// });

const express = require('express');
const Smartglass = require('xbox-smartglass-core-node');
var SystemInputChannel = require('xbox-smartglass-core-node/src/channels/systeminput');
const EventEmitter = require('events');

const app = express();
const port = 3000;

// This function connects to the Xbox and fetches the current running app
async function getRunningApp(ip) {
    return new Promise((resolve, reject) => {
        const sgClient = Smartglass();

        // Custom event emitter to wait for the active app
        const customEmitter = new EventEmitter();

        // Listen for console status to get the current app
        customEmitter.on('_on_console_status', (message) => {
            if (message.packet_decoded.protected_payload.apps[0]) {
                const currentApp = message.packet_decoded.protected_payload.apps[0].aum_id;
                resolve(currentApp);
            } else {
                resolve('No app running');
            }
        });

        // Connect to the Xbox at the provided IP
        sgClient.connect(ip).then(() => {
            console.log(`Connected to Xbox at IP: ${ip}`);

            // Adding manager for system input
            sgClient.addManager('system_input', SystemInputChannel());

            // Listen for console status messages
            sgClient.on('_on_console_status', (message) => {
                customEmitter.emit('_on_console_status', message);
            });

            // Wait for the connection and the app info
            setTimeout(() => {
                sgClient.disconnect();
                reject('Timeout: Unable to fetch app info');
            }, 5000); // 5-second timeout
        }).catch((err) => {
            reject('Error connecting to Xbox: ' + err);
        });
    });
}

// Define the HTTP GET endpoint
app.get('/current-app', async (req, res) => {
    const ip = req.query.IP;
    if (!ip) {
        return res.status(400).send('IP query parameter is required');
    }

    try {
        console.log(`Received request for IP: ${ip}`);
        const currentApp = await getRunningApp(ip);
        res.send(currentApp);
    } catch (err) {
        console.error('Error occurred:', err);
        res.status(500).send(err);
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

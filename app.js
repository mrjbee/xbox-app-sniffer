const express = require('express');
const Smartglass = require('xbox-smartglass-core-node');
var SystemInputChannel = require('xbox-smartglass-core-node/src/channels/systeminput');
const EventEmitter = require('events');
const dotenv = require('dotenv');
const app = express();
const port = 3000;

// Load environment variables
dotenv.config();

// Store the last known apps by IP and the list of active clients
const appMemory = {};
const activeClients = {};

// Parse Xbox IPs from environment variable
const xboxIps = process.env.XBOX_IPS ? process.env.XBOX_IPS.split(',') : [];

const reconnectDelay = process.env.RETRY_DELAY ? process.env.RETRY_DELAY : 1 * 60 * 1000;

console.log("- Retry delay is:" + reconnectDelay)
console.log("- XBOX ips:" + xboxIps)

// Function to connect to an Xbox and monitor the running app
function monitorXbox(ip) {
    const sgClient = Smartglass();

    const customEmitter = new EventEmitter();

    // Try to connect to Xbox
    sgClient.connect(ip).then(() => {
        console.log(`Connected to Xbox at IP: ${ip}`);

        // Add system input manager
        sgClient.addManager('system_input', SystemInputChannel());

        // Listen for the console status to get the active app
        sgClient.on('_on_console_status', (message) => {
            if (message.packet_decoded.protected_payload.apps[0]) {
                const currentApp = message.packet_decoded.protected_payload.apps[0].aum_id;
                appMemory[ip] = currentApp; // Store the current app in memory
            }
        });

        // Listen for disconnections and attempt to reconnect
        sgClient.on('_on_timeout', () => {
            console.log(`Disconnected from Xbox at IP: ${ip}`);
            delete appMemory[ip]
            // Retry after 5 minutes
            setTimeout(() => {
                monitorXbox(ip);
            }, reconnectDelay);
            delete activeClients[ip]
            sgClient._closeClient()
            console.log(`!Disconnected from Xbox at IP: ${ip}`);

        });

        activeClients[ip] = sgClient; // Track this client

    }).catch((err) => {
        console.error(`Error connecting to Xbox at IP: ${ip} - ${err}`);
        // Retry after 5 minutes if connection fails initially
        setTimeout(() => {
            monitorXbox(ip);
        }, reconnectDelay);
    });
}

// Initialize connections for all Xbox IPs
xboxIps.forEach(ip => {
    monitorXbox(ip);
});

// Endpoint to get the currently running app for a specific Xbox IP
app.get('/current-app', (req, res) => {
    const ip = req.query.IP;
    if (!ip) {
        return res.status(400).send('IP query parameter is required');
    }

    const currentApp = appMemory[ip];
    if (currentApp) {
        res.send(currentApp);
    } else {
        res.status(404).send(`No app found for Xbox at IP: ${ip}`);
    }
});

// API to get all active apps
app.get('/list-apps', (req, res) => {
    const appsList = xboxIps.map(ip => {
        // Check if the app exists for this IP, if not, return the IP with an empty app string
        const app = appMemory[ip] || 'NO APP';
        return `${ip}:${app}`;
    }).join(',');

    res.send(appsList);
});

// Graceful shutdown on SIGINT or SIGTERM
function shutdown() {
    console.log('Shutting down server...');

    // Disconnect all active Xbox clients
    Object.entries(activeClients).forEach(([ip, client]) => {
        client._closeClient();
        console.log(`Disconnected Xbox client ${ip}`);
    });

    // Close the server
    server.close(() => {
        console.log('Server has been closed');
        process.exit(0);
    });
}

// Handle termination signals (Ctrl+C or kill)
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the server
var server = app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

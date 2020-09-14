const fs = require('fs');
const path = require('path');

// Files
const responsePath = path.join(__dirname, 'responses.json');
const configPath = path.join(__dirname, '../../config.json');

if (!fs.existsSync(responsePath)) {
    throw new Error(`[altv-os-auth] Failed to read responses.json. Try re-installing with 'altv-pkg'`);
}

const responsesData = fs.readFileSync(responsePath);
let responses;

try {
    responses = JSON.parse(responsesData);
} catch (err) {
    throw err;
}

if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, '{}');
}

const configData = fs.readFileSync(configPath);
let config;

try {
    config = JSON.parse(configData);
} catch (err) {
    throw err;
}

config.url = responses[0]; // url
config.database = responses[1]; // database name
config.collections = ['accounts']; // Collection

if (responses[2] && responses[3]) {
    config.username = responses[2];
    config.password = responses[3];
}
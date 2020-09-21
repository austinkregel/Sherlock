const fs = require('fs');
const axios = require('axios');
const express = require('express');
const app = express();
const Sherlock = require('./src/Sherlock');
const ora = require('ora');

const spinner = ora('Starting the app...').start({
    spinner: 'dots'
});

const service = new Sherlock(spinner);

const DEBUG_MODE = process.env.DEBUG_MODE || false;

if (DEBUG_MODE) {
    Object.keys(devices)
        .map(key => devices[key])
        .map(device => {
            spinner.info(`Loading device ${device.name || device.ip}`.trim())
        })
}

const fetchNewOuiFile = async () => {
    if (fs.existsSync(__dirname + '/oui.csv')) {
        return;
    }

    const { data } = await axios.get('https://standards.ieee.org/develop/regauth/oui/oui.csv');

    fs.writeFileSync(__dirname + '/oui.csv', data)
    
    console.log('Please restart the app. We downloaded a new OUI file.')
    process.exit();
}

const httpServer = () => {
    app.get('/', function (req, res) {
        res.send(Object.values(service.devices))
    })

    app.post('/:device', async (req, res) => {
        if (req.params.device) {
            return res.status(404).send({
                message: 'Unknown route.'
            })
        }

        if (!this.devices[req.params.device]) {
            return res.status(404).send({
                message: 'Unknown device.'
            })
        }

        await Sherlock.portSearchAll(req.params.device);

        res.send({
            message: "Successfully portscanned 10,000 ports for that address."
        })
    });

    app.listen(3000)
}

var loop;
process.on('SIGINT', () => {
    console.log('SIGINT!')
    clearInterval(loop);
    service.save(__dirname + "/devices.json");
    process.exit();
})

const startApp = async () => {
    await fetchNewOuiFile();
    spinner.stopAndPersist({
        symbol: '✔',
        text: 'Loaded the OUI file',
        color: 'green',
    });

    await service.boot();
    await service.expandOpenPortSearch();

    spinner.start('Starting HTTP Server.');
    await httpServer();

    spinner.stopAndPersist({
        symbol: '✔',
        text: 'Started http server',
        color: 'green',
    });

    spinner.succeed('http://localhost:3000')
    loop = setInterval(() => service.boot(), 60000);
};

startApp();
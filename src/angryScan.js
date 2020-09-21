const evilscan = require('evilscan');
const portMappings = require('./portMapping');

const joinDataTogther = (network, data) => ({
    ...network,
    [data.ip]: Object.values({
        ...(network[data.ip]||{}),
        [data.port]: {
            port: data.port,
            name: portMappings[data.port],
        },
    }),
})

const angryScan = (ip) => {
    return new Promise((resolve, reject) => {
        let network = {};
        const scanner = new evilscan({
            target: ip,
            port: '20-25,53,80,88,100-162,389,443,444,465,993,1560-1590,1883,3000,3020,3074,3306,3389,3535,4000,5000,5050,5353,5432,5984,6000-6063,6665-6669,6697,7000,7400-7402,8000,8080,8123,8140,32400,2082,3479,3480,5000,5001,5050,7396,7777,8006,8443,8883,9000,9001,9094,9293,9200,9993,10001,16384-16473,18091,18092,19132,19133,25565,27017-27037,36330',
            status: 'O',
        })
        
        scanner.on('result',function(data) {
            // fired when item is matching options
            if (data.status === 'open') {
                network = joinDataTogther(network, data);
            }
        });

        scanner.on('done', function() {
            // finished !
            resolve(network)
        });

        scanner.run();
    });
}

const angryScanAll = (ip) => {
    return new Promise((resolve, reject) => {
        let network = {};
        const scanner = new evilscan({
            target: ip,
            port: '1-10000',
            status: 'O',
        })
        
        scanner.on('result',function(data) {
            // fired when item is matching options
            if (data.status === 'open') {
                network = joinDataTogther(network, data);
            }
        });

        scanner.on('done', function() {
            // finished !
            resolve(network)
        });

        scanner.run();
    });
}

module.exports = { angryScan, angryScanAll };
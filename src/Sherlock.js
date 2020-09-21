const fs = require('fs');
const arp = require('@network-utils/arp-lookup');
const { angryScan, angryScanAll } = require('./angryScan');
const dnsLookup = require('./dnsLookup');
const mac = require('./macLookup');
const DEBUG_MODE = process.env.DEBUG_MODE || false;
const dayjs = require('dayjs');
dayjs.extend(require('dayjs/plugin/localizedFormat'))

module.exports = class Sherlock {
    constructor(spinner) {
        this.devices = fs.existsSync(__dirname + '/../devices.json') 
            ? JSON.parse(fs.readFileSync(__dirname + '/../devices.json')) 
            : {};;
        this.spinner = spinner
    }

    save(path) {
        fs.writeFileSync(path, JSON.stringify(this.devices));
    }

    async arpNetworkDevices() {
        const table = await arp.getTable()
    
        table.map(device => {
            this.devices[device.mac] = this.standardize(device);
            if (DEBUG_MODE) {
                this.spinner.info(`Found device ${device.ip}`.trim())
            }
        })
    }

    async pairNetworkDevicesToOpenPorts() {
        await Promise.all(Object.keys(this.devices).map(async macAddr => {
            const device = this.devices[macAddr];
            const { [device.ip]: openPorts } = await angryScan(device.ip);
    
            this.devices[macAddr] = this.standardize({
                ...device,
                ports: (openPorts || [])
            });
    
            if (openPorts && DEBUG_MODE) {
                this.spinner.info(`Found open ports on ip ${device.ip}: ${(openPorts).join(', ')}`.trim())
            }
        }))
    }

    async pairNetworkDevicesToMacVendor(){
        await Promise.all(Object.keys(this.devices).map(async (macAddr) => {
            const identifier = macAddr.substr(0, 8).replace(':', '');
            mac.lookup(identifier, (err, name) => {
                if (err) {
                    return;
                }
                if (name) {
                    this.devices[macAddr] = this.standardize({
                        ...this.devices[macAddr],
                        vendor: name
                    });

                    if (DEBUG_MODE) {
                        this.spinner.info(`New vendor ${name}`.trim())
                    }        
                }
            })
        }))
    }

    async lookupHostnamesFromIp() {
        await Promise.all(
            Object.keys(this.devices)
                .map(async (macAddr) => {
                    const device = this.devices[macAddr];
    
                    try {
                        const names = await dnsLookup(device.ip);

                        if (names.length === 1) {
                            this.devices[macAddr].name = names.join('')
                        } else {
                            this.devices[macAddr].dns = names;
                        }

                        if (DEBUG_MODE) {
                            this.spinner.info(`Found hosts on ip: ${device.ip} - ${names.join(', ')}`.trim())
                        }
                    } catch (e) { 
    
                    }
                })
            )
    }

    async portSearchAll(macAddr) {
        const device = this.devices[macAddr];
        this.spinner.text = `Digging Deeper on device ${device.ip}`;

        const { [device.ip]: openPorts } = await angryScanAll(device.ip);
        
        this.devices[macAddr] = this.standardize({
            ...device,
            ports: (openPorts || [])
        });
        if (openPorts && DEBUG_MODE) {
            this.spinner.info(`Found open ports on ip ${device.ip}: ${(openPorts).join(', ')}`.trim())
        }
    }

    async expandOpenPortSearch() {
        const devicesToQuery = Object.keys(this.devices)
            .filter(macAddr=> this.devices[macAddr].ports.length > 5);

        this.spinner.stopAndPersist({
            symbol: '✔',
            color: 'green',
            text: `Found ${devicesToQuery.length} devices with 6 or more open ports. Looking further at these devices!`
        });

        this.spinner.start(`Digging Deeper...`);
        
        for (let key in devicesToQuery) {
            try {
                const macAddr = devicesToQuery[key];
                await this.portSearchAll(macAddr)
            } catch (e){ 
                console.error('continuing', e)
            }
        }
    }

async updateDNS() {
    Object.keys(this.devices)
        .map(macAddr => {
            const device = this.devices[macAddr];
            const ports = device.ports.filter(({ name }) => name && name.toLowerCase().includes('http'))
                .map((port) => {
                    if (!port) {
                        return;
                    }

                    if (device.name === '') {
                        return;
                    }

                    if (port.name.toLowerCase().includes('https')) {
                        var addr = `https://${device.name}:${port.port}/`;
                    } else {
                        var addr = `http://${device.name}:${port.port}/`;
                    }

                    const dns = this.devices[macAddr].dns;

                    dns.push(addr);

                    this.devices[macAddr].dns = [
                        ...new Set(dns)
                    ]
                })
        })
    }

    async boot () {
        this.spinner.start('Querying the network devices, this may take a moment.');
        const before = Object.keys(this.devices).length;
        await this.arpNetworkDevices();
        await this.lookupHostnamesFromIp();
        await this.pairNetworkDevicesToMacVendor();
        await this.pairNetworkDevicesToOpenPorts();
        await this.updateDNS();
        const after = Object.keys(this.devices).length;

        this.save(__dirname + '/../devices.json');

        let message = '';
        if (before != after) {
            const removed = before > after;

            if (removed) {
                message = `Removed ${before - after} devices [${dayjs().format('LLL')}].`
            } else {
                message = `Added ${after - before} devices [${dayjs().format('LLL')}].`
            }
        } else {
            message = `Nothing changed [${dayjs().format('LLL')}].`
        }


        this.spinner.stopAndPersist({
            symbol: '✔',
            text: message,
            color: 'green',
        });
    }

    standardize(device) {
        return ({
            ip: '',
            mac: '',
            type: '',
            vendor: '',
            ports: [],
            name: '',
            dns: [],
            ...device
        })
    }
}
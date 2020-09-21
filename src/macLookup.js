const macLookup = require('mac-lookup');
const fs = require('fs');
const mac = fs.existsSync(__dirname + '/oui.csv') ? new macLookup.constructor({
    csv: __dirname + '/oui.csv',
}) : macLookup;


mac.rebuild(function (err) {
    if (err) throw err;
    console.log('rebuild completed');
});

mac.load(done => {
    if(done) {
        done()
    }
});

module.exports = mac;
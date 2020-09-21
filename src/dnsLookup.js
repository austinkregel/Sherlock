const dns = require('dns');

module.exports = (ip) => new Promise((resolve, reject) => dns.reverse(ip, (err, names) => {
    if (err) return reject(err);

    resolve(names);
}))
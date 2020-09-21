var bonjour = require('bonjour')()
  
module.exports = {
    findAll() {
        bonjour.find({ }, function (service) {
            console.log(service)
        })
    }
}
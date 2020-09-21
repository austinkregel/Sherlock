## What is this?
This is a tool I put together to help me find the IPs of devices on my network from a more central location. 

## Why?
My homelab has a number of servers on it, and when I reboot the network sometimes my IPs change (yea, I don't use static IPs, I know I created this problem... I don't wanna have to configure static IPs...)

## Okay but how do I install it?
At the moment.

```
git clone git@github.com:austinkregel/Sherlock.git
cd Sherlock
npm i
node index.js
```

Then it will download the latest OUI file from the IEEE, update the `devices.json` file with existing devices on the network, start an http server on port 3000 by default, and then it will recheck the network once every minute and update the file as needed.

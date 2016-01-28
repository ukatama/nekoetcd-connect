'use strict';

const fs = require('fs-promise');
const request = require('request-promise');
const os = require('os');

const app = process.env.APP;
const hosts = os.platform() === 'win32'
        ? `${process.env.SystemRoot}/System32/drivers/etc/hosts`
        : '/etc/hosts';
const logger = console;
const port = process.env.PORT || 4001;

const update = () => {
    logger.info('Updating ip address');

    fs.readFile(hosts)
        .then((file) => file.toString()
                .split(/\r\n|\n/)
                .map((line) =>
                    line.replace(/\s\s+/, ' ')
                        .replace(/(#.*$)/, '')
                        .match(/^\s*([^\s]+)\s+(([^\s]+\s*)+)$/)
                )
                .filter((m) => m)
                .map((m) => [m[1], m[2].split(/\s+/)])
                .map((m) => m[1].indexOf(app) >= 0 && m[0])
                .find((a) => a)
        )
        .then(
            (address) => 
                address || Promise.reject(new Error('Failed to resolve app to address'))
        )
        .then((address) => request({
                method: 'PUT',
                uri: `http://etcd:${port}/v2/keys/${app}?value=${address}`,
                json: true,
            })
            .then((data) => {
                logger.info(
                    'Addres of',
                    data.node.key,
                    'has been updated to',
                    data.node.value,
                    'from',
                    data.prevNode && data.prevNode.value || null
                );
            })
        )
        .catch((e) => logger.error(e))
        ;
};

update();
setInterval(update, 1000 * 60 * 10);
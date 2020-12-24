const reformatOutput = (stdout) => {
    return (typeof stdout !== 'string')
        ? stdout
        : stdout
            .match(/^(?!(PROC|COPY|\n)).*/gm)
            .join('\n')
            .replace(/\u001B\[33m/gi, '&#x1F536;')
            .replace(/\u001B\[39m/gi, '')
            .replace(/\u001B\[31m/gi, '&#x1F534;')
            .replace(/(\u001B\[1m)|(\u001B\[22m)/gi, '**')
            .replace(/\n\nBuild time: \d*.*\d*(ms|s)/, '');
};

const conclusionTypes = {
    success: 'success',
    failure: 'failure',
};

const checkResultMessageTemplate = (result) => `check-runs was ${result}.`;
const getLogger = (id) => (msg) => console.log(`[${id}]: ${msg}`);
const getAdminMessage = (id) => `An unexpected error has occurred, could you please contact admins. Your RequestID: ${id}`;
const getBucketUrl = (folderId, bucket, source) =>
    `Source are stored in https://console.cloud.yandex.ru/folders/${folderId}/storage/bucket/${bucket}?key=${source}`;

module.exports = {
    reformatOutput,
    conclusionTypes,
    checkResultMessageTemplate,
    getLogger,
    getAdminMessage,
    getBucketUrl,
};
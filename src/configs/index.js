const { getEnv } = require('../utils');

const env = getEnv();

module.exports = require(`./${env}.js`);
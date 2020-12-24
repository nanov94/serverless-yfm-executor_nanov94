const { Environment } = require('./models');

const getEnv = () => {
    const env = process.env.APP_ENV;

    return env || Environment.Test;
};

module.exports = {
    getEnv,
}
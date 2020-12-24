const express = require('express');
const bodyParser = require('body-parser');
const { checkYFM } = require('./src/checkYfm');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.post('/', async function (req, res) {
    checkYFM(req);

    res.sendStatus(200);
});

app.listen(3000);
const express = require('express');
const bodyParser = require('body-parser');
const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const fs = require('fs');
const util = require('util');
const exec = util.promisify(require('child_process').exec);


const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get("/", function (request, response) {
    console.log('GET request');
    response.send('TEST');
});

const getLogger = (id) => (msg) => console.log(`[${id}]: ${msg}`);

app.post('/', async function (req, res) {
    console.log('POST request');

    //res.sendStatus(200);
    //res.send('POST request to the homepage');

    const source = '/tmp/source';
    const inputDir = `${source}/input`;
    const outputDir = `${source}/output`;
    const checkRunName = 'YFM';
    // const requestID = context.requestId;
    const logger = getLogger('requestID');

    try {
        await exec(`rm -rf ${source}/*`);

        const data = req.body;

        if (data === null || data === undefined) {
            throw new Error(`Invalid input data equals: ${data}`);
        }

        const repoFullName = data.pull_request.head.repo.full_name;
        const repoName = data.pull_request.head.repo.name;
        const refName = data.pull_request.head.ref;
        const headSHA = data.pull_request.head.sha;
        const issueId = data.number;
        const owner = data.sender.login;

        // logger('Setup auth');
        // const [appOctokit, octokit] = getAppAuth();

        // const createCheckRuns = getCreateCheckRuns(appOctokit, owner, repoName, checkRunName, headSHA);
        // const createComments = getCreateComments(octokit, owner, repoName, issueId);
        // const addCheckResult = getAddCheckResult(createCheckRuns, createComments, logger);

        try {
            // logger(checkResultMessageTemplate(`creation was started with owner: ${owner}, repo: ${repoName}, issueId: ${issueId}`));

            // await createCheckRuns('in_progress');
            // logger(checkResultMessageTemplate(`created with owner: ${owner}, repo: ${repoName}, issueId: ${issueId}`));

            logger('Cloning was started');
            await git.clone({ fs, http, dir: inputDir, ref: refName, url: `https://github.com/${repoFullName}.git` });
            logger('Cloning was finished');

            logger('YFM was started');
            const { stdout } = await exec(`
                export YFM_STORAGE_KEY_ID=PfztUN1PQrmljzW5IQJP;
                export YFM_STORAGE_SECRET_KEY=QRDfgnEyzgjA4SDPL-NHHBtRCwnl8RcwFsLyq2G4;
                export YFM_STORAGE_PREFIX=nanov94testfolder;
                export S3_ACCESS_KEY_ID=AVGQh5AqhxNuuXNOzc7b;
                export S3_SECRET_ACCESS_KEY=9CduaI4coKr_IsDL0Pn-ljGa4EtCGULncLQHoanx;
                npx yfm -i ${inputDir} -o ${outputDir} -q --publish --storageBucket=nanov94-os --storageEndpoint=storage.yandexcloud.net`);
            logger('YFM was finished');

            console.log(stdout);

            // await addCheckResult(
            //     stdout,
            //     checkResultMessageTemplate('completed successfully'),
            //     getAdditionalCheckParameters(conclusionTypes.success, requestID));

        } catch (error) {
            const { stdout } = error;

            // await addCheckResult(
            //     stdout || getAdminMessage(requestID),
            //     checkResultMessageTemplate('failed'),
            //     getAdditionalCheckParameters(conclusionTypes.failure, requestID));

            throw error;
        }
    } catch (error) {
        logger(`Error has occurred. ${error}`);


        // return {
        //     statusCode: 500,
        //     body: JSON.stringify(error),
        // };
    }

    // return {
    //     statusCode: 200,
    //     body: 'Ok',
    // };
});

app.listen(3000);
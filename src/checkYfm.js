const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const fs = require('fs');
const util = require('util');
const uuid = require('uuid');
const exec = util.promisify(require('child_process').exec);
const { Octokit } = require('@octokit/core');
const { createAppAuth } = require('@octokit/auth-app');

const { s3, yfmStorage, github } = require('./configs');

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

const checkYFM = async (request) => {
    console.log(request.requestId);
    const source = '/tmp/source';
    const inputDir = `${source}/input`;
    const outputDir = `${source}/output`;
    const checkRunName = 'YFM';

    const requestID = uuid.v4();
    const logger = getLogger(requestID);

    try {
        await exec(`rm -rf ${source}/*`);

        const data = request.body;

        if (data === null || data === undefined) {
            throw new Error(`Invalid input data equals: ${data}`);
        }

        const repoFullName = data.pull_request.head.repo.full_name;
        const repoName = data.pull_request.head.repo.name;
        const refName = data.pull_request.head.ref;
        const headSHA = data.pull_request.head.sha;
        const issueId = data.number;
        const owner = data.sender.login;

        logger('Setup auth');
        const [appOctokit, octokit] = getAppAuth();

        const createCheckRuns = getCreateCheckRuns(appOctokit, owner, repoName, checkRunName, headSHA);
        const createComments = getCreateComments(octokit, owner, repoName, issueId);
        const addCheckResult = getAddCheckResult(createCheckRuns, createComments, logger);

        try {
            logger(checkResultMessageTemplate(`creation was started with owner: ${owner}, repo: ${repoName}, issueId: ${issueId}`));
            await createCheckRuns('in_progress');
            logger(checkResultMessageTemplate(`created with owner: ${owner}, repo: ${repoName}, issueId: ${issueId}`));

            logger('Cloning was started');
            await git.clone({ fs, http, dir: inputDir, ref: refName, url: `https://github.com/${repoFullName}.git` });
            logger('Cloning was finished');

            logger('YFM was started');
            const { stdout } = await exec(`
                export YFM_STORAGE_KEY_ID=${yfmStorage.keyId};
                export YFM_STORAGE_SECRET_KEY=${yfmStorage.secretKey};
                export YFM_STORAGE_PREFIX=${yfmStorage.prefix}${requestID};
                export S3_ACCESS_KEY_ID=${s3.accessKeyId};
                export S3_SECRET_ACCESS_KEY=${s3.secretAccessKey};
                npx yfm -i ${inputDir} -o ${outputDir} -q --publish --storageBucket=${s3.bucket} --storageEndpoint=${s3.endpoint}`);
            logger('YFM was finished');

            await addCheckResult(
                stdout,
                checkResultMessageTemplate('completed successfully'),
                getAdditionalCheckParameters(conclusionTypes.success, requestID));

        } catch (error) {
            const { stdout } = error;

            await addCheckResult(
                stdout || getAdminMessage(requestID),
                checkResultMessageTemplate('failed'),
                getAdditionalCheckParameters(conclusionTypes.failure, requestID));

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
}

function getAdditionalCheckParameters(type, requestID) {
    switch (type) {
        case conclusionTypes.success:
            return {
                conclusion: conclusionTypes.success,
            };
        case conclusionTypes.failure:
            return {
                conclusion: conclusionTypes.failure,
                output: {
                    title: 'More information',
                    summary: `If you got unexpected behavior could you please contact admins. Your RequestID: ${requestID}`,
                },
            };
        default:
            return Object();
    }
}

function getAddCheckResult(createCheckRuns, createComments, logger) {
    return async (consoleLog, checkResultMessage, ...args) => {
        const stdout = reformatOutput(consoleLog);

        await createCheckRuns('completed', ...args);
        logger(checkResultMessage);

        await createComments(stdout);
        logger('comment was created successfully.');
    };
}

function getCreateCheckRuns(appOctokit, owner, repo, name, headSHA) {
    return async (status, ...args) => {
        const parameters = Object.assign({
            owner,
            repo,
            name,
            head_sha: headSHA,
            status,
        }, ...args);
        return appOctokit.request('POST /repos/{owner}/{repo}/check-runs', parameters);
    };
}

function getCreateComments(octokit, owner, repo, issueId) {
    return async (body) => {
        await octokit.request(
            'POST /repos/{owner}/{repo}/issues/{issue_number}/comments',
            { owner, repo, issue_number: issueId, body: JSON.stringify(body) });
    };
}

function getAppAuth() {
    const { appId, privateKey, installationId, token } = github;
    const appOctokit = new Octokit({
        authStrategy: createAppAuth,
        auth: {
            appId,
            privateKey,
            installationId,
        },
    });

    const octokit = new Octokit({ auth: token });

    return [appOctokit, octokit];
}

module.exports = checkYFM;
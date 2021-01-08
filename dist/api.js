"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports._maxLimit = exports._defaultLimit = void 0;
const chalk_1 = __importDefault(require("chalk"));
const express_1 = __importDefault(require("express"));
const download_1 = require("./download");
let downloads;
const updateDownloads = (force = false) => {
    return new Promise((resolve, reject) => {
        if (!downloads || force) {
            download_1.getDownloads()
                .then((result) => {
                downloads = result;
                resolve();
            })
                .catch((err) => reject(err));
        }
        else
            resolve();
    });
};
const versionMatch = (query, release) => {
    const split1 = query.split('.');
    const split2 = release.split('.');
    // If we've specified more sections in our query (ex 8.1.0.1) than exist in the release (ex 8.1.0), return false
    if (split1.length > split2.length)
        return false;
    return Array(query.length)
        .fill(null)
        .map((_, i) => split1[i] === split2[i])
        .reduce((r, x) => r && x);
};
const stringMatch = (req, field, downloads) => {
    return downloads.filter((x) => !req.query[field] || req.query[field].toString().toLowerCase() === x[field].toLowerCase());
};
const requestFilter = (req) => {
    let ret = stringMatch(req, 'platform', downloads);
    ret = stringMatch(req, 'arch', ret);
    ret = stringMatch(req, 'filetype', ret);
    ret = stringMatch(req, 'product', ret);
    ret = stringMatch(req, 'filename', ret);
    ret = ret.filter((x) => !req.query.version || versionMatch(req.query.version.toString(), x.version));
    return ret;
};
const fieldFilter = (download, field) => {
    let ret = download;
    if (typeof field === 'string') {
        // If only one field is needed we can use map
        ret = ret.map((x) => x[field]);
    }
    else {
        ret = ret.map((item) => 
        // Use reduce to build a new object with only the selected fields
        field.reduce((arr, field) => {
            if (item[field] !== undefined)
                arr[field] = item[field];
            return arr;
        }, {}));
    }
    // Return a set to remove duplicates
    return [...new Set(ret.map((d) => JSON.stringify(d)))].map((d) => JSON.parse(d));
};
const allowedFields = ['arch', 'link', 'filename', 'filetype', 'md5', 'platform', 'sha512', 'version', 'product'];
exports._defaultLimit = 10;
const defaultLimit = parseInt(process.env.SPLUNKRELEASES_API_DEFAULT_LIMIT, 10) || exports._defaultLimit;
exports._maxLimit = 100;
const maxLimit = parseInt(process.env.SPLUNKRELEASES_API_MAX_LIMIT, 10) || exports._maxLimit;
class ReturnError {
}
const sendError = (res, err) => {
    res.status(err.status);
    res.send(err);
};
const downloadReq = (req, res) => {
    if (res.locals.downloads.length > 1) {
        sendError(res, {
            status: 400,
            error: 'Needs Further Filtering',
            message: `${res.locals.downloads.length} releases found for the filters supplied. Expected 1. See releases for list.`,
            releases: res.locals.downloads.slice(0, defaultLimit),
        });
    }
    else {
        const out = req.path === '/download'
            ? res.locals.downloads[0].link
            : req.path === '/md5'
                ? res.locals.downloads[0].md5
                : req.path === '/sha512'
                    ? res.locals.downloads[0].sha512
                    : '';
        res.status(303).location(out).send(`303 see other ${res.locals.downloads[0].link}`);
    }
};
const parseIntMiddleware = (name) => {
    return (req, res, next) => {
        if (req.query[name]) {
            res.locals[name] = parseInt(req.query[name].toString(), 10);
            const failureReason = isNaN(res.locals[name]) ? 'numeric' : res.locals[name] < 0 ? 'positive' : undefined;
            if (failureReason !== undefined) {
                sendError(res, {
                    status: 400,
                    error: `Invalid ${name}`,
                    message: `expected a ${failureReason} value for query parameter '${name}', received '${req.query[name].toString()}'.`,
                });
                return;
            }
        }
        next();
    };
};
const detailsReq = (req, res) => {
    const start = res.locals.start || 0;
    const limit = Math.min(res.locals.limit || defaultLimit, maxLimit);
    const slice = res.locals.downloads.slice(start, start + limit);
    res.status(200).send({
        total: res.locals.downloads.length,
        count: slice.length,
        start: start,
        limit: limit,
        data: slice,
    });
};
const fieldsMiddleware = (req, res, next) => {
    // If a list of fields to return was supplied
    if (req.query.field) {
        const fields = typeof req.query.field === 'string' ? [req.query.field] : req.query.field;
        // Check that each field is valid
        for (let i = 0; i < fields.length; i++) {
            if (allowedFields.includes(fields[i]))
                continue;
            sendError(res, {
                status: 400,
                error: `Invalid Field`,
                message: `field '${fields[i]}' is invalid.`,
                allowedFields: allowedFields,
            });
            return;
        }
        // Filter to requested fields
        res.locals.downloads = fieldFilter(res.locals.downloads, req.query.field);
    }
    next();
};
const filterMiddleware = (req, res, next) => {
    updateDownloads()
        .then(() => {
        res.locals.downloads = [...new Set(requestFilter(req))];
        if (res.locals.downloads.length === 0) {
            sendError(res, {
                status: 404,
                error: `No Releases`,
                message: `No releases match the filters provided`,
                filters: allowedFields
                    .filter((f) => req.query[f])
                    .reduce((obj, f) => {
                    obj[f] = req.query[f];
                    return obj;
                }, {}),
            });
            return;
        }
        next();
    })
        .catch(() => {
        res.status(500);
        next();
    });
};
const run = () => {
    const app = express_1.default();
    app.get('/download', filterMiddleware, downloadReq);
    app.get('/md5', filterMiddleware, downloadReq);
    app.get('/sha512', filterMiddleware, downloadReq);
    app.get('/details', filterMiddleware, fieldsMiddleware, parseIntMiddleware('start'), parseIntMiddleware('limit'), detailsReq);
    let server;
    let attempts = 0;
    const retries = process.env.SPLUNKRELEASES_APIRETRIES || 5;
    while (server === undefined && attempts < retries) {
        const port = process.env.SPLUNKRELEASES_APIPORT || Math.floor(Math.random() * 64512) + 1024;
        console.log(`Attempting to open API server on port ${port}`);
        try {
            server = app.listen(port);
            console.log(chalk_1.default.green('Success'));
        }
        catch (err) {
            if (err.code !== 'EADDRINUSE')
                throw err;
            attempts++;
            console.log(`Port in use ${chalk_1.default.red(port)}`);
        }
    }
    return server;
};
exports.default = run;
if (require.main === module) {
    run();
}
//# sourceMappingURL=api.js.map
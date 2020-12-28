import chalk from 'chalk';
import express, { NextFunction } from 'express';
import { ParsedQs } from 'qs'
import { Download, getDownloads } from './download';

const app = express();
let downloads: Download[];

const updateDownloads = (force = false) => {
    return new Promise<void>((resolve, reject) => {
        if(!downloads || force) {
            getDownloads().then((result) => {
                downloads = result;
                resolve();
            }).catch(err => reject(err));
        } else resolve();
    })
}

const versionMatch = (query: string, release: string): boolean => {
    const split1 = query.split('.');
    const split2 = release.split('.');
    // If we've specified more sections in our query (ex 8.1.0.1) than exist in the release (ex 8.1.0), return false
    if (split1.length > split2.length) return false;
    return Array(query.length)
        .fill(null)
        .map((_,i) => split1[i] === split2[i])
        .reduce((r, x) => r && x)
}

const requestFilter = (req: express.Request & {query: ParsedQs}): Download[] => {
    return downloads.filter(x => 
        (!req.query.platform || req.query.platform.toString().toLowerCase() === x.platform.toLowerCase()) &&
        (!req.query.arch || req.query.arch.toString().toLowerCase() === x.arch.toLowerCase()) && 
        (!req.query.version || versionMatch(req.query.version.toString(), x.version)) &&
        (!req.query.filetype || req.query.filetype.toString().toLocaleLowerCase() === x.filetype) &&
        (!req.query.product || req.query.product.toString().toLowerCase() === x.product.toLowerCase())
    )
}

app.get('/download', (req: express.Request, res: express.Response, next: NextFunction): void => {
    updateDownloads().then(() => {
        const download = [...new Set(requestFilter(req))]
        if (download.length > 1) {
            const response = Object();
            response.error = "more than one download matches the filter supplied.";
            response.matches = download;
            res.status(400)
            res.send(response)
        } else {
            res.status(303);
            res.location(download[0].link)
            res.send(`303 see other ${download[0].link}`)
        }
    }).catch(() => {
        res.status(500);
        next();
    });
})

app.get('/details', (req: express.Request, res: express.Response, next: NextFunction): void => {
    updateDownloads().then(() => {
        res.status(200);
        res.send([...new Set(requestFilter(req))]);
    }).catch(() => {
        res.status(500);
        next();
    });
})


const allowedFields = ["arch", "link", "filename", "filetype", "md5", "oplatform", "platform", "sha512", "thankyou", "version"]
app.get('/detail/:field', (req: express.Request, res: express.Response, next: NextFunction): void => {
    if (!allowedFields.includes(req.params.field)) {
        res.status(404)
        res.send(`field '${req.params.field}' is incorrect. options are: ${allowedFields}.`)
    } else {
        updateDownloads().then(() => {
            res.status(200);
            res.send([...new Set(requestFilter(req).map(x => x[req.params.field]))]);
        }).catch(() => {
            res.status(500);
            next();
        });
    }
})

let server = undefined;
let attempts = 0;
const retries = process.env.SPLUNKRELEASES_APIRETRIES || 5;
while(server === undefined && attempts < retries) {
    const port = process.env.SPLUNKRELEASES_APIPORT || (Math.floor(Math.random() * 64512) + 1024);
    console.log(`Attempting to open API server on port ${port}`);
    try {
        server = app.listen(port);
        console.log(chalk.green('Success'))
    } catch (err) {
        if (err.code !== 'EADDRINUSE') throw err;
        attempts++;
        console.log(`Port in use ${chalk.red(port)}`);
    }
}
import http from 'http';
import chalk from 'chalk';
import express, { NextFunction } from 'express';
import { ParsedQs } from 'qs';
import { Download, getDownloads } from './download';

let downloads: Download[];
const updateDownloads = (force = false) => {
  return new Promise<void>((resolve, reject) => {
    if (!downloads || force) {
      getDownloads()
        .then((result) => {
          downloads = result;
          resolve();
        })
        .catch((err) => reject(err));
    } else resolve();
  });
};

const versionMatch = (query: string, release: string): boolean => {
  const split1 = query.split('.');
  const split2 = release.split('.');
  // If we've specified more sections in our query (ex 8.1.0.1) than exist in the release (ex 8.1.0), return false
  if (split1.length > split2.length) return false;
  return Array(query.length)
    .fill(null)
    .map((_, i) => split1[i] === split2[i])
    .reduce((r, x) => r && x);
};

const requestFilter = (req: express.Request & { query: ParsedQs }): Download[] => {
  return downloads.filter(
    (x) =>
      (!req.query.platform || req.query.platform.toString().toLowerCase() === x.platform.toLowerCase()) &&
      (!req.query.arch || req.query.arch.toString().toLowerCase() === x.arch.toLowerCase()) &&
      (!req.query.version || versionMatch(req.query.version.toString(), x.version)) &&
      (!req.query.filetype || req.query.filetype.toString().toLocaleLowerCase() === x.filetype) &&
      (!req.query.product || req.query.product.toString().toLowerCase() === x.product.toLowerCase()),
  );
};

const fieldFilter = (download: Download[], field: string | string[]): Download[] => {
  let ret = download;
  if (typeof field === 'string') {
    // If only one field is needed we can use map
    ret = ret.map((x) => x[field]);
  } else {
    ret = ret.map((item) =>
      // Use reduce to build a new object with only the selected fields
      field.reduce((arr, field) => {
        if (item[field] !== undefined) arr[field] = item[field];
        return arr;
      }, {}),
    ) as Download[];
  }
  // Return a set to remove duplicates
  return [...new Set(ret)];
};

const allowedFields = [
  'arch',
  'link',
  'filename',
  'filetype',
  'md5',
  'oplatform',
  'platform',
  'sha512',
  'thankyou',
  'version',
  'product',
];

const run = (): http.Server => {
  const app = express();

  app.get('/download', (req: express.Request, res: express.Response, next: NextFunction): void => {
    updateDownloads()
      .then(() => {
        const download = [...new Set(requestFilter(req))];
        if (download.length > 1) {
          const response = Object();
          response.error = 'more than one download matches the filter supplied.';
          response.matches = download;
          res.status(400);
          res.send(response);
        } else {
          res.status(303);
          res.location(download[0].link);
          res.send(`303 see other ${download[0].link}`);
        }
      })
      .catch(() => {
        res.status(500);
        next();
      });
  });

  app.get('/details', (req: express.Request, res: express.Response, next: NextFunction): void => {
    updateDownloads()
      .then(() => {
        res.status(200);
        let ret = [...new Set(requestFilter(req))];
        if (ret.length === 0) {
          res.status(404);
          res.send('no results found');
          return;
        }
        // If a list of fields to return was supplied
        if (req.query.field) {
          const fields: string[] =
            typeof req.query.field === 'string' ? [req.query.field] : (req.query.field as string[]);
          // Check that each field is valid
          for (let i = 0; i < fields.length; i++) {
            if (!allowedFields.includes(fields[i])) {
              res.status(400);
              res.send(`field '${fields[i]}' is invalid. supported options are: ${allowedFields}.`);
              return;
            }
          }
          // Filter to requested fields
          ret = fieldFilter(ret, req.query.field as string | string[]);
        }
        // WIP: Pagination
        let start = 0;
        if (req.query.start) {
          start = parseInt(req.query.start.toString());
          if (isNaN(start)) {
            res.status(400);
            res.send(`invalid value for query parameter 'start': ${req.query.start.toString()}`);
            return;
          }
        }
        // TODO: have this "default limit" as a const as opposed to a magic number
        let limit = 10;
        if (req.query.limit) {
          limit = parseInt(req.query.limit.toString());
          if (isNaN(limit)) {
            res.status(400);
            res.send(`invalid value for query parameter 'limit': ${req.query.limit.toString()}`);
            return;
          }
          // TODO: have this "hard limit" as a const as opposed to a magic number
          limit = Math.min(limit, 100);
        }
        res.send({
          total: ret.length,
          start: start,
          limit: limit,
          data: ret.slice(start, start + limit),
        });
      })
      .catch(() => {
        res.status(500);
        next();
      });
  });

  let server: http.Server;
  let attempts = 0;
  const retries = process.env.SPLUNKRELEASES_APIRETRIES || 5;
  while (server === undefined && attempts < retries) {
    const port = process.env.SPLUNKRELEASES_APIPORT || Math.floor(Math.random() * 64512) + 1024;
    console.log(`Attempting to open API server on port ${port}`);
    try {
      server = app.listen(port);
      console.log(chalk.green('Success'));
    } catch (err) {
      if (err.code !== 'EADDRINUSE') throw err;
      attempts++;
      console.log(`Port in use ${chalk.red(port)}`);
    }
  }

  return server;
};

export default run;

if (require.main === module) {
  run();
}

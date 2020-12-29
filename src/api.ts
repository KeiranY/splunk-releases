import http from 'http';
import chalk from 'chalk';
import express, { NextFunction } from 'express';
import { ParsedQs } from 'qs';
import { Download, getDownloads } from './download';
import { down } from 'inquirer/lib/utils/readline';

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

const stringMatch = (req: express.Request & { query: ParsedQs }, field: string, downloads: Download[]) => {
  return downloads.filter(
    (x) => !req.query[field] || req.query[field].toString().toLowerCase() === x[field].toLowerCase(),
  );
};

const requestFilter = (req: express.Request & { query: ParsedQs }): Download[] => {
  let ret = stringMatch(req, 'platform', downloads);
  ret = stringMatch(req, 'arch', ret);
  ret = stringMatch(req, 'filetype', ret);
  ret = stringMatch(req, 'product', ret);
  ret = ret.filter((x) => !req.query.version || versionMatch(req.query.version.toString(), x.version));
  return ret;
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

const allowedFields = ['arch', 'link', 'filename', 'filetype', 'md5', 'platform', 'sha512', 'version', 'product'];

export const _defaultLimit = 10;
const defaultLimit = parseInt(process.env.SPLUNKRELEASES_API_DEFAULT_LIMIT, 10) || _defaultLimit;
export const _maxLimit = 100;
const maxLimit = parseInt(process.env.SPLUNKRELEASES_API_MAX_LIMIT, 10) || _maxLimit;

const downloadReq = (req: express.Request, res: express.Response, next: NextFunction): void => {
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
};

const detailsReq = (req: express.Request, res: express.Response, next: NextFunction): void => {
  updateDownloads()
    .then(() => {
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
      // Pagination
      let start = 0;
      if (req.query.start) {
        start = parseInt(req.query.start.toString(), 10);
        if (isNaN(start)) {
          res.status(400);
          res.send(`invalid value for query parameter 'start': ${req.query.start.toString()}`);
          return;
        }
      }
      let limit = defaultLimit;
      if (req.query.limit) {
        limit = parseInt(req.query.limit.toString(), 10);
        if (isNaN(limit)) {
          res.status(400);
          res.send(`invalid value for query parameter 'limit': ${req.query.limit.toString()}`);
          return;
        }
        limit = Math.min(limit, maxLimit);
      }
      const slice = ret.slice(start, start + limit);
      res.status(200);
      res.send({
        total: ret.length,
        count: slice.length,
        start: start,
        limit: limit,
        data: slice,
      });
    })
    .catch(() => {
      res.status(500);
      next();
    });
};

const run = (): http.Server => {
  const app = express();

  app.get('/download', downloadReq);

  app.get('/details', detailsReq);

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

#!/usr/bin/env node

import axios from 'axios';
import http from 'http';
import api, { _defaultLimit, _maxLimit } from '../src/api';

const platform = 'Linux';
const architecture = 'x86_64';
const version = '8.1.0';
const filetype = 'tgz';
const product = 'enterprise';
let server: http.Server;

beforeAll(() => {
  process.env.SPLUNKRELEASES_APIPORT = (Math.floor(Math.random() * 64512) + 1024).toString();
  server = api();
});

afterAll(() => {
  server.close();
});

it('returns details', (done) => {
  axios.get(`http://localhost:${process.env.SPLUNKRELEASES_APIPORT}/details`).then((res) => {
    expect(res.status).toBe(200);
    expect(typeof res.data.data).toBe('object');
    expect(res.data).toHaveProperty('total');
    expect(res.data).toHaveProperty('count');
    expect(res.data).toHaveProperty('start');
    expect(res.data).toHaveProperty('limit');
    expect(res.data).toHaveProperty('data');
    expect(typeof res.data.data).toBe('object');
    expect(typeof res.data.data).not.toHaveLength(0);
    expect(res.data.data[0]).toHaveProperty('version');
    done();
  });
});

it('filters', (done) => {
  axios
    .get(
      `http://localhost:${process.env.SPLUNKRELEASES_APIPORT}/details` +
        `?platform=${platform}` +
        `&arch=${architecture}` +
        `&version=${version}` +
        `&filetype=${filetype}` +
        `&product=${product}`,
    )
    .then((res) => {
      expect(res.status).toBe(200);
      expect(typeof res.data.data).toBe('object');
      expect(res.data.data).toHaveLength(1);
      expect(res.data.data[0].platform).toBe(platform);
      expect(res.data.data[0].arch).toBe(architecture);
      expect(res.data.data[0].version).toBe(version);
      expect(res.data.data[0].filetype).toBe(filetype);
      expect(res.data.data[0].product).toBe(product);
      done();
    });
});

it('invalid filter value', (done) => {
  axios
    .get(`http://localhost:${process.env.SPLUNKRELEASES_APIPORT}/details?platform=invalid`, {
      validateStatus: () => true,
    })
    .then((res) => {
      expect(res.status).toBe(404);
      expect(typeof res.data).toBe('object');
      expect(res.data).toHaveProperty('status', 404);
      expect(res.data).toHaveProperty('error', 'No Releases');
      expect(res.data).toHaveProperty('message', 'No releases match the filters provided');
      expect(res.data).toHaveProperty('filters', { platform: 'invalid' });
      done();
    });
});

it('single field list', (done) => {
  axios.get(`http://localhost:${process.env.SPLUNKRELEASES_APIPORT}/details?field=version`).then((res) => {
    expect(res.status).toBe(200);
    expect(typeof res.data.data).toBe('object');
    expect(typeof res.data.data[0]).toBe('string');
    expect(res.data.data).toContain(version);
    done();
  });
});

it('multiple field array', (done) => {
  axios
    .get(`http://localhost:${process.env.SPLUNKRELEASES_APIPORT}/details?field=version&field=product`)
    .then((res) => {
      expect(res.status).toBe(200);
      expect(typeof res.data.data).toBe('object');
      expect(typeof res.data.data[0]).toBe('object');
      expect(res.data.data[0]).toHaveProperty('version');
      expect(res.data.data[0]).toHaveProperty('product');
      expect(res.data.data[0]).not.toHaveProperty('platform');
      expect(res.data.data.map((x) => x.version)).toContain(version);
      expect(res.data.data.map((x) => x.product)).toContain(product);
      expect(res.data.data).toHaveLength(new Set(res.data.data.map((d) => JSON.stringify(d))).size);
      done();
    });
});

it('invalid field name', (done) => {
  axios
    .get(`http://localhost:${process.env.SPLUNKRELEASES_APIPORT}/details?field=v`, {
      validateStatus: () => true,
    })
    .then((res) => {
      expect(res.status).toBe(400);
      expect(typeof res.data).toBe('object');
      expect(res.data).toHaveProperty('status', 400);
      expect(res.data).toHaveProperty('error', 'Invalid Field');
      expect(res.data).toHaveProperty('message', "field 'v' is invalid.");
      expect(typeof res.data.allowedFields).toBe('object');
      done();
    });
});

it('redirects to download', (done) => {
  axios
    .get(
      `http://localhost:${process.env.SPLUNKRELEASES_APIPORT}/download` +
        `?platform=${platform}` +
        `&arch=${architecture}` +
        `&version=${version}` +
        `&filetype=${filetype}` +
        `&product=${product}`,
      { maxRedirects: 0, validateStatus: () => true },
    )
    .then((result) => {
      expect(result.status).toBe(303);
      expect(typeof result.data).toBe('string');
      expect(result.data).toContain('303 see other');
      expect(result.headers).toHaveProperty('location');
      expect(result.headers.location).toContain('download.splunk.com');
      expect(result.headers.location).toContain(platform);
      expect(result.headers.location).toContain(architecture);
      expect(result.headers.location).toContain(version);
      expect(result.headers.location).toContain(filetype);
      done();
    });
});

it('redirects to md5', (done) => {
  axios
    .get(
      `http://localhost:${process.env.SPLUNKRELEASES_APIPORT}/md5` +
        `?platform=${platform}` +
        `&arch=${architecture}` +
        `&version=${version}` +
        `&filetype=${filetype}` +
        `&product=${product}`,
      { maxRedirects: 0, validateStatus: () => true },
    )
    .then((result) => {
      expect(result.status).toBe(303);
      expect(typeof result.data).toBe('string');
      expect(result.data).toContain('303 see other');
      expect(result.headers).toHaveProperty('location');
      expect(result.headers.location).toContain('download.splunk.com');
      expect(result.headers.location).toContain(platform);
      expect(result.headers.location).toContain(architecture);
      expect(result.headers.location).toContain(version);
      expect(result.headers.location).toContain('.md5');
      done();
    });
});

it('redirects to sha512', (done) => {
  axios
    .get(
      `http://localhost:${process.env.SPLUNKRELEASES_APIPORT}/sha512` +
        `?platform=${platform}` +
        `&arch=${architecture}` +
        `&version=${version}` +
        `&filetype=${filetype}` +
        `&product=${product}`,
      { maxRedirects: 0, validateStatus: () => true },
    )
    .then((result) => {
      expect(result.status).toBe(303);
      expect(typeof result.data).toBe('string');
      expect(result.data).toContain('303 see other');
      expect(result.headers).toHaveProperty('location');
      expect(result.headers.location).toContain('download.splunk.com');
      expect(result.headers.location).toContain(platform);
      expect(result.headers.location).toContain(architecture);
      expect(result.headers.location).toContain(version);
      expect(result.headers.location).toContain('.sha512');
      done();
    });
});

it("won't download multiple", (done) => {
  axios
    .get(
      `http://localhost:${process.env.SPLUNKRELEASES_APIPORT}/download` +
        `?platform=${platform}` +
        `&arch=${architecture}` +
        `&version=${version}` +
        `&product=${product}`,
      { maxRedirects: 0, validateStatus: () => true },
    )
    .then((res) => {
      expect(res.status).toBe(400);
      expect(typeof res.data).toBe('object');
      expect(res.data).toHaveProperty('status', 400);
      expect(res.data).toHaveProperty('error', 'Needs Further Filtering');
      expect(res.data).toHaveProperty('message');
      expect(res.data.message).toContain('releases found for the filters supplied. Expected 1. See releases for list.');
      expect(res.data).toHaveProperty('releases');
      expect(res.data.releases.length).toBeLessThanOrEqual(_defaultLimit);
      done();
    });
});

describe('pagination', () => {
  it('has defaults', (done) => {
    axios.get(`http://localhost:${process.env.SPLUNKRELEASES_APIPORT}/details`).then((res) => {
      expect(res.data.limit).toBe(_defaultLimit);
      expect(res.data.start).toBe(0);
      done();
    });
  });
  it('accepts custom limit', (done) => {
    axios.get(`http://localhost:${process.env.SPLUNKRELEASES_APIPORT}/details?limit=1`).then((res) => {
      expect(res.data.limit).toBe(1);
      expect(res.data.data).toHaveLength(1);
      done();
    });
  });
  it('has max limit', (done) => {
    axios
      .get(`http://localhost:${process.env.SPLUNKRELEASES_APIPORT}/details?limit=${Number.MAX_SAFE_INTEGER}`, {
        validateStatus: () => true,
      })
      .then((res) => {
        expect(res.status).toBe(200);
        expect(typeof res.data).toBe('object');
        expect(res.data).toHaveProperty('total');
        expect(res.data).toHaveProperty('count');
        expect(res.data.count).toEqual(Math.min(_maxLimit, parseInt(res.data.total)));
        expect(res.data).toHaveProperty('limit', _maxLimit);
        done();
      });
  });
  it('has custom start', (done) => {
    axios.get(`http://localhost:${process.env.SPLUNKRELEASES_APIPORT}/details?start=1`).then((res) => {
      expect(res.data.start).toBe(1);
      axios.get(`http://localhost:${process.env.SPLUNKRELEASES_APIPORT}/details`).then((res2) => {
        expect(res.data.data[0]).toEqual(res2.data.data[1]);
        done();
      });
    });
  });
  it('returns correct result count', (done) => {
    axios.get(`http://localhost:${process.env.SPLUNKRELEASES_APIPORT}/details`).then((res) => {
      expect(res.data.data).toHaveLength(res.data.count);
      done();
    });
  });
  it('rejects non-numeric integer params', (done) => {
    axios
      .get(`http://localhost:${process.env.SPLUNKRELEASES_APIPORT}/details?start=a`, { validateStatus: () => true })
      .then((res) => {
        expect(res.status).toBe(400);
        expect(typeof res.data).toBe('object');
        expect(res.data).toHaveProperty('status', 400);
        expect(res.data).toHaveProperty('error', 'Invalid start');
        expect(res.data).toHaveProperty(
          'message',
          `expected a numeric value for query parameter 'start', received 'a'.`,
        );
        done();
      });
  });
  it('rejects negative integer params', (done) => {
    axios
      .get(`http://localhost:${process.env.SPLUNKRELEASES_APIPORT}/details?limit=-10`, { validateStatus: () => true })
      .then((res) => {
        expect(res.status).toBe(400);
        expect(typeof res.data).toBe('object');
        expect(res.data).toHaveProperty('status', 400);
        expect(res.data).toHaveProperty('error', 'Invalid limit');
        expect(res.data).toHaveProperty(
          'message',
          `expected a positive value for query parameter 'limit', received '-10'.`,
        );
        done();
      });
  });
});

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
      expect(res.data).toBe('no results found');
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
      expect(res.data).toContain("field 'v' is invalid.");
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
    .then((result) => {
      expect(result.status).toBe(400);
      expect(typeof result.data).toBe('object');

      expect(result.data).toHaveProperty('error');
      expect(result.data.error).toBe('more than one download matches the filter supplied.');

      expect(result.data).toHaveProperty('matches');
      expect(typeof result.data.matches).toBe('object');
      expect(result.data.matches[0].platform).toBe(platform);
      expect(result.data.matches[0].arch).toBe(architecture);
      expect(result.data.matches[0].version).toBe(version);
      expect(result.data.matches[0].product).toBe(product);
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
      .get(`http://localhost:${process.env.SPLUNKRELEASES_APIPORT}/details?limit=${Number.MAX_SAFE_INTEGER}`)
      .then((res) => {
        expect(res.data.limit).toBe(_maxLimit);
        expect(res.data.data.length).toBeLessThanOrEqual(_maxLimit);
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
  it('rejects invalid start param', (done) => {
    axios
      .get(`http://localhost:${process.env.SPLUNKRELEASES_APIPORT}/details?start=a`, { validateStatus: () => true })
      .then((res) => {
        expect(res.status).toBe(400);
        expect(res.data).toBe(`invalid value for query parameter 'start': a`);
        done();
      });
  });
  it('rejects invalid limit param', (done) => {
    axios
      .get(`http://localhost:${process.env.SPLUNKRELEASES_APIPORT}/details?limit=a`, { validateStatus: () => true })
      .then((res) => {
        expect(res.status).toBe(400);
        expect(res.data).toBe(`invalid value for query parameter 'limit': a`);
        done();
      });
  });
});

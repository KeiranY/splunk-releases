import axios from 'axios';
import http from 'http';
import api from '../src/api';

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
  axios.get(`http://localhost:${process.env.SPLUNKRELEASES_APIPORT}/details`).then((result) => {
    expect(result.status).toBe(200);
    expect(typeof result.data).toBe('object');
    expect(result.data[0]).toBeTruthy();
    expect(result.data[0]).toHaveProperty('version');
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
    .then((result) => {
      expect(result.status).toBe(200);
      expect(typeof result.data).toBe('object');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].platform).toBe(platform);
      expect(result.data[0].arch).toBe(architecture);
      expect(result.data[0].version).toBe(version);
      expect(result.data[0].filetype).toBe(filetype);
      expect(result.data[0].product).toBe(product);
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
    expect(typeof res.data).toBe('object');
    expect(typeof res.data[0]).toBe('string');
    expect(res.data).toContain(version);
    done();
  });
});

it('multiple field array', (done) => {
  axios
    .get(`http://localhost:${process.env.SPLUNKRELEASES_APIPORT}/details?field=version&field=product`)
    .then((res) => {
      expect(res.status).toBe(200);
      expect(typeof res.data).toBe('object');
      expect(typeof res.data[0]).toBe('object');
      expect(res.data[0]).toHaveProperty('version');
      expect(res.data[0]).toHaveProperty('product');
      expect(res.data[0]).not.toHaveProperty('platform');
      expect(res.data.map((x) => x.version)).toContain(version);
      expect(res.data.map((x) => x.product)).toContain(product);
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

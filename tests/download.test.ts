import { Download, getDownloads, getDownload, enterpriseCurrentReleaseURL } from '../src/download';

describe('latest release', () => {
  let value: Download[];
  const product = 'test_product';
  beforeAll(async () => {
    value = await getDownload(enterpriseCurrentReleaseURL, product);
  });

  it('default value set (arch)', () => expect(value[0]).toHaveProperty('arch'));
  it('single version', () => {
    expect([...new Set(value.map((x) => x.version))].length).toBe(1);
  });
  it('filetype set', () => {
    value.map((x) => {
      expect(x).toHaveProperty('filetype');
      expect(x.filetype.length).toBeGreaterThan(0);
    });
  });
  it('product set', () => {
    value.map((x) => {
      expect(x.product).toBe(product);
    });
  });
});

describe('all releases', () => {
  let value: Download[];
  let products: string[];
  beforeAll(async () => {
    value = await getDownloads();
    products = [...new Set(value.map((x) => x.product))];
  });

  it('returns splunk enterprise', () => {
    expect(products).toContain('enterprise');
  });

  it('returns splunk forwarder', () => {
    expect(products).toContain('forwarder');
  });

  it('has major version 7', () => {
    expect(value.map((x) => x.version.split('.')[0])).toContain('7');
  });

  it('has major version 8', () => {
    expect(value.map((x) => x.version.split('.')[0])).toContain('8');
  });
});

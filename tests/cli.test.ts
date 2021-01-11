import nock from 'nock';
import fs from 'fs';
import { ObjectWritableMock } from 'stream-mock';
import inquirer, { ListQuestion } from 'inquirer';
import { load } from '../mocks/download.mock';
import chalk from 'chalk';

const platform = 'Linux';
const invalidPlatform = 'fail';
const architecture = 'x86_64';
const version = '8.1.0';
const filetype = 'tgz';
const product = 'enterprise';
const answers = {
  'Choose a platform': platform,
  'Choose a architecture': architecture,
  'Choose a version': version,
  'Choose a file type': filetype,
  'Choose a product': product,
};
const matches = [
  new RegExp(`Choose a platform.*${platform}`),
  new RegExp(`Choose a architecture.*${architecture}`),
  new RegExp(`Choose a version.*${version}`),
  new RegExp(`Choose a file type.*${filetype}`),
  new RegExp(`Choose a product.*${product}`),
  /Link:.*?https:\/\/download.splunk.com\//,
];

const backupArgv: string[] = process.argv;
const backupEnv: NodeJS.ProcessEnv = process.env;
beforeEach(() => {
  process.argv = { ...backupArgv };
  process.env = { ...backupEnv };
});

beforeAll(async (done) => {
  jest.mock('../src/download', () => ({
    getDownloads: load,
  }));
  done();
});

it('Command Line Arguments', (done) => {
  jest.isolateModules(() => {
    const spy = jest.spyOn(global.console, 'log').mockImplementation();

    process.argv = ['node', 'cli.js', '-p', platform, '-a', architecture, '-v', version, '-f', filetype, '-r', product];
    require('../src/cli')
      .main()
      .then(() => {
        spy.mock.calls.forEach((call, i) => {
          expect(call[0]).toMatch(matches[i]);
        });

        spy.mockRestore();
        done();
      });
  });
});

it('Environment variables', (done) => {
  jest.isolateModules(() => {
    const spy = jest.spyOn(global.console, 'log').mockImplementation();

    process.env.SPLUNKRELEASES_PLATFORM = platform;
    process.env.SPLUNKRELEASES_ARCH = architecture;
    process.env.SPLUNKRELEASES_VERSION = version;
    process.env.SPLUNKRELEASES_FILETYPE = filetype;
    process.env.SPLUNKRELEASES_PRODUCT = product;
    process.argv = ['node', 'cli.js'];
    require('../src/cli')
      .main()
      .then(() => {
        spy.mock.calls.forEach((call, i) => {
          expect(call[0]).toMatch(matches[i]);
        });

        spy.mockRestore();
        done();
      });
  });
});

it('Questions', (done) => {
  jest.isolateModules(() => {
    const spy = jest.spyOn(global.console, 'log').mockImplementation();
    const inquirerSpy = jest
      .spyOn(inquirer, 'prompt')
      .mockImplementation((questions: ListQuestion, _initialAnswers?): any => {
        return new Promise<any>((resolve, _reject) => {
          resolve({ [questions.name]: answers[questions.name] });
        });
      });

    process.argv = ['node', 'cli.js'];
    require('../src/cli')
      .main()
      .then(() => {
        expect(inquirerSpy).toBeCalledTimes(5);
        inquirerSpy.mock.calls.forEach((call: [ListQuestion, any?], _i) => {
          expect(call[0].type).toEqual('list');
        });

        spy.mockRestore();
        inquirerSpy.mockRestore();
        done();
      });
  });
});

it('No matching releases', (done) => {
  jest.isolateModules(async () => {
    // TODO: Could replace this with an empty stub and check for "toBeCalled"ith
    const spy = jest.spyOn(global.console, 'log').mockImplementation();
    // Replace process.exit with a thrown error
    jest.spyOn(process, 'exit').mockImplementation((code: number) => {
      throw new Error('Mock Exit ' + code);
    });

    process.argv = ['node', 'cli.js', '-p', invalidPlatform];
    // Catch error thrown by Mocked function
    await expect(require('../src/cli').main()).rejects.toThrowError('Mock Exit 1');
    expect(spy.mock.calls[1][0]).toBe(`No releases match platform = ${invalidPlatform}`);
    done();
  });
});

it('Downloads to file', (done) => {
  jest.isolateModules(() => {
    const mockStream = new ObjectWritableMock();

    // Mock the file being written to
    const spy = jest.spyOn(fs, 'createWriteStream').mockImplementation((): any => mockStream);
    // Mock the file being downloaded
    nock('https://download.splunk.com')
      .get('/products/splunk/releases/8.1.0/linux/splunk-8.1.0-f57c09e87251-Linux-x86_64.tgz')
      .reply(200, 'Mock Data', { 'content-length': '9' });
    // eslint-disable-next-line prettier/prettier
    process.argv = ['node', 'cli.js', 'download', '-p', platform, '-a', architecture, '-v', version, '-f', filetype, '-r', product];
    require('../src/cli')
      .main()
      .then(() => {
        expect(mockStream.data.toString()).toBe('Mock Data');
        done();
      });
  });
});

describe('checksum', () => {
  let exitSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;
  let writeSpy: jest.SpyInstance;
  let mockStream: ObjectWritableMock;

  beforeEach(() => {
    // Mock process exit
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((code: number) => null as never);
    // Mock console log
    logSpy = jest.spyOn(global.console, 'log').mockImplementation();
    // Mock the file being written to
    mockStream = new ObjectWritableMock();
    writeSpy = jest.spyOn(fs, 'createWriteStream').mockImplementation((): any => mockStream);
    // Mock the file being downloaded
    nock('https://download.splunk.com')
      .get('/products/splunk/releases/8.1.0/linux/splunk-8.1.0-f57c09e87251-Linux-x86_64.tgz')
      .reply(200, 'Mock Data', { 'content-length': '9' });
  });

  afterEach(() => {
    exitSpy.mockRestore();
    logSpy.mockRestore();
    writeSpy.mockRestore();
  });

  const checksum = (hash: string, type: string): Promise<void> => {
    const hashDownload = `${type} (splunk-8.1.0-f57c09e87251-Linux-x86_64.tgz) = ${hash}`;
    // Mock the checksum being downloaded
    nock('https://download.splunk.com')
      .get('/products/splunk/releases/8.1.0/linux/splunk-8.1.0-f57c09e87251-Linux-x86_64.tgz.' + type)
      .reply(200, hashDownload, { 'content-length': hashDownload.length.toString() });
    // eslint-disable-next-line prettier/prettier
    process.argv = ['node', 'cli.js', 'download', '-c', type, '-p', platform, '-a', architecture, '-v', version, '-f', filetype, '-r', product];
    return require('../src/cli')
      .main()
      .then(() => {
        expect(mockStream.data.toString()).toBe('Mock Data');
      });
  };

  const rightChecksum = (hash: string, type: string): Promise<void> => {
    return checksum(hash, type).then(() => {
      expect(logSpy.mock.calls).toContainEqual([`${type} hash ${chalk.green(hash)} matches`]);
    });
  };

  const wrongChecksum = (correctHash: string, hash: string, type: string): Promise<void> => {
    return checksum(hash, type).then(() => {
      expect(logSpy.mock.calls).toContainEqual([
        `${chalk.stderr('error:')} download ${type} hash is ${chalk.stderr(correctHash)} expected ${hash}`,
      ]);
      expect(exitSpy).toBeCalledWith(3);
    });
  };

  it('accepts matching checksum (MD5)', (done) => {
    rightChecksum('da6ce5b4ea8d8df22645dc0f5a760d8b', 'md5').then(() => {
      done();
    });
  });

  it('rejects non-matching checksum (MD5)', (done) => {
    wrongChecksum('da6ce5b4ea8d8df22645dc0f5a760d8b', 'aa6ce5b4ea8d8df22645dc0f5a760d8b', 'md5').then(() => {
      done();
    });
  });

  it('accepts matching checksum (SHA512)', (done) => {
    rightChecksum(
      'de7e72bc2b344ffdadb2c82ad8403431cca61a56c51654eb7ca23a0f53bae6a16d183819f38de524b276360f374bdfad85d180d304ad8aacbc93bd6cdbcda27e',
      'sha512',
    ).then(() => {
      done();
    });
  });

  it('rejects non-matching checksum (SHA512)', (done) => {
    wrongChecksum(
      'de7e72bc2b344ffdadb2c82ad8403431cca61a56c51654eb7ca23a0f53bae6a16d183819f38de524b276360f374bdfad85d180d304ad8aacbc93bd6cdbcda27e',
      'ae7e72bc2b344ffdadb2c82ad8403431cca61a56c51654eb7ca23a0f53bae6a16d183819f38de524b276360f374bdfad85d180d304ad8aacbc93bd6cdbcda27e',
      'sha512',
    ).then(() => {
      done();
    });
  });

  it('rejects invalid checksum types', async () => {
    exitSpy.mockRestore();
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((code: number) => {
      throw new Error('Mock Exit ' + code);
    });
    await expect(checksum('', 'sha256')).rejects.toThrowError('Mock Exit 2');
    expect(logSpy.mock.calls[logSpy.mock.calls.length - 1][0]).toContain(
      `${chalk.stderr('error:')} provided checksum type sha256 is unsupported.\nsplunk-releases supports md5,sha512.`,
    );
    expect(exitSpy).toBeCalledWith(2);
  });
});

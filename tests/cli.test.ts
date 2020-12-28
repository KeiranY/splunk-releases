import nock from 'nock';
import fs from 'fs';
import { ObjectWritableMock } from 'stream-mock';
import inquirer, { ListQuestion } from 'inquirer';
import { load } from '../mocks/download.mock';

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
      .reply(200, 'Mock Data');

    // eslint-disable-next-line prettier/prettier
    process.argv = ['node', 'cli.js', '-d', '-p', platform, '-a', architecture, '-v', version, '-f', filetype, '-r', product];
    require('../src/cli').main();

    mockStream.on('finish', () => {
      expect(mockStream.data.toString()).toBe('Mock Data');
      done();
    });
  });
});

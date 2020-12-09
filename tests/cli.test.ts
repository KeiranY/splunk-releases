import inquirer, {ListQuestion} from 'inquirer';
import { load } from '../mocks/download.mock';

const platform = "Linux"
const architecture = "x86_64"
const version = "8.1.0"
const filetype = "tgz"
const product = "enterprise"
const answers = {
    'Choose a platform': platform,
    'Choose a architecture': architecture,
    'Choose a version': version,
    'Choose a file type': filetype,
    'Choose a product': product,
}
const matches = [
    new RegExp(`Choose a platform.*${platform}`),
    new RegExp(`Choose a architecture.*${architecture}`),
    new RegExp(`Choose a version.*${version}`),
    new RegExp(`Choose a file type.*${filetype}`),
    new RegExp(`Choose a product.*${product}`),
    /Link:.*?https:\/\/download.splunk.com\//
]

const backupArgv: string[] = process.argv;
const backupEnv: NodeJS.ProcessEnv = process.env;
beforeEach(() => {
    process.argv = {...backupArgv};
    process.env = {...backupEnv};
});

beforeAll(async (done) => {
    jest.mock('../src/download', () => ({
        getDownloads: load
    }));
    done();
});

it('Command Line Arguments', (done) => {
    jest.isolateModules(() => {
        const spy = jest.spyOn(global.console, 'log').mockImplementation();

        process.argv = ['node', 'cli.js', "-p", platform, "-a", architecture, "-v", version, "-f", filetype, "-r", product];
        require('../src/cli').main().then(() => {
            spy.mock.calls.forEach((call, i) => {
                expect(call[0]).toMatch(matches[i]);
            });

            spy.mockRestore();
            done();
        });
    });
})

it('Environment variables', (done) => {
    jest.isolateModules(() => {
        const spy = jest.spyOn(global.console, 'log').mockImplementation();

        process.env.SPLUNKRELEASES_PLATFORM = platform
        process.env.SPLUNKRELEASES_ARCH = architecture
        process.env.SPLUNKRELEASES_VERSION = version
        process.env.SPLUNKRELEASES_FILETYPE = filetype
        process.env.SPLUNKRELEASES_PRODUCT = product
        process.argv = ['node', 'cli.js'];
        require('../src/cli').main().then(() => {
            spy.mock.calls.forEach((call, i) => {
                expect(call[0]).toMatch(matches[i]);
            });

            spy.mockRestore();
            done();
        });
    });
})

it('Questions', (done) => {
    jest.isolateModules(() => {
        const spy = jest.spyOn(global.console, 'log').mockImplementation();
        const inquirerSpy = jest.spyOn(inquirer, 'prompt').mockImplementation((questions: ListQuestion, initialAnswers?): any => {
            return new Promise<any>((resolve, reject) => {
                resolve({[questions.name]: answers[questions.name]})
            })
        })

        process.argv = ['node', 'cli.js'];
        require('../src/cli').main().then(() => {
            expect(inquirerSpy).toBeCalledTimes(5)
            inquirerSpy.mock.calls.forEach((call: [ListQuestion, any?], i) => {
                expect(call[0].type).toEqual('list');
            });

            spy.mockRestore();
            inquirerSpy.mockRestore();
            done();
        });
    });
})
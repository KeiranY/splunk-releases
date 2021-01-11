#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = void 0;
const https_1 = __importDefault(require("https"));
const fs_1 = __importDefault(require("fs"));
const inquirer_1 = __importDefault(require("inquirer"));
const download_1 = require("./download");
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const cli_progress_1 = __importDefault(require("cli-progress"));
const crypto_1 = __importDefault(require("crypto"));
const createHash = () => {
    if (!commander_1.program.opts()['checksum'])
        return null;
    const hashes = ['md5', 'sha512'].filter((x) => crypto_1.default.getHashes().includes(x));
    if (!hashes.includes(commander_1.program.opts()['checksum'])) {
        console.log(`${chalk_1.default.stderr('error:')} provided checksum type ${commander_1.program.opts()['checksum']} is unsupported.
      splunk-releases supports md5,sha512.
      openSSL on this machine supports ${hashes}`);
        process.exit(2);
    }
    return crypto_1.default.createHash(commander_1.program.opts()['checksum']);
};
const checkHash = (download, hash) => {
    if (!hash)
        return;
    return new Promise((resolve, reject) => {
        https_1.default.get(commander_1.program.opts()['checksum'] === 'md5' ? download.md5 : download.sha512, (res) => {
            const body = [];
            res.on('data', (c) => body.push(c));
            res.on('end', () => {
                const splunkHash = Buffer.concat(body).toString().split('=')[1].trim();
                const downloadHash = hash.digest('hex');
                if (splunkHash !== downloadHash) {
                    console.log(`${chalk_1.default.stderr('error:')} download ${commander_1.program.opts()['checksum']} hash is ${chalk_1.default.stderr(downloadHash)} expected ${splunkHash}`);
                    process.exit(3);
                }
                else {
                    console.log(`${commander_1.program.opts()['checksum']} hash ${chalk_1.default.green(downloadHash)} matches`);
                }
                resolve();
            });
        });
    });
};
const singleFilter = (downloads, question, field) => __awaiter(void 0, void 0, void 0, function* () {
    if (commander_1.program.opts()[field]) {
        console.log(`${chalk_1.default.green('?')} ${chalk_1.default.bold(question) + ':'} ${chalk_1.default.cyan(commander_1.program.opts()[field])}`);
        downloads = downloads.filter((x) => x[field].toLowerCase() === commander_1.program.opts()[field].toLowerCase());
        if (downloads.length === 0) {
            console.log(`No releases match ${field} = ${commander_1.program.opts()[field]}`);
            process.exit(1);
        }
    }
    else {
        const choices = [...new Set(downloads.map((x) => x[field]))];
        if (choices.length > 1) {
            const prompt = { type: 'list', name: question, choices: choices };
            const answer = yield inquirer_1.default.prompt(prompt);
            downloads = downloads.filter((x) => x[field] === answer[question]);
        }
    }
    return downloads;
});
const filter = () => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
        download_1.getDownloads()
            .then((d) => singleFilter(d, 'Choose a platform', 'platform'))
            .then((d) => singleFilter(d, 'Choose a architecture', 'arch'))
            .then((d) => singleFilter(d, 'Choose a version', 'version'))
            .then((d) => singleFilter(d, 'Choose a file type', 'filetype'))
            .then((d) => singleFilter(d, 'Choose a product', 'product'))
            .then((d) => resolve(d))
            .catch((e) => reject(e));
    });
});
const details = () => __awaiter(void 0, void 0, void 0, function* () {
    const d = yield filter();
    console.log(chalk_1.default.bold('Link: ') + chalk_1.default.underline(d[0].link));
});
const download = (filename) => __awaiter(void 0, void 0, void 0, function* () {
    const download = (yield filter())[0];
    filename = filename || download.filename;
    const outFile = fs_1.default.createWriteStream(filename, { encoding: null });
    const bar = new cli_progress_1.default.SingleBar({
        format: `${chalk_1.default.green(filename)} ${chalk_1.default.cyan('{bar}')} | {percentage}% | {value}/{total}  | ETA: {eta}s`,
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true,
    });
    const hash = createHash();
    return new Promise((resolve, _reject) => {
        https_1.default.get(download.link, (response) => {
            bar.start(parseInt(response.headers['content-length']), 0);
            response
                .on('end', () => {
                bar.stop();
                console.log(chalk_1.default.bold('Downloaded to: ') + chalk_1.default.underline(outFile.path));
                outFile.end();
                resolve(checkHash(download, hash));
            })
                .on('data', (chunk) => {
                bar.increment(chunk.length);
                if (hash)
                    hash.update(chunk);
            })
                .pipe(outFile);
        });
    });
});
exports.main = () => __awaiter(void 0, void 0, void 0, function* () {
    yield commander_1.program.parseAsync(process.argv);
    return;
});
commander_1.program
    .storeOptionsAsProperties(false)
    .option('-p, --platform <platform>', 'platform filter i.e. linux', process.env.SPLUNKRELEASES_PLATFORM)
    .option('-a, --arch <arch>', 'architecture filter i.e x86_64', process.env.SPLUNKRELEASES_ARCH)
    .option('-v, --version <version>', 'version filter i.e 8.1.0', process.env.SPLUNKRELEASES_VERSION)
    .option('-f, --filetype <filetype>', 'filetype filter i.e tgz', process.env.SPLUNKRELEASES_FILETYPE)
    .option('-r, --product <product>', 'product filter (enterprise/forwarder)', process.env.SPLUNKRELEASES_PRODUCT)
    .command('details', { isDefault: true, hidden: true })
    .action(details);
commander_1.program
    .option('-c, --checksum <md5|sha512>', 'calculate checksum of download')
    .command('download [filename]')
    .aliases(['d', 'dl'])
    .description('download a splunk release', { checksum: 'calculate checksum of download' })
    .usage('download [filename] <c md5|sha512>')
    .action(download);
if (require.main === module) {
    exports.main();
}
//# sourceMappingURL=cli.js.map
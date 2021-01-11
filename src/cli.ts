#!/usr/bin/env node
import https from 'https';
import fs from 'fs';
import inquirer from 'inquirer';
import { ListQuestion } from 'inquirer';
import { Download, getDownloads } from './download';
import { Command, program } from 'commander';
import chalk from 'chalk';
import cliProgress from 'cli-progress';
import crypto from 'crypto';

const createHash = (): crypto.Hash | null => {
  if (!program.opts()['checksum']) return null;
  const hashes = ['md5', 'sha512'].filter((x) => crypto.getHashes().includes(x));
  if (!hashes.includes(program.opts()['checksum'])) {
    console.log(`${chalk.stderr('error:')} provided checksum type ${program.opts()['checksum']} is unsupported.
      splunk-releases supports md5,sha512.
      openSSL on this machine supports ${hashes}`);
    process.exit(2);
  }
  return crypto.createHash(program.opts()['checksum']);
};

const checkHash = (download: Download, hash: crypto.Hash | null) => {
  if (!hash) return;
  https.get(program.opts()['checksum'] === 'md5' ? download.md5 : download.sha512, (res) => {
    const body = [];
    res.on('data', (c) => body.push(c));
    res.on('end', () => {
      const splunkHash = Buffer.concat(body).toString().split('=')[1].trim();
      const downloadHash = hash.digest('hex');
      if (splunkHash !== downloadHash) {
        console.log(
          `${chalk.stderr('error:')} download ${program.opts()['checksum']} hash is ${chalk.stderr(
            downloadHash,
          )} expected ${splunkHash}`,
        );
        process.exit(3);
      } else {
        console.log(`${program.opts()['checksum']} hash ${chalk.green(downloadHash)} matches`);
      }
    });
  });
};

const singleFilter = async (downloads: Download[], question: string, field: string): Promise<Download[]> => {
  if (program.opts()[field]) {
    console.log(`${chalk.green('?')} ${chalk.bold(question) + ':'} ${chalk.cyan(program.opts()[field])}`);
    downloads = downloads.filter((x) => x[field].toLowerCase() === program.opts()[field].toLowerCase());
    if (downloads.length === 0) {
      console.log(`No releases match ${field} = ${program.opts()[field]}`);
      process.exit(1);
    }
  } else {
    const choices = [...new Set(downloads.map((x) => x[field]))];
    if (choices.length > 1) {
      const prompt: ListQuestion = { type: 'list', name: question, choices: choices };
      const answer = await inquirer.prompt(prompt);
      downloads = downloads.filter((x) => x[field] === answer[question]);
    }
  }
  return downloads;
};

const filter = async (): Promise<Download[]> => {
  return new Promise<Download[]>((resolve, reject) => {
    getDownloads()
      .then((d) => singleFilter(d, 'Choose a platform', 'platform'))
      .then((d) => singleFilter(d, 'Choose a architecture', 'arch'))
      .then((d) => singleFilter(d, 'Choose a version', 'version'))
      .then((d) => singleFilter(d, 'Choose a file type', 'filetype'))
      .then((d) => singleFilter(d, 'Choose a product', 'product'))
      .then((d) => resolve(d))
      .catch((e) => reject(e));
  });
};

const details = async (): Promise<void> => {
  const d = await filter();
  console.log(chalk.bold('Link: ') + chalk.underline(d[0].link));
};

const download = async (filename: string) => {
  const download = (await filter())[0];
  filename = filename || download.filename;
  const outFile = fs.createWriteStream(filename, { encoding: null });
  const bar = new cliProgress.SingleBar({
    format: `${chalk.green(filename)} ${chalk.cyan('{bar}')} | {percentage}% | {value}/{total}  | ETA: {eta}s`,
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
  });
  const hash = createHash();
  return new Promise<void>((resolve, _reject) => {
    https.get(download.link, (response) => {
      bar.start(parseInt(response.headers['content-length']), 0);
      response
        .on('end', () => {
          bar.stop();
          console.log(chalk.bold('Downloaded to: ') + chalk.underline(outFile.path));
          outFile.end();
          checkHash(download, hash);
          resolve();
        })
        .on('data', (chunk) => {
          bar.increment(chunk.length);
          if (hash) hash.update(chunk);
        })
        .pipe(outFile);
    });
  });
};

export const main = async (): Promise<void> => {
  await program.parseAsync(process.argv);
  return;
};

program
  .storeOptionsAsProperties(false)
  .option('-p, --platform <platform>', 'platform filter i.e. linux', process.env.SPLUNKRELEASES_PLATFORM)
  .option('-a, --arch <arch>', 'architecture filter i.e x86_64', process.env.SPLUNKRELEASES_ARCH)
  .option('-v, --version <version>', 'version filter i.e 8.1.0', process.env.SPLUNKRELEASES_VERSION)
  .option('-f, --filetype <filetype>', 'filetype filter i.e tgz', process.env.SPLUNKRELEASES_FILETYPE)
  .option('-r, --product <product>', 'product filter (enterprise/forwarder)', process.env.SPLUNKRELEASES_PRODUCT)
  .command('details', { isDefault: true, hidden: true })
  .action(details);

program
  .command('download [filename]')
  .aliases(['d', 'dl'])
  .description('download a splunk release', { checksum: 'calculate checksum of download' })
  .usage('download [filename] <c md5|sha512>')
  .option('-c --checksum <md5|sha512>', 'calculate checksum of download')
  .action(download);

if (require.main === module) {
  main();
}

import https from 'https';
import fs from 'fs';
import inquirer from 'inquirer';
import { ListQuestion } from 'inquirer';
import { Download, getDownloads } from './download';
import { program } from 'commander';
import chalk from 'chalk';
import cliProgress from 'cli-progress';
import crypto from 'crypto';

program
  .storeOptionsAsProperties(false)
  .option('-d, --download [filename]', 'download splunk to [filename]', process.env.SPLUNKRELEASES_DOWNLOAD)
  .option('-p, --platform <platform>', 'platform filter i.e. linux', process.env.SPLUNKRELEASES_PLATFORM)
  .option('-a, --arch <arch>', 'architecture filter i.e x86_64', process.env.SPLUNKRELEASES_ARCH)
  .option('-v, --version <version>', 'version filter i.e 8.1.0', process.env.SPLUNKRELEASES_VERSION)
  .option('-f, --filetype <filetype>', 'filetype filter i.e tgz', process.env.SPLUNKRELEASES_FILETYPE)
  .option('-r, --product <product>', 'product filter (enterprise/forwarder)', process.env.SPLUNKRELEASES_PRODUCT)
  .option('-c --checksum <md5|sha512>', 'calculate checksum of download')
  .parse(process.argv);

const filter = async (downloads: Download[], question: string, field: string): Promise<Download[]> => {
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

export const main = async (): Promise<void> => {
  let downloads = await getDownloads();
  downloads = await filter(downloads, 'Choose a platform', 'platform');
  downloads = await filter(downloads, 'Choose a architecture', 'arch');
  downloads = await filter(downloads, 'Choose a version', 'version');
  downloads = await filter(downloads, 'Choose a file type', 'filetype');
  downloads = await filter(downloads, 'Choose a product', 'product');
  if (program.opts()['download']) {
    if (typeof program.opts()['download'] === 'string') {
      download(downloads[0], program.opts()['download']);
    } else {
      download(downloads[0], downloads[0].filename);
    }
  } else {
    console.log(chalk.bold('Link: ') + chalk.underline(downloads[0].link));
  }
};

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
        console.log(`${chalk.stderr('error:')} download ${program.opts()['checksum']} hash is ${chalk.stderr(downloadHash)} expected ${splunkHash}`);
        process.exit(3);
      } else {
        console.log(`${program.opts()['checksum']} hash ${chalk.green(downloadHash)} matches`);
      }
    });
  });
};

const download = (download: Download, filename: string) => {
  const outFile = fs.createWriteStream(filename, { encoding: null });
  const bar = new cliProgress.SingleBar({
    format: `${chalk.green(filename)} ${chalk.cyan('{bar}')} | {percentage}% | {value}/{total}  | ETA: {eta}s`,
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
  });
  https.get(download.link, (response) => {
    bar.start(parseInt(response.headers['content-length']), 0);
    const hash = createHash();
    response
      .on('close', () => {
        bar.stop();
        console.log(chalk.bold('Downloaded to: ') + chalk.underline(outFile.path));
        outFile.close();
        checkHash(download, hash);
      })
      .on('data', (chunk) => {
        bar.increment(chunk.length);
        if (hash) hash.update(chunk);
      })
      .pipe(outFile);
  });
};

if (require.main === module) {
  main();
}

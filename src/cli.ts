import http from 'http';
import fs from 'fs';
import inquirer from 'inquirer';
import { ListQuestion } from 'inquirer';
import { Download, getDownloads } from './download';
import { program } from 'commander';
import chalk from 'chalk';
import axios, { AxiosResponse } from 'axios';
import cliProgress from 'cli-progress';

program
  .storeOptionsAsProperties(false)
  .option('-d, --download [filename]', 'download splunk to [filename]', process.env.SPLUNKRELEASES_DOWNLOAD)
  .option('-p, --platform <platform>', 'filter to specified platform i.e. linux', process.env.SPLUNKRELEASES_PLATFORM)
  .option('-a, --arch <arch>', 'filter to specified architecture i.e x86_64', process.env.SPLUNKRELEASES_ARCH)
  .option('-v, --version <version>', 'filter to specified version i.e 8.1.0', process.env.SPLUNKRELEASES_VERSION)
  .option('-f, --filetype <filetype>', 'filter to specified filetype i.e tgz', process.env.SPLUNKRELEASES_FILETYPE)
  .option(
    '-r, --product <product>',
    'filter to specified platform (enterprise/forwarder)',
    process.env.SPLUNKRELEASES_PRODUCT,
  )
  .parse(process.argv);

const filter = async (downloads: Download[], question: string, field: string): Promise<void> => {
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
};

export const main = async (): Promise<void> => {
  const downloads = await getDownloads();
  await filter(downloads, 'Choose a platform', 'platform');
  await filter(downloads, 'Choose a architecture', 'arch');
  await filter(downloads, 'Choose a version', 'version');
  await filter(downloads, 'Choose a file type', 'filetype');
  await filter(downloads, 'Choose a product', 'product');
  if (program.opts()['download']) {
    if (typeof program.opts()['download'] === 'string') {
      download(downloads[0].link, program.opts()['download']);
    } else {
      download(downloads[0].link, downloads[0].filename);
    }
  } else {
    console.log(chalk.bold('Link: ') + chalk.underline(downloads[0].link));
  }
};

const download = (link: string, filename: string) => {
  const outFile = fs.createWriteStream(filename);
  const bar = new cliProgress.SingleBar({
    format: `${chalk.green(filename)} ${chalk.cyan('{bar}')} | {percentage}% | {value}/{total}  | ETA: {eta}s`,
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
  });
  axios({
    url: link,
    method: 'GET',
    responseType: 'stream',
  }).then((result: AxiosResponse<http.ServerResponse>) => {
    bar.start(result.headers['content-length'], 0);
    result.data.on('data', (chunk) => bar.increment(chunk.length));
    result.data.on('close', () => {
      bar.stop();
      console.log(chalk.bold('Downloaded to: ') + chalk.underline(outFile.path));
    });
    result.data.pipe(outFile);
  });
};

if (require.main === module) {
  main();
}

import inquirer from 'inquirer';
import { ListQuestion } from 'inquirer';
import { Download, getDownloads } from './download';

const filter = async (downloads: Download[], question: string, field: string): Promise<Download[]> => {
  const choices = [...new Set(downloads.map(x => x[field]))];
  if (choices.length > 1) {
    const prompt: ListQuestion = {type: 'list', name: question, choices: choices};
    const answer = await inquirer.prompt(prompt);
    downloads = downloads.filter(x => x[field]===answer[question]);
  }
  return downloads
} 

(async () => {
  var downloads = await getDownloads;
  downloads = await filter(downloads, 'Choose a platform', 'platform')
  downloads = await filter(downloads, 'Choose a architecture', 'arch')
  downloads = await filter(downloads, 'Choose a version', 'version')
  console.log(downloads[0].link + '\n')
})()
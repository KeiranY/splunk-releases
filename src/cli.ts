import inquirer from 'inquirer';
import { ListQuestion } from 'inquirer';
import { getDownloads } from './download';

(async () => {
  var downloads = await getDownloads;
  
  const platforms = [...new Set(downloads.map(x => x.platform))];
  if (platforms.length > 1) {
    const platformQuestion: ListQuestion = {type: 'list', name: 'Choose a platform', choices: platforms};
    const platform = await inquirer.prompt(platformQuestion);
    downloads = downloads.filter(x => 
      x.platform===platform['Choose a platform']);
  }

  const archs = [...new Set(downloads.map(x => x.arch))]
  if (archs.length > 1) {
    const archQuestion: ListQuestion = {type: 'list', name: 'Choose a architecture', choices: archs};
    const arch = await inquirer.prompt(archQuestion);
    downloads = downloads.filter(x => x.arch===arch['Choose a architecture']);
  }

  const versions = [...new Set(downloads.map(x => x.version))]
  if (versions.length > 1) {
    const versionQuestion: ListQuestion = {type: 'list', name: 'Choose a version', choices: versions};
    const version = await inquirer.prompt(versionQuestion);
    downloads = downloads.filter(x => x.version===version['Choose a version']);
  }

  console.log(downloads[0].link + '\n')
})()
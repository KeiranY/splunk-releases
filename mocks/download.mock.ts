import { getDownloads, Download } from '../src/download';
import fs from 'fs';
import path from 'path';

const getDownloadsPath = path.join(__dirname, `getDownloads.json`);

const save = async (): Promise<void> => {
  const downloads = await getDownloads();
  fs.writeFileSync(getDownloadsPath, JSON.stringify(downloads));
};
export { save };

const load = async (): Promise<Download[]> => {
  const data = await fs.promises.readFile(getDownloadsPath).catch((err) => {
    throw err;
  });
  const ret: Download[] = JSON.parse(data.toString());
  return ret;
};
export { load };

if (require.main === module) {
  save();
}

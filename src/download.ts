import axios from 'axios';
const extractRex = /data-link="(?<link>[^"]*)"\s+data-filename="(?<filename>[^"]*)"\s+data-arch="(?<arch>[^"]*)"\s+data-platform="(?<platform>[^"]*)"\s+data-oplatform="[^"]*"\s+data-version="(?<version>[^"]*)"\s+data-md5="(?<md5>[^"]*)"\s+data-sha512="(?<sha512>[^"]*)"/;

export const enterpriseCurrentReleaseURL =
  'https://www.splunk.com/en_us/download/get-started-with-your-free-trial.html';
export const enterprisePreviousReleaseURL = 'https://www.splunk.com/en_us/download/previous-releases.html';
export const ufCurrentReleaseURL = 'https://www.splunk.com/en_us/download/universal-forwarder.html';
export const ufPreviousReleaseURL = 'https://www.splunk.com/en_us/download/previous-releases/universalforwarder.html';

export interface Download {
  arch: string;
  link: string;
  filename: string;
  md5: string;
  platform: string;
  sha512: string;
  version: string;
  product: string;
  filetype: string;
}

const getDownload = (url: string, product: string): Promise<Download[]> => {
  return new Promise<Download[]>((resolve, reject) => {
    axios
      .get(url)
      .then((response) => {
        resolve(
          response.data
            .match(/data-link=.*?>/gm)
            .map((x: string) => x.match(extractRex))
            .map((x: RegExpMatchArray) => {
              x.groups.filetype = x.groups.filename.split('.').pop();
              x.groups.product = product;
              return x.groups;
            }),
        );
      })
      .catch((error) => reject(error));
  });
};
export { getDownload };

const getDownloads = (): Promise<Download[]> => {
  return new Promise<Download[]>((resolve, reject) => {
    Promise.all([
      getDownload(enterpriseCurrentReleaseURL, 'enterprise'),
      getDownload(enterprisePreviousReleaseURL, 'enterprise'),
      getDownload(ufCurrentReleaseURL, 'forwarder'),
      getDownload(ufPreviousReleaseURL, 'forwarder'),
    ])
      .then((downloads) => {
        resolve(downloads.reduce((p, c) => p.concat(c)));
      })
      .catch((error) => reject(error));
  });
};
export { getDownloads };

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDownloads = exports.getDownload = exports.ufPreviousReleaseURL = exports.ufCurrentReleaseURL = exports.enterprisePreviousReleaseURL = exports.enterpriseCurrentReleaseURL = void 0;
const axios_1 = __importDefault(require("axios"));
const extractRex = /data-link="(?<link>[^"]*)"\s+data-filename="(?<filename>[^"]*)"\s+data-arch="(?<arch>[^"]*)"\s+data-platform="(?<platform>[^"]*)"\s+data-oplatform="[^"]*"\s+data-version="(?<version>[^"]*)"\s+data-md5="(?<md5>[^"]*)"\s+data-sha512="(?<sha512>[^"]*)"/;
exports.enterpriseCurrentReleaseURL = 'https://www.splunk.com/en_us/download/get-started-with-your-free-trial.html';
exports.enterprisePreviousReleaseURL = 'https://www.splunk.com/en_us/download/previous-releases.html';
exports.ufCurrentReleaseURL = 'https://www.splunk.com/en_us/download/universal-forwarder.html';
exports.ufPreviousReleaseURL = 'https://www.splunk.com/en_us/download/previous-releases/universalforwarder.html';
const getDownload = (url, product) => {
    return new Promise((resolve, reject) => {
        axios_1.default
            .get(url)
            .then((response) => {
            resolve(response.data
                .match(/data-link=.*?>/gm)
                .map((x) => x.match(extractRex))
                .map((x) => {
                x.groups.filetype = x.groups.filename.split('.').pop();
                x.groups.product = product;
                return x.groups;
            }));
        })
            .catch((error) => reject(error));
    });
};
exports.getDownload = getDownload;
const getDownloads = () => {
    return new Promise((resolve, reject) => {
        Promise.all([
            getDownload(exports.enterpriseCurrentReleaseURL, 'enterprise'),
            getDownload(exports.enterprisePreviousReleaseURL, 'enterprise'),
            getDownload(exports.ufCurrentReleaseURL, 'forwarder'),
            getDownload(exports.ufPreviousReleaseURL, 'forwarder'),
        ])
            .then((downloads) => {
            resolve(downloads.reduce((p, c) => p.concat(c)));
        })
            .catch((error) => reject(error));
    });
};
exports.getDownloads = getDownloads;
//# sourceMappingURL=download.js.map
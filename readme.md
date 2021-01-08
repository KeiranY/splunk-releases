[![GitHub Workflow Status](https://img.shields.io/github/workflow/status/KeiranY/splunk-releases/Jest%20&%20Codecov?logo=github)](https://github.com/KeiranY/splunk-releases/actions?query=workflow%3A%22Jest+%26+Codecov%22)
[![OpenAPI Verstion](https://img.shields.io/badge/dynamic/json?logo=openapi-initiative&logoColor=FFFFFF&color=success&label=OpenAPI&query=defaultVersion&url=https%3A%2F%2Fapp.swaggerhub.com%2Fapiproxy%2Fregistry%2FKeiranY%2Fsplunk-releases%2F.meta)](https://app.swaggerhub.com/apis-docs/KeiranY/splunk-releases)
[![Codecov](https://img.shields.io/codecov/c/github/KeiranY/splunk-releases)](https://codecov.io/gh/KeiranY/splunk-releases)
[![CodeFactor Grade](https://img.shields.io/codefactor/grade/github/KeiranY/splunk-releases)](https://www.codefactor.io/repository/github/keirany/splunk-releases)

# Splunk Releases

Collection of utilites for interacting with Splunk Enterprise/Universal forwarders releases.

#### Table of Contents
- [Splunk Releases](#splunk-releases)
      - [Table of Contents](#table-of-contents)
  - [Usage](#usage)
  - [Command Line](#command-line)
    - [Usage](#usage-1)
    - [Environment Variables](#environment-variables)
    - [Example](#example)
  - [Rest API](#rest-api)
    - [Usage](#usage-2)
    - [Environmant Variables](#environmant-variables)
    - [Documentation](#documentation)

## Usage

After downloading, install prerequisites with [npm](https://www.npmjs.com/get-npm) 
```
$ npm i
```
Then build the JS versions of the tools
```
$ npm run build
```


## Command Line

The command line utility can be used to retrieve the download link to a Splunk release

### Usage
```
$ npm run cli

Usage: cli [options]

Options:
  -d, --download [filename]  download splunk to [filename]
  -p, --platform <platform>  filter to specified platform i.e. linux
  -a, --arch <arch>          filter to specified architecture i.e x86_64
  -v, --version <version>    filter to specified version i.e 8.1.0.1
  -f, --filetype <filetype>  filter to specified filetype i.e tgz
  -r, --product <product>    filter to specified platform (enterprise/forwarder)
  -h, --help                 display help for command
```

### Environment Variables

Environment variables can also supply filters, cli parameters take precedence over these.

| Environment Variable      | Flag | Example   |
| ------------------------- | ---- | --------- |
| SPLUNKRELEASES_PLATFORM   | -p   | linux     |
| SPLUNKRELEASES_ARCH       | -a   | x86_64    |
| SPLUNKRELEASES_VERSION    | -v   | 8.1.0     |
| SPLUNKRELEASES_FILETYPE   | -f   | tgz       |
| SPLUNKRELEASES_PRODUCT    | -r   | forwarder |
| SPLUNKRELEASES_DOWNLOAD   | -d   | splunk.tgz|

### Example
![Example of using the splunk releases CLI command](./cli-example.gif)


## Rest API

The REST API lets you retrieve info about splunk release (`/details`) or to download individual releases directly (`/download`).

An example of the API server *may* be running at [sr.keirany.com](https://sr.keirany.com/details?limit=1).

### Usage

```
$ npm run api
```

### Environmant Variables

| Environment Variable | Description     | Default   |
| --- | --- | --- |
| SPLUNKRELEASES_API_MAX_LIMIT | Sets the max number of relases returned in a page | 100 |
| SPLUNKRELEASES_API_DEFAULT_LIMIT | Sets the default number of relases returned in a page | 10 |
| SPLUNKRELEASES_APIPORT | Web server port | Random between 1024-65536 |
| SPLUNKRELEASES_APIRETRIES | Attempts to bind to port |5 |

### Documentation

See the [SwaggerHub Page](https://app.swaggerhub.com/apis-docs/KeiranY/splunk-releases) for documentation and examples for the Rest API (OpenApi3 spec [here](https://app.swaggerhub.com/apis/KeiranY/splunk-releases)).


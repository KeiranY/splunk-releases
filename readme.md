# Splunk Releases

Collection of utilites for interacting with Splunk Enterprise/Universal forwarders releases.

#### Table of Contents
- [Splunk Releases](#splunk-releases)
      - [Table of Contents](#table-of-contents)
  - [Command Line](#command-line)
    - [Usage](#usage)
    - [Example](#example)
  - [Rest API](#rest-api)
    - [Documentation](#documentation)

## Command Line

The command line utility can be used to retrieve the download link to a Splunk release

### Usage
```
Usage: cli [options]

Options:
  -p, --platform <platform>  filter to specified platform i.e. linux
  -a, --arch <arch>          filter to specified architecture i.e x86_64
  -v, --version <version>    filter to specified version i.e 8.1.0.1
  -f, --filetype <filetype>  filter to specified filetype i.e tgz
  -d, --download [filename]  download splunk to [filename]
  -h, --help                 display help for command
```

### Example
![Example of using the splunk releases CLI command](./cli-example.gif)


## Rest API

### Documentation

See the [Postman Collection](#TODO) for documentation and examples for the Rest API


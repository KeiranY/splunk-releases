# Todo


- [ ] test: split unit & integration tests 

- [ ] test(api): pagination env variable test

- [ ] fix(api): remove duplicate results seen when supplying multiple fields i.e. /details?field=version&field=product

- [ ] feat(cli): calculate md5/sha digest with [digest-stream](https://github.com/jeffbski/digest-stream) and output results when downloading.

- [ ] feat(api): cause updateDownloads to refresh available releases periodically


## Complete

- [x] ~~feat(api): pagination~~
- [x] ~~docs(api): update postman docs~~
- [x] ~~refactor: clean up fields in Download object (remove)~~
- [x] ~~ci: only re-run test/coverage action when source files change [docs](https://docs.github.com/en/free-pro-team@latest/actions/reference/workflow-syntax-for-github-actions#onpushpull_requestpaths)~~
- [x] ~~feat(api): add status codes and consistent error messages~~

Format: *type*(*scope*): *description*

Types: build, chore, ci, docs, feat, fix, perf, refactor, style, test
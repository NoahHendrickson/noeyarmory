# Changelog

## [0.4.0](https://github.com/NoahHendrickson/noeyarmory/compare/v0.3.0...v0.4.0) (2026-06-11)


### Features

* Add ammo generation sort and polish search, palette, and shaders. ([#32](https://github.com/NoahHendrickson/noeyarmory/issues/32)) ([1cc1009](https://github.com/NoahHendrickson/noeyarmory/commit/1cc100922b08a6f29fadcfc140ec03199abdd1df))
* Add damage-perks filter to the Trait 1/2 pickers. ([5037c62](https://github.com/NoahHendrickson/noeyarmory/commit/5037c626ae80b589609b899f72c86c0ab1adcd91))
* add Microsoft Clarity analytics for production sessions. ([656fe6d](https://github.com/NoahHendrickson/noeyarmory/commit/656fe6d58a98cd38b916ec2d79ee539ca5f6e305))
* Add new item markers to search results ([bfebd6a](https://github.com/NoahHendrickson/noeyarmory/commit/bfebd6a08d113ceedd79d52f282ae6414e34d79b))
* Add share button to copy weapon detail link ([#41](https://github.com/NoahHendrickson/noeyarmory/issues/41)) ([e9b3d87](https://github.com/NoahHendrickson/noeyarmory/commit/e9b3d87cb94d4fc1a9b2f440e8fcc7b4c61a52e9))
* Add SRL source, compact new-armor grid, and palette polish. ([4cccbba](https://github.com/NoahHendrickson/noeyarmory/commit/4cccbbaa2a01774d229b45bb632738be229c6d04))
* add weapon popularity tracking and Popular lately home section. ([c45d3a5](https://github.com/NoahHendrickson/noeyarmory/commit/c45d3a54deaffa4ac2259be4dc734c74eb72d2a3))
* Compact new armor page with set search. ([e2f762d](https://github.com/NoahHendrickson/noeyarmory/commit/e2f762d05fa3faa1f7878bc03c8f96a6abba6221))
* Improve new armor page and expand activity source tracking. ([cd7942a](https://github.com/NoahHendrickson/noeyarmory/commit/cd7942a39584036f222f9a6c1047fafea3bacf39))
* Revert "Add iOS-inspired motion tokens ([#43](https://github.com/NoahHendrickson/noeyarmory/issues/43))" ([f53cbc1](https://github.com/NoahHendrickson/noeyarmory/commit/f53cbc12f8203c366b85868980018a8f7520307d))
* Show cursor-following Copied pill on weapon share. ([75d7719](https://github.com/NoahHendrickson/noeyarmory/commit/75d7719c7937d14bcf7f08cdae23931adc671f4e))
* weapon type chip icons, build planner, and search polish ([1f660b7](https://github.com/NoahHendrickson/noeyarmory/commit/1f660b750491315cedfa3a82ac28efe9e21dc3f3))
* **web:** make UI mobile-friendly across search, vault, and detail views ([#14](https://github.com/NoahHendrickson/noeyarmory/issues/14)) ([43d1b6c](https://github.com/NoahHendrickson/noeyarmory/commit/43d1b6c3526bc0f7d4224badc231da13b81df7f6))


### Bug Fixes

* Allow feedback submission without GITHUB_TOKEN ([#15](https://github.com/NoahHendrickson/noeyarmory/issues/15)) ([ef69b06](https://github.com/NoahHendrickson/noeyarmory/commit/ef69b06cc6e20a73328804a1b6b95f51ccf127e4))
* evaluate Microsoft Clarity gate on the server. ([edbf2db](https://github.com/NoahHendrickson/noeyarmory/commit/edbf2db69d49dcfc0302f4c4c725db93d3924a48))
* Fix command palette reopen stale state and polish search UX. ([1cfc0bc](https://github.com/NoahHendrickson/noeyarmory/commit/1cfc0bc8bcfda0bed59951484336b86d5fb2b00f))
* Fix palette results navigation and polish modal chrome. ([563600a](https://github.com/NoahHendrickson/noeyarmory/commit/563600a0d9d93cf583e45a1a9a696d6e19237417))
* Fix weapon index preload script falling back to sample data. ([f04b3dd](https://github.com/NoahHendrickson/noeyarmory/commit/f04b3dda4de30d2df4f6022f67fd08987171bd4a))
* gate Popular lately behind POPULAR_WEAPONS_ENABLED opt-in. ([38892aa](https://github.com/NoahHendrickson/noeyarmory/commit/38892aabb5eb24cdc71786e0bf8a8622bc4cd00c))
* hide Popular lately on production until explicitly enabled ([#26](https://github.com/NoahHendrickson/noeyarmory/issues/26)) ([7b53b6d](https://github.com/NoahHendrickson/noeyarmory/commit/7b53b6ddb0f462eed47087d8d6b56e450f6ba4cb))
* Improve command palette typing responsiveness in Firefox only. ([b4bcb90](https://github.com/NoahHendrickson/noeyarmory/commit/b4bcb900d7e2764f1ebe784104ad2be7dba00cfe))
* include UI lib tokens in Tailwind scan for production blur ([b5ca4be](https://github.com/NoahHendrickson/noeyarmory/commit/b5ca4befabd93cacc3b2441c865b0cbf2d8a3c32))
* Keep sort control right-aligned when pinned filters wrap. ([f615336](https://github.com/NoahHendrickson/noeyarmory/commit/f615336b446756496b396e5a20c3856b839f3419))
* Prefer reprised craftable raid weapons over legacy manifest twins. ([2a1acac](https://github.com/NoahHendrickson/noeyarmory/commit/2a1acac235514b9e92fda803bf0c4a8afe13ced5))
* save filter chips to recent searches when applied. ([9b22eb0](https://github.com/NoahHendrickson/noeyarmory/commit/9b22eb01a0f55fa9c6d6fc27775b32b2a42a7ac5))
* show Popular lately only when Redis rankings are ready. ([787baa5](https://github.com/NoahHendrickson/noeyarmory/commit/787baa5f343dad2ac122b912e1fa5b89c605e0d5))
* **web:** move search mode pill above the command palette bar ([27e56cf](https://github.com/NoahHendrickson/noeyarmory/commit/27e56cf8960610dd634abcf64e5277e56d00a1cc))
* **web:** resolve mobile header overlap and restore What's new label ([#21](https://github.com/NoahHendrickson/noeyarmory/issues/21)) ([9263e9d](https://github.com/NoahHendrickson/noeyarmory/commit/9263e9dd5893350c66433835d4638389c77932aa))

## [0.3.0](https://github.com/NoahHendrickson/noeyarmory/compare/v0.2.0...v0.3.0) (2026-06-07)


### Features

* add DPS rankings, custom filters, and richer weapon search ([bfca574](https://github.com/NoahHendrickson/noeyarmory/commit/bfca574894d29d8e46cfae2ebfa413a679dc132c))
* Create custom filters inline in the command palette ([24a7818](https://github.com/NoahHendrickson/noeyarmory/commit/24a7818b4b3f786b24276e46858ce0576a53625d))
* Remove icons from What's new and Feedback toolbar buttons. ([c34785e](https://github.com/NoahHendrickson/noeyarmory/commit/c34785ecfe428886de5c2a0471df70ac08c9f4cd))
* Sync changelog.json for v0.2.0 release. ([ad835cf](https://github.com/NoahHendrickson/noeyarmory/commit/ad835cff7608404c16a576a9552ab7c16dcf9b2b))


### Bug Fixes

* address PR [#7](https://github.com/NoahHendrickson/noeyarmory/issues/7) review follow-ups ([609e5cf](https://github.com/NoahHendrickson/noeyarmory/commit/609e5cf09b0c032fc42f82a171fa893aa1431070))
* harden web security boundaries ([7d0ea93](https://github.com/NoahHendrickson/noeyarmory/commit/7d0ea939e39af8640784a1e91f3e00761547bb25))

## [0.2.0](https://github.com/NoahHendrickson/noeyarmory/compare/v0.1.0...v0.2.0) (2026-06-07)


### Features

* Add in-app changelog, release-please, and automatic commit prefixes. ([57b4936](https://github.com/NoahHendrickson/noeyarmory/commit/57b493699be095657bd0d3f92e35c6cdd91860e3))
* add My Armor vault search, Clarity perks, and Bungie setup tooling ([f874d84](https://github.com/NoahHendrickson/noeyarmory/commit/f874d84772bda816e3fdfe9fe15f31fe56a8d4ec))
* **destiny:** manifest → weapon index pipeline + search functions ([7125162](https://github.com/NoahHendrickson/noeyarmory/commit/7125162c6343ef4b79e79a3a2e4c2fbf5ac4b9e1))
* **vault:** Bungie OAuth sign-in + My Vault search of owned rolls ([3a1b81d](https://github.com/NoahHendrickson/noeyarmory/commit/3a1b81df51e90f3e0d393bb48cfe27b6fea85a93))
* **web:** add shader background overlay and glass command palette ([4119919](https://github.com/NoahHendrickson/noeyarmory/commit/4119919373830cb19581aa956a6082d9ce4075e9))
* **web:** command-palette search UI, weapon detail modal, and craftable perks ([e411735](https://github.com/NoahHendrickson/noeyarmory/commit/e411735e9d5a626d64ba4e197ad0cd89bd99a031))
* **web:** weapon browse, facet filters, and fuzzy search ([dabe2cf](https://github.com/NoahHendrickson/noeyarmory/commit/dabe2cf8cf6cdc5c85c4d6682a7c4371e6aede84))
* **web:** weapon detail page + reverse perk view ([4b6cd84](https://github.com/NoahHendrickson/noeyarmory/commit/4b6cd84171bab46e6dd63149c15c8ceb30dca349))


### Bug Fixes

* Vercel monorepo deploy config and build resilience ([5fd5020](https://github.com/NoahHendrickson/noeyarmory/commit/5fd5020091742f653a6bd92d92c88005bc6d3496))


### Performance

* intern perks, split browse/detail index, virtualize grids ([8a483ea](https://github.com/NoahHendrickson/noeyarmory/commit/8a483eae2f1f86117ad95e96b42ecc99ab691f8d))
* shared weapon index cache, memoized search, and SSR seeds ([2e2382f](https://github.com/NoahHendrickson/noeyarmory/commit/2e2382f9bfe1bb8ca582f48502f5535ec1dd871c))
* shared weapon index cache, memoized search, and SSR seeds ([4324728](https://github.com/NoahHendrickson/noeyarmory/commit/4324728a32850dc77018b4ee773f92d8a65a76ac))

## [0.1.0](https://github.com/NoahHendrickson/noeyarmory/releases/tag/v0.1.0) (2026-06-06)

### Features

* Weapon and perk search with command palette
* Bungie OAuth vault integration ("My Vault")
* Shader backgrounds and moonfang screensaver
* In-app "What's new" changelog with automated release notes

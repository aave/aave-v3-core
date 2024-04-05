# Changelog

## [1.19.3](https://github.com/aave/aave-v3-core/compare/v1.19.2...v1.19.3) (2024-03-07)


### Bug Fixes

* Bump version of v3 dependencies ([#938](https://github.com/aave/aave-v3-core/issues/938)) ([64870f0](https://github.com/aave/aave-v3-core/commit/64870f00345c8e10eefd6057bdba66f14ea0682c))

## [1.19.2](https://github.com/aave/aave-v3-core/compare/v1.19.1...v1.19.2) (2023-10-17)


### Bug Fixes

* Fixes solc version of contracts ([#920](https://github.com/aave/aave-v3-core/issues/920)) ([6d6fa53](https://github.com/aave/aave-v3-core/commit/6d6fa53d360b43f492ff5b3c7033f95aee4f1335))

## [1.19.1](https://github.com/aave/aave-v3-core/compare/v1.19.0...v1.19.1) (2023-07-04)


### Bug Fixes

* Fix prepublish step in CI ([#862](https://github.com/aave/aave-v3-core/issues/862)) ([ec2902a](https://github.com/aave/aave-v3-core/commit/ec2902a4a113c6584434d49742ee1a5616070f90))

## [1.19.0](https://github.com/aave/aave-v3-core/compare/v1.18.0...v1.19.0) (2023-07-04)


### Features

* add OpenZeppelin SafeERC20 and Address dependencies ([#859](https://github.com/aave/aave-v3-core/issues/859)) ([493bb4d](https://github.com/aave/aave-v3-core/commit/493bb4dfd3e0a69f7c3fbf468bc8ef310da9960b))


### Bug Fixes

* add natspec docs to flags of reserve configuration map ([#854](https://github.com/aave/aave-v3-core/issues/854)) ([792c23e](https://github.com/aave/aave-v3-core/commit/792c23eed73d3791fde31f6d26c69bc62f3533bf))
* remove initial config of fee params in pool initialize function ([#846](https://github.com/aave/aave-v3-core/issues/846)) ([3bb960b](https://github.com/aave/aave-v3-core/commit/3bb960b92bcb3d58d8bdcd2d2f924340ba812164))
* Soften solidity version of FlashLoanBase contracts ([#861](https://github.com/aave/aave-v3-core/issues/861)) ([364a779](https://github.com/aave/aave-v3-core/commit/364a779efd9a7e42ec1882156d95a62f22ea3fc4))

## [1.18.0](https://github.com/aave/aave-v3-core/compare/v1.17.2...v1.18.0) (2023-06-26)


### Features

* Add zero IR strategy ([#818](https://github.com/aave/aave-v3-core/issues/818)) ([ade6cf8](https://github.com/aave/aave-v3-core/commit/ade6cf86f296ee68e82077ca18a3218096516862))


### Bug Fixes

* communicate correct premium in case of debt-bearing flashloan ([#822](https://github.com/aave/aave-v3-core/issues/822)) ([7b2a284](https://github.com/aave/aave-v3-core/commit/7b2a2840e1bc7e1201fd4ed37cbbd8da967dda11))
* Fix collateral behavior of zero-ltv assets ([#820](https://github.com/aave/aave-v3-core/issues/820)) ([ea48670](https://github.com/aave/aave-v3-core/commit/ea4867086d39f094303916e72e180f99d8149fd5))
* Fix event checks in test cases ([#824](https://github.com/aave/aave-v3-core/issues/824)) ([29ff9b9](https://github.com/aave/aave-v3-core/commit/29ff9b9f89af7cd8255231bc5faf26c3ce0fb7ce))
* linting ([#837](https://github.com/aave/aave-v3-core/issues/837)) ([97cb6ea](https://github.com/aave/aave-v3-core/commit/97cb6ead76ed69dbeae144a47f4dbef807f06082))
* Return final withdraw amount in L2Pool withdraw fn ([#831](https://github.com/aave/aave-v3-core/issues/831)) ([37b4d1f](https://github.com/aave/aave-v3-core/commit/37b4d1f0e770ccb9ebdf50037c81582f3c79c5ee))

## [1.17.2](https://github.com/aave/aave-v3-core/compare/v1.17.1...v1.17.2) (2023-01-31)


### Bug Fixes

* expose error list and types at npm package ([#809](https://github.com/aave/aave-v3-core/issues/809)) ([0334bf2](https://github.com/aave/aave-v3-core/commit/0334bf2d3452aaca256a4855ea9b3c04c74dfe8a))

## [1.17.1](https://github.com/aave/aave-v3-core/compare/v1.17.0...v1.17.1) (2023-01-10)


### Bug Fixes

* Add BUSL to tokenization contracts ([#784](https://github.com/aave/aave-v3-core/issues/784)) ([bf87c52](https://github.com/aave/aave-v3-core/commit/bf87c52825ac1d8847e870bfe238b702b2cdf7b8))
* Fix typos ([#781](https://github.com/aave/aave-v3-core/issues/781)) ([8a39136](https://github.com/aave/aave-v3-core/commit/8a3913607df88afcc4b8cc63f3a876ebac7d148b))

## [1.17.0](https://github.com/aave/aave-v3-core/compare/v1.16.2...v1.17.0) (2022-12-28)


### Features

* add additional flashloan scenario ([8888093](https://github.com/aave/aave-v3-core/commit/88880936a353d3dd5c9556d0fabb3f15ecd01c0c))
* add unit test for reserve configuration ([49d0f4e](https://github.com/aave/aave-v3-core/commit/49d0f4e6baa5b78d31443617456331904db7dfdc))
* bump to beta version ([348ce20](https://github.com/aave/aave-v3-core/commit/348ce204a7b30a9846dbe9637b17e86125137d6f))
* enable and disable flashloans ([bb62572](https://github.com/aave/aave-v3-core/commit/bb625723211944a7325b505caf6199edf4b8ed2a))
* remove borrow enabled requirement ([8b9221b](https://github.com/aave/aave-v3-core/commit/8b9221b822c0ecf1cc84831b51d4137072dc28d3))
* switch bit used for flashloan enabled ([748818f](https://github.com/aave/aave-v3-core/commit/748818f0ef78c94fc45192165cbb3a24c23d63d9))
* updated price oracle sentinel interface ([0457e71](https://github.com/aave/aave-v3-core/commit/0457e7176c89f91700e0aa63691dd0d9580b77db))
* updates and tests ([8d12d79](https://github.com/aave/aave-v3-core/commit/8d12d798cee82ab2d2b210c35a9ca69089b5ded3))


### Bug Fixes

* Add license to L2Pool contract ([#765](https://github.com/aave/aave-v3-core/issues/765)) ([56fd7ba](https://github.com/aave/aave-v3-core/commit/56fd7ba792e084518c2852cc6158f214cfd3eb2e))
* add validation to simpleFlashLoan ([bf652c2](https://github.com/aave/aave-v3-core/commit/bf652c2837d1403977e9cbc50e623dee21c5fcf4))
* Avoid emitting events when balanceIncrease is zero ([#745](https://github.com/aave/aave-v3-core/issues/745)) ([43f34c9](https://github.com/aave/aave-v3-core/commit/43f34c90400d02f3959beeec21038464d924242a))
* Capitalize license name of contracts ([fba69f0](https://github.com/aave/aave-v3-core/commit/fba69f087131abcb5945f6e817d5c7acb51badfa))
* CEI to fix reentrancy risk with reentrant tokens (eg ERC777) ([#704](https://github.com/aave/aave-v3-core/issues/704)) ([7fbdc6e](https://github.com/aave/aave-v3-core/commit/7fbdc6ea5f657072fbdf9494db07f1769c38c1d9))
* check revert msg and event emission ([284b492](https://github.com/aave/aave-v3-core/commit/284b49221e1947f689fd63da7c845f6b9c641f8b))
* Complete interfaces of IReserveInterestRateStrategy and IPoolDataProvider ([#766](https://github.com/aave/aave-v3-core/issues/766)) ([a00dda8](https://github.com/aave/aave-v3-core/commit/a00dda8faf464f6b0d338cf7e902e5931e0edbea))
* Fix condition of full liquidation of collateral ([#753](https://github.com/aave/aave-v3-core/issues/753)) ([56bcf5d](https://github.com/aave/aave-v3-core/commit/56bcf5d1ef378e9e5e7d09bcdb0bc42b4a1b645d))
* Fix docs param in burnScaled ([6b504d4](https://github.com/aave/aave-v3-core/commit/6b504d4bced83e1ac64ab552d082387de042e5af))
* Fix param of IAToken function ([1cb9ba1](https://github.com/aave/aave-v3-core/commit/1cb9ba198650c8582e12657c0ac9b21fa379ff06))
* Fix test of inaccuracy when liquidationProtocolFee is on ([7d8b7bf](https://github.com/aave/aave-v3-core/commit/7d8b7bf5acf016e541beaa36e2e82783ff74b846))
* Fix typo in docs ([#752](https://github.com/aave/aave-v3-core/issues/752)) ([9ccb1ab](https://github.com/aave/aave-v3-core/commit/9ccb1ab3c175d1e71404e875e623f1d161fd17e7))
* Install the last package of periphery for the rewards contract update ([066259a](https://github.com/aave/aave-v3-core/commit/066259a79444b097da911021d120e1fe4a000ad6))
* make InterestRateStrategy contract inheritable ([d06f8f2](https://github.com/aave/aave-v3-core/commit/d06f8f22296f44673b15f2b71df8d17a70b1ea88))
* make InterestRateStrategy contract inheritable ([0311475](https://github.com/aave/aave-v3-core/commit/0311475614ed7a6c4befba99a7567ee27454f942))
* Make transferOnLiq() virtual ([6968062](https://github.com/aave/aave-v3-core/commit/6968062ba1129b0e88ddb60408d235329a913fc9))
* Minimize the IAaveIncentivesController with only the handleAction ([a33f931](https://github.com/aave/aave-v3-core/commit/a33f93119f53d01c69b9c65a20d552e19a175e76))
* modify interface versions to support all minor 0.8.x vers ([9e95439](https://github.com/aave/aave-v3-core/commit/9e954393ea6c50aa00318e7f96a5867d0f49a460))
* Optimize logic for atoken self-transfers ([6c3154e](https://github.com/aave/aave-v3-core/commit/6c3154eedb5e543bd564953058c40b7f19b42d41))
* reentrancy in liquidationCall ([cd508a7](https://github.com/aave/aave-v3-core/commit/cd508a713d3cdd4e09c514fe0c47cf8f51383b07))
* Reformat code ([84b900c](https://github.com/aave/aave-v3-core/commit/84b900ce583eb8b1174357c05882e4a9f1854c38))
* remove formatting conflicts ([4c2cda0](https://github.com/aave/aave-v3-core/commit/4c2cda0f63326d986a7a7e68da32f9570623a450))
* remove gitignore update ([d7aa26a](https://github.com/aave/aave-v3-core/commit/d7aa26af60d2b9f34c95316fe42c17f51115630b))
* remove unrelated change ([a5ce86a](https://github.com/aave/aave-v3-core/commit/a5ce86a350f428e4a89bd0867254c7a898c72ca3))
* solution to fix liquidation failed case. ([623730b](https://github.com/aave/aave-v3-core/commit/623730b3db4146281a11c5424938d339c4005357))
* streamline test ([516e0e8](https://github.com/aave/aave-v3-core/commit/516e0e81263b2133c8640836ffa08afb112aacfa))
* typo ([#717](https://github.com/aave/aave-v3-core/issues/717)) ([9666e99](https://github.com/aave/aave-v3-core/commit/9666e9912c956950e6a4682df5e381999411840b))
* typos ([#715](https://github.com/aave/aave-v3-core/issues/715)) ([7dd869f](https://github.com/aave/aave-v3-core/commit/7dd869f68bbdb07ac94cf671bdf93c392c65af60))
* update comment for setReserveFlashLoaning ([9d84549](https://github.com/aave/aave-v3-core/commit/9d84549a0a1e91246da0312068a59e37413f5aa8))
* update deploy and periphery dependencies ([078fa28](https://github.com/aave/aave-v3-core/commit/078fa28584484209a0a1fac44cbc6ae827b719f6))
* update hardhat dependencies and fix test-suite error codes ([#739](https://github.com/aave/aave-v3-core/issues/739)) ([a54692a](https://github.com/aave/aave-v3-core/commit/a54692a54eddf2c0d5531de86ae298c491a2b192))

## [1.16.2](https://github.com/aave/aave-v3-core/compare/v1.16.1...v1.16.2) (2022-07-28)


### Features

* bump ci node.js to 16 ([82a11d2](https://github.com/aave/aave-v3-core/commit/82a11d2f4b7a2b747def6a5bfe1a52fd5a30a9ee))
* set to hardhat 2.10.0 and ethers to 5.6.9 ([9b50898](https://github.com/aave/aave-v3-core/commit/9b50898f6dbace6c2228e4bd41c081ff4afa7324))


### Bug Fixes

* dependencies ([f844a45](https://github.com/aave/aave-v3-core/commit/f844a4596b22fd16ec2516fa1e72c6d223481710))
* load market test data correctly, fix atoken/debt token names ([72d1264](https://github.com/aave/aave-v3-core/commit/72d1264d1e6a285663828e37c52b9078525ca291))
* remove npm ci cache, bump gas reporter to fixed version 1.0.8 set ethers to fixed version 5.6.1 ([bbb2dfd](https://github.com/aave/aave-v3-core/commit/bbb2dfde6c754c4e0552e78f43c5c09a6474805f))
* upgrade periphery and deploy library to latest version ([902b48a](https://github.com/aave/aave-v3-core/commit/902b48aca1b53435fb302c0ba462c79beb1b57b8))
* use ethers 5.5.3 to prevent different @ethersproject/bignumber version ([5411930](https://github.com/aave/aave-v3-core/commit/541193012dfd3c7ee1cb0dc2dfc11db091876145))


### Miscellaneous Chores

* release 1.16.2 ([32901d1](https://github.com/aave/aave-v3-core/commit/32901d1e541b38e2273ae896c43323a02a2ed744))

### [1.16.1](https://www.github.com/aave/aave-v3-core/compare/v1.16.0...v1.16.1) (2022-04-05)


### Bug Fixes

* add comment for undocumentted parameter ([ba0e4ee](https://www.github.com/aave/aave-v3-core/commit/ba0e4ee72cc3060fc55294aeac0a7bbb9caf3087))
* Add helpers for proxy contracts (eip1967 slots) ([d82be43](https://www.github.com/aave/aave-v3-core/commit/d82be4350d1778c269b5f7d875bdf5025fcff0bd))
* Fix ts type of contract in tests ([12373ca](https://www.github.com/aave/aave-v3-core/commit/12373ca09d4e2cec32546dc87285d516c1d9f261))

## [1.16.0](https://www.github.com/aave/aave-v3-core/compare/v1.15.0...v1.16.0) (2022-03-15)


### Features

* updated price oracle sentinel interface ([f6b71f5](https://www.github.com/aave/aave-v3-core/commit/f6b71f508db2a9a6f966bc6d606198eebaaefbb9))


### Bug Fixes

* Fix docstrings of ISequencerOracle ([4391fd4](https://www.github.com/aave/aave-v3-core/commit/4391fd4c8f29fb81c966fd4510df89d0acdb8404))

## [1.15.0](https://www.github.com/aave/aave-v3-core/compare/v1.14.2...v1.15.0) (2022-03-04)


### Features

* add owner constructor parameter to contracts that inherits Ownable to support CREATE2 factory deployment ([b6cc245](https://www.github.com/aave/aave-v3-core/commit/b6cc245b7e78e7d27b7af3e045cceff58e477231))
* bump beta deploy package ([fbcf885](https://www.github.com/aave/aave-v3-core/commit/fbcf885269285b36b54cc741da7922d257255a44))
* refactored executeLiquidationCall function ([63e43ef](https://www.github.com/aave/aave-v3-core/commit/63e43eff1c36a8d7e96c86f9655e7af31fe7e81f))


### Bug Fixes

* add owner parameters to test suites ([6e96821](https://www.github.com/aave/aave-v3-core/commit/6e968212d088ab6c9911b85dc454e4b989db7d6f))
* Move reservesData param to the beginning of the param list ([0872cb4](https://www.github.com/aave/aave-v3-core/commit/0872cb4c30e79566f09a0320168d0bd1f5111a29))

### [1.14.2](https://www.github.com/aave/aave-v3-core/compare/v1.14.1...v1.14.2) (2022-03-02)


### Bug Fixes

* Replace `...PriceAddress` with `...PriceSource` ([10a8667](https://www.github.com/aave/aave-v3-core/commit/10a8667b08c2e3daa1d87b1a7348154081c3903d))
* Use `EModeLogic::isInEModeCategory` in `executeLiquidationCall` ([28f72fe](https://www.github.com/aave/aave-v3-core/commit/28f72fe82496044d23d4ea3f20298cec9918404b))

### [1.14.1](https://www.github.com/aave/aave-v3-core/compare/v1.14.0...v1.14.1) (2022-03-01)


### Bug Fixes

* Improve consistency of function naming of CalldataLogic ([1a5517d](https://www.github.com/aave/aave-v3-core/commit/1a5517d28b531d673e6ac81e59b552d1280e7d7e))
* Use memory instead of storage in `getLiquidationBonus` ([deccf52](https://www.github.com/aave/aave-v3-core/commit/deccf529ad8d300f8a0e768cc8d9bf6d48b7699f))

## [1.14.0](https://www.github.com/aave/aave-v3-core/compare/v1.13.1...v1.14.0) (2022-02-21)


### Features

* clean dependencies and upgrade child dependencies ([7ca97ca](https://www.github.com/aave/aave-v3-core/commit/7ca97ca4cd6e9aad74583a4a1ca5ebe3fae44c64))
* removed obsolete files for the certora tools ([d7e0e7c](https://www.github.com/aave/aave-v3-core/commit/d7e0e7c37c0741b54afde3354d0be4a619fafde5))


### Bug Fixes

* `reserves` renamed to `reservesData` or `reservesList` when fitting ([3a6b928](https://www.github.com/aave/aave-v3-core/commit/3a6b928abb9ad6920582064704673e84f4b543dd))
* Cleanup naming and remove duplicate tests ([6ed5891](https://www.github.com/aave/aave-v3-core/commit/6ed589163ae30b235206dc571b98091f08dc5bad))
* Fix typo in package contributors tag ([14a3b6d](https://www.github.com/aave/aave-v3-core/commit/14a3b6d503d71d080c145e7fbcdacbe68b2b11ba))
* Moved getUserAccountData logic to PoolLogic to minimize contract size ([b07bdab](https://www.github.com/aave/aave-v3-core/commit/b07bdab921705788f38e130f75a10a1444cbc6b1))
* Natspec for `IPool::swapBorrowRateMode()` ([5b016fc](https://www.github.com/aave/aave-v3-core/commit/5b016fc699ef816204cf1e0fe1178285f53cf83c))
* Place interface extension declaration at the end ([19c015e](https://www.github.com/aave/aave-v3-core/commit/19c015ec76efc229da6b59fafa9f640d56e7f157))
* Rename reserves to reservesList ([4b0af0b](https://www.github.com/aave/aave-v3-core/commit/4b0af0bbb200e76dfedc7adf923c80e74fae37cb))
* Revert dependencies to last working state ([ff4d987](https://www.github.com/aave/aave-v3-core/commit/ff4d98765cea9b07f3e61f5b5e0efc472a06addc))
* typo in tech paper ([d6b9cbc](https://www.github.com/aave/aave-v3-core/commit/d6b9cbc55adf88c4cb7dd6df11941167fd119b3d))
* Update contributors etc in package.json ([60fc967](https://www.github.com/aave/aave-v3-core/commit/60fc967fa8037bb856c0c39c1e433fabafab255c))
* Update gas optimization numbers ([8719929](https://www.github.com/aave/aave-v3-core/commit/8719929597742e697cd8824cd29d9a786f3ec0eb))

### [1.13.1](https://www.github.com/aave/aave-v3-core/compare/v1.13.0...v1.13.1) (2022-01-27)


### Bug Fixes

* Add virtual to getReserveNormalizedIncome function ([bc10fd2](https://www.github.com/aave/aave-v3-core/commit/bc10fd24750680e83e3d4abb54bf452998fa0e0d))
* Mark all functions as virtual ([f6932b3](https://www.github.com/aave/aave-v3-core/commit/f6932b3d8c0055caf4ed1a191ec64676f4e68ad1))

## [1.13.0](https://www.github.com/aave/aave-v3-core/compare/v1.12.0...v1.13.0) (2022-01-25)


### Features

* bump @aave/deploy-v3 ([430c9d3](https://www.github.com/aave/aave-v3-core/commit/430c9d3eebfafc6349ead5860016e25ff43fb547))

## [1.12.0](https://www.github.com/aave/aave-v3-core/compare/v1.11.1...v1.12.0) (2022-01-25)


### Features

* bump @aave/deploy-v3 version ([85ec0fe](https://www.github.com/aave/aave-v3-core/commit/85ec0fe7cb45ae227b74ceb53c9088612034a3dc))


### Bug Fixes

* missing library at test, add updated deploy beta package ([67a5c80](https://www.github.com/aave/aave-v3-core/commit/67a5c80f04d0bcdd2dfa01c4b2d18a8a82dd222e))

### [1.11.1](https://www.github.com/aave/aave-v3-core/compare/v1.11.0...v1.11.1) (2022-01-25)


### Bug Fixes

* Add natspec and handle naming ([1f5c8a9](https://www.github.com/aave/aave-v3-core/commit/1f5c8a9daeeb58e25049d315127c37b3b92cee74))
* Adding literal params struct to initReserve ([43cced7](https://www.github.com/aave/aave-v3-core/commit/43cced7b155fa8cd714f5a088f5bf0b24ba6dc4e))
* Change function modifier of MAX_NUMBER_RESERVES to pure ([dc34a67](https://www.github.com/aave/aave-v3-core/commit/dc34a67d390e66ce77622d0c8ce80edd572fe9c6))
* Error library ([475eb1d](https://www.github.com/aave/aave-v3-core/commit/475eb1d73755d1ab8eb997feb0ebfa7f15f9893a))
* fix comments ([b90b888](https://www.github.com/aave/aave-v3-core/commit/b90b888726beed2032b6c0ba84d797cf90aef2e5))
* Move `dropReserve` logic to PoolLogic ([169d72c](https://www.github.com/aave/aave-v3-core/commit/169d72c58135b49b1236fd7fe9478adf1053efe9))
* Move `initReserve` and `getReservesList` to PoolLogic ([b0ef5e4](https://www.github.com/aave/aave-v3-core/commit/b0ef5e4ed8ff4aa2d1a872f23899a1e81476b6ba))
* Move availableLiqudity assignment in DefaultReserveInterestRateStrategy ([8c82d9d](https://www.github.com/aave/aave-v3-core/commit/8c82d9d87566ec2bacb705e2918ebb6e916d13b6))
* Move comment up in validationlogic ([cbdaa30](https://www.github.com/aave/aave-v3-core/commit/cbdaa3080f43ea53bcc4afa9636735eff1deb175))
* Move getters back to Pool, rename execute for functions called by pool ([106b617](https://www.github.com/aave/aave-v3-core/commit/106b6174c40086347de907f17dbf65f7535d69f3))
* Naming Atoken to AToken ([0d50841](https://www.github.com/aave/aave-v3-core/commit/0d508413f9ddba280ff32db6898d3927f1219bda))
* Remove unneeded comment ([1cb2324](https://www.github.com/aave/aave-v3-core/commit/1cb2324e11138c08d908d8cda7460f8598005cd1))
* Remove unneeded comment ([4134d89](https://www.github.com/aave/aave-v3-core/commit/4134d89707e5dec310fcb1f6945d1692d7a9cf5c))
* Remove unneeded fields in FlashLoanLocalVars struct ([9cb3a05](https://www.github.com/aave/aave-v3-core/commit/9cb3a05efdcb388ff7329480f26de8b3cc38d249))
* Remove unneeded import of interface in Pool ([cc49160](https://www.github.com/aave/aave-v3-core/commit/cc4916049d394fbadf63568b3ddaef74b531d087))
* Rename flashloanRepayment internal funciton to _flashloanRepayment ([3e18b8a](https://www.github.com/aave/aave-v3-core/commit/3e18b8ad2a80776f47f72c6c9bb5dfe620400e82))
* Replace > 0 with != 0 ([7bc9926](https://www.github.com/aave/aave-v3-core/commit/7bc99264a76453f04ac7754595ec643317b0763e))
* Simplify `executeRepay` ([6ab4a44](https://www.github.com/aave/aave-v3-core/commit/6ab4a44d601c71784a3af47d0d3f2c1d0f09b3f4))
* update comments ([5f09cf9](https://www.github.com/aave/aave-v3-core/commit/5f09cf90792d1e8aa71168de4822f4f4b29da0a8))
* Update deploy version ([a99e5b4](https://www.github.com/aave/aave-v3-core/commit/a99e5b458e4264ec1b583d7bbeafc12fde9a0ba5))
* Update import order in PoolLogic ([40447cd](https://www.github.com/aave/aave-v3-core/commit/40447cd10c1925ce5daea74f0d201c571128cab6))
* Update natspec ([f60a451](https://www.github.com/aave/aave-v3-core/commit/f60a451508f8c96a6c9dad55a2f5b43812feb721))
* Update ordering in `FlashLoanRepaymentParams` ([93dd9ea](https://www.github.com/aave/aave-v3-core/commit/93dd9eadd3f8e0deef5b91ff36f038d14b89e8f6))

## [1.11.0](https://www.github.com/aave/aave-v3-core/compare/v1.10.0...v1.11.0) (2022-01-23)


### Features

* Add rescueTokens functionality for Pool and AToken ([047edf8](https://www.github.com/aave/aave-v3-core/commit/047edf8a3cbb93d2d61f25b7954be9599ee96fd7))


### Bug Fixes

* Add getter for `_stableRateExcessOffset` ([3586ebb](https://www.github.com/aave/aave-v3-core/commit/3586ebbe2df893332c791ad9aa1bf049240d8c25))
* Fix contract docstrings ([802a4bd](https://www.github.com/aave/aave-v3-core/commit/802a4bd428edeff446cf0fca2696f4f7ad2a97cd))
* Fix imports order ([5d237a4](https://www.github.com/aave/aave-v3-core/commit/5d237a4e7e4259b28a50052ba106961a38911220))
* Re-add the abstract modifier to base tokenization contracts ([52abb3f](https://www.github.com/aave/aave-v3-core/commit/52abb3f81a420ed233422d7caee87beda8e8f31e))
* Remove blank space ([0c208fa](https://www.github.com/aave/aave-v3-core/commit/0c208fa3555c481667fa507ebfec1863a9bc39f9))
* Remove rescueTokensFromAToken from Pool ([1a32301](https://www.github.com/aave/aave-v3-core/commit/1a32301881993888b880e077236de90493338cde))
* Revert chainId renaming ([c4283d5](https://www.github.com/aave/aave-v3-core/commit/c4283d5fe062c4af5a6c37effa95df67efd7bd57))
* Update comment ([94c4cfb](https://www.github.com/aave/aave-v3-core/commit/94c4cfbd95d45e772d6348bdcde7e212a5651ea6))
* Update natspec and test ([39363e4](https://www.github.com/aave/aave-v3-core/commit/39363e4dd659899163619b62ef4fd2818a58f620))
* Update natspec for `calculateInterestRates()` ([b22150b](https://www.github.com/aave/aave-v3-core/commit/b22150b8da8ba0a51845264e367b1935456b0ba7))
* Update test name ([f6319b9](https://www.github.com/aave/aave-v3-core/commit/f6319b94d0db7a65ca7763115b29845f78dd5ae4))

## [1.10.0](https://www.github.com/aave/aave-v3-core/compare/v1.9.0...v1.10.0) (2022-01-12)


### Features

* fix tests missing module. add deployments dir to gitignore ([4e2c5e8](https://www.github.com/aave/aave-v3-core/commit/4e2c5e8334060941741375053ee2da4e6de3ed98))
* moved IncentivizedERC20 to the base folder ([1d5ed55](https://www.github.com/aave/aave-v3-core/commit/1d5ed55a613d52290263a87f863e423d054871f2))
* refactored premium to protocol in updateFlashloanPremiumTotal ([6349f4b](https://www.github.com/aave/aave-v3-core/commit/6349f4bdc16665350f421d535ac1e8126ba6741e))
* refactored premiumTotal in updateFlashloanPremiumToProtocol ([6b9f82c](https://www.github.com/aave/aave-v3-core/commit/6b9f82cb7cc267b932b92afce124e22cc22e523a))
* update comment ([7d6ccfb](https://www.github.com/aave/aave-v3-core/commit/7d6ccfb1b2ee35e59177d5bd289bce1bbe167b14))


### Bug Fixes

* Add `userTotalDebt` variable and refactor fix ([f9794f1](https://www.github.com/aave/aave-v3-core/commit/f9794f1f2494b7a4d569b947c14c01d6d6f678f6))
* Add amount cache in premium calc of executeFlashLoan ([785ba09](https://www.github.com/aave/aave-v3-core/commit/785ba097f930d35fe98fb52888bc43939a5ab356))
* Add checks to turn off borrowing. ([f9ec711](https://www.github.com/aave/aave-v3-core/commit/f9ec71142186d2d3abc6d9d090920cb2abd03d20))
* Add error message ([18ae21f](https://www.github.com/aave/aave-v3-core/commit/18ae21f2d345de64f5c7272c2023ac3c4d3eadb6))
* add failing tests ([254a021](https://www.github.com/aave/aave-v3-core/commit/254a0212dfd083dad58aadd0f9081b503d1f1eee))
* Add id to register and unregister events ([c196b71](https://www.github.com/aave/aave-v3-core/commit/c196b71241833db95205925c42ef29afc6f5b343))
* Add indexed params to MarketIdSet event ([74062fc](https://www.github.com/aave/aave-v3-core/commit/74062fcfb3e735b3430723d2d8e15ac67347a502))
* Add new event AddressSetAsProxy for imple address updates ([e4a15fb](https://www.github.com/aave/aave-v3-core/commit/e4a15fbecdfcaa2bc6a988b02af33ea43c99508d))
* Add override modifier to underlyingAsset getter ([be4702c](https://www.github.com/aave/aave-v3-core/commit/be4702c0ca9e3f310bf25875f574162cb2f4f153))
* Add percentage range check of liquidationFee in Configurator ([2d5330b](https://www.github.com/aave/aave-v3-core/commit/2d5330b37b248aa3f7e36713588eeff2c961cace))
* Add range check for new reserve factor ([9863a47](https://www.github.com/aave/aave-v3-core/commit/9863a47eac0a84e8b64469f5a597759b8c542633))
* add test for setting interest rate on unlistest asset ([09c04d2](https://www.github.com/aave/aave-v3-core/commit/09c04d241c087ea084f69701fca004adf282d165))
* Add underlying getter in debtToken interfaces ([498b860](https://www.github.com/aave/aave-v3-core/commit/498b860f7ff0588b9e58b793376d3b132bbcf498))
* add validation to set interest rates ([f623d9a](https://www.github.com/aave/aave-v3-core/commit/f623d9afe64035ef45d1f75b8693bb51e5a967cf))
* Add visibility accessors to StableDebtToken state variables ([9faa22f](https://www.github.com/aave/aave-v3-core/commit/9faa22f91343cbfd2eac5d3ac917432692871f07))
* Add visibility accessors to state variables of mocks ([b76dcb7](https://www.github.com/aave/aave-v3-core/commit/b76dcb731fc473aaef91141580ae4fd3d479deed))
* address provider staticcall get implementation ([d2b1a32](https://www.github.com/aave/aave-v3-core/commit/d2b1a322b34ab7e055f5c60142db917367e629fe))
* Change order of condition in validateHFAndLtv for gas saving ([34145bf](https://www.github.com/aave/aave-v3-core/commit/34145bf33225f6185a558a9eff965aac87803fb4))
* check asset for zero address ([cdaa90c](https://www.github.com/aave/aave-v3-core/commit/cdaa90cb231e2799513d1bf20125dbf8de1f973b))
* Clean tests ([d47b777](https://www.github.com/aave/aave-v3-core/commit/d47b777f9459ca8d55983096305cf78e4ccf59c6))
* consistent get, set order ([ccb634a](https://www.github.com/aave/aave-v3-core/commit/ccb634ae26d12ecdb15ed4a50b906a089089ab0c))
* Enhance reserves listing function in Pool ([2303871](https://www.github.com/aave/aave-v3-core/commit/2303871378a9ef5f123fc64756d30f6f9c2c2002))
* failing test ([82758e9](https://www.github.com/aave/aave-v3-core/commit/82758e96c6ae97745cd76558139a67b88eae4fb7))
* Fix ChainlinkAggregator intergration in AaveOracle ([44af5fe](https://www.github.com/aave/aave-v3-core/commit/44af5fe4b0b1378ca0767f821d443275b1bc6875))
* Fix docstrings ([a6b1a02](https://www.github.com/aave/aave-v3-core/commit/a6b1a0286980814dc7ba8c7f4f326a6c4bda3d64))
* Fix error from merge conflicts ([b0bea4c](https://www.github.com/aave/aave-v3-core/commit/b0bea4c8e4e4b62795f823d796a45418df786ed9))
* Fix error in a revert message of test cases ([abaaa2c](https://www.github.com/aave/aave-v3-core/commit/abaaa2c71b191c5637f97f5c9d0d637b33141ef7))
* Fix error in docstring ([a9aec4a](https://www.github.com/aave/aave-v3-core/commit/a9aec4a582875979e8d5271a67c45a72e8297b78))
* Fix error in test case ([4fb8037](https://www.github.com/aave/aave-v3-core/commit/4fb80372bf68c6740b8d5dc143719d4efb0585c7))
* Fix error in test from merge conflicts ([c7512ed](https://www.github.com/aave/aave-v3-core/commit/c7512ed0ea3d8b5932df461475292fa4b86ac14d))
* Fix error name INVALID_RESERVE_FACTOR ([3785b38](https://www.github.com/aave/aave-v3-core/commit/3785b389db2588ff731e9eeab234fa96e498024d))
* Fix errors constants in types.ts ([cdc6b26](https://www.github.com/aave/aave-v3-core/commit/cdc6b2663ac4798d46894a36473ff751223d811e))
* Fix errors in constants from merge conflicts ([4831638](https://www.github.com/aave/aave-v3-core/commit/4831638687daf4567bf825e4ee0ff905ae6b426a))
* Fix errors of merge conflicts ([b684547](https://www.github.com/aave/aave-v3-core/commit/b684547f2517397fe4dade7f30b050186f4d3d94))
* Fix grammar spell typos in docstrings ([3868ead](https://www.github.com/aave/aave-v3-core/commit/3868eadd9c6c01fcfd407247e718737bfef9d608))
* Fix MockAggregator code ([67d29f5](https://www.github.com/aave/aave-v3-core/commit/67d29f553f9ad7d53435aea0c40221372efa5bf2))
* Fix test, fetching artifact from local typechain ([da07b87](https://www.github.com/aave/aave-v3-core/commit/da07b87b3073ade16312f30935b46459a3859082))
* Fix typo in constant value ([71dc37c](https://www.github.com/aave/aave-v3-core/commit/71dc37cb70113aca1d9d0450a833786ac22d8237))
* Fix typo in docstring ([70a4a51](https://www.github.com/aave/aave-v3-core/commit/70a4a512caad3e83a462eac79d84c9dec3060ef3))
* Fix typos in docstrings ([51b95e0](https://www.github.com/aave/aave-v3-core/commit/51b95e0f1d26f61a16480e773fb65f3881fc663c))
* Fix typos in docstrings ([80ad248](https://www.github.com/aave/aave-v3-core/commit/80ad248732c1b9377955b811b2f3b2515c22b6eb))
* Fix typos in docstrings ([d3aa941](https://www.github.com/aave/aave-v3-core/commit/d3aa9413ae29010385f02d878ef4450f6fb8fd0e))
* Improve readability of LiquidationLogic constants ([79896d5](https://www.github.com/aave/aave-v3-core/commit/79896d5292aeef177eedda5dabd287988d3b8c45))
* improve set config readability ([a9dd99f](https://www.github.com/aave/aave-v3-core/commit/a9dd99fc69b960594261420152e0c5e4a979a0be))
* interest-rate-strategy-range-checks ([adf2f4c](https://www.github.com/aave/aave-v3-core/commit/adf2f4c341c36c559c555897162f34991824a008))
* Make flashloan premium to protocol a fraction of total premium ([d24c962](https://www.github.com/aave/aave-v3-core/commit/d24c96297013c122380b115a1ad5e8552a655097))
* Mark proxyAddress as indexed in AddressSetAsProxy event ([bddabad](https://www.github.com/aave/aave-v3-core/commit/bddabadb50bfee7f4d2f050a05893f1edcd7d07f))
* Move IChainlinkAggregator to dependencies and rename it to official name ([6099f84](https://www.github.com/aave/aave-v3-core/commit/6099f84733fbfe8c4738e0cd8c7b4637d8e8f0a9))
* Move up validation of executeFlashloan ([4b64705](https://www.github.com/aave/aave-v3-core/commit/4b6470574c81d2da10937bf2922a9bed9cf762f6))
* Naming of excess variables + introduction of constant for stable ratio ([37c2a63](https://www.github.com/aave/aave-v3-core/commit/37c2a63063b74bacf47a1f7059b1978f61b59750))
* Remove .solhint.json ([972ec21](https://www.github.com/aave/aave-v3-core/commit/972ec21552400b2ca29beb9a7e4b4680f742f82b))
* remove console logs ([2cd4dcc](https://www.github.com/aave/aave-v3-core/commit/2cd4dccdb0d6994dfbad60a4d3e18678dfd0fe96))
* Remove external hacky getProxyImplementation function ([62a25c8](https://www.github.com/aave/aave-v3-core/commit/62a25c8f4d50a5ff38c960a00962d5ec220b94f8))
* Remove getUserCurrentDebtMemory() helper function ([f2dc371](https://www.github.com/aave/aave-v3-core/commit/f2dc37148d13e7d217bcc3458c703fc98c7c90ca))
* Remove not needed ProxyImplementationSet event ([002ebda](https://www.github.com/aave/aave-v3-core/commit/002ebdac6a6665529886149765f550c46bf4c589))
* Remove redundant functions in WadRayMath lib ([5f0f035](https://www.github.com/aave/aave-v3-core/commit/5f0f0352efc69c19751b58b0dbcfc61370296992))
* Remove references to DataTypes inside itself ([e5abd90](https://www.github.com/aave/aave-v3-core/commit/e5abd90f36594f0bce3d5303a7a870ca0f98afad))
* Remove unneeded _getUnderlyingAsset() ([f2af600](https://www.github.com/aave/aave-v3-core/commit/f2af60004d4be0bb0ef6fd69070723f3f2527d69))
* Remove unneeded constants for tests ([27130ac](https://www.github.com/aave/aave-v3-core/commit/27130ac8e9d61303f8723e24f442d662e957eb54))
* Remove unneeded debug console ([4654be0](https://www.github.com/aave/aave-v3-core/commit/4654be065b270150456a1d7b06d217d15ef3d521))
* Remove unneeded import in PoolStorage ([361cc39](https://www.github.com/aave/aave-v3-core/commit/361cc390f540a029df6fc587802581d2dc616fac))
* Remove unneeded local variables ([a718549](https://www.github.com/aave/aave-v3-core/commit/a718549425f45cd6bc5bce52381fadefa80fa5ac))
* Remove unneeded vars for validateHFAndLtv ([8b32e45](https://www.github.com/aave/aave-v3-core/commit/8b32e45867405e8792ae1c50f08d4eb18272c032))
* Remove unused commented value ([9179670](https://www.github.com/aave/aave-v3-core/commit/917967002858662cd2164699f3852610dbc5ea97))
* Removes not needed BytesLib library ([43db2f6](https://www.github.com/aave/aave-v3-core/commit/43db2f6479d8e10629fc5f8b213d4cbc9be430f5))
* Rename last test helper with utilizationRate naming ([8acfc1a](https://www.github.com/aave/aave-v3-core/commit/8acfc1a40683bb6a051de7a4c7784baf24f1c209))
* Rename utilizationRate for usageRation in contracts ([b9e46eb](https://www.github.com/aave/aave-v3-core/commit/b9e46ebd1ac1e9144cc0db70bd9bfcbcb70725e5))
* Replace INCORRECT_ADDRESSES_PROVIDER for INVALID_ADDRESSES_PROVIDER ([be99a3c](https://www.github.com/aave/aave-v3-core/commit/be99a3ca8e150f749739838f7d058108ee07c56d))
* Replace INVALID_PARAMS_EMODE_CATEGORY for INVALID_EMODE_CATEGORY_PARAMS ([e4e922b](https://www.github.com/aave/aave-v3-core/commit/e4e922b52ec9f4a3b57d746830b02d636c07c19d))
* Replace INVALID_PARAMS_RESERVE for INVALID_RESERVE_PARAMS ([b6bb1cc](https://www.github.com/aave/aave-v3-core/commit/b6bb1ccbd3def686f90b32ae0e2685fbb304f696))
* Replace NO_STABLE_RATE_LOAN_IN_RESERVE for NO_STABLE_RATE_DEBT ([43cf2a1](https://www.github.com/aave/aave-v3-core/commit/43cf2a1d3634282073a3a7671443434587eb5f28))
* Replace NO_VARIABLE_RATE_LOAN_IN_RESERVE for NO_VARIABLE_RATE_DEBT ([df9658f](https://www.github.com/aave/aave-v3-core/commit/df9658f0e4bc663b7bc89e4f818f75a46a76f8b3))
* Replace unneeded inline if with expect ([d0d24b8](https://www.github.com/aave/aave-v3-core/commit/d0d24b8474c9c9ca0a28131f3a9a7aed6f618db0))
* Replace updateIsolationModeTotalDebt with a reset function ([35b4346](https://www.github.com/aave/aave-v3-core/commit/35b4346d5cf3f8054ce13ff8c69e369311f68f7e))
* Revert renaming of ValidationLogic constants ([b6fc891](https://www.github.com/aave/aave-v3-core/commit/b6fc891b211698db7d2b0d615d28ace84f47b5f7))
* Revert renaming of ValidationLogic constants ([52fc81a](https://www.github.com/aave/aave-v3-core/commit/52fc81ab447de19437e614535b027f409845fe8f))
* Revert variable rename of usageRatio ([66f51fd](https://www.github.com/aave/aave-v3-core/commit/66f51fd4fa18c7ffa1e9f98fe72aa50c3db22ee1))
* Simplify test using object destructuring ([98b7d73](https://www.github.com/aave/aave-v3-core/commit/98b7d73e2d766606148278ca94b3bb3ad44ea9eb))
* Simplify updateImpl logic ([da14cbf](https://www.github.com/aave/aave-v3-core/commit/da14cbf3ddfc7afcf590a4df95f3c81c411f4097))
* Update naming of EXCESS constants ([064a4d4](https://www.github.com/aave/aave-v3-core/commit/064a4d4131f53ba9e3be457ecf86bd902af769a6))


### Miscellaneous Chores

* release 1.10.0 ([734f83a](https://www.github.com/aave/aave-v3-core/commit/734f83abe0385760489185aa7fb7e773a41ab8b8))

## [1.9.0](https://www.github.com/aave/aave-v3-core/compare/v1.8.0...v1.9.0) (2021-12-26)


### Features

* add event test ([d5fe4bb](https://www.github.com/aave/aave-v3-core/commit/d5fe4bb5afd7d5cc1dfe47ef0700c5dd4cfce5ea))
* added additional functions to IAToken for EIP2612 ([df8ee61](https://www.github.com/aave/aave-v3-core/commit/df8ee614e460cf804fcaf1dcd8b9e5f1de0ef406))
* added event to DelegationAwareAToken ([f5fd1b6](https://www.github.com/aave/aave-v3-core/commit/f5fd1b654d598ff9b2170dafcba6d28f88a391ae))
* added indexed to the ICreditDelegation event ([0a3d365](https://www.github.com/aave/aave-v3-core/commit/0a3d36546683949a6dc8002db814827507847abc))
* replaced SafeERC20 with GPv2SafeERC20 ([fe4ae41](https://www.github.com/aave/aave-v3-core/commit/fe4ae41aa2bb1583b430595decc4fddd6e60d137))


### Bug Fixes

* Add comment to BorrowLogic ([2ae309d](https://www.github.com/aave/aave-v3-core/commit/2ae309dbad85dedf1313a898a0bd558eeb447b64))
* add else ([4bdbd7f](https://www.github.com/aave/aave-v3-core/commit/4bdbd7f56b4bdf7d3fdf421a7a2f21a0cdcb7b31))
* Add explicit access level for variables ([8fb2e3c](https://www.github.com/aave/aave-v3-core/commit/8fb2e3c3102bc42aab9aaec8f77a1bea6463b6da))
* Add mode to FlashLoan event ([956c809](https://www.github.com/aave/aave-v3-core/commit/956c809749a83d4fa79ffa1cfc8d7bd06348b442))
* Add natspec to `executeLiquidationCall` ([9bb5289](https://www.github.com/aave/aave-v3-core/commit/9bb5289465ffaf0edc32c6f733f4c7eccecf2f5a))
* Add repay with atoken ux issue ([b464cf5](https://www.github.com/aave/aave-v3-core/commit/b464cf55fe9dbfa918b3832f033e635595212247))
* Avoid finalizeTransfer with 0 value transfer ([d6bf261](https://www.github.com/aave/aave-v3-core/commit/d6bf261f4fc08bfd8bd1a4b3e3b4ed140430a01a))
* Cache result to not recompute for event ([b342d2f](https://www.github.com/aave/aave-v3-core/commit/b342d2f7f0f9fc05b5e7d9dc21e17183219b6d19))
* Change  to  in Pool for V2 compatibility ([932c5a0](https://www.github.com/aave/aave-v3-core/commit/932c5a0dc02c22f4a9c20384a9912e2780fcbae8))
* Clean cumulateToLiqIndex and add comments ([d6e90dc](https://www.github.com/aave/aave-v3-core/commit/d6e90dcd92e2f1536323648fb66c018a8811d97d))
* Fix `income` -> `debt` in `getNormalizedDebt` natspec. ([9e6b183](https://www.github.com/aave/aave-v3-core/commit/9e6b1831f3f814fca46e19d6761bda9a7cd07f66))
* Fix differences between IPool and Pool ([8beefda](https://www.github.com/aave/aave-v3-core/commit/8beefda3d19c3814196052575332342a5b23be08))
* Fix docstrings ([93c2d95](https://www.github.com/aave/aave-v3-core/commit/93c2d954937172dedd3a794a0e58627b7aaa1dc0))
* Fix docstrings ([c55bb04](https://www.github.com/aave/aave-v3-core/commit/c55bb04725b4a1ed6c87a0f5092669d55e306afc))
* Fix typo ([df40063](https://www.github.com/aave/aave-v3-core/commit/df400636ac915f19b642a830b8ba86969837ac2d))
* Fix typo in setReserveFreeze function name ([da72c39](https://www.github.com/aave/aave-v3-core/commit/da72c391f8ddef9a200e5b9203c1cfbd29986ca6))
* Fix variable name of event in ReserveLogic ([40b9bb8](https://www.github.com/aave/aave-v3-core/commit/40b9bb814e5b89e19b50cb73a274646901dd2a00))
* Gas optimization UserConfiguration ([af00927](https://www.github.com/aave/aave-v3-core/commit/af009272000e82aa2af78ec871373a57e2f1dbf5))
* Handle code style issues ([af3743b](https://www.github.com/aave/aave-v3-core/commit/af3743b108ebeca4f7185a79b6ce6d7ca988075c))
* Improve code readability of ReserveLogic ([ae1476d](https://www.github.com/aave/aave-v3-core/commit/ae1476daf53cf24262fdd9628e0fa4df9bf15a47))
* Improve readability of initial values of variables ([592b21d](https://www.github.com/aave/aave-v3-core/commit/592b21d831b0dc2a6e3e998701ea4e3a4b13c401))
* Include 100% as valid premiums ([c6b3347](https://www.github.com/aave/aave-v3-core/commit/c6b33472ed4f2ba6ebcf5a0b1aa3826c066aa7bd))
* Make test engine not stop at first failure ([84eaf29](https://www.github.com/aave/aave-v3-core/commit/84eaf29afeffb720194d95b6ed86cb91273bf763))
* Move up event in IVariableDebtToken ([f536538](https://www.github.com/aave/aave-v3-core/commit/f536538e6b7d6f97b24ff353c32e301c1b11d1ec))
* move up require ([d47afa2](https://www.github.com/aave/aave-v3-core/commit/d47afa2da264bb4ec81957ebdc787052ce7d0079))
* Re-add `getUserCurrentDebtMemory()` ([7742985](https://www.github.com/aave/aave-v3-core/commit/7742985319be5df5a11d6740a712c2017f64dcf6))
* Refactor variable calc in StableDebtToken ([4ed69b4](https://www.github.com/aave/aave-v3-core/commit/4ed69b4a8ad17cfc8defe19e7049db88f1cd0cf8))
* Remove case, created separate issue ([0082fd8](https://www.github.com/aave/aave-v3-core/commit/0082fd82eacfe61f32efce03fe99f464a3992eec))
* remove IAaveIncentivesController casting ([9805add](https://www.github.com/aave/aave-v3-core/commit/9805add3405965badb9803ab68c8b7f73b0989ab))
* Remove redundant casting for block.timestamp ([941539f](https://www.github.com/aave/aave-v3-core/commit/941539f0a3b72598a0ff556ba2b5889cfe0f08ff))
* Remove redundant unneeded variable ([703782c](https://www.github.com/aave/aave-v3-core/commit/703782cb7c1d353239bec219b474f3ee30b0c063))
* Remove unneeded `delegator` param from delegationWithSig typehash ([dcf7c36](https://www.github.com/aave/aave-v3-core/commit/dcf7c36dc2df66283f29c72738872c1e3e992a43))
* Remove unneeded imports in contracts ([48f9e89](https://www.github.com/aave/aave-v3-core/commit/48f9e89ee21fe0637e970fd1bbcd662c74ab5147))
* Remove unneededv variable in cumulateToLiqIndex ([75e7fdc](https://www.github.com/aave/aave-v3-core/commit/75e7fdcd4cf9b5112bb22fb3c4e6b03b33db4907))
* removed invalid imports ([659b82c](https://www.github.com/aave/aave-v3-core/commit/659b82cf93d3a032a9ad746a7f0fdf02f06ecd60))
* rename admin variable ([5199283](https://www.github.com/aave/aave-v3-core/commit/5199283c5ac4e93260ad416920fb28aa8896ce5a))
* Replace `rateMode` with `interestRateMode` and precise dataype ([806f161](https://www.github.com/aave/aave-v3-core/commit/806f16172bb718366417ef9e519b0fe5b9d04595))
* Replace factor with multiplier for clarity ([085ad0c](https://www.github.com/aave/aave-v3-core/commit/085ad0c8df62ac60a25f74c722fcd822c1f09107))
* Replace HALF_PERCENT with HALF_PERCENTAGE_FACTOR ([4fb45ec](https://www.github.com/aave/aave-v3-core/commit/4fb45ec34d4d86f75b94e2d284942ac69d62e8db))
* Replace Helper.toUint128 with OZ SafeCast ([3916735](https://www.github.com/aave/aave-v3-core/commit/391673546fbf7de6199822b60a49787498a26978))
* Rever simplification of cumulateToLiqIndex due to precision loss ([585c9c4](https://www.github.com/aave/aave-v3-core/commit/585c9c41525a8df7c6b13aa37fa07c860a03bd27))
* set config map to zero on init ([ea40ee1](https://www.github.com/aave/aave-v3-core/commit/ea40ee1608b7ffe60ae03154403b77fdc20933de))
* Simplify condition in SupplyLogic ([6487f29](https://www.github.com/aave/aave-v3-core/commit/6487f29892706390cae8fd46b10de24ca67281db))
* Simplify cumulateToLiqIndex in ReserveLogic ([53a95c8](https://www.github.com/aave/aave-v3-core/commit/53a95c809764a3acdb6f6e5d1845aea0d7de5a27))
* swap name ([ebd3622](https://www.github.com/aave/aave-v3-core/commit/ebd3622b28b18d8d7adbcd5f285a3c13a180db8f))
* Typo in liquidation-emode.spec.ts ([97e0acc](https://www.github.com/aave/aave-v3-core/commit/97e0acc5515641ef936cbb3284b4e2f9811a27f6))
* update admin to internal ([7d19d29](https://www.github.com/aave/aave-v3-core/commit/7d19d295c66c5e19c58cec87082e1905116dc196))
* Update test with new delegationWithSig typehash ([fea83f3](https://www.github.com/aave/aave-v3-core/commit/fea83f39d433ff1e624a39878686ddf661eb66fe))
* Use `next` prefix for isolation mode total debt ([5ffeecd](https://www.github.com/aave/aave-v3-core/commit/5ffeecdd6e376ff341d6f633e36be53c2cbc43b1))

## [1.8.0](https://www.github.com/aave/aave-v3-core/compare/v1.7.0...v1.8.0) (2021-12-16)


### Features

* added natspec comments, changed function param names to uniform with the other functions ([dda5bde](https://www.github.com/aave/aave-v3-core/commit/dda5bde0b901df2fdadd41cba332652f20dc3796))
* clarify mint and burn comment in interface ([03041ef](https://www.github.com/aave/aave-v3-core/commit/03041ef2189dbd5ed5344df09a6d3acf5caff0b6))
* refactored setReserveBorrowing, setReserveStableRateBorrowing, fixed tests ([6749233](https://www.github.com/aave/aave-v3-core/commit/6749233881b49e7f1d93b991ce1b8f850382c5b7))


### Bug Fixes

* Add 0 division check to wadDiv and rayDiv. ([ea80f22](https://www.github.com/aave/aave-v3-core/commit/ea80f22e6aeb51d0eab96785113aa5b802346e9d))
* Add better natspec for ConfiguratorLogic ([5cdfcdf](https://www.github.com/aave/aave-v3-core/commit/5cdfcdfe67ffbaccaf565385ad13588f99865145))
* Add better natspec for EModeLogic ([816d566](https://www.github.com/aave/aave-v3-core/commit/816d566224b4df116016e60a7e841cb0c5826949))
* Add comments about BaseCurrency to IPriceOracleGetter ([60ff953](https://www.github.com/aave/aave-v3-core/commit/60ff953ba9b4bdacb9a2acf5bbfcefd69e87e84d))
* Add docstrings for SequencerOracle ([9557272](https://www.github.com/aave/aave-v3-core/commit/955727288ef62e0a1e59ffdd3babb0b211a70a40))
* Add docstrings to PriceOracleSentinel ([368c77f](https://www.github.com/aave/aave-v3-core/commit/368c77f15e644e00e53a73f92294cf52a17d91b7))
* Add event emission to natspec ([ec28a38](https://www.github.com/aave/aave-v3-core/commit/ec28a384fad9d42cc308c5a894358f81f11034bd))
* Add explicit error message for LTV == 0 before division. ([d8d1694](https://www.github.com/aave/aave-v3-core/commit/d8d1694deb12a24f0638fb5990951f0daa574731))
* Add functions docs of `IPoolAddressesProvider` ([36a543b](https://www.github.com/aave/aave-v3-core/commit/36a543b3856a075d197e108717f4aa020f06fa1c))
* Add IAaveOracle interface ([ed03e30](https://www.github.com/aave/aave-v3-core/commit/ed03e3097aaae33c202d042bd6bb0f1d9a03eb26))
* Add literal syntax to setEModeCategory ([4ab27c3](https://www.github.com/aave/aave-v3-core/commit/4ab27c3a78f882175032417019073b6574e28d91))
* Add missing docstrings of the IACLManager ([84bcffc](https://www.github.com/aave/aave-v3-core/commit/84bcffce40ecfec73b43ce0f4263b60629fa9d87))
* Add test and zero div check to percentageDiv ([d914c9d](https://www.github.com/aave/aave-v3-core/commit/d914c9dc4502e1f166d0c1cc26c7c95628d34db6))
* Added `first` to natspec `_getFirstAssetAsCollateralId()` ([1b6a1df](https://www.github.com/aave/aave-v3-core/commit/1b6a1dfb80b6a254753af01fcfa60b9d8a891d62))
* additional check in isUsingAsCollateralOne() to avoid revert if collateralData == 0 ([49638cb](https://www.github.com/aave/aave-v3-core/commit/49638cb0874050443281c6cb30959891b6d32268))
* Change access control to setGracePeriod ([d9c2630](https://www.github.com/aave/aave-v3-core/commit/d9c26306b4f573422584453437c8f8d1b777f484))
* Clean code style of FlashLoan mocks ([6fe84b6](https://www.github.com/aave/aave-v3-core/commit/6fe84b6bd385195e5d5cac299a1458e33489f643))
* Clean code style of mocks ([60a03e3](https://www.github.com/aave/aave-v3-core/commit/60a03e38157ed8c64fab8efd073d72e183f17a7b))
* Consolidate BorrowingOnReserve events into 1 ([110c5d0](https://www.github.com/aave/aave-v3-core/commit/110c5d01bd321be8f101202c5ca3c38822928701))
* Enhance clarity of WadRayMath constants ([b7244c1](https://www.github.com/aave/aave-v3-core/commit/b7244c181f3649e94a6c8a085c1d3156556883f7))
* Fix and clean halfWad and halfRay values ([5f5dff4](https://www.github.com/aave/aave-v3-core/commit/5f5dff43a826209bc22a8a4562dbbb40c782e06a))
* Fix BridgeLogic natspec ([71be75e](https://www.github.com/aave/aave-v3-core/commit/71be75eb0362c214b4a28292455d9faaf473d24a))
* Fix PoolAddresesProvider docstrings ([30d757f](https://www.github.com/aave/aave-v3-core/commit/30d757f45d4eec26285df513e9b914aa4964985d))
* Fix typo in `IAaveOracle` natspec ([1f02c09](https://www.github.com/aave/aave-v3-core/commit/1f02c090b7922f9a08ad6e5bc29d350b2736060b))
* Fix typo in `LiquidationLogic` natspec ([3729466](https://www.github.com/aave/aave-v3-core/commit/37294662bbb6a8ff77c0c48ad3d0d09e554ade8f))
* Fix typos in docstrings ([167da26](https://www.github.com/aave/aave-v3-core/commit/167da26e4db23a9ca6b30940d633d4472a1348e4))
* Fix typos in natspec docs ([e29d46f](https://www.github.com/aave/aave-v3-core/commit/e29d46f9ff816f085140a70fcb41d4785a1c85fd))
* Format public immutable variable name with MACRO case ([c90b040](https://www.github.com/aave/aave-v3-core/commit/c90b04093f770e32febb3fb88e26a199c0b2316b))
* increased the data size of id and i to uint16 ([3d7fc2b](https://www.github.com/aave/aave-v3-core/commit/3d7fc2bf8ff001d203e64bde826f3f77da552cea))
* Make `_pool` public of AToken and DebtToken ([014da25](https://www.github.com/aave/aave-v3-core/commit/014da25b4f13ea9c83b468099e71b5eceff2f98c))
* Make addressesProvider of AaveOracle public ([69b3eca](https://www.github.com/aave/aave-v3-core/commit/69b3ecacc7e953c43a32764b4bcaad0da1c822cb))
* Make gracePeriod and sequencerOracle configurables ([3c6352f](https://www.github.com/aave/aave-v3-core/commit/3c6352fa3907407e46c1df6d9338cd638d974ece))
* Make Pool `_addressesProvider` public ([762d79e](https://www.github.com/aave/aave-v3-core/commit/762d79e033be02a0a67dbf47447688de1cd08167))
* Merge conflict in stable-debt-token.spec.ts ([78a6198](https://www.github.com/aave/aave-v3-core/commit/78a61982db5d58e0ee6a5ee0b3bcf2173a264a07))
* Minor merge conflict ([0df5e80](https://www.github.com/aave/aave-v3-core/commit/0df5e80a4a7e983231b7cb23be458f53b3f572b6))
* Move the optimization after the operation condition ([c6a785f](https://www.github.com/aave/aave-v3-core/commit/c6a785f2cd1f93f147a9c5a799648b61f4381541))
* naming consistency and stable debt event fix ([7f17123](https://www.github.com/aave/aave-v3-core/commit/7f17123ee4c59157a1a6f02746dd9790e4420db8))
* Optimize setUseReserveAsCollateral whenthere is no state change ([55445f2](https://www.github.com/aave/aave-v3-core/commit/55445f21ea27d8248ecad60a3230d28c48c9581a))
* remove console.log ([e279cda](https://www.github.com/aave/aave-v3-core/commit/e279cda79676b2c6d92a4ccbb737d71dc062fee9))
* Remove duplicated code in LiquidationLogic ([2189ba4](https://www.github.com/aave/aave-v3-core/commit/2189ba4446e843645ed3b2add8153881088bfbb4))
* Remove unneeded comments ([9ec0ec4](https://www.github.com/aave/aave-v3-core/commit/9ec0ec4b79a29b060743bbdd700559d6d7159469))
* Remove unneeded contract file ([6f480ec](https://www.github.com/aave/aave-v3-core/commit/6f480ecb2eb0325aabab25e6b902e83d22f77755))
* remove unused variable ([87fc0bb](https://www.github.com/aave/aave-v3-core/commit/87fc0bb492df1ef82b71a765f48b9913024d2875))
* Rename PoolConfigurator setter events ([53b40ce](https://www.github.com/aave/aave-v3-core/commit/53b40ce81d0b539be6b415ed75d1e419137b9fbc))
* Rename setter functions names ([449f42d](https://www.github.com/aave/aave-v3-core/commit/449f42d91fd0c08342412f08e3e3b1f3638ba953))
* set package-lock.json ([299d2f9](https://www.github.com/aave/aave-v3-core/commit/299d2f9ea3d62190004caca0dafa243089a262b3))
* Typo in flashloanlogic natspec ([4e36f6f](https://www.github.com/aave/aave-v3-core/commit/4e36f6f2d58411c9bc51f59058a80349a171a3de))
* Unify reserveCount and maxReserve to uint16 ([b6e2b35](https://www.github.com/aave/aave-v3-core/commit/b6e2b351f15cad9de45dcd3cf1e6a0686b64aad9))
* update .npmrc ([9cfe79c](https://www.github.com/aave/aave-v3-core/commit/9cfe79c3752959c7a22fcfb07b74d4c960c8ccf2))
* Update comments in validation-logic.spec.ts ([3b5c039](https://www.github.com/aave/aave-v3-core/commit/3b5c03973446c817860401ef255bcb5455d2676b))
* Update executeRepay to compute interest correctly for repaying with aTokens ([abf0e0c](https://www.github.com/aave/aave-v3-core/commit/abf0e0cf6da5bd9f6d91c505fda3580e4467c87e))
* Update function naming ([594b929](https://www.github.com/aave/aave-v3-core/commit/594b92985fb62831e8b4ee72a6ad4dfd5730eb05))
* Update natspec docs for FlashLoanLogic ([4b02b3e](https://www.github.com/aave/aave-v3-core/commit/4b02b3e6cf2f4f1c3f7f583652b3b9ff3a41b94e))
* Update variable packing of `ReserveData` ([7765624](https://www.github.com/aave/aave-v3-core/commit/77656242fd9e61c2080f938e7514d719c0015a91))
* Update wording of token update functions in ConfiguratorLogic ([2dd1551](https://www.github.com/aave/aave-v3-core/commit/2dd15513c1930d739aff0b14e2c94770b0e38004))
* use @aave/deploy-v3@1.7.1 library and load typechain locally instead of deploy-v3, to fix unsynced artifacts ([6904746](https://www.github.com/aave/aave-v3-core/commit/690474641fef8efa0dd95f645cb3e9b8d4eab3e5))
* Use `checkNoSuppliers` instead of `CheckNoDepositors` ([88aff43](https://www.github.com/aave/aave-v3-core/commit/88aff43cebb660689c6fcdd84560a5ebe9f98911))
* use already calculated value instead of re-calculating ([c0743f9](https://www.github.com/aave/aave-v3-core/commit/c0743f95890eb6e6c0ee873775b81aa952b55753))
* Use cache to get `aTokenAddress` in bridge logic ([e41ec39](https://www.github.com/aave/aave-v3-core/commit/e41ec395182296ee1226ed4b57914abdd3321fa0))
* Use literal syntax for struct params ([7baf196](https://www.github.com/aave/aave-v3-core/commit/7baf196bf51ad60a09d477e325537fdffe6f8465))

## [1.7.0](https://www.github.com/aave/aave-v3-core/compare/v1.6.0...v1.7.0) (2021-12-01)


### Features

* Add decimals to MockAggregator to match Chainlink Aggregator interface ([4cf1dac](https://www.github.com/aave/aave-v3-core/commit/4cf1dacd70f11a0c7103ade68bb05c907e846b2d))
* added handleRepayment() in flashloan and liqCall ([6c43820](https://www.github.com/aave/aave-v3-core/commit/6c438201c6ee95b6dc3895b904213b975ce3905d))


### Bug Fixes

* fixed handleRepayment() in flashloan ([80a19bb](https://www.github.com/aave/aave-v3-core/commit/80a19bb7e0d92af0604e67dc6586a0f376bf91a4))

## [1.6.0](https://www.github.com/aave/aave-v3-core/compare/v1.5.2...v1.6.0) (2021-11-27)


### Features

* reduced the number of optimizer runs ([8562a91](https://www.github.com/aave/aave-v3-core/commit/8562a911d04ede756a703be60f985d1916805d46))
* reorganized PoolStorage for gas savings ([87776f7](https://www.github.com/aave/aave-v3-core/commit/87776f757d58ddf20b99cdce752e068602f38389))


### Bug Fixes

* Add `useATokens` param to `Repay` event ([beec3f8](https://www.github.com/aave/aave-v3-core/commit/beec3f86bf1e4024dc74583bb386851b3d212963))
* Add additional constraint to use `eModeAssetPrice` ([ec42295](https://www.github.com/aave/aave-v3-core/commit/ec422953ca60110d98aa3c7c8930f70d88d5b294))
* Add check to `Pool::initializer()` ([8f2b426](https://www.github.com/aave/aave-v3-core/commit/8f2b426962a11c3e289301a341bcdf170b3e763f))
* Add clean ups to VariableDebtToken test ([bc4f314](https://www.github.com/aave/aave-v3-core/commit/bc4f314c85ac59ea84244108e6fc6f7c22d3fb74))
* Add cleanup to StableDebtToken test ([d1eeaa5](https://www.github.com/aave/aave-v3-core/commit/d1eeaa51d19b1e45bfa564fb51e5bd69623450db))
* Add cleanups in eMode tests ([fbf80a8](https://www.github.com/aave/aave-v3-core/commit/fbf80a8092c5807a281ab95b6e54f85790dda9b4))
* Add extra input to MockPoolInherited test deployment ([e7944dc](https://www.github.com/aave/aave-v3-core/commit/e7944dc1f92ea6fada5a31031d3628c7682da0d7))
* Add minor gas optimization for executeFlashLoan ([0d737f5](https://www.github.com/aave/aave-v3-core/commit/0d737f5041649a27a2d97148e625e1d3b211d0e3))
* Add natspec comments to IncentivizedERC20 ([722a8e7](https://www.github.com/aave/aave-v3-core/commit/722a8e7b5c3a2e14f639e6491cb264b8d305508a))
* Add precision to debt ceiling comment ([3d43c02](https://www.github.com/aave/aave-v3-core/commit/3d43c02a8d014e33619ad5d375d1baeac4448cb8))
* Add test exploiting pricing issue ([3457fb8](https://www.github.com/aave/aave-v3-core/commit/3457fb829d094a45f6d056c9893ad0c3b1bef465))
* Add test for incorrect init of pool ([b3cebaf](https://www.github.com/aave/aave-v3-core/commit/b3cebaf6180340378e37257c6ac4e4adab444e2f))
* Bumped Node JS version of Dockerfile to 16 stable version. Update package-lock. ([f0c8787](https://www.github.com/aave/aave-v3-core/commit/f0c8787725ff3fc77b02cf92928f6e79207a93ff))
* Change visibility of `name()` in IncentivizedERC20 ([467a5c1](https://www.github.com/aave/aave-v3-core/commit/467a5c110552bf4ec71449cccc2bb8fd9201806b))
* Do multiplication before devision for `currentStableBorrowRate` ([ca177fb](https://www.github.com/aave/aave-v3-core/commit/ca177fbe5860ae360e4ebf8e93712fa84b1ab2e4))
* Fix typo on credit delegation test case ([0b6a65b](https://www.github.com/aave/aave-v3-core/commit/0b6a65bb109665b1d74bcdc5c5fd04c38dfa4721))
* Handle minor merge issue ([36488c9](https://www.github.com/aave/aave-v3-core/commit/36488c9e86a15bc66047ddf09505dbcf29f79324))
* Make `_addressesProvider` immutable in `Pool` ([b41feab](https://www.github.com/aave/aave-v3-core/commit/b41feabd504c8da527db7fc1e3867519b2c7334e))
* Make `_nonces` internal and add `nonces` getter ([f3d1817](https://www.github.com/aave/aave-v3-core/commit/f3d18176f6250ac255287acaf86aae8f04c22e77))
* Make `MAX_RESERVES_COUNT` constant ([04ced7f](https://www.github.com/aave/aave-v3-core/commit/04ced7fd5582af588ebdcf4d2f755db8998d1b75))
* MockPoolInherited wrong return value on `MAX_NUMBER_RESERVES` ([b724a73](https://www.github.com/aave/aave-v3-core/commit/b724a73790b8fcad67e33df10217da448a4cf953))
* Move `_nonces` to IncentivizedERC20 ([54eb024](https://www.github.com/aave/aave-v3-core/commit/54eb024bef45a8d77a5f856cf1866024d282da7e))
* Move list length check to front of `validateFlashloan` function ([f485be5](https://www.github.com/aave/aave-v3-core/commit/f485be5d9f87d85cef65d816e708741437586280))
* Pair `_avgStableBorrowRate` and `_totalSupplyTimestamp` ([b6c9372](https://www.github.com/aave/aave-v3-core/commit/b6c937292dd7bb2c91eec05940170ac902701a09))
* Refactor tokens, move domain separator function to IncentivizedERC20 ([c033f9d](https://www.github.com/aave/aave-v3-core/commit/c033f9d4d83c08f75b63b972ca02fca27d6afc45))
* Removal of unneeded struct ([262dc7a](https://www.github.com/aave/aave-v3-core/commit/262dc7a525b3e6794b96b904189696773e3787c5))
* Remove unneeded fields from `AvailableCollateralToLiquidateLocalVars` ([f9088b6](https://www.github.com/aave/aave-v3-core/commit/f9088b65a6b3a5c6875f0176f32bda99caf63ee9))
* setup npm registry without file ([91fdc99](https://www.github.com/aave/aave-v3-core/commit/91fdc99b02dffb4924c5078d894f2ca180d8e23c))
* Simplify `_getFirstAssetAsCollateralId()` ([dffc2f6](https://www.github.com/aave/aave-v3-core/commit/dffc2f63275c6d4be780dc4199adace662afb585))
* source setup env for coverage ([fd7de34](https://www.github.com/aave/aave-v3-core/commit/fd7de34862f678aeac426634ba48b1c0afd65f7d))
* Update `user` to `onBehalfOf` for VariabelDebtToken ([7ff840f](https://www.github.com/aave/aave-v3-core/commit/7ff840f36a12ae19372c1f83b9d2ee01ae30de5b))
* Update package.json ([49a8c39](https://www.github.com/aave/aave-v3-core/commit/49a8c39e6137f31aa7a4e05a6ca2556532ddab20))
* update v3 deploy dev dependency to latest deployment scripts ([2aa8f5c](https://www.github.com/aave/aave-v3-core/commit/2aa8f5c3364c518890a12366f4ed6c8747dfe4bc))
* update v3 dev dependencies ([9cb6a47](https://www.github.com/aave/aave-v3-core/commit/9cb6a47393d676d16bd928e8cce5f90db14892ad))
* Use cached value for asset unit instead of recomputation ([335927c](https://www.github.com/aave/aave-v3-core/commit/335927c0493772f68968feb0477d0fad348e5b59))

### [1.5.2](https://www.github.com/aave/aave-v3-core/compare/v1.5.1...v1.5.2) (2021-11-12)


### Bug Fixes

* fix releasepipeline ([5dc309d](https://www.github.com/aave/aave-v3-core/commit/5dc309d08120d3cf2ddea44e53f56b6c29fdfca6))

### [1.5.1](https://www.github.com/aave/aave-v3-core/compare/v1.5.0...v1.5.1) (2021-11-12)


### Bug Fixes

* fix ci workflow file ([5520c8f](https://www.github.com/aave/aave-v3-core/commit/5520c8fb3ab959f3167755cee7642e3ea184eac9))

## [1.5.0](https://www.github.com/aave/aave-v3-core/compare/v1.4.0...v1.5.0) (2021-11-12)


### Features

* updated solidity version ([7891ac6](https://www.github.com/aave/aave-v3-core/commit/7891ac6a9063e9d042333aa16589126e10fcb67d))


### Bug Fixes

* Add comment + gasoptimization for flashloans ([546fe84](https://www.github.com/aave/aave-v3-core/commit/546fe84771345d612d42a91ef434188194b26a3b))
* Add comment to elaborate on unusual flow in flashloan simple ([5f41c07](https://www.github.com/aave/aave-v3-core/commit/5f41c07c19e36e195114c63702808607de6a5f9c))
* Add configuration cache to save gas ([e5b9c2a](https://www.github.com/aave/aave-v3-core/commit/e5b9c2a8e52084f58548d11609ccebdf0e40bf52))
* Fix reentrance attack in `flashLoanSimple` ([1e98320](https://www.github.com/aave/aave-v3-core/commit/1e98320efce9e4a2de8da59c6c416e49a10d9ce5))
* Move `interestRateMode` cast below state update ([9732e6f](https://www.github.com/aave/aave-v3-core/commit/9732e6f1e61fa010401126651c615e911da2af57))
* Simplify flow for `mintToTreasury` ([8385f6b](https://www.github.com/aave/aave-v3-core/commit/8385f6b6c6dfd2e3e0b02b09ca7a8b6970ba6868))

## [1.4.0](https://www.github.com/aave/aave-v3-core/compare/v1.3.0...v1.4.0) (2021-11-09)


### Features

* added public debt ceiling decimal constant, added getter to DataProvider ([52918e2](https://www.github.com/aave/aave-v3-core/commit/52918e2f98e3e9ce65fca8df19596ec577213b26))

## [1.3.0](https://www.github.com/aave/aave-v3-core/compare/v1.2.1...v1.3.0) (2021-11-09)


### Features

* added borrowable in isolation configuration, fixed tests ([8755279](https://www.github.com/aave/aave-v3-core/commit/87552797a8776f38e869aff7e0c3a1f9d70a7950))
* Added missing legacy methods ([3a2fc3f](https://www.github.com/aave/aave-v3-core/commit/3a2fc3f50dbcc7f3552554b04f6b33f51657a107))
* finalized implementation, fixed tests ([c9bb800](https://www.github.com/aave/aave-v3-core/commit/c9bb8002498e8638b63528d63cea4d8fefcbcdb2))
* initial implementation ([043bcde](https://www.github.com/aave/aave-v3-core/commit/043bcdec992a7196348881fa3bfef1ac8cb9e0b7))


### Bug Fixes

* improved condition in rayToWad() ([3eec7b3](https://www.github.com/aave/aave-v3-core/commit/3eec7b3093249e6d07861434298ff0e9716c3c44))

### [1.2.1](https://www.github.com/aave/aave-v3-core/compare/v1.2.0...v1.2.1) (2021-10-19)


### Bug Fixes

* Added view to getEModeCategoryData method in pool interface ([b3ebdcc](https://www.github.com/aave/aave-v3-core/commit/b3ebdcc53fe0220285cbd42ada2240ffbbaf9158))

## [1.2.0](https://www.github.com/aave/aave-v3-core/compare/v1.1.0...v1.2.0) (2021-10-18)


### Features

* Add `onlyAssetListingOrPoolAdmins` modifier to `setAssetSources` ([6bb8a1c](https://www.github.com/aave/aave-v3-core/commit/6bb8a1c06a1167941068656fec64bfd9ea18c0ce))
* Add bridge protocol fee + fix tests for update ([bc4b554](https://www.github.com/aave/aave-v3-core/commit/bc4b554403b245bbcb1be3d2b4546d001a9175e7))
* Add simple flashloan of 1 asset ([dbc5c9e](https://www.github.com/aave/aave-v3-core/commit/dbc5c9e1a9f3f8913ab8f1da16844ac4e62caf86))
* added setIncentivesController ([8c027f4](https://www.github.com/aave/aave-v3-core/commit/8c027f4048bfa8c0bd859296e441906e9f3c0de3))
* added the data provider to the addresses provider ([5f3abbc](https://www.github.com/aave/aave-v3-core/commit/5f3abbc8eaf216603ba2dfbd007ef5452905e50d))
* finalize implementation ([1e72d0b](https://www.github.com/aave/aave-v3-core/commit/1e72d0bcf5dd4a4facefa716f095fc3d97c02f22))
* fixed calculations in ValidationLogic and BorrowLogic ([5b507bd](https://www.github.com/aave/aave-v3-core/commit/5b507bd8b911e1a3a5cd8529413a3c6071a0ebb7))
* fixed setDebtCeiling, added tests ([6ef9683](https://www.github.com/aave/aave-v3-core/commit/6ef968352655ac9e958ddf53ab0748e68e2160a6))
* increased debt ceiling field capacity ([541f970](https://www.github.com/aave/aave-v3-core/commit/541f97056bb7e4fdb1f8645c386b68b9818ae7a4))
* refactored PoolDataProvider functions in the addresses provider, fixed _checkNoLiquidity ([10300d4](https://www.github.com/aave/aave-v3-core/commit/10300d40832cfb94df83064879036e36994b57a4))
* refactored the pool variable to immutable in atoken/debt tokens ([8e4d226](https://www.github.com/aave/aave-v3-core/commit/8e4d2265edd7f322e785a10ae61f67ded93d6fcb))
* renamed simpleFlashloan and data structure ([9cc4d0c](https://www.github.com/aave/aave-v3-core/commit/9cc4d0c301325d1b113fb6ebaa51a0087d811c75))
* Uniform permission of `AaveOracle` ([f471b0f](https://www.github.com/aave/aave-v3-core/commit/f471b0f9156cb93f1ec70fc94961d900a3b6927c))


### Bug Fixes

* Add `getActive` check on assets in flashloan. ([740aeaf](https://www.github.com/aave/aave-v3-core/commit/740aeafdee25cb48fbf7a6a170ccc7893857c6ab))
* added public vars to interface for periphery usage ([8af6d0a](https://www.github.com/aave/aave-v3-core/commit/8af6d0aed5de659676db5b920267596454d8678d))
* added view to the getDataProvider function interface ([0e6ee36](https://www.github.com/aave/aave-v3-core/commit/0e6ee361604ad0309a1cf83abd40c82d41bb9611))
* correct package lock ([7965e0e](https://www.github.com/aave/aave-v3-core/commit/7965e0e4c264d63b71fc357b8de16cd06d6615a4))
* Fix 0.8.7 version throughout the contracts ([6d97be8](https://www.github.com/aave/aave-v3-core/commit/6d97be80c2ba3c9d608bb690e4b5e1dacb174c07))
* fix calculation bug in isolation mode ([8de2424](https://www.github.com/aave/aave-v3-core/commit/8de2424d475ac707c4b51e0b7bec5674746f5049))
* Fix convention naming for constants ([193e3ab](https://www.github.com/aave/aave-v3-core/commit/193e3ab8b4255b0f152bae2a98530b812d2b3c53))
* Fix declaration shadowing of mock contract ([7872ecb](https://www.github.com/aave/aave-v3-core/commit/7872ecbf67db4ed2e0e2314aebdb2919b692974a))
* Fix doc in `StableDebtToken` ([9494299](https://www.github.com/aave/aave-v3-core/commit/9494299d7f9652e2c20adf5e03f42f8dcc4cfaf1))
* Fix inheritance of mock contracts ([5bb62ad](https://www.github.com/aave/aave-v3-core/commit/5bb62ad59ddd97c1444d6d28f9b8764889238c08))
* Fix simple flash loan test to use new function name ([9036580](https://www.github.com/aave/aave-v3-core/commit/9036580d7e1e6d5302d984f1fc6e82ff01ee3bfe))
* Fix stack too deep for unoptimized compile of PoolConfigurator ([ef14f03](https://www.github.com/aave/aave-v3-core/commit/ef14f031e0a20bd7284e0a5ff96c889d3a005925))
* fixed condition on supply and transfer, added tests ([6081003](https://www.github.com/aave/aave-v3-core/commit/6081003fd6bc09c27aa5dfb7642dea3a1051b122))
* fixed isolation mode condition ([9672442](https://www.github.com/aave/aave-v3-core/commit/96724422b59517b0307d746a71c8f609208a4317))
* fixed the calculation for isolationModeTotalDebt ([68bf644](https://www.github.com/aave/aave-v3-core/commit/68bf644803a1d89ac5f650b2031a1896bf7fd5e0))
* Follow `check-effects-interactions` pattern more strictly ([7e7980a](https://www.github.com/aave/aave-v3-core/commit/7e7980a19dee98ecca7f13767fcc192ae0629bfb))
* Mark the initialization functions as `external` ([e037467](https://www.github.com/aave/aave-v3-core/commit/e037467b555dd83a3419ee0bd8f1743bfa4b1551))
* Move flashloans to separate library ([9308e97](https://www.github.com/aave/aave-v3-core/commit/9308e9797b1097334df7cf4745a335804b229dd0))
* package lock with correct node version ([3d2f5b6](https://www.github.com/aave/aave-v3-core/commit/3d2f5b61057f06f3990951e86cd8017b1b4fa6bf))
* Reintroduced check for max repayment on behalf ([c351627](https://www.github.com/aave/aave-v3-core/commit/c351627cfc218b99c9f0354c58cefb9edb2e68a2))
* Remove comment from `FlashLoanLogic` ([774c326](https://www.github.com/aave/aave-v3-core/commit/774c326a4b128f3816e6c2f4a924f6f8a5adc460))
* Remove old call ([a82d303](https://www.github.com/aave/aave-v3-core/commit/a82d3039653ec9574a6c9ae1637307fcfb1a63da))
* Remove unneded return value of `AToken.transferUnderlyingTo` ([5f30b38](https://www.github.com/aave/aave-v3-core/commit/5f30b38dd5b5a719c72da466ac56aac3a407fd7c))
* Remove unneded use of `SafeMath` ([a9584f8](https://www.github.com/aave/aave-v3-core/commit/a9584f84e2acf11ec1b7cdb09b6f5fe0b1ff5873))
* Remove unneeded check at validateRepay ([6d3d73f](https://www.github.com/aave/aave-v3-core/commit/6d3d73ff6cbde45ac13065cae1af799888ef524a))
* Remove unneeded storage variable from PoolConfigurator ([af8f695](https://www.github.com/aave/aave-v3-core/commit/af8f695aa371cb8e6d7a3a9ac0fac53da07a412e))
* Remove unneeded use of function params ([d0d8980](https://www.github.com/aave/aave-v3-core/commit/d0d898003791c8f3df184a12e070f25e4dbad9ff))
* Remove unused `PC_INVALID_DEBT_CEILING_ASSET_ALREADY_SUPPLIED` ([c68b67a](https://www.github.com/aave/aave-v3-core/commit/c68b67a8843e12da02b762cff4e73935e2d42d5f))
* Remove unused imports from BorrowLogic ([7b019c0](https://www.github.com/aave/aave-v3-core/commit/7b019c0fdbc1e5daf6e9214a03bcf43b979343c6))
* Remove unused inports from FlashLoanLogic ([0aa3a39](https://www.github.com/aave/aave-v3-core/commit/0aa3a3926e5a0e3bc97c31d72643dd51fbdd17f1))
* Remove unused variable + readability ([00c2e66](https://www.github.com/aave/aave-v3-core/commit/00c2e66d78451be2f0874586e9357915359ad682))
* Rename `_checkNoLiquidity` to `_checkNoDepositors` ([95fb785](https://www.github.com/aave/aave-v3-core/commit/95fb7853a0e216e2716a5ed3cdd14eb134120ad5))
* Rename arguments for `backUnbacked` in library ([6ca57a1](https://www.github.com/aave/aave-v3-core/commit/6ca57a1fb0067c265b2697f52721e412a2342961))
* Rename Percentage to BPs for argument in `backUnbacked` ([94eaf83](https://www.github.com/aave/aave-v3-core/commit/94eaf83df951a134a70add4c5fdc326db806a356))
* Replace assembly for chainId ([777d04a](https://www.github.com/aave/aave-v3-core/commit/777d04a1bd1790e768f474e9ae68590d1adf7e6e))
* Set `MAX_VALID_DEBT_CEILING` = `2^40 - 1` ([fa4c485](https://www.github.com/aave/aave-v3-core/commit/fa4c485a53cd497cf58e5a772a171ee0fb5ecbe2))
* Update `calculateCompoundedInterest` to increase precision ([dcbb583](https://www.github.com/aave/aave-v3-core/commit/dcbb583231d57790c1decceaa6a5f73d852734ad))
* Update comments in FlashLoanLogic ([7fee95c](https://www.github.com/aave/aave-v3-core/commit/7fee95c0608bdf87a7535b62e5495585af2840b4))
* Update doc for `getDebtCeiling` ([3d0e0cb](https://www.github.com/aave/aave-v3-core/commit/3d0e0cb742ec9a36782db24c0b976377c71506ce))
* Update IPool doc for `backUnbacked` ([6ffc157](https://www.github.com/aave/aave-v3-core/commit/6ffc15703175de2974b957c98d5663f001f71251))
* Update precision in isolationDebt check ([7fbf7b6](https://www.github.com/aave/aave-v3-core/commit/7fbf7b67080ffe54d0d235ff1a686f45ec9c530b))
* update the max MAX_VALID_DEBT_CEILING ([16d9aa8](https://www.github.com/aave/aave-v3-core/commit/16d9aa8a0e7dae3edd59ca3012523b7eefe2ef9b))
* Update visibility of tokenization ([128a947](https://www.github.com/aave/aave-v3-core/commit/128a947d91ccca05645e6f2a40f2917c977e7d8f))
* updated hardhat config ([2129dc0](https://www.github.com/aave/aave-v3-core/commit/2129dc0cc45de1895a0a030e5abf9174730fd303))

## [1.1.0](https://www.github.com/aave/aave-v3-core/compare/v1.0.3...v1.1.0) (2021-09-28)


### Features

* Add `unbackedMintCap` to control unbacked atokens minting ([bde09e3](https://www.github.com/aave/aave-v3-core/commit/bde09e30dea092f442c2bbf14a94bb04e15dea62))
* Add asset listing admin role ([3c3cd50](https://www.github.com/aave/aave-v3-core/commit/3c3cd50873c379d1b126c523039a36532ae16f1c))
* Add eMode category getters on Pool ([1e5a4e2](https://www.github.com/aave/aave-v3-core/commit/1e5a4e26e1c9d6b2084dbbe9936d1c60db485249))
* Add flag for OperationValidator at ReserveConfig, add renaming ([6515d1d](https://www.github.com/aave/aave-v3-core/commit/6515d1de492f9532363b6f303ffd6c6a810bd175))
* Add getReserveEModeCategory at DataProvider ([268dac1](https://www.github.com/aave/aave-v3-core/commit/268dac16779745fc54bbef9b7a11f5c563cdae37))
* Add initial contract to validate operations ([d6af2e5](https://www.github.com/aave/aave-v3-core/commit/d6af2e5caa9ab714bb7091ee5553a8582ec9cf2c))
* Add new onlyAssetListingOrPoolAdmin for initReserves ([9d36fa5](https://www.github.com/aave/aave-v3-core/commit/9d36fa56327e110c1d954b183046e1ea983b55a6))
* Add test cases ([0814ac2](https://www.github.com/aave/aave-v3-core/commit/0814ac29f5318e0f7eca0a02cf523c684c1bc74b))
* Add test cases for category emode registration ([31ab296](https://www.github.com/aave/aave-v3-core/commit/31ab296db37e0e934b761cf5527c609c0e7d90fc))
* Add tests for edge cases of `supply` function ([30d5f83](https://www.github.com/aave/aave-v3-core/commit/30d5f83d1478925865d175824fafd0fef20e9d89))
* Add tests for the new unbackedMint cap control ([ad92076](https://www.github.com/aave/aave-v3-core/commit/ad9207672a66f0e9c9bff5c43b77ee84ba96aadc))
* added optimal stable to variable debt ratio ([e0a9756](https://www.github.com/aave/aave-v3-core/commit/e0a9756822a42f8d990ee4ce466b9300b1f3f6eb))
* added validation and events on eMode categories configuration ([fdf483b](https://www.github.com/aave/aave-v3-core/commit/fdf483bd70d95146e12d781bf55875e72b0137e3))
* Initial OperationalValidator integration ([5088148](https://www.github.com/aave/aave-v3-core/commit/5088148abd402153535180ddd6a3841b8e6b9198))
* refactored InterestRateStrategy, fixed conditions ([5196636](https://www.github.com/aave/aave-v3-core/commit/51966363ae3ce6cab7a532d3f2b3ab5180295046))
* removal of the rate oracle, initial implementation, tests fixed ([1f5b953](https://www.github.com/aave/aave-v3-core/commit/1f5b9530b39a6c5ea1f8edbdfdf3d34b5c43192f))
* Rename `OperationalValidator` to `PriceOracleSentinel` ([9004f49](https://www.github.com/aave/aave-v3-core/commit/9004f49775fa4c57b07a259f3b660298cdef855c))


### Bug Fixes

* Add additional checks to liquidation tests ([e06c74f](https://www.github.com/aave/aave-v3-core/commit/e06c74fceeeb33211363e0cb1cf0e2f5549933f4))
* Add check for previous index ([3cfc67c](https://www.github.com/aave/aave-v3-core/commit/3cfc67c9c9a9dffb78ee63aed9e2c48fa9c8a75b))
* Add checks for avaiable liquidity in liqudations ([80cb24d](https://www.github.com/aave/aave-v3-core/commit/80cb24ddd72cd075c488f16f1a697e907ece6d30))
* Add cleanups and fixes to tests ([ccd5a96](https://www.github.com/aave/aave-v3-core/commit/ccd5a961e2e0eb6d73d5f0e696383b762daf1f3e))
* Add fixes to OperationalValidator contracts ([829be88](https://www.github.com/aave/aave-v3-core/commit/829be8826c84fa67fce6745b5768dbee5127e5e4))
* Add tests for `ASSET_LISTING_ADMIN` role ([84aa268](https://www.github.com/aave/aave-v3-core/commit/84aa26830124fee2fa4479e8ed3fc16ccbd38024))
* Cap supply utilization at borrow utilization ([5e79c48](https://www.github.com/aave/aave-v3-core/commit/5e79c48f9d9d10492166a8801f34f0a73114affb))
* Fix `supply` function  error at `SupplyLogic` lib. ([6c112e8](https://www.github.com/aave/aave-v3-core/commit/6c112e89a271003acb8ed3a33fcb6a9f9bc2c196))
* Fix docs of `ACLManager` contract ([acfebe8](https://www.github.com/aave/aave-v3-core/commit/acfebe8e685e1b980fc74be5f9f16d73ea4aeeec))
* Fix docs of OperationValidator contract ([213094c](https://www.github.com/aave/aave-v3-core/commit/213094cebf281c3d2e84affcfc448b74677cca0c))
* Fix duplicated code at `validateHF` ([6a30bbb](https://www.github.com/aave/aave-v3-core/commit/6a30bbb46cad3d1330db5174f47dcc0dc7b169c2))
* Fix liquidityAdded in BridgeLogic backUnbacked ([68764ee](https://www.github.com/aave/aave-v3-core/commit/68764ee1d539495f6beaf3df545806f466e710fd))
* Fix package-lock ([5e37eeb](https://www.github.com/aave/aave-v3-core/commit/5e37eeba93ee371261286322d757f1a6fb113d01))
* Fix some comments on contracts ([973e644](https://www.github.com/aave/aave-v3-core/commit/973e6447bb49981f66791fa3be48475a9c0e4b25))
* Fix tests ([506d339](https://www.github.com/aave/aave-v3-core/commit/506d339f6fc958484b3b09095bb5bebb6ee5a230))
* fixed borrow condition, removed conditions on transfer/deposit/use as collateral ([8dbe7e4](https://www.github.com/aave/aave-v3-core/commit/8dbe7e4d186c834eca1a80e3d01d9d939ddd2038))
* fixed calculation of the avg ltv/liq threshold in eMode ([0534f47](https://www.github.com/aave/aave-v3-core/commit/0534f47dfc16ba3a3f7f1c274b80de662ca54b72))
* fixed error after merging the main branch ([83f385f](https://www.github.com/aave/aave-v3-core/commit/83f385fc1fdcac9f87aaa94614bcda3020578fb0))
* fixed logic for the stable rate offset, fixed tests ([c319929](https://www.github.com/aave/aave-v3-core/commit/c31992993519a5b964656093b034de6b4fa91a3d))
* fixed validateSetUserEMode ([750fd34](https://www.github.com/aave/aave-v3-core/commit/750fd349e8c52726d505844fa47376c8784d7109))
* Improve readability and fix docs of `BridgeLogic` ([2c48e7e](https://www.github.com/aave/aave-v3-core/commit/2c48e7e64cc7a2de53e54865b11ecefbe0acedea))
* Initial interest rate fix ([350c528](https://www.github.com/aave/aave-v3-core/commit/350c528354d3cbb55f66458b812395d31fc12d95))
* Move `isBorrowAllowed` higher up in `validateBorrow` ([93a447c](https://www.github.com/aave/aave-v3-core/commit/93a447c2a18e17a5067b47dbe7e724970d9eff9b))
* npm dependencies ([2a366f7](https://www.github.com/aave/aave-v3-core/commit/2a366f7f708803137c7dab2916e524709a7afc83))
* refactored PriceOracleSentinel, valdiation conditions, removed reserve config ([e112db9](https://www.github.com/aave/aave-v3-core/commit/e112db92acbaf3a41f2197a7b270b5b42d1586b7))
* Remove AToken totalSupply from interest computation ([9b779e9](https://www.github.com/aave/aave-v3-core/commit/9b779e9ead03fc919f7fa6f38c6dbe361d47198f))
* Remove deployOperationalValidator import ([3152285](https://www.github.com/aave/aave-v3-core/commit/3152285ae7e7bbb126ff41a403bd6f7a13767607))
* Remove deprecated code of contracts ([282b629](https://www.github.com/aave/aave-v3-core/commit/282b6297e7276b579cd59ff182d670ebf9aeca12))
* removed unnecessary overflow check ([4d9861d](https://www.github.com/aave/aave-v3-core/commit/4d9861d94d5531104f95af625cffead15f603d4d))
* removed useAsCollateral flag in supply ([891da9b](https://www.github.com/aave/aave-v3-core/commit/891da9bdeccc6c09e8b65472618370725030fbc9))
* Rename variable `rate-strategy.spec.ts` ([f7fbdac](https://www.github.com/aave/aave-v3-core/commit/f7fbdac5fa0eea659ba4da6c5f87eae6e82fec51))
* Revert renaming back to SequencerOracle ([53ab533](https://www.github.com/aave/aave-v3-core/commit/53ab533d0c4c56d59002e4efcc8f3c4ae5c44f10))
* Update `rate-strategy.spec.ts` to use strategy two ([31335e0](https://www.github.com/aave/aave-v3-core/commit/31335e0ff373d343b7bb2887a499e66ea2b7cff4))
* Update and fix contracts docs ([171acdf](https://www.github.com/aave/aave-v3-core/commit/171acdf711b243234c1baa350c30485e58f9f4f3))
* Update comments in IPool ([3e32f07](https://www.github.com/aave/aave-v3-core/commit/3e32f07f9966c97242035580f1f6672bba27cd7a))
* Update operation-validator reserve getters ([bcdc91d](https://www.github.com/aave/aave-v3-core/commit/bcdc91d134403f49b15f13a07c996e22ff7da844))
* Update tests for new interest rate calculation ([a37d9a1](https://www.github.com/aave/aave-v3-core/commit/a37d9a10591b5b39f63731a3d8257d024a540538))
* Upgrade  library to make it work with london hf. ([c1e6fec](https://www.github.com/aave/aave-v3-core/commit/c1e6fecbcffa7d6160a896ec00d3cedb248cfa8c))
* use nextVariableBorrowIndex instead of nextLiquidityIndex on repayValidation ([cf9007c](https://www.github.com/aave/aave-v3-core/commit/cf9007c78d6e2eaaa9816309ebc44f160c53ed3c))

### [1.0.3](https://www.github.com/aave/aave-v3-core/compare/v1.0.2...v1.0.3) (2021-09-17)


### Miscellaneous Chores

* release 1.0.3 ([003569a](https://www.github.com/aave/aave-v3-core/commit/003569a1c336f9396715c306be78f1973348ca5c))

### [1.0.2](https://www.github.com/aave/aave-v3-core/compare/v1.0.1...v1.0.2) (2021-09-15)


### Bug Fixes

* add repository field and fix publishConfig at package.json ([76b90e7](https://www.github.com/aave/aave-v3-core/commit/76b90e7780b602a48cbbd388a99a742dc24978a5))

### [1.0.1](https://www.github.com/aave/aave-v3-core/compare/v1.0.0...v1.0.1) (2021-09-15)


### Bug Fixes

* set release please to run at master ([599fe87](https://www.github.com/aave/aave-v3-core/commit/599fe870a95ab46b1db6869b8339a65871e10e57))

## 1.0.0 (2021-09-14)


### Features

* Add `virtual` on Pool and Configurator `getRevision` functions ([ddd4ac5](https://www.github.com/aave/aave-v3-core/commit/ddd4ac5f76e3dc5b99c58068e823c1a7930e2d8c))
* Add `wadraymath.ts` to support wad and ray math on ethers bignumber ([cc468df](https://www.github.com/aave/aave-v3-core/commit/cc468df58ca1408279ec32a69c8feadc1d63d4d9))
* add coverage, fix merge issues ([cfd2afd](https://www.github.com/aave/aave-v3-core/commit/cfd2afdc1a32d53317a65b50e48df82b4e97540a))
* add coverage.json to gitignore ([8613ddd](https://www.github.com/aave/aave-v3-core/commit/8613ddd9d2d72e46ed76511e9a54f1c479f78b19))
* Add fix in WETH9Mocked ([615ca0b](https://www.github.com/aave/aave-v3-core/commit/615ca0be8da2f80e9d5420f65af65a3954ca2786))
* add liquidation protocol fee to configuration ([1207d63](https://www.github.com/aave/aave-v3-core/commit/1207d63ea6080039be63067894af25cc6e203d47))
* Add missing cases for `DefaultReserveInterestRateStrategy` ([08d6c63](https://www.github.com/aave/aave-v3-core/commit/08d6c636c561df8727a36e25a810a1613242f982))
* Add missing cases for `LiqudationLogic` ([5fa09f5](https://www.github.com/aave/aave-v3-core/commit/5fa09f5a7cced188fa6cbc459b6c6ec3ecb34af2))
* Add missing cases for `ValidationLogic` ([c8703d4](https://www.github.com/aave/aave-v3-core/commit/c8703d423070720cd8abbaca2db69275cb39a4b9))
* Add receive function as fallback in Proxy contract ([9bf567e](https://www.github.com/aave/aave-v3-core/commit/9bf567ece620b3a5f58fd55c175446c40b0f57a9))
* Change lendingpool path to pool ([f344193](https://www.github.com/aave/aave-v3-core/commit/f344193cfa7ef1b3a041267763b51ace6bc489d1))
* Fix small compiler warnings ([6f86981](https://www.github.com/aave/aave-v3-core/commit/6f86981447cdc64d4607de3efb0ac423dce2b060))
* initial implementation ([34786a9](https://www.github.com/aave/aave-v3-core/commit/34786a9ec9b80de21252db608455a17600915143))
* liquidation fee based on bonus amount ([6ca1b1e](https://www.github.com/aave/aave-v3-core/commit/6ca1b1ec759bd7e5eadb137e385c872ebf980120))
* liquidation protocol fee and tests ([1a86b77](https://www.github.com/aave/aave-v3-core/commit/1a86b77652f2af4ff4bc21be1c9dce923df313e2))
* re-add temporary test script ([7ddeb7a](https://www.github.com/aave/aave-v3-core/commit/7ddeb7ad26e11ea90d2f71cde9ffad8940b6b879))
* refactor and simplify the market configuration ([eeb9e7a](https://www.github.com/aave/aave-v3-core/commit/eeb9e7a4a09afbbfa34737d6057875675ea68e7e))
* Remove `LendingPool` references of contracts ([702a8d3](https://www.github.com/aave/aave-v3-core/commit/702a8d374e0cd91dc0eea03a8225444aca502385))
* Remove `LendingPool` references of tasks, helpers and tests ([6fdde99](https://www.github.com/aave/aave-v3-core/commit/6fdde99e042062d20edae46b1e75863b5657f777))
* remove adapter scripts ([259c2cb](https://www.github.com/aave/aave-v3-core/commit/259c2cb010da2b7a3fcec1d489e73da6501e4d1f))
* remove adapters ([253c63e](https://www.github.com/aave/aave-v3-core/commit/253c63e339bc0d75319869b344cb9e3accd470c6))
* remove amm test scripts ([9f00d44](https://www.github.com/aave/aave-v3-core/commit/9f00d44927c373757721017b43a89eb6e46328c9))
* remove dev tasks ([3693feb](https://www.github.com/aave/aave-v3-core/commit/3693febe46786b755503d6116de7deca69c8790d))
* Remove LendingPoolCollateralManager references ([270f1fe](https://www.github.com/aave/aave-v3-core/commit/270f1fe1d881531385a21f5f00e2b369711ea524))
* remove multi market support ([3b6e9c5](https://www.github.com/aave/aave-v3-core/commit/3b6e9c5212795f17c3d99b1a4a8945be1575fb30))
* Remove references to `LENDING_POOL` of Errors lib ([59b5104](https://www.github.com/aave/aave-v3-core/commit/59b510494880bb134812c6ecf4e0c796ed360477))
* Remove references to `LendingPool` of `Pool` contract ([9919194](https://www.github.com/aave/aave-v3-core/commit/9919194ce6735cfea33ca77df7f6633f5c6fb297))
* Remove references to LendingPool ([39a7077](https://www.github.com/aave/aave-v3-core/commit/39a707781ad710009a6ef730cc1e81f56324a8cd))
* remove safemath in all the core contracts ([eaf0ab8](https://www.github.com/aave/aave-v3-core/commit/eaf0ab8ebfde0c156ac9f0db581fbe04afe7dd62))
* remove tasks, update config, tests working ([28a2f87](https://www.github.com/aave/aave-v3-core/commit/28a2f876c6047fecca95fb093b054299eaa18a48))
* remove UiPoolDataProvider ([e6b5d55](https://www.github.com/aave/aave-v3-core/commit/e6b5d5513ac096a4a7edf7a82d3bcca34f79b192))
* remove un-used code ([a370115](https://www.github.com/aave/aave-v3-core/commit/a37011563f1ed81f7cfe66a2c220d4155df5e963))
* Remove unneeded `public` modifier from contract constructors ([207dd42](https://www.github.com/aave/aave-v3-core/commit/207dd42d66b144a7c85aa2268772ea3868e5a0a6))
* Remove unneeded returning value in Pool function ([c8b8ba0](https://www.github.com/aave/aave-v3-core/commit/c8b8ba03fcc55081824588783f8fa5bcbeaf76f2))
* remove ununsed smart contracts ([13faee9](https://www.github.com/aave/aave-v3-core/commit/13faee96ffc42b49087ebbadbfe16e946585d701))
* remove unused imports and variables ([09e72f2](https://www.github.com/aave/aave-v3-core/commit/09e72f20fe1d219f3ce418a3b7f648916f3bb778))
* Remove unused pause functions from Pool contract ([024b389](https://www.github.com/aave/aave-v3-core/commit/024b389c9ddc66ab743335cef22260829317e3ee))
* remove verify flag ([6da1acf](https://www.github.com/aave/aave-v3-core/commit/6da1acfa245b24081087af10ab4f23e3e0765da7))
* remove WalletBalanceProvider ([efa9df9](https://www.github.com/aave/aave-v3-core/commit/efa9df9b518059d38e1c6fb33c1602ec137759ef))
* remove weth gateway ([a6583c4](https://www.github.com/aave/aave-v3-core/commit/a6583c44769628f2583b97b336ba237b1c8577dc))
* removed console.log and commented test script ([c14b725](https://www.github.com/aave/aave-v3-core/commit/c14b7256db812d320c9e59cb81363802d91343a3))
* Rename `getLendingPool()` of PoolAddresesProvider ([2b94692](https://www.github.com/aave/aave-v3-core/commit/2b9469250d51449e3d76d48240b00621d52c783f))
* Rename `getLendingPoolCollateralManager()` of AddressesProvider ([e318492](https://www.github.com/aave/aave-v3-core/commit/e318492afc748d6e2274aa2e86281adc380ba638))
* Rename `getLendingPoolConfigurator()` of PoolAddressesProvider ([6a34932](https://www.github.com/aave/aave-v3-core/commit/6a3493223fcbf2d96a7ee1bc9de1bc2c9cf519bd))
* Rename `getLendingRateOracle()` of PoolAddressesProvider ([e50413e](https://www.github.com/aave/aave-v3-core/commit/e50413ef6da1c9db4cea63a4efa4b0fc5674c9b4))
* Rename `setLendingPoolCollateralManager()` of AddressesProvider ([b79b168](https://www.github.com/aave/aave-v3-core/commit/b79b1684da9604ac9011381c7a34d8587275dafe))
* Rename `setLendingPoolConfiguratorImpl()` of PoolAddressesProvider ([475fbe1](https://www.github.com/aave/aave-v3-core/commit/475fbe12323781011cd1345fa7073991bd83634e))
* Rename `setLendingPoolImpl()` of PoolAddressesProvider ([d3070f0](https://www.github.com/aave/aave-v3-core/commit/d3070f00c1e2f5d097c473ba740b2264ad165428))
* Rename `setLendingRateOracle()` of PoolAddresesProvider ([2988f28](https://www.github.com/aave/aave-v3-core/commit/2988f28feebe1ddba38c342ee68bd3ccaa29f1a8))
* Rename LendingPool to Pool on contracts ([8c4297e](https://www.github.com/aave/aave-v3-core/commit/8c4297e66d37cd9eede64c9b74d1c31ad67c70c7))
* Rename LendingPoolAddressesProvider to PoolAddressesProvider ([396ce87](https://www.github.com/aave/aave-v3-core/commit/396ce873a0f80371ad145593386161576d69532f))
* Rename LendingPoolAddressesProviderRegistry ([d39e18c](https://www.github.com/aave/aave-v3-core/commit/d39e18c5ffbbbf7819dce9f02c5a058f4e10b1eb))
* Rename LendingPoolCollateralManager ([aa00d30](https://www.github.com/aave/aave-v3-core/commit/aa00d300a74bcd0e27e2f202153cd0e2d7a74231))
* Rename LendingPoolConfigurator ([eea90d8](https://www.github.com/aave/aave-v3-core/commit/eea90d86ac8630d1357c0525bf1c549647fa32e1))
* Rename LendingPoolHarnessForVariableDebtToken ([d06d3ac](https://www.github.com/aave/aave-v3-core/commit/d06d3accd8b08df9462073772aa73c9cf59c03df))
* Rename LendingPoolStorage ([5f9b1ea](https://www.github.com/aave/aave-v3-core/commit/5f9b1eab1e4e77d95187e048c0256b2b681b2bf5))
* Rename LendingRateOracle to RateOracle ([a9c34b1](https://www.github.com/aave/aave-v3-core/commit/a9c34b1f179077422a8519555763f48aaad4a37d))
* Rename LendingRateOracle to RateOracle in contracts ([49f14d3](https://www.github.com/aave/aave-v3-core/commit/49f14d3f8ed02a8a835375d0031167dd4a9d39af))
* simplify pacakage.json ([b169a8e](https://www.github.com/aave/aave-v3-core/commit/b169a8e45ef1524e24af87b32d14467c5f4cd458))
* Split pool logic into libraries ([a78e6cc](https://www.github.com/aave/aave-v3-core/commit/a78e6cce0fc50ce5dfe9fb1d8ed3bcac4a3163f4))
* Split PoolConfigurator logic into library ([dee8fe5](https://www.github.com/aave/aave-v3-core/commit/dee8fe5b5f9c4081f8f2286d0bac778543ffa7f4))
* update dependencies ([d9ec325](https://www.github.com/aave/aave-v3-core/commit/d9ec3258e90caa0ca37240f840688a6354103b36))
* update IAToken interface with treasury getter ([2b481cb](https://www.github.com/aave/aave-v3-core/commit/2b481cb9203b2d3c3a8f1fb29b62676f0c8db99a))
* Update README ([c42b691](https://www.github.com/aave/aave-v3-core/commit/c42b691f362745145cd7715377d424fd70f22b85))
* updated genericlogic ([6a25b22](https://www.github.com/aave/aave-v3-core/commit/6a25b22b6455c62b6191143f268bde95c9d66d70))


### Bug Fixes

* add markets folder to prettier linting ([52abdf1](https://www.github.com/aave/aave-v3-core/commit/52abdf1fdbbe39cfd63247466f812d5b38f9e143))
* Add minimal comments to PoolBaseLogic and PoolHelperLogic ([68e077b](https://www.github.com/aave/aave-v3-core/commit/68e077be631485c06919f4ce30c5d838c815ffd6))
* Add minor changes to contract docs ([4f393aa](https://www.github.com/aave/aave-v3-core/commit/4f393aa2bb643524a850f55eda5a908fb529c0e4))
* add test-amm folder to prettier ([bc34d1d](https://www.github.com/aave/aave-v3-core/commit/bc34d1dc1c28a135f0b57420e6ca957f24235eca))
* Additional context in test name in `interest-overflow.spec.ts` ([c177a81](https://www.github.com/aave/aave-v3-core/commit/c177a810765fdc2b2ce1c7bfe32b8f63b2765d07))
* Clean package.json scripts ([4802cab](https://www.github.com/aave/aave-v3-core/commit/4802cab74d07e68c114f9a527cef147d9d5540c8))
* comment unused `getWalletProvider()` in `1__general.ts` ([0c3ac70](https://www.github.com/aave/aave-v3-core/commit/0c3ac7077cdb7d35caa6a8f39c102019aa156af5))
* Fix CI actions ([11027c8](https://www.github.com/aave/aave-v3-core/commit/11027c8ff834a189cc96d1191e0b0d8551042499))
* Fix deployment token helper test ([644d4df](https://www.github.com/aave/aave-v3-core/commit/644d4df7ecb7fdbc4437b6588253e64365c73f50))
* Fix docs typos in `AaveOracle` ([9622097](https://www.github.com/aave/aave-v3-core/commit/9622097b2bfc9597aca93163cd8e1926a885bd54))
* Fix docs typos of `protocol/configuration` package ([d679c22](https://www.github.com/aave/aave-v3-core/commit/d679c22dad424c76527e77abf2cbb8f76ce9972f))
* Fix errors in atoken repay tests ([d056de8](https://www.github.com/aave/aave-v3-core/commit/d056de8c0664415b91a826c44479c01410215ce3))
* Fix Mock contract name ([af0f9a8](https://www.github.com/aave/aave-v3-core/commit/af0f9a8206b4debea9dff94341a81529f4a38361))
* Fix some docs typos of `FlashLoan` package ([eb0d5d8](https://www.github.com/aave/aave-v3-core/commit/eb0d5d81505783ca58fadd23d1cc62999feb4b23))
* Fix test cases of `atoken-permit.spec.ts` ([0e0c68d](https://www.github.com/aave/aave-v3-core/commit/0e0c68de972f727ad39f36acc3e0392f42ada28e))
* Fix the `Transfer` emission code ([f51ef2c](https://www.github.com/aave/aave-v3-core/commit/f51ef2cb5fd7593fce03fb5829abd055d764a9c9))
* Fix typo of `FlashloanPremiumToProcolUpdated` event ([108e203](https://www.github.com/aave/aave-v3-core/commit/108e2038accb0c4fb399961c7b9c1bdd113f775e))
* Fix typos on imports declarations ([d29cbf5](https://www.github.com/aave/aave-v3-core/commit/d29cbf5d7c76ad1fc8a85ccd8831b8ea4af7d9e3))
* fixed flashloans tests ([d9d1890](https://www.github.com/aave/aave-v3-core/commit/d9d1890bafd31db0fd877cdf355e3b269e9f3110))
* fixed getIncentivesController inheritance chain ([4d27d55](https://www.github.com/aave/aave-v3-core/commit/4d27d558091b736c79790b6057019ed496817f6d))
* fixed github action targets ([500c448](https://www.github.com/aave/aave-v3-core/commit/500c44848851bffb39ece1a49f60e6aa885098d9))
* folder name ([dd67c22](https://www.github.com/aave/aave-v3-core/commit/dd67c22c7b2ea2597a54bfa42219df0977115110))
* formatting ([6c787df](https://www.github.com/aave/aave-v3-core/commit/6c787dfcc5c3f33ebe633a1aaeb2dd51ebf8f0fb))
* formatting ([8a2f45b](https://www.github.com/aave/aave-v3-core/commit/8a2f45b949b49d2827825b89b17379a82f99fb3e))
* Inconsistency in coverage runs ([cfc3caf](https://www.github.com/aave/aave-v3-core/commit/cfc3cafb891248e2ebe7e77ac2f55794711f92c7))
* Make `GenericLogic` internal ([e7ff741](https://www.github.com/aave/aave-v3-core/commit/e7ff741792c198d186c4f48a25531c8aa2896661))
* Make `ReserveLogic` internal ([6598274](https://www.github.com/aave/aave-v3-core/commit/6598274afd35761ca95c1240ec82a268c3659463))
* Make `ValidationLogic` library internal ([e1d1a01](https://www.github.com/aave/aave-v3-core/commit/e1d1a01e96bc245338b914e13e4bb2fdf8f4b749))
* Make `WadRayMath` and `PercentageMath` unchecked ([1a81ecf](https://www.github.com/aave/aave-v3-core/commit/1a81ecf3fcbf51d15e2f63099e976139bed42243))
* meet formatting ([650f771](https://www.github.com/aave/aave-v3-core/commit/650f771ee6f1b3ff13931c11dd2fd7c50568701b))
* Minor changes to docs ([dfc4b36](https://www.github.com/aave/aave-v3-core/commit/dfc4b3674173310ea7a427893865a74095aef756))
* minor cleanup in `atoken-edge.spec.ts` ([b17310e](https://www.github.com/aave/aave-v3-core/commit/b17310ede6424dd19461210704826ce4ae2f5da4))
* Move `dropReserve()` into `PoolHelperLogic` library ([38a9904](https://www.github.com/aave/aave-v3-core/commit/38a990498a0407585e75ac757a67fec368a30186))
* Move `finalizeTransfer()` from `Pool` into `PoolBaseLogic` library ([053d9ed](https://www.github.com/aave/aave-v3-core/commit/053d9edeca2ea0070135a7a7c1e22a53d91db732))
* Move `flashLoan()` from `Pool` to `PoolBaseLogic` library ([f9af312](https://www.github.com/aave/aave-v3-core/commit/f9af312e9111ce1f46ea9c9664299717d3a4fdf9))
* package.json formatting ([5162360](https://www.github.com/aave/aave-v3-core/commit/5162360477490f45ad9e5d2474598af8c58885ba))
* Reducing compiler warnings for mocks ([8adf3b4](https://www.github.com/aave/aave-v3-core/commit/8adf3b4f8893ecdb39bbb6b04c6ff5846f9128da))
* Refactor docstrings and imports to handle inheritance ([b943f9f](https://www.github.com/aave/aave-v3-core/commit/b943f9f4e58187eb4b4615196fc1fe38b24f140b))
* Refactor in `actions` to support effective gas price after London. ([d98fa47](https://www.github.com/aave/aave-v3-core/commit/d98fa47445099696e5a345f4403214567fbf8f4c))
* Remove `impossible` cases. Reasoning added to notion notes ([2e733be](https://www.github.com/aave/aave-v3-core/commit/2e733be24dcab8c62ccc12568804c4524fdada9e))
* remove blank file ([0286af5](https://www.github.com/aave/aave-v3-core/commit/0286af52c3f5b430180e56a4277a99d1fc3e2891))
* Remove comment mentioning `refreshDebt()` from `ReserveLogic.sol` ([5ddd74e](https://www.github.com/aave/aave-v3-core/commit/5ddd74eaa774a86dd6404234871635d641aedce2))
* Remove commented test file ([88d329e](https://www.github.com/aave/aave-v3-core/commit/88d329e63c29ece06dd263c52d771cd3dd653342))
* remove coverage.json ([915c4a7](https://www.github.com/aave/aave-v3-core/commit/915c4a7c041aaead6f940244fb70c74999d676e3))
* Remove explicit return values from `IReserveInterestRateStrategy` ([3107e2a](https://www.github.com/aave/aave-v3-core/commit/3107e2a76c55732e9e0314f8884b021a70f6dc41))
* Remove imports of `ethers` subpaths ([c731f77](https://www.github.com/aave/aave-v3-core/commit/c731f77cfd59079c167d76997215697e567b46f1))
* Remove last references to `lending` ([81aa4ce](https://www.github.com/aave/aave-v3-core/commit/81aa4ce392bd8454639f4cb02dd6314235dee07d))
* Remove last references to `LendingPool ([940352e](https://www.github.com/aave/aave-v3-core/commit/940352e53ce2cf399b99eb52dc61c7ffdc7375d8))
* Remove receive function from Proxy ([2b45a89](https://www.github.com/aave/aave-v3-core/commit/2b45a8952578765db55c025d5f71597e1e079d50))
* Remove StringLib contract since its unused ([fdb5d85](https://www.github.com/aave/aave-v3-core/commit/fdb5d852bcf1eb59a24353cd63b1096226a2b9a7))
* Remove unnecessary read ([ba61546](https://www.github.com/aave/aave-v3-core/commit/ba61546230954b98b16763b857e2bf53f42615c3))
* Remove unneeded code in MockAggregator ([a0bb375](https://www.github.com/aave/aave-v3-core/commit/a0bb375c2775575e89c8f68fe9eea79587b6cb09))
* Remove unneeded constant ([1c34b8c](https://www.github.com/aave/aave-v3-core/commit/1c34b8ca7d7af904dbb1c8e2a1806dbdac9e44da))
* Remove unused `UserConfiguration` from `Pool` ([5ffc46c](https://www.github.com/aave/aave-v3-core/commit/5ffc46cc9916442b8c0992c561e9dcbbe3c78e2e))
* Remove unused code from `deployments` contracts ([495e145](https://www.github.com/aave/aave-v3-core/commit/495e145824880397512c8cdf87b9f933b9517a94))
* Remove unused imports from `Pool` ([a6e01a5](https://www.github.com/aave/aave-v3-core/commit/a6e01a54f90b88f1dd75e3a33f77a9b08774b7ac))
* Remove unused imports of test files ([8d6782b](https://www.github.com/aave/aave-v3-core/commit/8d6782be9bc55823eacd5e8b72b7332c61c91302))
* Rename `PoolBaseLogic` library functions ([df1f197](https://www.github.com/aave/aave-v3-core/commit/df1f19780b8a88a0d6a3585e82fb6339091fd3f9))
* Rename two tests ([78b891b](https://www.github.com/aave/aave-v3-core/commit/78b891b9a2559cbfcb436f56f84eddbbfc63b5b3))
* replaced buidler references with hardhat, removed unused buidlerevm network references ([8543ff2](https://www.github.com/aave/aave-v3-core/commit/8543ff29fc6d6e3b004a18faef455dacac4fda80))
* Undo contracts code change ([b1f296e](https://www.github.com/aave/aave-v3-core/commit/b1f296e8b99ea58d8f3d040245b9ccb3dad8837c))
* Update [@return](https://www.github.com/return) doc in `IScaledBalancetoken` ([c0e9987](https://www.github.com/aave/aave-v3-core/commit/c0e9987ae26a55b3ba17e96ce0962c8c14f488af))
* Update [@return](https://www.github.com/return) doc in `LiquidationLogic` ([1998cc2](https://www.github.com/aave/aave-v3-core/commit/1998cc2500d6f15f00aea8c0a1dc5efc5a1b6d6d))
* Update [@return](https://www.github.com/return) doc in `ReserveConfiguration` ([5afa498](https://www.github.com/aave/aave-v3-core/commit/5afa498b8523f32fafa322c71421bbc8b5bc4364))
* Update `MockIncentivesController` to get of compiler warnings ([dd7bf6c](https://www.github.com/aave/aave-v3-core/commit/dd7bf6c917e9817e5eec97e791f3aac85de98d47))
* Update doc in `Helpers` ([9797019](https://www.github.com/aave/aave-v3-core/commit/9797019635701656c73ab6f5293bc1171aea2d04))
* Update docs in `ReserveLogic` ([3bfe674](https://www.github.com/aave/aave-v3-core/commit/3bfe674c699f4a1d564b3818db327ae7bd280813))
* Update docs in `ValidationLogic` ([9298d56](https://www.github.com/aave/aave-v3-core/commit/9298d56b3ebe69dfdca165871c6386e7e7b9c699))
* update hardfork and tsconfig ([0723f20](https://www.github.com/aave/aave-v3-core/commit/0723f201da643de71e6f286d8e8bb25e69f38678))
* Update hardhat and set hardfork to london ([7534c84](https://www.github.com/aave/aave-v3-core/commit/7534c849bb698aabb72d0b28a83a08f1bfcdec6f))
* Update package-lock.json ([e35f02b](https://www.github.com/aave/aave-v3-core/commit/e35f02ba9ccf9a876bc4ef8a17aff173319bcf80))
* update to 0.7.6 ([7f55456](https://www.github.com/aave/aave-v3-core/commit/7f55456ffe13a1ea8d83fe05e9dae2d926091037))
* Update to 0.8.6 ([932f591](https://www.github.com/aave/aave-v3-core/commit/932f591e8fe8c8d07565997421a04c3467195c9e))
* update variable names ([0bf6132](https://www.github.com/aave/aave-v3-core/commit/0bf613268ab3307c4e05f3a4033f1f352302faf9))
* update variable names, remove duplicate variable ([3789669](https://www.github.com/aave/aave-v3-core/commit/37896690c1f73afe23bf06858928e29a1236a793))
* Use fresh rateOracle instead of replacing old in `deployment-token-helper.spec.ts` ([d7e28e4](https://www.github.com/aave/aave-v3-core/commit/d7e28e4cd71bcce1084c75d873a40dceca72436c))
* Use mock incentives controller instead of none ([9ffce12](https://www.github.com/aave/aave-v3-core/commit/9ffce12a0d84daae66f9efb009d9db9ec8fdc87b))
* Use struct for execute repay params ([9172681](https://www.github.com/aave/aave-v3-core/commit/91726816423128d284c0bc21c1d30f72e6d734dc))
* Use struct for helper variables in execute borrow ([53a9ce8](https://www.github.com/aave/aave-v3-core/commit/53a9ce89d99c35a4d0c9986182bcbad1b3fcf491))
* Use struct for variables in `_executeWithdraw()` ([30ffa88](https://www.github.com/aave/aave-v3-core/commit/30ffa888d13e01494011c9e573b903dd90ce0a2c))

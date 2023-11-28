#!/usr/bin/env node

/* this file is the entry point when launching `lenses2` from the CLI */

const fs          = require('fs');
const path        = require('path');
const open        = require('open');

process.env['NODE_CONFIG_DIR'] = path.join(__dirname, '..', 'config');

const config       = require('config');
const { copyDir }  = require('../server/lib/copyDir');
const { emptyDir } = require('../server/lib/emptyDir');

let rootStudyConfig = {};
// hack: prefer lenses.json
try {
  rootStudyConfig = require(path.join(process.cwd(), 'study.json'));
} catch (o_0) {}
try {
  rootStudyConfig = require(path.join(process.cwd(), 'lenses.json'));
} catch (o_0) {}

// HELPERS:
/**
 * @param {Object} object
 * @param {string} key
 * @return {any} value
 * https://stackoverflow.com/a/47538066
 */
const getParameterCaseInsensitive = (object, key) => {
  return object[
    Object.keys(object).find((k) => k.toLowerCase() === key.toLowerCase())
  ];
};

/* The user can optionally launch a sub-path from the directory they are in
  if they do this, localhost will still serve from the root of the directory
    the browser will just open to the selected sub-path
  when global configuration is set, there will be default plugin options for different mime types
    then the browser will open to that sub-path with the appropriate queries
    -> localhost:xxxx/user/defined/path?default-plugins-for-mime-type
*/
const userArgs = process.argv.slice(2);
// use the first arg that doesn't match a port config

// Check for CLI params:
const param    = userArgs;
// --version, -v
const isVersionParam = Boolean( 
  param 
  && 
  ( 
    param[0] === "--version" 
    || 
    param[0] === "-v" 
  )
);
if ( isVersionParam ){

  const packageJSON = require('../package.json');

  console.log("v" + packageJSON.version);
  process.exit();

}


config.demo = null;
// is this a demo run?
const demoOption = '-demo-reset';
const isDemo =
  userArgs.find((entry) => entry.includes(demoOption))?.split('=') ||
  Object.entries(rootStudyConfig).find((entry) =>
    entry[0].includes(demoOption),
  );
if (isDemo) {
  config.demo = {};
  const defaultDelay = 300000;
  const userDelay = isDemo.length > 1 ? Number(isDemo[1]) : defaultDelay;
  config.demo.resetDelay = !Number.isNaN(userDelay) ? userDelay : defaultDelay;

  config.demo.resetIgnore =
    userArgs
      .find((entry) => entry.includes('-reset-ignore'))
      ?.split('=')?.[1]
      .split(',') ||
    Object.entries(rootStudyConfig).find((entry) =>
      entry[0].includes('-reset-ignore'),
    )?.[1];

  config.demo.path = path.join(__dirname, '..', '.temp-demo-content');

  // clear any old demos
  console.log('--- emptying backup directory ---');
  emptyDir(config.demo.path);
  console.log('--- backing up demo content ---');
  copyDir(process.cwd(), config.demo.path, config.demo.resetIgnore);

  // https://stackoverflow.com/a/14032965
  function clearBackup() {
    console.log('\n========= clearing demo backup =========');
    emptyDir(config.demo.path);
  }
  //do something when app is closing
  process.on('exit', clearBackup.bind(null, { cleanup: true }));

  //catches ctrl+c event
  // process.on('SIGINT', clearBackup.bind(null, { exit: true }));

  // catches "kill pid" (for example: nodemon restart)
  process.on('SIGUSR1', clearBackup.bind(null, { exit: true }));
  process.on('SIGUSR2', clearBackup.bind(null, { exit: true }));
}

const pathToStudy = userArgs.find((entry) => entry[0] !== '-' && entry[1] !== '-') || '';

const absPathToStudy = path.join(process.cwd(), pathToStudy);

const defaultLenses = config.locals['--defaults'];
const defaultLense =
  fs.existsSync(absPathToStudy) && fs.lstatSync(absPathToStudy).isDirectory()
    ? defaultLenses.directory
    : defaultLenses[path.extname(pathToStudy)];

// user can define a port number to study
const cliPortSearch = process.argv.find((entry) => {
  if (/--port=[\d]*/i.test(entry)) {
    const portString = entry.split('=')[1];
    const portNumber = Number(portString);
    if (!Number.isNaN(portNumber) && portNumber >= 3000 && portNumber < 9000) {
      return true;
    }
    process.argv;
  }
  return false;
});
const cliPort =
  cliPortSearch !== undefined ? cliPortSearch.split('=')[1] : undefined;

const cliLensSearch = process.argv.find((entry) => /--lens=[\d]*/i.test(entry));
const cliLens =
  cliLensSearch !== undefined ? cliLensSearch.split('=')[1] : undefined;

const rootStudyConfigPort = getParameterCaseInsensitive(
  rootStudyConfig,
  '--port',
);
const rootStudyConfigPortValidated =
  !Number.isNaN(rootStudyConfigPort) &&
  rootStudyConfigPort >= 3000 &&
  rootStudyConfigPort < 9000
    ? rootStudyConfigPort
    : undefined;

const port =
  process.env.PORT || cliPort || rootStudyConfigPortValidated || config.PORT;

const queryMarker = defaultLense ? '?' : '';

// -- the following lines will need to be rewritten when config works --
// construct a url using global configurations and the user-provided sub-path
// should this not normalize? might it make url paths in windows backslashes?
const pathToOpen = path.normalize(pathToStudy);
// const url = `http://localhost:${port}/${pathToOpen}${queryMarker}${defaultLense}`;
const url = `http://localhost:${port}/${pathToOpen}${queryMarker}${
  cliLens || '--defaults'
}`;
const helpUrl = `http://localhost:${port}?--help`;

// Load and launch the promisified server:
const serverPromiseCloser = require('../server/index.js');

serverPromiseCloser(port)
.then(() => {

  console.log('studying: ', url);
  const rootStudyConfigKeys = Object.keys(rootStudyConfig);

  const hasNoOpenParam = (
    userArgs.find((entry) => entry.includes('-no-open')) 
    ||
    rootStudyConfigKeys.find((configName) =>
      configName.includes('-no-open'),
    )
  );

  if ( !hasNoOpenParam ) {
    open(url);
  }
}).catch( error =>{

  process.exit(1);

})
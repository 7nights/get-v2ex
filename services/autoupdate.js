const https = require('https');
const fs = require('fs').promises;
const createWriteStream = require('fs').createWriteStream;
const path = require('path');
const semver = require('semver');
const request = require('request');
const unzip = require('node-unzip-2');
const exec = require('child_process').exec;

const RELEASE_URL = 'https://github.com/7nights/bv2ex/releases/latest';
const DOWNLOAD_URL = 'https://github.com/7nights/bv2ex/releases/latest/download/bv2ex.zip';
const INCREMENTAL_DOWNLOAD_URL = 'https://github.com/7nights/bv2ex/releases/latest/download/bv2ex-incremental.zip';
const DOWNLOAD_DIST = path.join(__dirname, '../bv2ex-auto-update.zip');
const EXTRACT_DIST = path.join(__dirname, '../');

function downloadUpdate(url) {
  return new Promise((resolve, reject) => {
    const req = request.get(url)
      .on('response', (res) => {
        if (res.statusCode === 200) {
          console.log('downloading update...');
          req.on('close', () => {
            resolve();
          });
          req.pipe(createWriteStream(DOWNLOAD_DIST));
        } else {
          console.log('Failed to download update zip', res.statusCode);
          reject(res.statusCode);
        }
      });
  });
}

exports.checkAndUpdate = () => {
  let data = '';
  https.get(RELEASE_URL, (res) => {
    res.on('data', (chunk) => {
      data += chunk.toString();
    });
    res.on('end', () => {
      const tag = data.match(/tag\/v([0-9.]*)/);
      if (tag) {
        console.log('current latest version is: ', tag[1]);
        fs.readFile(path.join(__dirname, '../public/package.json'), {
          encoding: 'utf8'
        })
          .then(ret => {
            return JSON.parse(ret);
          })
          .then(package => {
            if (semver.gt(tag[1], package.version)) {
              console.log(tag[1] + ' is greater than ', package.version, 'auto updating...');
              return downloadUpdate(INCREMENTAL_DOWNLOAD_URL)
                .catch(ex => {
                  if (ex === 404) {
                    console.log('Did not find the incremental zip, try to download full package.');
                    return downloadUpdate(DOWNLOAD_URL);
                  }
                });
            } else {
              throw new Error('No updates found.');
            }
          })
          .then(() => {
            return new Promise((resolve, reject) => {
              createReadStream(DOWNLOAD_DIST)
                .pipe(unzip.Extract({path: EXTRACT_DIST}))
                .on('close', resolve)
                .on('error', (err) => {
                  reject(err);
                });
            });
          })
          .then(() => {
            return new Promise((resolve, reject) => {
              exec('npm run build', {
                cwd: path.join(EXTRACT_DIST, './public')
              }, (err, stdout, stderr) => {
                if (err) return reject(err);
                console.log(stdout, stderr);
                resolve();
              });
            });
          })
          .then(() => {
            console.log('automatic update succeeded');
          })
          .catch(err => {
            console.log('failed to do auto-update');
            console.error(err);
          });
      }
    });
  });
};

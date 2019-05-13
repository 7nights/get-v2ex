const inquirer = require('inquirer');
const fs = require('fs').promises;
const path = require('path');

const templatePath = path.join(__dirname, './config.default.js');
const configPath = path.join(__dirname, './config.js');
console.log('Initialize get-v2ex configuration 👍');
Promise.resolve()
  .then(() => {
    // check config.js exists
    return fs.stat(configPath)
      .then(ret => {
        if (ret) {
          return inquirer.prompt([{
            type: 'confirm',
            default: false,
            name: 'override',
            message: 'Previous configuration found, do you want to override it?'
          }])
            .then(answer => {
              if (!answer.override) throw new Error('User aborted.');
            });
        }
      }, () => {})
  })
  .then(() => {
    return inquirer
      .prompt([{
          type: 'input',
          name: 'username',
          message: 'Please input your v2ex username'
        }, {
          type: 'password',
          name: 'password',
          message: 'Please input your v2ex password'
        }, {
          type: 'number',
          name: 'pwaCode',
          message: 'Please input a 4-number code to verify clients in the web application',
          validate: (code) => {
            const str = '' + code;
            if (str.length !== 4 || /[^0-9]/.test(str)) return 'Please input a code with 4 numbers.';
            return true;
          }
        }
      ]);
  })
  .then((answers) => {
    return fs.readFile(templatePath, { encoding: 'utf8' })
      .then(tpl => {
        const config = tpl.replace(/{{(.*?)}}/g, ($, $0) => {
          return answers[$0.trim()] || '';
        });
        
        return fs.writeFile(configPath, config);
      });
  })
  .then(() => {
    console.log('👍 Configuration was saved in config.js .');
  });

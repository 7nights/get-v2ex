get-v2ex
================================

RESTful APIs for [V2EX](https://www.v2ex.com). This is the back-end of bv2ex web application.

## Requirements
Node.js >= 10.15.3

## Installation

```shell
git clone https://github.com/7nights/get-v2ex.git --depth 1
npm install
npm run init
```

## Configure FCM

*(This step is optional.)* You can enable FCM to notifiy users when they get new notifications. This need you to configure both the server side and client side. Follow the instruction below to configure your server.

### Step 1. Add a project

Go to [Firebase console](https://console.firebase.google.com/u/0/) to add a project.

### Step 2. Create a server account

1. In the Firebase console, open Settings > [Server Accounts](https://console.firebase.google.com/u/0/project/_/settings/serviceaccounts/adminsdk).
2. Click **Generate New Private Key**, then confirm by clicking **Generate Key**.
3. Securely store the JSON file containing the key on your server.

### Step 3. Edit `config.js`

1. Fill in `serverKeyPath` with the absolute path of the key file.
2. Fill in `databaseURL`. You can find it in the `Admin SDK configuration snippet` at step 2.

## Configure Nginx

Before you configure Nginx, you need to install [bv2ex](https://github.com/7nights/bv2ex) first.

You may use get-v2ex to serve both the RESTFul APIs and static resources of the web application. 

To achieve this, we need to add 2 rules to tell Nginx how it should rewrite the requests. For example, if we configure `clientAddress` as `https://example_domain` in `get-v2ex/public/config.js`, we'll need to rewrite all the client resource requests to add `'/static'` as a prefix. (This is because bv2ex resources are served under the `/static` scope by default.)

So eventually you may add something like the following to `server` section:

```nginx
index static/index.html;

# configure serverAddress in your config.js as 'https://[your_domain.com]/api'
location ~ ^/api/(.*) {
  rewrite ^/api/(.*) /$1 break;
  proxy_pass http://127.0.0.1:3001;
}
# treat other requests as static resources
location ~ ^/(.*) {
  rewrite ^/(.*) /static/$1 break;
  proxy_pass http://127.0.0.1:3001;
}
```

## Start your server

You can use some tools to manage your bv2ex server process such as [pm2](https://pm2.io/doc/en/runtime/overview/?utm_source=pm2&utm_medium=website&utm_campaign=rebranding) or [forever](https://www.npmjs.com/package/forever).

```shell
npm i -g forever
forever start index.js
```

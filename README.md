get-v2ex
================================

RESTful APIs for [V2EX](https://www.v2ex.com). This is the back-end of b2ex web application.

## Requirements
Node.js >= 10.15.3

## Installation

```shell
git clone https://github.com/7nights/get-v2ex.git --depth 1
npm install
npm run init
```

## Configure FCM

You can enable FCM to notifiy users when they get new notifications. This need you to configure both the server side and client side. Follow the instruction to configure your server.

### Step 1. Add a project

Go to [Firebase console](https://console.firebase.google.com/u/0/) to add a project.

### Step 2. Create a server account

1. In the Firebase console, open Settings > [Server Accounts](https://console.firebase.google.com/u/0/project/_/settings/serviceaccounts/adminsdk).
2. Click **Generate New Private Key**, then confirm by clicking **Generate Key**.
3. Securely store the JSON file containing the key on your server.

### Step 3. Edit `config.js`

1. Fill in `serverKeyPath` with the absolute path of the key file.
2. Fill in `databaseURL`. You can find it in the `Admin SDK configuration snippet` at step 2.

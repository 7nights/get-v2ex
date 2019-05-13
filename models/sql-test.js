const sqlite = require('sqlite');
const SQL = require('sql-template-strings');
sqlite.open('./database.sqlite')
  .then((db) => {
    return db.get(`CREATE TABLE IF NOT EXISTS following_posts (
      'id' INTEGER PRIMARY KEY,
      'title' TEXT,
      'content' TEXT,
      'last_read_replies' INTEGER,
      'current_replies' INTEGER
    );`);
  })
  .then(console.log);
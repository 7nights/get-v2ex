CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INTEGER PRIMARY KEY,
  `to` TEXT, -- user name
  `title` TEXT,
  `content` TEXT,
  `url` TEXT
);

CREATE TABLE IF NOT EXISTS `notification_devices` (
  `id` INTEGER PRIMARY KEY,
  `token` TEXT,
  `user` TEXT -- user name
);

CREATE TABLE IF NOT EXISTS `notification_count` (
  `user` TEXT PRIMARY KEY,
  `count` INTEGER,
  `time` INTEGER
);

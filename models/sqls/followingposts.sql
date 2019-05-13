CREATE TABLE IF NOT EXISTS `following_posts` (
  `id` INTEGER PRIMARY KEY,
  `user` TEXT,
  `topic` INTEGER,
  `title` TEXT,
  `content` TEXT,
  `last_read_replies` INTEGER,
  `current_replies` INTEGER,
  UNIQUE(`user`, `topic`)
);

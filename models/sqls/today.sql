CREATE TABLE IF NOT EXISTS `today_post` (
  `topic` INTEGER PRIMARY KEY,
  `author` TEXT,
  `title` TEXT,
  `content_json` TEXT,
  `reply_count` INTEGER,
  `updated` INTEGER
);

CREATE TABLE IF NOT EXISTS `today_list` (
  `date` INTEGER PRIMARY KEY, -- days since 01-01-1970
  `list` TEXT -- JSON format
)

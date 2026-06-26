CREATE TABLE `li_creative_alphix_topic` (
  `creative_id` int(10) unsigned NOT NULL,
  `topic_id` int(10) unsigned NOT NULL,
  `weight` int(10) unsigned NOT NULL COMMENT 'Amount of times the topic is found in the text',
  `create_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_fetched` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`creative_id`,`topic_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

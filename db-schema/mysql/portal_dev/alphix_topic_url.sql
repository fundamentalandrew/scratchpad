CREATE TABLE `alphix_topic_url` (
  `url_clean_id` int(20) unsigned NOT NULL,
  `recommendedTopicUuidList` json DEFAULT NULL,
  `topicUuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `clientUuid` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `dateMatched` datetime DEFAULT NULL,
  PRIMARY KEY (`url_clean_id`,`clientUuid`),
  KEY `topicUuid` (`topicUuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

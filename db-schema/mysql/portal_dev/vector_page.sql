CREATE TABLE `vector_page` (
  `uuid` varchar(36) NOT NULL,
  `version` mediumint(4) DEFAULT '1',
  `client_uuid` varchar(36) NOT NULL,
  `url_clean_id` int(10) unsigned NOT NULL,
  `ai_job_uuid` varchar(36) NOT NULL,
  `status` varchar(50) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `version_url_clean_id` (`version`,`url_clean_id`) USING BTREE,
  KEY `status` (`status`) USING BTREE,
  KEY `ai_job_uuid` (`ai_job_uuid`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

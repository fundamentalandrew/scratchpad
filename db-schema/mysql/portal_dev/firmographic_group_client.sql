CREATE TABLE `firmographic_group_client` (
  `firmographic_group_id` varchar(36) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `client_uuid` varchar(36) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`firmographic_group_id`,`client_uuid`),
  KEY `firmographic_group_id` (`firmographic_group_id`),
  KEY `client_uuid` (`client_uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

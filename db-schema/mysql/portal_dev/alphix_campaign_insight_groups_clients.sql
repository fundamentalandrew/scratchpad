CREATE TABLE `alphix_campaign_insight_groups_clients` (
  `campaign_insight_group_uuid` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `client_uuid` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `market_topic_uuid` varchar(36) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`campaign_insight_group_uuid`,`client_uuid`) USING BTREE,
  KEY `market_topic_uuid` (`market_topic_uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

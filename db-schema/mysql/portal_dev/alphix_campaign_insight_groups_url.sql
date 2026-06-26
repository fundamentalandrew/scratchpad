CREATE TABLE `alphix_campaign_insight_groups_url` (
  `url_clean_id` int(20) unsigned NOT NULL,
  `campaign_insight_group_uuid` varchar(36) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `client_uuid` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`url_clean_id`),
  KEY `campaign_insight_group_uuid` (`campaign_insight_group_uuid`) USING BTREE,
  KEY `client_uuid` (`client_uuid`) USING BTREE,
  KEY `status` (`status`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

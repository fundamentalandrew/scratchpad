CREATE TABLE `alphix_campaign_insight_groups_url_recommended` (
  `url_clean_id` int(20) unsigned NOT NULL,
  `campaign_insight_group_uuid` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`url_clean_id`,`campaign_insight_group_uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

CREATE TABLE `aw_campaign_label` (
  `campaign_id` bigint(20) unsigned NOT NULL,
  `label_id` bigint(20) unsigned NOT NULL,
  `label` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`campaign_id`,`label_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

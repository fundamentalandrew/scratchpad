CREATE TABLE `creative_campaign_group` (
  `creative_campaign_id` int(10) unsigned NOT NULL,
  `creative_group_id` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`creative_campaign_id`,`creative_group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

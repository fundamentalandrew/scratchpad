CREATE TABLE `dcs_report` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `date` date DEFAULT NULL,
  `agency_id` bigint(20) unsigned NOT NULL,
  `advertiser_id` bigint(20) unsigned NOT NULL,
  `campaign_id` bigint(20) unsigned NOT NULL,
  `account_id` bigint(20) unsigned NOT NULL,
  `avg_pos` decimal(18,8) NOT NULL,
  `cost` decimal(10,2) NOT NULL,
  `impressions` int(11) NOT NULL,
  `clicks` int(11) NOT NULL,
  `visits` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `advertiser_id` (`advertiser_id`),
  KEY `campaign_id` (`campaign_id`),
  KEY `date` (`date`)
) ENGINE=InnoDB AUTO_INCREMENT=20152 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

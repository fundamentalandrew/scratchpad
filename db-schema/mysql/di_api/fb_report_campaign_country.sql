CREATE TABLE `fb_report_campaign_country` (
  `date` date NOT NULL,
  `campaign_id` bigint(20) unsigned NOT NULL,
  `country` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_id` bigint(20) unsigned NOT NULL,
  `impressions` int(11) NOT NULL,
  `clicks` int(11) NOT NULL,
  `cost` decimal(60,30) NOT NULL,
  PRIMARY KEY (`date`,`campaign_id`,`country`),
  KEY `account_id` (`account_id`),
  KEY `campaign_id` (`campaign_id`),
  KEY `country` (`country`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

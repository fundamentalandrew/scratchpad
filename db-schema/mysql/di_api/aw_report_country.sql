CREATE TABLE `aw_report_country` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `date` date DEFAULT NULL,
  `customer_id` bigint(20) unsigned NOT NULL,
  `campaign_id` bigint(20) unsigned NOT NULL,
  `country_id` bigint(20) unsigned NOT NULL,
  `country_code` varchar(10) COLLATE utf8_unicode_ci NOT NULL,
  `cost` decimal(10,2) NOT NULL,
  `impressions` int(11) NOT NULL,
  `clicks` int(11) NOT NULL,
  `all_conversions` decimal(10,2) DEFAULT NULL,
  `conversions` decimal(10,2) DEFAULT NULL,
  `cost_gbp` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `date` (`date`),
  KEY `campaign_id` (`campaign_id`),
  KEY `country_id` (`country_id`),
  KEY `cost_gbp` (`cost_gbp`)
) ENGINE=InnoDB AUTO_INCREMENT=3134847 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

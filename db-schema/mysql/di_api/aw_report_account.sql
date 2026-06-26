CREATE TABLE `aw_report_account` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `date` date DEFAULT NULL,
  `customer_id` bigint(20) unsigned NOT NULL,
  `cost` decimal(10,2) NOT NULL,
  `clicks` int(11) NOT NULL,
  `impressions` int(11) NOT NULL,
  `conversions` decimal(10,2) DEFAULT NULL,
  `all_conversions` decimal(10,2) DEFAULT NULL,
  `cost_gbp` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `date` (`date`),
  KEY `customer_id` (`customer_id`),
  KEY `cost_gbp` (`cost_gbp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

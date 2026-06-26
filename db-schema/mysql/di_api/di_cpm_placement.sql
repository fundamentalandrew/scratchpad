CREATE TABLE `di_cpm_placement` (
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `placement_id` bigint(20) unsigned NOT NULL,
  `cpm` decimal(15,4) DEFAULT NULL,
  `currency` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`start_date`,`end_date`,`placement_id`),
  KEY `cpm` (`cpm`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

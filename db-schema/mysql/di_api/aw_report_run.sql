CREATE TABLE `aw_report_run` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `report_reference` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `customer_id` bigint(20) unsigned NOT NULL,
  `date` date NOT NULL,
  PRIMARY KEY (`id`),
  KEY `report_reference` (`report_reference`),
  KEY `customer_id` (`customer_id`),
  KEY `date` (`date`)
) ENGINE=InnoDB AUTO_INCREMENT=4455945 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

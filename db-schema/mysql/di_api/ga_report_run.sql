CREATE TABLE `ga_report_run` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `report_reference` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `view_id` int(11) NOT NULL,
  `date` date NOT NULL,
  PRIMARY KEY (`id`),
  KEY `report_reference` (`report_reference`),
  KEY `view_id` (`view_id`),
  KEY `date` (`date`)
) ENGINE=InnoDB AUTO_INCREMENT=11654402 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

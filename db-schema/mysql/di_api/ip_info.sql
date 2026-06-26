CREATE TABLE `ip_info` (
  `ip` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `country` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `region` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `city` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `postal_area` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `location_coordinates` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `timezone` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `privacy` varchar(50) COLLATE utf8_unicode_ci DEFAULT NULL,
  `carrier_id` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `abuse_id` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `asn_id` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `company_name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `company_domain` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `company_type` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `last_check` datetime DEFAULT NULL,
  PRIMARY KEY (`ip`),
  KEY `last_check` (`last_check`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

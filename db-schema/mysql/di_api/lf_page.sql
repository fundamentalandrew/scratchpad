CREATE TABLE `lf_page` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `business_id` int(11) NOT NULL,
  `visit_id` bigint(20) NOT NULL,
  `page_visit_date_time` datetime NOT NULL,
  `page_location` varchar(2048) COLLATE utf8_unicode_ci DEFAULT NULL,
  `page_title` varchar(512) COLLATE utf8_unicode_ci DEFAULT NULL,
  `referrer_name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `booking_unique_number` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `booking_placement_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `business_id` (`business_id`),
  KEY `visit_id` (`visit_id`),
  KEY `page_visit_date_time` (`page_visit_date_time`),
  KEY `page_title` (`page_title`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=4296723 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `software_browser_os_support_history` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `os_id` int(10) unsigned NOT NULL,
  `browser_id` int(10) unsigned NOT NULL,
  `min_supported_version` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL,
  `eol_date` date DEFAULT NULL,
  `notes` text COLLATE utf8_unicode_ci,
  `latest_version` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=216 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

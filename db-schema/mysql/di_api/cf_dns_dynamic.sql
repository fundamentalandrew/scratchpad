CREATE TABLE `cf_dns_dynamic` (
  `hostname` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `system` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `status` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`hostname`),
  KEY `system` (`system`),
  KEY `status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `ip_info_carrier` (
  `name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `mcc` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `mnc` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`name`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

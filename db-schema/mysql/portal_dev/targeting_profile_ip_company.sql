CREATE TABLE `targeting_profile_ip_company` (
  `targeting_profile_ip_id` int(10) unsigned NOT NULL,
  `company_uuid` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `createdAt` datetime DEFAULT NULL,
  PRIMARY KEY (`targeting_profile_ip_id`,`company_uuid`),
  KEY `targeting_profile_ip_company_company_uuid` (`company_uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

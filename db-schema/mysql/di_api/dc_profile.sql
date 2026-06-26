CREATE TABLE `dc_profile` (
  `profileId` int(10) unsigned NOT NULL,
  `accountId` int(10) unsigned DEFAULT NULL,
  `client_uuid` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `status` tinyint(1) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`profileId`),
  KEY `accountId` (`accountId`),
  KEY `client_uuid` (`client_uuid`),
  KEY `status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

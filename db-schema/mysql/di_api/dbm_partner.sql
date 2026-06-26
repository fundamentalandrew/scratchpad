CREATE TABLE `dbm_partner` (
  `partnerId` int(10) unsigned NOT NULL,
  `displayName` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `updateTime` datetime NOT NULL,
  `entityStatus` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `timeZone` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `currencyCode` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `adServerConfig` json NOT NULL COMMENT '(DC2Type:json)',
  `dataAccessConfig` json NOT NULL COMMENT '(DC2Type:json)',
  `exchangeConfig` json NOT NULL COMMENT '(DC2Type:json)',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `status` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`partnerId`),
  KEY `displayName` (`displayName`),
  KEY `updateTime` (`updateTime`),
  KEY `status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

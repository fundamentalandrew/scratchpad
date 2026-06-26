CREATE TABLE `asset_builder_creative_setting` (
  `uuid` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `creative_uuid` varchar(36) COLLATE utf8_unicode_ci NOT NULL,
  `setting` varchar(500) COLLATE utf8_unicode_ci NOT NULL,
  `value` text COLLATE utf8_unicode_ci,
  `created_by` int(10) unsigned DEFAULT NULL,
  `updated_by` int(10) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`uuid`),
  KEY `setting` (`setting`) USING BTREE,
  KEY `creative_uuid` (`creative_uuid`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `activity_setting` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `aa_uuid` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `setting` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `value` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `list` text COLLATE utf8_unicode_ci COMMENT '(DC2Type:simple_array)',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `settingUnique` (`aa_uuid`,`setting`),
  KEY `aa_uuid` (`aa_uuid`),
  KEY `setting` (`setting`)
) ENGINE=InnoDB AUTO_INCREMENT=2403734 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

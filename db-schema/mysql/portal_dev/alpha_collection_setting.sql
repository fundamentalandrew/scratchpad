CREATE TABLE `alpha_collection_setting` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `ac_uuid` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `setting` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `value` text COLLATE utf8_unicode_ci NOT NULL COMMENT '(DC2Type:simple_array)',
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `settingUnique` (`ac_uuid`,`setting`),
  KEY `ac_uuid` (`ac_uuid`),
  KEY `setting` (`setting`)
) ENGINE=InnoDB AUTO_INCREMENT=13771 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `tracker_unique` (
  `delta_tag_unique` bigint(20) unsigned NOT NULL,
  `id` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `timestamp` datetime NOT NULL,
  `delta_tag` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`delta_tag_unique`,`delta_tag`),
  KEY `id` (`id`),
  KEY `timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

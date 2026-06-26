CREATE TABLE `targeting_profile_content_keyword` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `targeting_profile_content_id` int(10) unsigned DEFAULT NULL,
  `mode` varchar(20) COLLATE utf8_unicode_ci NOT NULL,
  `keyword` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `headline` tinyint(4) NOT NULL DEFAULT '0',
  `content` tinyint(4) NOT NULL DEFAULT '0',
  `createdAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `targeting_profile_content_id` (`targeting_profile_content_id`),
  KEY `mode` (`mode`),
  KEY `keyword` (`keyword`),
  KEY `headline` (`headline`),
  KEY `content` (`content`),
  CONSTRAINT `targeting_profile_content_keyword_ibfk_1` FOREIGN KEY (`targeting_profile_content_id`) REFERENCES `targeting_profile_content` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=74 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

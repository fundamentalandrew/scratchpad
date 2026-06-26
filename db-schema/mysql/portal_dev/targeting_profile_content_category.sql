CREATE TABLE `targeting_profile_content_category` (
  `targeting_profile_content_id` int(10) unsigned NOT NULL,
  `iabCategoryId` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `mode` varchar(20) COLLATE utf8_unicode_ci NOT NULL,
  `createdAt` datetime DEFAULT NULL,
  PRIMARY KEY (`targeting_profile_content_id`,`iabCategoryId`),
  KEY `mode` (`mode`),
  CONSTRAINT `targeting_profile_content_category_ibfk_1` FOREIGN KEY (`targeting_profile_content_id`) REFERENCES `targeting_profile_content` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

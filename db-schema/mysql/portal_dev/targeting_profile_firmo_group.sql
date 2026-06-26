CREATE TABLE `targeting_profile_firmo_group` (
  `targeting_profile_firmo_id` int(10) unsigned NOT NULL,
  `firmographic_group_id` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `createdAt` datetime DEFAULT NULL,
  PRIMARY KEY (`targeting_profile_firmo_id`,`firmographic_group_id`),
  KEY `firmographic_group_id` (`firmographic_group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `targeting_profile_ip_tier` (
  `targeting_profile_ip_id` int(10) unsigned NOT NULL,
  `tier` tinyint(3) unsigned NOT NULL,
  `createdAt` datetime DEFAULT NULL,
  PRIMARY KEY (`targeting_profile_ip_id`,`tier`),
  KEY `tier` (`tier`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `ip_flow_industry` (
  `id` int(10) unsigned NOT NULL,
  `level` int(10) unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `groupId` int(10) unsigned NOT NULL,
  `groupName` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `lastUpdate` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `lastUpdate` (`lastUpdate`),
  KEY `groupId` (`groupId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

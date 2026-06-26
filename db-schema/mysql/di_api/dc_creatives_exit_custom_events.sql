CREATE TABLE `dc_creatives_exit_custom_events` (
  `id` int(10) unsigned NOT NULL,
  `creativesId` int(10) unsigned NOT NULL,
  `advertiserCustomEventId` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `advertiserCustomEventName` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `advertiserCustomEventType` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `artworkLabel` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `artworkType` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `customClickThroughUrl` varchar(2048) COLLATE utf8_unicode_ci DEFAULT NULL,
  `targetType` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `accountId` int(10) unsigned DEFAULT NULL,
  `profileId` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`,`creativesId`),
  KEY `creativesId` (`creativesId`),
  KEY `advertiserCustomEventId` (`advertiserCustomEventId`),
  KEY `accountId` (`accountId`),
  KEY `profileId` (`profileId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

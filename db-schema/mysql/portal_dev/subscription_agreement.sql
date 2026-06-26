CREATE TABLE `subscription_agreement` (
  `uuid` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `clientUuid` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `startDate` datetime NOT NULL,
  `endDate` datetime NOT NULL,
  `type` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `status` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`uuid`,`clientUuid`),
  KEY `clientUuid` (`clientUuid`),
  KEY `startDate` (`startDate`),
  KEY `endDate` (`endDate`),
  KEY `type` (`type`),
  KEY `status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

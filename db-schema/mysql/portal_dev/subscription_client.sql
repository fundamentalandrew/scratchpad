CREATE TABLE `subscription_client` (
  `clientUuid` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `allowAnyDomain` tinyint(4) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`clientUuid`),
  KEY `allowAnyDomain` (`allowAnyDomain`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `subscription_client_invite` (
  `uuid` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `clientUuid` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `role` text COLLATE utf8_unicode_ci NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `status` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `ownerTermsAccept` datetime DEFAULT NULL,
  PRIMARY KEY (`uuid`),
  KEY `clientUuid` (`clientUuid`),
  KEY `email` (`email`),
  KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `subscription_client_user` (
  `clientUuid` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `userId` int(10) unsigned NOT NULL,
  `status` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `owner` tinyint(1) NOT NULL,
  PRIMARY KEY (`clientUuid`,`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

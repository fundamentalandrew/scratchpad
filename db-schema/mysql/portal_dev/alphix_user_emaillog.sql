CREATE TABLE `alphix_user_emaillog` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `userId` int(10) unsigned NOT NULL,
  `emailRef` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `emailUuid` varchar(36) COLLATE utf8_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `attachmentUuid` varchar(36) COLLATE utf8_unicode_ci DEFAULT NULL,
  `emailDate` date DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=272 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

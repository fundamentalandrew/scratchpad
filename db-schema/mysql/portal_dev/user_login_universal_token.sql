CREATE TABLE `user_login_universal_token` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `userId` int(10) unsigned DEFAULT NULL,
  `checkToken` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `loginToken` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `applyApp` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `redirectApp` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `expires` datetime NOT NULL,
  `created` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `checkToken` (`checkToken`),
  KEY `loginToken` (`loginToken`)
) ENGINE=InnoDB AUTO_INCREMENT=87817 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

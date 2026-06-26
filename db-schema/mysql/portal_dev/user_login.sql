CREATE TABLE `user_login` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `token` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `expires` datetime NOT NULL,
  `status` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `ip_address` varchar(39) COLLATE utf8_unicode_ci NOT NULL,
  `adminUserId` int(10) unsigned DEFAULT NULL,
  `loginType` varchar(100) COLLATE utf8_unicode_ci DEFAULT 'email',
  `ssoProviderData` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `status` (`status`),
  KEY `created_at` (`created_at`),
  KEY `user_login_adminUserId` (`adminUserId`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=179692 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

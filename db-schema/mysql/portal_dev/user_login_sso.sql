CREATE TABLE `user_login_sso` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `validation_token` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `provider` varchar(100) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `token_expiry` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `tid` varchar(36) DEFAULT NULL,
  `oid` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `validation_token` (`validation_token`),
  KEY `created_at` (`created_at`),
  KEY `idx_token_expiry` (`token_expiry`)
) ENGINE=InnoDB AUTO_INCREMENT=123 DEFAULT CHARSET=utf8mb4;

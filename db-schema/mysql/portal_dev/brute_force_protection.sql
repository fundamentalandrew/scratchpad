CREATE TABLE `brute_force_protection` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned DEFAULT NULL,
  `ip_address` varchar(39) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action_time` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `user_id` (`user_id`) USING BTREE,
  KEY `action` (`action`) USING BTREE,
  KEY `ip_address` (`ip_address`) USING BTREE,
  KEY `action_id` (`action_id`) USING BTREE,
  KEY `action_time` (`action_time`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=4061 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `alphix_topic` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `topic` (`name`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=17088 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

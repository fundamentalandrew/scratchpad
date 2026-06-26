CREATE TABLE `dashboard_template` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `creator` int(11) NOT NULL,
  `name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `status` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `filters` json DEFAULT NULL COMMENT '(DC2Type:json)',
  `block_sharing` tinyint(4) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `creator` (`creator`),
  KEY `name` (`name`),
  KEY `status` (`status`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

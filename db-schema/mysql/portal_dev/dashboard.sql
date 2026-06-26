CREATE TABLE `dashboard` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `template_id` int(11) NOT NULL,
  `creator` int(11) NOT NULL,
  `name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `status` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `filters` json DEFAULT NULL COMMENT '(DC2Type:json)',
  PRIMARY KEY (`id`),
  KEY `template_id` (`template_id`),
  KEY `creator` (`creator`),
  KEY `name` (`name`),
  KEY `status` (`status`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=289 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

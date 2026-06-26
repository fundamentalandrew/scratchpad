CREATE TABLE `dashboard_template_page` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `template_id` int(11) NOT NULL,
  `page_order` smallint(6) NOT NULL,
  `name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `filters` json DEFAULT NULL COMMENT '(DC2Type:json)',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `template_id` (`template_id`),
  KEY `page_order` (`page_order`),
  KEY `name` (`name`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

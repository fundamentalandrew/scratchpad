CREATE TABLE `dashboard_template_page_widget` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `template_page_id` int(11) NOT NULL,
  `component` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `options` json DEFAULT NULL COMMENT '(DC2Type:json)',
  `pos_x` smallint(6) DEFAULT NULL,
  `pos_y` smallint(6) DEFAULT NULL,
  `width` smallint(6) DEFAULT NULL,
  `height` smallint(6) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `template_page_id` (`template_page_id`),
  KEY `component` (`component`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=47 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

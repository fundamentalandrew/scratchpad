CREATE TABLE `dashboard_page_filter` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `dashboard_id` int(11) NOT NULL,
  `template_page_id` int(11) NOT NULL,
  `filter` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `value` json NOT NULL COMMENT '(DC2Type:json)',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `dashboard_id` (`dashboard_id`),
  KEY `template_page_id` (`template_page_id`),
  KEY `filter` (`filter`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

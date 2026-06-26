CREATE TABLE `li_organization_brand` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `token_user_id` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `organization_brand_id` int(10) unsigned NOT NULL,
  `organization_brand_reference` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `locale` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `parent` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `website` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_organization_brand` (`organization_brand_id`),
  KEY `token_user_id` (`token_user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=33062 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

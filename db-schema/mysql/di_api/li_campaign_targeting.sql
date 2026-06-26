CREATE TABLE `li_campaign_targeting` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `token_user_id` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `campaign_id` int(10) unsigned NOT NULL,
  `include_exclude` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `or_id` int(10) unsigned DEFAULT NULL,
  `type` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `urn` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `token_user_id` (`token_user_id`),
  KEY `campaign_id` (`campaign_id`),
  KEY `include_exclude` (`include_exclude`),
  KEY `type` (`type`)
) ENGINE=InnoDB AUTO_INCREMENT=151005112 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

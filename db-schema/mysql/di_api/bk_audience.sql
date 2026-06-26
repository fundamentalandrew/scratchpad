CREATE TABLE `bk_audience` (
  `id` int(10) unsigned NOT NULL,
  `partner_id` int(10) unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `retargeting` tinyint(1) NOT NULL,
  `prospecting` tinyint(1) NOT NULL,
  `recency` int(10) unsigned NOT NULL,
  `reach` int(10) unsigned NOT NULL,
  `notes` varchar(2048) COLLATE utf8_unicode_ci NOT NULL,
  `campaign_count` int(10) unsigned NOT NULL,
  `sharing_type` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `usage_type` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `device_type` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `status` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `created_at` date NOT NULL,
  `updated_at` date NOT NULL,
  PRIMARY KEY (`id`),
  KEY `status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

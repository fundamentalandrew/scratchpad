CREATE TABLE `bk_campaign_pixel` (
  `id` int(10) unsigned NOT NULL,
  `campaign_id` int(10) unsigned NOT NULL,
  `partner_id` int(10) unsigned NOT NULL,
  `vendor_id` int(10) unsigned NOT NULL,
  `vendor_name` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `vendor_segment` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `vendor_logo_url` varchar(2048) COLLATE utf8_unicode_ci NOT NULL,
  `macros` varchar(2048) COLLATE utf8_unicode_ci NOT NULL,
  `sequence` int(10) unsigned NOT NULL,
  `avg_latency` int(10) unsigned NOT NULL,
  `monitoring_status` int(10) unsigned NOT NULL,
  `status` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `updated_at` date DEFAULT NULL,
  PRIMARY KEY (`id`,`campaign_id`),
  KEY `status` (`status`),
  KEY `campaign_id` (`campaign_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

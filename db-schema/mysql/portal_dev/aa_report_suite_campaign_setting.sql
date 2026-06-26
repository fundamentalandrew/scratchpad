CREATE TABLE `aa_report_suite_campaign_setting` (
  `rsid` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `campaign_variable` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `separator` varchar(10) COLLATE utf8_unicode_ci NOT NULL,
  `channel_index` int(10) unsigned NOT NULL,
  `channel_mapping` text COLLATE utf8_unicode_ci NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`rsid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

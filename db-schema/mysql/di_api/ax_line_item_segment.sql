CREATE TABLE `ax_line_item_segment` (
  `targeting_profile_content_id` int(10) NOT NULL,
  `advertiserId` int(10) unsigned NOT NULL,
  `segmentKey` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `accountId` int(10) unsigned DEFAULT NULL,
  `type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  KEY `targeting_profile_content_id` (`targeting_profile_content_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ax_line_item_linked_segment` (
  `targeting_profile_content_id` int(10) NOT NULL,
  `lineItemId` int(10) NOT NULL,
  `accountId` int(10) unsigned NOT NULL,
  `segmentKey` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`targeting_profile_content_id`,`lineItemId`,`accountId`,`segmentKey`),
  KEY `idx_targeting_profile_content_id` (`targeting_profile_content_id`) USING BTREE,
  KEY `idx_segmentKey` (`segmentKey`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

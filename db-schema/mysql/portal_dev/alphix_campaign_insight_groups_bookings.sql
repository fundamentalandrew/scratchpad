CREATE TABLE `alphix_campaign_insight_groups_bookings` (
  `booking_number` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `campaign_insight_group_uuid` varchar(36) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `date_matched` datetime NOT NULL,
  PRIMARY KEY (`booking_number`) USING BTREE,
  KEY `campaign_insight_group_uuid` (`campaign_insight_group_uuid`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

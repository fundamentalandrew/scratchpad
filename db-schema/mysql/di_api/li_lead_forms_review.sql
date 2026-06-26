CREATE TABLE `li_lead_forms_review` (
  `lead_id` bigint(20) unsigned NOT NULL,
  `review_status` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `last_updated` timestamp NULL DEFAULT NULL,
  `rejection_reasons` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  PRIMARY KEY (`lead_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

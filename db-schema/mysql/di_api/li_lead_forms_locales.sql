CREATE TABLE `li_lead_forms_locales` (
  `lead_id` bigint(20) unsigned NOT NULL,
  `locale` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `headline` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `description` varchar(500) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `post_submission_message` varchar(500) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  PRIMARY KEY (`lead_id`,`locale`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

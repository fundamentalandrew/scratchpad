CREATE TABLE `li_lead_forms_hidden_fields` (
  `lead_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `value` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  KEY `lead_id` (`lead_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

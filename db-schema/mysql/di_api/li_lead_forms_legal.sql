CREATE TABLE `li_lead_forms_legal` (
  `lead_id` bigint(20) unsigned NOT NULL,
  `legal_info_id` bigint(20) unsigned NOT NULL,
  `locale` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `legal_disclaimer` varchar(2000) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  PRIMARY KEY (`lead_id`,`legal_info_id`,`locale`) USING BTREE,
  UNIQUE KEY `legal_info_id_locale` (`legal_info_id`,`locale`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

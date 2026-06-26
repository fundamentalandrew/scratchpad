CREATE TABLE `li_lead_forms_legal_consents` (
  `lead_id` bigint(20) unsigned NOT NULL,
  `legal_info_id` bigint(20) unsigned NOT NULL,
  `legal_consent_id` int(10) unsigned NOT NULL,
  `locale` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `consent` varchar(500) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `check_required` tinyint(1) NOT NULL DEFAULT '0',
  `label` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  PRIMARY KEY (`lead_id`,`legal_info_id`,`legal_consent_id`,`locale`) USING BTREE,
  UNIQUE KEY `legal_info_id_legal_consent_id_locale` (`legal_info_id`,`legal_consent_id`,`locale`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

CREATE TABLE `li_lead_forms_questions_choices` (
  `lead_id` bigint(20) unsigned NOT NULL,
  `question_id` bigint(20) unsigned NOT NULL,
  `option_id` int(10) unsigned NOT NULL,
  `locale` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `text` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `label` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  PRIMARY KEY (`lead_id`,`question_id`,`option_id`,`locale`) USING BTREE,
  UNIQUE KEY `question_id_option_id_locale` (`question_id`,`option_id`,`locale`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

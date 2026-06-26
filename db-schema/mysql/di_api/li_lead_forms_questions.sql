CREATE TABLE `li_lead_forms_questions` (
  `lead_id` bigint(20) unsigned NOT NULL,
  `question_id` bigint(20) unsigned NOT NULL,
  `locale` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `question` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `label` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `text_prompt` varchar(500) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `predefined_field` varchar(50) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `response_required` tinyint(1) DEFAULT NULL,
  `response_editable` tinyint(1) DEFAULT NULL,
  `freemium_email_allowed` tinyint(1) DEFAULT NULL,
  `text_response_default` varchar(2000) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `text_response_max_char` int(11) DEFAULT NULL,
  `multiple_choice_default_option` int(11) DEFAULT NULL,
  PRIMARY KEY (`lead_id`,`question_id`,`locale`) USING BTREE,
  UNIQUE KEY `question_id_locale` (`question_id`,`locale`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

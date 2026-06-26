CREATE TABLE `li_account_reference` (
  `reference` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `id` varchar(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `vanity_name` varchar(50) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `localized_name` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `preferred_locale_country` varchar(5) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `preferred_locale_language` varchar(5) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `logo_cropped_reference` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `logo_original_reference` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `logo_crop_x` int(11) DEFAULT '0',
  `logo_crop_width` int(11) DEFAULT '0',
  `logo_crop_y` int(11) DEFAULT '0',
  `logo_crop_height` int(11) DEFAULT '0',
  PRIMARY KEY (`reference`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

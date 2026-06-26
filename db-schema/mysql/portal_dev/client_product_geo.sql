CREATE TABLE `client_product_geo` (
  `product_id` int(10) unsigned NOT NULL,
  `geo` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `template_path` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `button_template_path` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `disclaimer_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `allowed_url_list` json DEFAULT NULL,
  `status` enum('live','archived') NOT NULL DEFAULT 'live',
  PRIMARY KEY (`product_id`,`geo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

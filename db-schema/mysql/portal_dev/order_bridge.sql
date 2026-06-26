CREATE TABLE `order_bridge` (
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `client_uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `codeVersion` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '1.0',
  `reference` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `amx_ip_segment_log` (
  `segment_key` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`segment_key`,`ip`),
  UNIQUE KEY `amx_ip_segment_log_segment_key_IDX` (`segment_key`,`ip`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

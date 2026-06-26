CREATE TABLE `lu_import_type` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `enabled` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `lu_import_type_id_unique` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

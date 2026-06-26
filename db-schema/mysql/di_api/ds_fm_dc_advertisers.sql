CREATE TABLE `ds_fm_dc_advertisers` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `doubleClickAdvertiserId` int(10) unsigned NOT NULL,
  `id_Client` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `doubleClickAdvertiserName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fundamentalInvoiceOffice` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ds_fm_dc_advertisers_id_unique` (`id`),
  KEY `idx_ds_fm_dc_advertisers_doubleClickAdvertiserId` (`doubleClickAdvertiserId`),
  KEY `idx_ds_fm_dc_advertisers_id_Client` (`id_Client`)
) ENGINE=InnoDB AUTO_INCREMENT=60 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

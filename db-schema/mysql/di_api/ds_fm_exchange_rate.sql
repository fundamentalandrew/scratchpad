CREATE TABLE `ds_fm_exchange_rate` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `domesticCurrency` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL,
  `foreignCurrency` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rate` decimal(12,6) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rateUnique` (`date`,`domesticCurrency`,`foreignCurrency`),
  KEY `date` (`date`),
  KEY `domesticCurrency` (`domesticCurrency`),
  KEY `foreignCurrency` (`foreignCurrency`)
) ENGINE=InnoDB AUTO_INCREMENT=2757763 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

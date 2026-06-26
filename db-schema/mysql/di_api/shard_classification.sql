CREATE TABLE `shard_classification` (
  `id` int(10) unsigned NOT NULL,
  `title` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `language` char(2) COLLATE utf8mb4_unicode_ci NOT NULL,
  `region` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `country` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gics_sector` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gics_industry_group` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gics_industry` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `iab_tier_1` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `iab_tier_2` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `iab_tier_3` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `iab_tier_4` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `brand_safety` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

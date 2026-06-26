CREATE TABLE `psychographix_zip_shard_weekly` (
  `zip_code` char(5) COLLATE utf8mb4_unicode_ci NOT NULL,
  `country` char(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USA',
  `shard_id` mediumint(8) unsigned NOT NULL,
  `processing_week` date NOT NULL,
  `num_urls` int(10) unsigned NOT NULL DEFAULT '0',
  `auction_count` int(10) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`zip_code`,`country`,`shard_id`,`processing_week`),
  KEY `idx_shard` (`shard_id`,`processing_week`),
  KEY `idx_zip` (`zip_code`,`processing_week`),
  KEY `idx_processing_week` (`processing_week`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `di_ca_placement_unlink` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `bookingUniqueNumber` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `placementId` bigint(20) unsigned NOT NULL,
  `unlinkedBy` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_pair` (`placementId`,`bookingUniqueNumber`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

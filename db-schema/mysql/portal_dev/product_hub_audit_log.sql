CREATE TABLE `product_hub_audit_log` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `userId` int(10) unsigned NOT NULL,
  `entityType` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entityUuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entityName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `oldValue` json DEFAULT NULL,
  `newValue` json DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_audit_entity` (`entityType`,`entityUuid`),
  KEY `idx_audit_actor` (`userId`),
  KEY `idx_audit_created` (`createdAt`)
) ENGINE=InnoDB AUTO_INCREMENT=181 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

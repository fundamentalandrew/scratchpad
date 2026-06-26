CREATE TABLE `targeting_contextual_run` (
  `targetingContextualProfileId` bigint(20) unsigned NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `error` mediumtext COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`targetingContextualProfileId`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

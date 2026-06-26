CREATE TABLE `ai_asset_builder_campaign_folder` (
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Folder UUID',
  `clientUuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Multi-tenant isolation',
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Folder name',
  `creator` int(11) NOT NULL COMMENT 'User ID who created folder',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`uuid`),
  KEY `idx_client_uuid` (`clientUuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Campaign folder organization';

CREATE TABLE `ai_asset_builder_template_resource` (
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Resource UUID',
  `templateUuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ref: template.uuid',
  `templateUnitUuid` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ref: template_unit.uuid (NULL for template-level resources)',
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Resource type (e.g. main-container)',
  `fileType` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'MIME type (e.g. text/html)',
  `fileSize` int(11) NOT NULL COMMENT 'File size in bytes',
  `filePath` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'GCS URI (gs://bucket/path)',
  `fileHash` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'SHA-256 hash for deduplication',
  `uploadedBy` int(11) NOT NULL COMMENT 'User ID who uploaded resource',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`uuid`),
  KEY `idx_template_uuid` (`templateUuid`),
  KEY `idx_template_unit_uuid` (`templateUnitUuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Template HTML files stored in GCS';

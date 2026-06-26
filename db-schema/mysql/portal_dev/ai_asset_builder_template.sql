CREATE TABLE `ai_asset_builder_template` (
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Template UUID',
  `clientUuid` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Template type (e.g. engaged-content)',
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Template name',
  `schema` json DEFAULT NULL COMMENT 'Aggregate schema from all units',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `schemaHash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT 'SHA-256 of normalized schema JSON (sorted keys, field names + types + charLimits). Identifies templates sharing the same copy shape for variation reuse (ADR-028). Empty string = pre-migration row, awaiting backfill on next write.',
  `creator` int(11) NOT NULL COMMENT 'User ID who created template',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`uuid`),
  KEY `idx_client_uuid` (`clientUuid`),
  KEY `idx_client_schema_hash` (`clientUuid`,`schemaHash`),
  KEY `idx_template_status` (`status`),
  KEY `idx_client_status` (`clientUuid`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Advertising template definitions (per client)';

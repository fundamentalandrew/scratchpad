CREATE TABLE `ai_asset_builder_creative_size` (
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Size UUID',
  `name` varchar(999) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Display name (e.g. 300x250)',
  `width` int(11) NOT NULL COMMENT 'Width in pixels',
  `height` int(11) NOT NULL COMMENT 'Height in pixels',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Standard ad banner sizes for AI Asset Builder';

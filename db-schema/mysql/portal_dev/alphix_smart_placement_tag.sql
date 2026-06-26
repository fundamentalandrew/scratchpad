CREATE TABLE `alphix_smart_placement_tag` (
  `tagUuid` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `publisherUuid` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `enabled` tinyint(4) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `codeVersion` decimal(5,2) NOT NULL,
  `reference` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Main Tag',
  PRIMARY KEY (`tagUuid`) USING BTREE,
  KEY `client_uuid` (`publisherUuid`) USING BTREE,
  KEY `codeVersion` (`codeVersion`) USING BTREE,
  KEY `enabled` (`enabled`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

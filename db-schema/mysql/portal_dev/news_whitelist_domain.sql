CREATE TABLE `news_whitelist_domain` (
  `whitelistUuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ref: news_whitelist.uuid',
  `domainId` int(11) NOT NULL COMMENT 'ref: domain.id',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`whitelistUuid`,`domainId`),
  KEY `idx_whitelist_uuid` (`whitelistUuid`),
  KEY `idx_domain_id` (`domainId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Junction: news_whitelist <-> domain';

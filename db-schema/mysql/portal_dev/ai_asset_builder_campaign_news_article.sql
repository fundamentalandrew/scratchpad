CREATE TABLE `ai_asset_builder_campaign_news_article` (
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Article UUID',
  `campaignNewsUuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ref: campaign_news.uuid',
  `title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Article headline',
  `content` text COLLATE utf8mb4_unicode_ci COMMENT 'Article body/excerpt',
  `published` date DEFAULT NULL COMMENT 'Article publish date',
  `netloc` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Domain name',
  `url` varchar(2048) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Full article URL',
  `urlHash` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Nosible dedup key',
  `relevanceScore` decimal(5,4) DEFAULT '0.0000' COMMENT '0-1 relevance score',
  `isSelected` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'User selection state',
  `isManual` tinyint(1) NOT NULL DEFAULT '0' COMMENT '1 if added via scrape-url',
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`uuid`),
  KEY `idx_campaign_news_uuid` (`campaignNewsUuid`),
  KEY `idx_url_hash` (`urlHash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Individual news articles from Nosible search results';

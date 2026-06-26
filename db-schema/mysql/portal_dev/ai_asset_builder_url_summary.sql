CREATE TABLE `ai_asset_builder_url_summary` (
  `urlScrapeUuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ref: url_scrape.uuid (platform-wide)',
  `aiSummary` json NOT NULL COMMENT 'LandingPageSummary output (title, summary, keyMessages, callsToAction, products, targetAudience)',
  `keywords` json NOT NULL COMMENT 'AI-suggested keyword array (baseline — user edits live in campaign_setting.landingPageKeywords)',
  `generatedAt` datetime NOT NULL COMMENT 'When the AI baseline was produced — cache hit when >= url_scrape.updated',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`urlScrapeUuid`),
  KEY `idx_generated_at` (`generatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI baseline cache for url_scrape records — shared across campaigns, invalidated by url_scrape.updated';

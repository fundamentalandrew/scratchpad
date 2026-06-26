CREATE TABLE `ai_asset_builder_campaign_variation_link_cm_creative` (
  `variationUuid` varchar(36) NOT NULL,
  `creativeId` int(11) NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`variationUuid`,`creativeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

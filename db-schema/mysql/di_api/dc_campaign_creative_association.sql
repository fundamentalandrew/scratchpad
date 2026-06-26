CREATE TABLE `dc_campaign_creative_association` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `campaignId` int(10) unsigned NOT NULL,
  `creativeId` int(10) unsigned NOT NULL,
  `accountId` int(10) unsigned DEFAULT NULL,
  `profileId` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dc_campaign_creative_association_campaignid_creativeid_unique` (`campaignId`,`creativeId`),
  UNIQUE KEY `dc_campaign_creative_association_id_unique` (`id`),
  KEY `accountId` (`accountId`),
  KEY `profileId` (`profileId`)
) ENGINE=InnoDB AUTO_INCREMENT=42554 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

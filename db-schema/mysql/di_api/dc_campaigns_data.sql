CREATE TABLE `dc_campaigns_data` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `advertiserId` int(10) unsigned NOT NULL,
  `campaignId` int(10) unsigned NOT NULL,
  `impressions` int(10) unsigned NOT NULL,
  `clicks` int(10) unsigned NOT NULL,
  `accountId` int(10) unsigned DEFAULT NULL,
  `profileId` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `campaignUnique` (`date`,`campaignId`),
  KEY `idx_dc_campaigns_campaignId` (`campaignId`),
  KEY `idx_dc_campaigns_advertiserId` (`advertiserId`),
  KEY `idx_dc_campaigns_date` (`date`),
  KEY `accountId` (`accountId`),
  KEY `profileId` (`profileId`)
) ENGINE=InnoDB AUTO_INCREMENT=815619 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

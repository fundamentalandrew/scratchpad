CREATE TABLE `client_attribution_campaign_group` (
  `clientAttributionCampaignId` int(10) unsigned NOT NULL,
  `clientAttributionGroupId` int(10) unsigned NOT NULL,
  `createdAt` datetime DEFAULT NULL,
  PRIMARY KEY (`clientAttributionCampaignId`,`clientAttributionGroupId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

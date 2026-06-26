CREATE TABLE `fb_campaign_agency_fee` (
  `date` date NOT NULL,
  `campaignId` int(11) NOT NULL,
  `agencyFee` decimal(10,5) DEFAULT NULL,
  PRIMARY KEY (`date`,`campaignId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

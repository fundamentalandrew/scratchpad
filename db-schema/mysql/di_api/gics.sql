CREATE TABLE `gics` (
  `sectorCode` int(10) unsigned NOT NULL,
  `sector` varchar(100) NOT NULL,
  `industryGroupCode` int(10) unsigned NOT NULL,
  `industryGroup` varchar(100) NOT NULL,
  `industryCode` int(10) unsigned NOT NULL,
  `industry` varchar(100) NOT NULL,
  `subIndustryCode` int(10) unsigned NOT NULL,
  `subIndustry` varchar(100) NOT NULL,
  `subIndustryDescription` text NOT NULL,
  `added` datetime NOT NULL,
  PRIMARY KEY (`subIndustryCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

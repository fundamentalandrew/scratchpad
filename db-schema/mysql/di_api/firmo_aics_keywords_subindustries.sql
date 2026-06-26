CREATE TABLE `firmo_aics_keywords_subindustries` (
  `subIndustry` varchar(100) NOT NULL,
  `keywords` varchar(100) NOT NULL,
  `language` varchar(2) NOT NULL,
  PRIMARY KEY (`subIndustry`,`keywords`,`language`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

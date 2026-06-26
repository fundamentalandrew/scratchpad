CREATE TABLE `bk_audience_country` (
  `partner_id` int(10) unsigned NOT NULL,
  `audience_id` int(10) unsigned NOT NULL,
  `country` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`partner_id`,`audience_id`,`country`),
  UNIQUE KEY `audienceCountry` (`partner_id`,`audience_id`,`country`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

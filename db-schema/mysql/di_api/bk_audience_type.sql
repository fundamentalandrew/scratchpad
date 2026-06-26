CREATE TABLE `bk_audience_type` (
  `partner_id` int(10) unsigned NOT NULL,
  `audience_id` int(10) unsigned NOT NULL,
  `type_id` int(10) unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `device_group` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `context_group` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`partner_id`,`audience_id`,`type_id`),
  UNIQUE KEY `audienceType` (`partner_id`,`audience_id`,`type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

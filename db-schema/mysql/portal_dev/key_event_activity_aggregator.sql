CREATE TABLE `key_event_activity_aggregator` (
  `key_event_id` int(10) unsigned NOT NULL,
  `aa_uuid` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`key_event_id`,`aa_uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE `key_event_geo` (
  `key_event_id` int(10) unsigned NOT NULL,
  `geo_id` int(10) unsigned NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`key_event_id`,`geo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

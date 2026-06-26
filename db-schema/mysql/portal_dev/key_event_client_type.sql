CREATE TABLE `key_event_client_type` (
  `key_event_id` int(10) unsigned NOT NULL,
  `client_type` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`key_event_id`,`client_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

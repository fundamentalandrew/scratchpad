CREATE TABLE `key_event_client` (
  `key_event_id` int(10) unsigned NOT NULL,
  `client_uuid` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`key_event_id`,`client_uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

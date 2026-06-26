CREATE TABLE `mux_view_event` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `view_id` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `viewer_time` bigint(20) unsigned NOT NULL,
  `playback_time` int(10) unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `event_time` bigint(20) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `view_id` (`view_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5677617 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

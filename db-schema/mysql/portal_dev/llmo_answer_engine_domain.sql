CREATE TABLE `llmo_answer_engine_domain` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `llmo_answer_engine_id` int(10) unsigned NOT NULL,
  `domain` varchar(128) COLLATE utf8_unicode_ci NOT NULL,
  `enabled` tinyint(1) unsigned NOT NULL DEFAULT '1',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

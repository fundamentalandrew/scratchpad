CREATE TABLE `lf_run` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `reference` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `date` date NOT NULL,
  PRIMARY KEY (`id`),
  KEY `reference` (`reference`),
  KEY `date` (`date`)
) ENGINE=InnoDB AUTO_INCREMENT=5135 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

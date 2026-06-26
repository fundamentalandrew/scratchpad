CREATE TABLE `iab_category` (
  `id` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `parentId` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `tier1` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `tier2` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `tier3` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `tier4` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `parentId` (`parentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

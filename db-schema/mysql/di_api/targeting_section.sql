CREATE TABLE `targeting_section` (
  `urlPath` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `segmentKey` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`urlPath`,`segmentKey`),
  KEY `urlPath` (`urlPath`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

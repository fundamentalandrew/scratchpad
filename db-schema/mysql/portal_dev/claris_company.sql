CREATE TABLE `claris_company` (
  `uuid` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `companyType` varchar(10) COLLATE utf8_unicode_ci NOT NULL,
  `sector` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `audience` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`uuid`),
  KEY `companyType` (`companyType`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

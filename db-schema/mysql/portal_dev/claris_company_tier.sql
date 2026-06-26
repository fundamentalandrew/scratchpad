CREATE TABLE `claris_company_tier` (
  `companyUuid` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `clientUuid` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `tier` int(11) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`companyUuid`,`clientUuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

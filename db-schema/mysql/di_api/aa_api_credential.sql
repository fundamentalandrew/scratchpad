CREATE TABLE `aa_api_credential` (
  `organizationId` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `clientId` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `clientSecret` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `technicalAccountId` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `technicalAccountEmail` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `status` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `companyId` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `companyName` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `keyName` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `scope` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`organizationId`),
  UNIQUE KEY `keyName` (`keyName`),
  KEY `status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
